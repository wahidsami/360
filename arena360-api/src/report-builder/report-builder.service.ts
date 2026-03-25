import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../common/storage.service';
import { ScopeUtils, UserWithRoles } from '../common/utils/scope.utils';
import * as puppeteer from 'puppeteer';
import { existsSync } from 'fs';
import { AiService } from '../ai/ai.service';
import { ActivityService } from '../activity/activity.service';
import {
  AssignClientReportTemplateDto,
  CreateProjectReportDto,
  CreateProjectReportEntryDto,
  CreateReportBuilderTemplateDto,
  CreateReportBuilderTemplateVersionDto,
  ReorderProjectReportEntriesDto,
  UpdateClientReportTemplateAssignmentDto,
  UpdateProjectReportDto,
  UpdateProjectReportEntryDto,
  UpdateReportBuilderTemplateDto,
} from './dto/report-builder.dto';
import { FileCategory, FileScopeType, FileVisibility, ProjectReportMediaType } from '@prisma/client';

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
    private readonly aiService: AiService,
    private readonly activity: ActivityService,
  ) {}

  private normalizeCode(code: string) {
    return code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async ensureClientInOrg(clientId: string, orgId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, orgId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  private async ensureTemplateInOrg(templateId: string, orgId: string) {
    const template = await this.prisma.reportBuilderTemplate.findFirst({
      where: { id: templateId, orgId },
    });
    if (!template) throw new NotFoundException('Report builder template not found');
    return template;
  }

  private async ensureProjectAccess(projectId: string, user: UserWithRoles) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, ...ScopeUtils.projectScope(user) },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async ensureProjectReportAccess(reportId: string, user: UserWithRoles) {
    const isClientUser = this.isClientUser(user.role);
    const report = await this.prisma.projectReport.findFirst({
      where: {
        id: reportId,
        deletedAt: null,
        orgId: user.orgId,
        project: ScopeUtils.projectScope(user),
        ...(isClientUser && {
          status: 'PUBLISHED',
          visibility: 'CLIENT',
        }),
      },
      include: {
        project: true,
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!report) throw new NotFoundException('Project report not found');
    return report;
  }

  private async ensureProjectReportEntryAccess(reportId: string, entryId: string, user: UserWithRoles) {
    await this.ensureProjectReportAccess(reportId, user);
    const entry = await this.prisma.projectReportEntry.findFirst({
      where: {
        id: entryId,
        orgId: user.orgId,
        projectReportId: reportId,
        deletedAt: null,
      },
      include: {
        projectReport: true,
        media: {
          include: {
            fileAsset: true,
          },
        },
      },
    });
    if (!entry) throw new NotFoundException('Project report entry not found');
    return entry;
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^\p{L}\p{N}._-]/gu, '_');
  }

  private isClientUser(role: string) {
    return ['CLIENT_OWNER', 'CLIENT_MANAGER', 'CLIENT_MEMBER'].includes(role);
  }

  private detectMediaType(mimeType: string): ProjectReportMediaType {
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    return 'DOCUMENT';
  }

  private severityLabel(severity?: string | null) {
    const labels: Record<string, string> = {
      CRITICAL: 'حرجة',
      HIGH: 'عالية',
      MEDIUM: 'متوسطة',
      LOW: 'منخفضة',
    };
    return labels[severity || 'LOW'] || 'منخفضة';
  }

  private async logActivity(data: {
    orgId: string;
    projectId?: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }) {
    this.activity.create(data).catch((error) => {
      this.logger.warn(`Failed to create activity feed entry for ${data.action}: ${error?.message || error}`);
    });
  }

  private async launchPdfBrowser() {
    const executablePath =
      this.config.get<string>('PUPPETEER_EXECUTABLE_PATH') || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (executablePath && !existsSync(executablePath)) {
      throw new ServiceUnavailableException(
        `PDF export runtime is misconfigured. Browser executable was not found at "${executablePath}". Run "npm run pdf:check" on the server and verify Puppeteer configuration.`,
      );
    }

    const disableSandbox =
      (this.config.get<string>('PUPPETEER_DISABLE_SANDBOX') || process.env.PUPPETEER_DISABLE_SANDBOX || 'true') !==
      'false';

    try {
      return await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: disableSandbox ? ['--no-sandbox', '--disable-setuid-sandbox'] : [],
      });
    } catch (error: any) {
      this.logger.error(`Failed to start browser for PDF export: ${error?.message || error}`);
      throw new ServiceUnavailableException(
        'PDF export runtime is unavailable. Run "npm run pdf:check" on the server and verify Chromium dependencies before retrying export.',
      );
    }
  }

  private escapeHtml(value?: string | null) {
    return (value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private async buildProjectReportPreviewData(reportId: string, user: UserWithRoles) {
    const accessibleReport = await this.ensureProjectReportAccess(reportId, user);
    const report = await this.prisma.projectReport.findFirst({
      where: {
        id: accessibleReport.id,
        deletedAt: null,
        orgId: user.orgId,
        project: ScopeUtils.projectScope(user),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        client: {
          select: { id: true, name: true, logo: true },
        },
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
        entries: {
          where: { deletedAt: null },
          include: {
            media: {
              include: {
                fileAsset: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!report) throw new NotFoundException('Project report not found');

    const entries = await Promise.all(
      report.entries.map(async (entry) => ({
        ...entry,
        media: await Promise.all(
          entry.media.map(async (media) => ({
            ...media,
            signedUrl: await this.storage.getSignedUrl(media.fileAsset.storageKey, 3600, false),
          })),
        ),
      })),
    );

    return { report, entries };
  }

  private async renderProjectReportHtml(reportId: string, user: UserWithRoles) {
    const { report, entries } = await this.buildProjectReportPreviewData(reportId, user);
    const summary = (report.summaryJson || {}) as Record<string, string>;
    const severityCounts = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((severity) => ({
      severity,
      count: entries.filter((entry) => entry.severity === severity).length,
    }));

    const tableRows = entries
      .map((entry, index) => {
        const mediaHtml = entry.media.length
          ? entry.media
              .map((media) => {
                const fileName = this.escapeHtml(media.fileAsset.filename);
                if (media.mediaType === 'IMAGE') {
                  return                     '<div class="evidence evidence-image">' +
                    '<img src="' + media.signedUrl + '" alt="' + fileName + '" />' +
                    '<span>' + fileName + '</span>' +
                    '</div>';
                }
                return                   '<div class="evidence evidence-link">' +
                  '<a href="' + media.signedUrl + '" target="_blank" rel="noreferrer">' + fileName + '</a>' +
                  '</div>';
              })
              .join('')
          : '<span class="muted">-</span>';

        const pageUrlHtml = entry.pageUrl
          ? '<a href="' + this.escapeHtml(entry.pageUrl) + '" target="_blank" rel="noreferrer">???? ???</a>'
          : '<span class="muted">-</span>';

        return           '<tr>' +
            '<td>' + (index + 1) + '</td>' +
            '<td>' + (this.escapeHtml(entry.serviceName) || '<span class="muted">-</span>') + '</td>' +
            '<td>' + this.escapeHtml(entry.issueTitle) + '</td>' +
            '<td>' + this.escapeHtml(entry.issueDescription) + '</td>' +
            '<td><span class="severity severity-' + ((entry.severity || 'LOW').toLowerCase()) + '">' + this.escapeHtml(this.severityLabel(entry.severity)) + '</span></td>' +
            '<td>' + pageUrlHtml + '</td>' +
            '<td>' + mediaHtml + '</td>' +
            '<td>' + (this.escapeHtml(entry.recommendation) || '<span class="muted">-</span>') + '</td>' +
          '</tr>';
      })
      .join('');

    const summaryCards = severityCounts
      .map(
        (item) =>           '<div class="summary-card">' +
            '<div class="summary-value">' + item.count + '</div>' +
            '<div class="summary-label">' + this.escapeHtml(this.severityLabel(item.severity)) + '</div>' +
          '</div>',
      )
      .join('');

    const summarySection =
      summary.introduction || summary.executiveSummary || summary.recommendationsSummary
        ?           '<section class="section">' +
            '<div class="eyebrow">???? ????? ??????? ?????????</div>' +
            '<h2>?????? ????????</h2>' +
            (summary.introduction ? '<div class="summary-block"><h3>???????</h3><p>' + this.escapeHtml(summary.introduction).replace(/\n/g, '<br />') + '</p></div>' : '') +
            (summary.executiveSummary ? '<div class="summary-block"><h3>?????? ????????</h3><p>' + this.escapeHtml(summary.executiveSummary).replace(/\n/g, '<br />') + '</p></div>' : '') +
            (summary.recommendationsSummary ? '<div class="summary-block"><h3>????? ????????</h3><p>' + this.escapeHtml(summary.recommendationsSummary).replace(/\n/g, '<br />') + '</p></div>' : '') +
          '</section>'
        : '';

    const coverDescription =
      this.escapeHtml(report.description) ||
      '????? ???? ???? ?????? ??????? ?? ???? ????? ????? ?????? ?????? ?????????? ??????.';

    return       '<!doctype html>' +
      '<html lang="ar" dir="rtl">' +
        '<head>' +
          '<meta charset="utf-8" />' +
          '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
          '<title>' + this.escapeHtml(report.title) + '</title>' +
          '<style>' +
            ':root {' +
              '--bg: #f6f2ec;' +
              '--panel: #ffffff;' +
              '--ink: #2d1b0f;' +
              '--muted: #6b7280;' +
              '--accent: #8a1538;' +
              '--border: #eadfd4;' +
              '--accent-soft: #f4e6ea;' +
            '}' +
            '* { box-sizing: border-box; }' +
            'body { margin: 0; font-family: "Noto Naskh Arabic", Tahoma, "Segoe UI", Arial, sans-serif; background: linear-gradient(180deg, #fcfaf7 0%, #f6f2ec 100%); color: var(--ink); }' +
            '.page { padding: 32px; }' +
            '.cover, .section { background: var(--panel); border: 1px solid var(--border); border-radius: 20px; padding: 24px; margin-bottom: 24px; box-shadow: 0 12px 40px rgba(62, 39, 22, 0.08); }' +
            '.eyebrow { color: var(--accent); font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px; }' +
            'h1, h2, h3, p { margin: 0; }' +
            'h1 { font-size: 34px; margin-bottom: 12px; }' +
            'h2 { font-size: 22px; margin-bottom: 14px; }' +
            'p { line-height: 1.8; }' +
            '.brand-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 16px; }' +
            '.brand-row img { max-height: 56px; max-width: 180px; object-fit: contain; }' +
            '.cover-lead { font-size: 15px; }' +
            '.meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; color: var(--muted); font-size: 13px; }' +
            '.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }' +
            '.summary-card { border: 1px solid var(--border); border-radius: 16px; padding: 16px; text-align: center; background: var(--accent-soft); }' +
            '.summary-value { font-size: 30px; font-weight: 800; color: var(--accent); }' +
            '.summary-label { margin-top: 8px; font-size: 13px; color: var(--muted); }' +
            'table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; }' +
            'th, td { border: 1px solid #e5e7eb; padding: 12px; vertical-align: top; }' +
            'th { background: var(--accent); color: #ffffff; font-size: 12px; }' +
            'td { background: #ffffff; }' +
            '.severity { display: inline-block; border-radius: 999px; padding: 4px 10px; font-weight: 700; font-size: 11px; }' +
            '.severity-critical, .severity-high { background: #fee2e2; color: #b91c1c; }' +
            '.severity-medium { background: #fef3c7; color: #b45309; }' +
            '.severity-low { background: #dcfce7; color: #166534; }' +
            '.evidence { margin-bottom: 8px; }' +
            '.evidence img { width: 100%; max-width: 140px; height: auto; border-radius: 10px; display: block; margin-bottom: 6px; }' +
            '.evidence a { color: #2563eb; text-decoration: none; font-weight: 600; }' +
            '.muted { color: var(--muted); }' +
            '.footer-note { color: var(--muted); font-size: 12px; margin-top: 16px; }' +
            '.summary-block { border: 1px solid var(--border); border-radius: 16px; padding: 16px; background: #fcfcff; margin-top: 14px; }' +
            '.summary-block h3 { font-size: 15px; margin-bottom: 8px; color: var(--accent); }' +
            '.closing { text-align: center; min-height: 180px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }' +
            '@page { size: A4 landscape; margin: 14mm; }' +
          '</style>' +
        '</head>' +
        '<body>' +
          '<div class="page">' +
            '<section class="cover">' +
              '<div class="brand-row">' +
                '<div>' +
                  '<div class="eyebrow">????? ????? ??????? ??????</div>' +
                  '<h1>' + this.escapeHtml(report.title) + '</h1>' +
                '</div>' +
                (report.client.logo ? '<img src="' + this.escapeHtml(report.client.logo) + '" alt="' + this.escapeHtml(report.client.name) + '" />' : '') +
              '</div>' +
              '<p class="cover-lead">' + coverDescription + '</p>' +
              '<div class="meta">' +
                '<span>??????: ' + this.escapeHtml(report.client.name) + '</span>' +
                '<span>???????: ' + this.escapeHtml(report.project.name) + '</span>' +
                '<span>???????: ' + this.escapeHtml(report.template.name) + ' / v' + report.templateVersion.versionNumber + '</span>' +
                '<span>?? ??????? ??????: ' + this.escapeHtml(report.performedBy?.name || 'Unknown') + '</span>' +
              '</div>' +
              '<div class="summary-grid">' + summaryCards + '</div>' +
            '</section>' +
            summarySection +
            '<section class="section">' +
              '<div class="eyebrow">???? ?????????</div>' +
              '<h2>???? ?????????</h2>' +
              '<table>' +
                '<thead>' +
                  '<tr>' +
                    '<th style="width: 5%">ID</th>' +
                    '<th style="width: 11%">??? ??????</th>' +
                    '<th style="width: 12%">????? ???????</th>' +
                    '<th style="width: 20%">??? ???????</th>' +
                    '<th style="width: 8%">???????</th>' +
                    '<th style="width: 10%">???? ??????</th>' +
                    '<th style="width: 14%">??????</th>' +
                    '<th style="width: 20%">????????</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' +
                  (tableRows || '<tr><td colspan="8" class="muted">?? ???? ??????? ???.</td></tr>') +
                '</tbody>' +
              '</table>' +
              '<p class="footer-note">?? ????? ??? ??????? ?? ????? ????? ???????? ?????? ??????? ???????? ?? ????? ???? ????? ?????? RTL ??? ???????.</p>' +
            '</section>' +
            '<section class="section closing">' +
              '<div class="eyebrow">????? ???????</div>' +
              '<h2>????? ???????</h2>' +
              '<p>???? ??????? ??? ??????? ????? ???? ???????? ????????? ???? ???????. ?? ????? ??? ??????? ?? ???? ??????? ??????? ?????? ?????????? ??? ?????? ??????? ??????? ?? ????? ?????.</p>' +
            '</section>' +
          '</div>' +
        '</body>' +
      '</html>';
  }

  async listTemplates(orgId: string) {
    return this.prisma.reportBuilderTemplate.findMany({
      where: { orgId },
      include: {
        versions: {
          orderBy: [{ versionNumber: 'desc' }],
          take: 5,
        },
        _count: {
          select: { assignments: true, projectReports: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async createTemplate(orgId: string, user: UserWithRoles, dto: CreateReportBuilderTemplateDto) {
    const code = this.normalizeCode(dto.code);
    if (!code) throw new BadRequestException('Template code is required');
    const template = await this.prisma.reportBuilderTemplate.create({
      data: {
        orgId,
        name: dto.name.trim(),
        code,
        description: dto.description?.trim(),
        category: dto.category ?? 'ACCESSIBILITY',
        status: dto.status ?? 'DRAFT',
        createdById: user.id,
      },
    });
    await this.logActivity({
      orgId,
      userId: user.id,
      action: 'report-template.created',
      entityType: 'report_template',
      entityId: template.id,
      description: `Report template "${template.name}" created.`,
      metadata: { templateId: template.id, code: template.code, category: template.category },
    });
    return template;
  }

  async updateTemplate(orgId: string, id: string, dto: UpdateReportBuilderTemplateDto, user?: UserWithRoles) {
    const current = await this.ensureTemplateInOrg(id, orgId);
    const template = await this.prisma.reportBuilderTemplate.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name.trim() }),
        ...(dto.code != null && { code: this.normalizeCode(dto.code) }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.category != null && { category: dto.category }),
        ...(dto.status != null && { status: dto.status }),
      },
    });
    await this.logActivity({
      orgId,
      userId: user?.id || current.createdById || 'system',
      action: 'report-template.updated',
      entityType: 'report_template',
      entityId: template.id,
      description: `Report template "${template.name}" updated.`,
      metadata: { templateId: template.id, previousStatus: current.status, nextStatus: template.status },
    });
    return template;
  }

  async createTemplateVersion(
    orgId: string,
    templateId: string,
    dto: CreateReportBuilderTemplateVersionDto,
    user?: UserWithRoles,
  ) {
    const template = await this.ensureTemplateInOrg(templateId, orgId);
    const latest = await this.prisma.reportBuilderTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    const version = await this.prisma.reportBuilderTemplateVersion.create({
      data: {
        templateId,
        versionNumber: (latest?.versionNumber ?? 0) + 1,
        schemaJson: dto.schemaJson as object,
        pdfConfigJson: dto.pdfConfigJson ? (dto.pdfConfigJson as object) : undefined,
        aiConfigJson: dto.aiConfigJson ? (dto.aiConfigJson as object) : undefined,
        taxonomyJson: dto.taxonomyJson ? (dto.taxonomyJson as object) : undefined,
      },
    });
    await this.logActivity({
      orgId,
      userId: user?.id || template.createdById || 'system',
      action: 'report-template.version-created',
      entityType: 'report_template_version',
      entityId: version.id,
      description: `Version ${version.versionNumber} created for template "${template.name}".`,
      metadata: { templateId, versionNumber: version.versionNumber },
    });
    return version;
  }

  async publishTemplateVersion(orgId: string, templateId: string, versionId: string, user: UserWithRoles) {
    await this.ensureTemplateInOrg(templateId, orgId);
    const version = await this.prisma.reportBuilderTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!version) throw new NotFoundException('Template version not found');

    const [, publishedVersion] = await this.prisma.$transaction([
      this.prisma.reportBuilderTemplateVersion.updateMany({
        where: { templateId },
        data: { isPublished: false },
      }),
      this.prisma.reportBuilderTemplateVersion.update({
        where: { id: versionId },
        data: {
          isPublished: true,
          publishedById: user.id,
          publishedAt: new Date(),
        },
      }),
      this.prisma.reportBuilderTemplate.update({
        where: { id: templateId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    await this.logActivity({
      orgId,
      userId: user.id,
      action: 'report-template.version-published',
      entityType: 'report_template_version',
      entityId: versionId,
      description: `Version ${version.versionNumber} published for report template.`,
      metadata: { templateId, versionId, versionNumber: version.versionNumber },
    });

    return publishedVersion;
  }

  async listClientAssignments(orgId: string, clientId: string) {
    await this.ensureClientInOrg(clientId, orgId);
    return this.prisma.clientReportTemplateAssignment.findMany({
      where: { orgId, clientId },
      include: {
        template: true,
        templateVersion: true,
      },
      orderBy: [{ assignedAt: 'desc' }],
    });
  }

  async createClientAssignment(
    orgId: string,
    clientId: string,
    user: UserWithRoles,
    dto: AssignClientReportTemplateDto,
  ) {
    await this.ensureClientInOrg(clientId, orgId);
    await this.ensureTemplateInOrg(dto.templateId, orgId);
    const version = await this.prisma.reportBuilderTemplateVersion.findFirst({
      where: {
        id: dto.templateVersionId,
        templateId: dto.templateId,
        isPublished: true,
      },
    });
    if (!version) throw new NotFoundException('Published template version not found');

    if (dto.isDefault) {
      await this.prisma.clientReportTemplateAssignment.updateMany({
        where: { orgId, clientId, templateId: dto.templateId },
        data: { isDefault: false },
      });
    }

    const assignment = await this.prisma.clientReportTemplateAssignment.create({
      data: {
        orgId,
        clientId,
        templateId: dto.templateId,
        templateVersionId: dto.templateVersionId,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        assignedById: user.id,
      },
      include: {
        template: true,
        templateVersion: true,
      },
    });
    await this.logActivity({
      orgId,
      userId: user.id,
      action: 'report-template.assigned',
      entityType: 'client_report_template_assignment',
      entityId: assignment.id,
      description: `Template "${assignment.template.name}" assigned to client.`,
      metadata: {
        clientId,
        templateId: assignment.templateId,
        templateVersionId: assignment.templateVersionId,
        isDefault: assignment.isDefault,
      },
    });
    return assignment;
  }

  async updateClientAssignment(
    orgId: string,
    assignmentId: string,
    dto: UpdateClientReportTemplateAssignmentDto,
    user?: UserWithRoles,
  ) {
    const assignment = await this.prisma.clientReportTemplateAssignment.findFirst({
      where: { id: assignmentId, orgId },
    });
    if (!assignment) throw new NotFoundException('Client template assignment not found');

    if (dto.isDefault) {
      await this.prisma.clientReportTemplateAssignment.updateMany({
        where: {
          orgId,
          clientId: assignment.clientId,
          templateId: assignment.templateId,
        },
        data: { isDefault: false },
      });
    }

    const updated = await this.prisma.clientReportTemplateAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.isDefault != null && { isDefault: dto.isDefault }),
        ...(dto.isActive != null && { isActive: dto.isActive }),
      },
      include: {
        template: true,
        templateVersion: true,
      },
    });
    if (user) {
      await this.logActivity({
        orgId,
        userId: user.id,
        action: 'report-template.assignment-updated',
        entityType: 'client_report_template_assignment',
        entityId: updated.id,
        description: `Client template assignment updated for "${updated.template.name}".`,
        metadata: { assignmentId: updated.id, isDefault: updated.isDefault, isActive: updated.isActive },
      });
    }
    return updated;
  }

  async listAvailableTemplates(projectId: string, user: UserWithRoles) {
    const project = await this.ensureProjectAccess(projectId, user);
    return this.prisma.clientReportTemplateAssignment.findMany({
      where: {
        orgId: user.orgId,
        clientId: project.clientId,
        isActive: true,
      },
      include: {
        template: true,
        templateVersion: true,
      },
      orderBy: [{ isDefault: 'desc' }, { assignedAt: 'desc' }],
    });
  }

  async listProjectReports(projectId: string, user: UserWithRoles) {
    await this.ensureProjectAccess(projectId, user);
    const isClientUser = this.isClientUser(user.role);
    return this.prisma.projectReport.findMany({
      where: {
        orgId: user.orgId,
        projectId,
        deletedAt: null,
        ...(isClientUser && {
          status: 'PUBLISHED',
          visibility: 'CLIENT',
        }),
      },
      include: {
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
        _count: { select: { entries: true, exports: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async createProjectReport(projectId: string, user: UserWithRoles, dto: CreateProjectReportDto) {
    const project = await this.ensureProjectAccess(projectId, user);
    const assignment = await this.prisma.clientReportTemplateAssignment.findFirst({
      where: {
        orgId: user.orgId,
        clientId: project.clientId,
        templateId: dto.templateId,
        templateVersionId: dto.templateVersionId,
        isActive: true,
      },
    });
    if (!assignment) {
      throw new ForbiddenException('Template version is not assigned to this project client');
    }

    const performedById = dto.performedById ?? user.id;
    const performer = await this.prisma.user.findFirst({
      where: { id: performedById, orgId: user.orgId, isActive: true },
      select: { id: true },
    });
    if (!performer) throw new NotFoundException('Selected performer not found');

    const report = await this.prisma.projectReport.create({
      data: {
        orgId: user.orgId,
        clientId: project.clientId,
        projectId,
        templateId: dto.templateId,
        templateVersionId: dto.templateVersionId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        visibility: dto.visibility ?? 'INTERNAL',
        performedById,
      },
      include: {
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId,
      userId: user.id,
      action: 'project-report.created',
      entityType: 'project_report',
      entityId: report.id,
      description: `Project report "${report.title}" created from template "${report.template.name}".`,
      metadata: { reportId: report.id, templateVersionId: report.templateVersionId, visibility: report.visibility },
    });
    return report;
  }

  async getProjectReport(reportId: string, user: UserWithRoles) {
    return this.ensureProjectReportAccess(reportId, user);
  }

  async updateProjectReport(reportId: string, user: UserWithRoles, dto: UpdateProjectReportDto) {
    const current = await this.ensureProjectReportAccess(reportId, user);
    if (dto.performedById) {
      const performer = await this.prisma.user.findFirst({
        where: { id: dto.performedById, orgId: user.orgId, isActive: true },
        select: { id: true },
      });
      if (!performer) throw new NotFoundException('Selected performer not found');
    }

    const publishedAt = dto.status === 'PUBLISHED' ? new Date() : undefined;

    const report = await this.prisma.projectReport.update({
      where: { id: reportId },
      data: {
        ...(dto.title != null && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.status != null && { status: dto.status }),
        ...(dto.visibility != null && { visibility: dto.visibility }),
        ...(dto.performedById != null && { performedById: dto.performedById }),
        ...(dto.summaryJson !== undefined && { summaryJson: dto.summaryJson as object }),
        ...(dto.coverSnapshotJson !== undefined && {
          coverSnapshotJson: dto.coverSnapshotJson as object,
        }),
        ...(publishedAt && { publishedAt }),
      },
      include: {
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId: current.projectId,
      userId: user.id,
      action: dto.status === 'PUBLISHED' ? 'project-report.published' : 'project-report.updated',
      entityType: 'project_report',
      entityId: report.id,
      description:
        dto.status === 'PUBLISHED'
          ? `Project report "${report.title}" published for client access.`
          : `Project report "${report.title}" updated.`,
      metadata: {
        reportId: report.id,
        previousStatus: current.status,
        nextStatus: report.status,
        visibility: report.visibility,
      },
    });
    return report;
  }

  async listProjectReportEntries(reportId: string, user: UserWithRoles) {
    await this.ensureProjectReportAccess(reportId, user);
    return this.prisma.projectReportEntry.findMany({
      where: {
        orgId: user.orgId,
        projectReportId: reportId,
        deletedAt: null,
      },
      include: {
        media: {
          include: {
            fileAsset: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createProjectReportEntry(
    reportId: string,
    user: UserWithRoles,
    dto: CreateProjectReportEntryDto,
  ) {
    const report = await this.ensureProjectReportAccess(reportId, user);
    const entry = await this.prisma.projectReportEntry.create({
      data: {
        orgId: user.orgId,
        projectReportId: reportId,
        sortOrder: dto.sortOrder ?? 0,
        serviceName: dto.serviceName?.trim(),
        issueTitle: dto.issueTitle.trim(),
        issueDescription: dto.issueDescription.trim(),
        severity: dto.severity,
        category: dto.category?.trim(),
        subcategory: dto.subcategory?.trim(),
        pageUrl: dto.pageUrl?.trim(),
        recommendation: dto.recommendation?.trim(),
        status: dto.status ?? 'OPEN',
        rowDataJson: dto.rowDataJson ? (dto.rowDataJson as object) : undefined,
        createdById: user.id,
        updatedById: user.id,
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId: report.projectId,
      userId: user.id,
      action: 'project-report.entry-created',
      entityType: 'project_report_entry',
      entityId: entry.id,
      description: `Report entry "${entry.issueTitle}" added to "${report.title}".`,
      metadata: { reportId, severity: entry.severity, category: entry.category },
    });
    return entry;
  }

  async updateProjectReportEntry(
    reportId: string,
    entryId: string,
    user: UserWithRoles,
    dto: UpdateProjectReportEntryDto,
  ) {
    const report = await this.ensureProjectReportAccess(reportId, user);
    const entry = await this.prisma.projectReportEntry.findFirst({
      where: {
        id: entryId,
        orgId: user.orgId,
        projectReportId: reportId,
        deletedAt: null,
      },
    });
    if (!entry) throw new NotFoundException('Project report entry not found');

    const updated = await this.prisma.projectReportEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
        ...(dto.serviceName !== undefined && { serviceName: dto.serviceName?.trim() || null }),
        ...(dto.issueTitle !== undefined && { issueTitle: dto.issueTitle?.trim() || entry.issueTitle }),
        ...(dto.issueDescription !== undefined && {
          issueDescription: dto.issueDescription?.trim() || entry.issueDescription,
        }),
        ...(dto.severity !== undefined && { severity: dto.severity }),
        ...(dto.category !== undefined && { category: dto.category?.trim() || null }),
        ...(dto.subcategory !== undefined && { subcategory: dto.subcategory?.trim() || null }),
        ...(dto.pageUrl !== undefined && { pageUrl: dto.pageUrl?.trim() || null }),
        ...(dto.recommendation !== undefined && {
          recommendation: dto.recommendation?.trim() || null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.rowDataJson !== undefined && { rowDataJson: dto.rowDataJson as object }),
        updatedById: user.id,
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId: report.projectId,
      userId: user.id,
      action: 'project-report.entry-updated',
      entityType: 'project_report_entry',
      entityId: updated.id,
      description: `Report entry "${updated.issueTitle}" updated in "${report.title}".`,
      metadata: { reportId, severity: updated.severity, status: updated.status },
    });
    return updated;
  }

  async deleteProjectReportEntry(reportId: string, entryId: string, user: UserWithRoles) {
    const report = await this.ensureProjectReportAccess(reportId, user);
    const entry = await this.prisma.projectReportEntry.findFirst({
      where: {
        id: entryId,
        orgId: user.orgId,
        projectReportId: reportId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException('Project report entry not found');

    const deleted = await this.prisma.projectReportEntry.update({
      where: { id: entryId },
      data: {
        deletedAt: new Date(),
        updatedById: user.id,
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId: report.projectId,
      userId: user.id,
      action: 'project-report.entry-deleted',
      entityType: 'project_report_entry',
      entityId: deleted.id,
      description: `A report entry was removed from "${report.title}".`,
      metadata: { reportId, entryId: deleted.id },
    });
    return deleted;
  }

  async reorderProjectReportEntries(
    reportId: string,
    user: UserWithRoles,
    dto: ReorderProjectReportEntriesDto,
  ) {
    await this.ensureProjectReportAccess(reportId, user);
    if (!dto.items.length) return [];

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.projectReportEntry.updateMany({
          where: {
            id: item.id,
            orgId: user.orgId,
            projectReportId: reportId,
            deletedAt: null,
          },
          data: {
            sortOrder: item.sortOrder,
            updatedById: user.id,
          },
        }),
      ),
    );

    return this.listProjectReportEntries(reportId, user);
  }

  async uploadProjectReportEntryMedia(
    reportId: string,
    entryId: string,
    user: UserWithRoles,
    file: Express.Multer.File,
    caption?: string,
  ) {
    const entry = await this.ensureProjectReportEntryAccess(reportId, entryId, user);
    const report = await this.ensureProjectReportAccess(reportId, user);
    const visibility: FileVisibility = report.visibility === 'CLIENT' ? 'CLIENT' : 'INTERNAL';
    const storageKey = this.storage.generateStorageKey(
      user.orgId,
      'PROJECT',
      report.projectId,
      'EVIDENCE',
      this.sanitizeFilename(file.originalname),
    );

    await this.storage.putObject(storageKey, file.buffer, file.mimetype);

    const fileAsset = await this.prisma.fileAsset.create({
      data: {
        orgId: user.orgId,
        scopeType: FileScopeType.PROJECT,
        projectId: report.projectId,
        uploaderId: user.id,
        category: FileCategory.EVIDENCE,
        visibility,
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey,
      },
    });

    const media = await this.prisma.projectReportEntryMedia.create({
      data: {
        entryId,
        fileAssetId: fileAsset.id,
        mediaType: this.detectMediaType(file.mimetype),
        caption: caption?.trim() || null,
        sortOrder: entry.media.length,
      },
      include: {
        fileAsset: true,
      },
    });

    await this.logActivity({
      orgId: user.orgId,
      projectId: report.projectId,
      userId: user.id,
      action: 'project-report.media-uploaded',
      entityType: 'project_report_media',
      entityId: media.id,
      description: `Evidence "${file.originalname}" uploaded to report "${report.title}".`,
      metadata: { reportId, entryId, mediaType: media.mediaType },
    });

    return media;
  }

  async deleteProjectReportEntryMedia(
    reportId: string,
    entryId: string,
    mediaId: string,
    user: UserWithRoles,
  ) {
    const entry = await this.ensureProjectReportEntryAccess(reportId, entryId, user);
    const media = await this.prisma.projectReportEntryMedia.findFirst({
      where: {
        id: mediaId,
        entryId,
        entry: {
          projectReportId: reportId,
          orgId: user.orgId,
        },
      },
      include: {
        fileAsset: true,
      },
    });
    if (!media) throw new NotFoundException('Project report media not found');

    await this.storage.deleteObject(media.fileAsset.storageKey);
    await this.prisma.$transaction([
      this.prisma.projectReportEntryMedia.delete({
        where: { id: mediaId },
      }),
      this.prisma.fileAsset.delete({
        where: { id: media.fileAssetId },
      }),
    ]);

    await this.logActivity({
      orgId: user.orgId,
      projectId: entry.projectReport.projectId,
      userId: user.id,
      action: 'project-report.media-deleted',
      entityType: 'project_report_media',
      entityId: media.id,
      description: `Evidence "${media.fileAsset.filename}" removed from project report.`,
      metadata: { reportId, entryId, mediaId },
    });

    return { success: true };
  }

  async getProjectReportPreview(reportId: string, user: UserWithRoles) {
    const html = await this.renderProjectReportHtml(reportId, user);
    return { html };
  }

  async generateProjectReportAiSummary(reportId: string, user: UserWithRoles) {
    const accessibleReport = await this.ensureProjectReportAccess(reportId, user);
    const entryCount = await this.prisma.projectReportEntry.count({
      where: { orgId: user.orgId, projectReportId: reportId, deletedAt: null },
    });
    if (entryCount === 0) {
      throw new BadRequestException('Add at least one report entry before generating AI summary');
    }
    const narratives = await this.aiService.generateProjectReportNarratives(reportId, user.orgId);
    const report = await this.prisma.projectReport.update({
      where: { id: reportId },
      data: {
        summaryJson: narratives,
      },
      include: {
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await this.logActivity({
      orgId: user.orgId,
      projectId: accessibleReport.projectId,
      userId: user.id,
      action: 'project-report.ai-summary-generated',
      entityType: 'project_report',
      entityId: report.id,
      description: `AI summary generated for project report "${report.title}".`,
      metadata: { reportId: report.id, entryCount },
    });
    return { report, narratives };
  }

  async listClientVisibleReports(user: UserWithRoles) {
    return this.prisma.projectReport.findMany({
      where: {
        orgId: user.orgId,
        deletedAt: null,
        visibility: 'CLIENT',
        status: 'PUBLISHED',
        project: ScopeUtils.projectScope(user),
      },
      include: {
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        template: true,
        templateVersion: true,
        performedBy: { select: { id: true, name: true, email: true, role: true } },
        exports: {
          include: { fileAsset: true },
          orderBy: { exportVersion: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async getLatestProjectReportExportDownload(reportId: string, user: UserWithRoles) {
    await this.ensureProjectReportAccess(reportId, user);
    const latestExport = await this.prisma.projectReportExport.findFirst({
      where: {
        projectReportId: reportId,
        orgId: user.orgId,
      },
      include: {
        fileAsset: true,
      },
      orderBy: { exportVersion: 'desc' },
    });
    if (!latestExport?.fileAsset) throw new NotFoundException('No exported file available');
    return {
      url: await this.storage.getSignedUrl(latestExport.fileAsset.storageKey, 3600, true),
      exportVersion: latestExport.exportVersion,
    };
  }

  async exportProjectReportPdf(reportId: string, user: UserWithRoles) {
    const { report } = await this.buildProjectReportPreviewData(reportId, user);
    const html = await this.renderProjectReportHtml(reportId, user);
    const browser = await this.launchPdfBrowser();

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '12mm',
          right: '12mm',
          bottom: '12mm',
          left: '12mm',
        },
      });

      const pdfFilename = `${this.sanitizeFilename(report.title || 'project-report')}.pdf`;
      const storageKey = this.storage.generateStorageKey(
        user.orgId,
        'PROJECT',
        report.projectId,
        'DOCS',
        pdfFilename,
      );
      await this.storage.putObject(storageKey, Buffer.from(pdfBuffer), 'application/pdf');

      const fileAsset = await this.prisma.fileAsset.create({
        data: {
          orgId: user.orgId,
          scopeType: FileScopeType.PROJECT,
          projectId: report.projectId,
          uploaderId: user.id,
          category: FileCategory.DOCS,
          visibility: report.visibility === 'CLIENT' ? 'CLIENT' : 'INTERNAL',
          filename: pdfFilename,
          mimeType: 'application/pdf',
          sizeBytes: pdfBuffer.length,
          storageKey,
        },
      });

      const latestExport = await this.prisma.projectReportExport.findFirst({
        where: { projectReportId: reportId, orgId: user.orgId },
        orderBy: { exportVersion: 'desc' },
        select: { exportVersion: true },
      });

      const exportRecord = await this.prisma.projectReportExport.create({
        data: {
          orgId: user.orgId,
          projectReportId: reportId,
          format: 'PDF',
          fileAssetId: fileAsset.id,
          exportVersion: (latestExport?.exportVersion ?? 0) + 1,
          generatedById: user.id,
        },
        include: {
          fileAsset: true,
        },
      });

      await this.logActivity({
        orgId: user.orgId,
        projectId: report.projectId,
        userId: user.id,
        action: 'project-report.exported',
        entityType: 'project_report_export',
        entityId: exportRecord.id,
        description: `PDF export v${exportRecord.exportVersion} generated for report "${report.title}".`,
        metadata: { reportId, exportVersion: exportRecord.exportVersion, visibility: report.visibility },
      });

      return {
        export: exportRecord,
        downloadUrl: await this.storage.getSignedUrl(storageKey, 3600, true),
      };
    } finally {
      await browser.close();
    }
  }
}
