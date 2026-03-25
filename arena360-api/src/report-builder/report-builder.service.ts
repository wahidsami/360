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
import {
  ACCESSIBILITY_AUDIT_CATEGORIES,
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES,
} from './accessibility-audit.config';
import { FileCategory, FileScopeType, FileVisibility, ProjectReportMediaType } from '@prisma/client';

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);
  private readonly canonicalAccessibilityTemplateCode = 'accessibility-audit';

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

  private accessibilityTemplateWhere(orgId: string) {
    return {
      orgId,
      category: 'ACCESSIBILITY' as const,
      code: this.canonicalAccessibilityTemplateCode,
    };
  }

  private normalizePreviewLocale(locale?: string | null): 'en' | 'ar' | undefined {
    if (!locale) return undefined;
    return String(locale).toLowerCase().startsWith('ar') ? 'ar' : 'en';
  }

  private resolvePreviewDirection(locale: 'en' | 'ar'): 'ltr' | 'rtl' {
    return locale === 'ar' ? 'rtl' : 'ltr';
  }

  private getAllowedAccessibilityTaxonomy(version?: { taxonomyJson?: any } | null) {
    const rawCategories = Array.isArray(version?.taxonomyJson?.accessibilityCategories)
      ? version?.taxonomyJson?.accessibilityCategories
      : [];
    const selectedCategories = rawCategories
      .map((item: any) => (typeof item === 'string' ? item : item?.value))
      .filter((value: any): value is string => typeof value === 'string' && value.trim().length > 0);

    const categories: string[] = selectedCategories.length > 0 ? selectedCategories : [...ACCESSIBILITY_AUDIT_MAIN_CATEGORIES];

    const subcategorySource = version?.taxonomyJson?.accessibilitySubcategories || {};
    const subcategories: Record<string, string[]> = {};

    categories.forEach((category: string) => {
      const rawItems = Array.isArray(subcategorySource?.[category]) ? subcategorySource[category] : [];
      const selected = rawItems
        .map((item: any) => (typeof item === 'string' ? item : item?.value))
        .filter((value: any): value is string => typeof value === 'string' && value.trim().length > 0);

      subcategories[category] =
        selected.length > 0
          ? selected
          : [...(ACCESSIBILITY_AUDIT_CATEGORIES[category as keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES] || [])];
    });

    return { categories, subcategories };
  }

  private validateAccessibilityEntryInput(
    report: { template?: { category?: string | null }; templateVersion?: { taxonomyJson?: any } | null },
    input: {
      serviceName?: string | null;
      issueTitle?: string | null;
      issueDescription?: string | null;
      severity?: string | null;
      category?: string | null;
      subcategory?: string | null;
      pageUrl?: string | null;
      recommendation?: string | null;
    },
  ) {
    if (report.template?.category !== 'ACCESSIBILITY') return;

    if (!input.serviceName?.trim()) {
      throw new BadRequestException('Service name is required for accessibility findings.');
    }
    if (!input.issueTitle?.trim()) {
      throw new BadRequestException('Issue title is required for accessibility findings.');
    }
    if (!input.issueDescription?.trim()) {
      throw new BadRequestException('Issue description is required for accessibility findings.');
    }
    if (!input.severity) {
      throw new BadRequestException('Severity is required for accessibility findings.');
    }
    if (!input.category?.trim()) {
      throw new BadRequestException('Main category is required for accessibility findings.');
    }
    if (!input.subcategory?.trim()) {
      throw new BadRequestException('Subcategory is required for accessibility findings.');
    }
    if (!input.pageUrl?.trim()) {
      throw new BadRequestException('Page URL is required for accessibility findings.');
    }
    if (!input.recommendation?.trim()) {
      throw new BadRequestException('Recommendations are required for accessibility findings.');
    }

    if (input.severity === 'CRITICAL') {
      throw new BadRequestException('Accessibility findings support HIGH, MEDIUM, or LOW severity only.');
    }

    const category = input.category?.trim();
    const subcategory = input.subcategory?.trim();

    if (!category && subcategory) {
      throw new BadRequestException('Select a main category before choosing a subcategory.');
    }

    const allowedTaxonomy = this.getAllowedAccessibilityTaxonomy(report.templateVersion);

    if (category && !allowedTaxonomy.categories.includes(category)) {
      throw new BadRequestException('Category must match the accessibility audit category list.');
    }

    if (subcategory) {
      const allowedSubcategories: string[] = category ? [...(allowedTaxonomy.subcategories[category] || [])] : [];

      if (!allowedSubcategories.includes(subcategory)) {
        throw new BadRequestException('Subcategory must match the selected accessibility audit category.');
      }
    }
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
    if (!template) throw new NotFoundException('Accessibility tool not found');
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
      CRITICAL: '\u062D\u0631\u062C\u0629',
      HIGH: '\u0639\u0627\u0644\u064A\u0629',
      MEDIUM: '\u0645\u062A\u0648\u0633\u0637\u0629',
      LOW: '\u0645\u0646\u062E\u0641\u0636\u0629',
    };
    return labels[severity || 'LOW'] || '\u0645\u0646\u062E\u0641\u0636\u0629';
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

  private normalizeDisplayText(value?: string | null) {
    if (!value) return '';
    if (!/[??]/.test(value)) return value;
    try {
      const decoded = Buffer.from(value, 'latin1').toString('utf8');
      return /[\u0600-\u06FF]/.test(decoded) ? decoded : value;
    } catch {
      return value;
    }
  }

  private getTemplateLocale(version?: { schemaJson?: any; pdfConfigJson?: any } | null) {
    const schemaLocale = String(version?.schemaJson?.locale?.primary || version?.pdfConfigJson?.locale || 'en').toLowerCase();
    const direction = String(
      version?.schemaJson?.locale?.direction ||
        version?.pdfConfigJson?.direction ||
        (schemaLocale.startsWith('ar') ? 'rtl' : 'ltr'),
    ).toLowerCase();

    return {
      locale: schemaLocale.startsWith('ar') ? 'ar' : 'en',
      direction: direction === 'ltr' ? 'ltr' : 'rtl',
    } as const;
  }

  private getPreviewLocaleConfig(
    version?: { schemaJson?: any; pdfConfigJson?: any } | null,
    localeOverride?: string,
  ) {
    const normalized = this.normalizePreviewLocale(localeOverride);
    if (!normalized) {
      return this.getTemplateLocale(version);
    }
    return {
      locale: normalized,
      direction: this.resolvePreviewDirection(normalized),
    } as const;
  }

  private getPreviewLabels(locale: 'ar' | 'en') {
    if (locale === 'en') {
      return {
        previewTag: 'Arena360 sample report',
        executiveInsights: 'Executive insights',
        introduction: 'Introduction',
        executiveSummary: 'Executive summary',
        recommendationSummary: 'Recommendation summary',
        findingsTag: 'Structured findings',
        findingsTitle: 'Findings table',
        noEntries: 'No findings have been added yet.',
        footerNote:
          'This preview is generated from the HTML export pipeline and mirrors the final PDF layout, including landscape print styling.',
        closingTag: 'End of report',
        closingTitle: 'Thank you',
        closingBody:
          'This report is generated from structured project findings and evidence. Share it with the client only after final review and approval.',
        client: 'Client',
        project: 'Project',
        template: 'Tool',
        performedBy: 'Performed by',
        totalIssues: 'Total issues',
        clickHere: 'Click here',
        viewImage: 'View Image',
        viewVideo: 'View Video',
        viewEvidence: 'View Evidence',
        sampleDescription:
          'This sample shows how the assigned accessibility tool will render once a project report is filled with findings, evidence, and AI-assisted summaries.',
      };
    }

    return {
      previewTag: '\u0645\u0639\u0627\u064A\u0646\u0629 \u062A\u0642\u0631\u064A\u0631 Arena360',
      executiveInsights: '\u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A',
      introduction: '\u0627\u0644\u0645\u0642\u062F\u0645\u0629',
      executiveSummary: '\u0627\u0644\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0646\u0641\u064A\u0630\u064A',
      recommendationSummary: '\u0645\u0644\u062E\u0635 \u0627\u0644\u062A\u0648\u0635\u064A\u0627\u062A',
      findingsTag: '\u062C\u062F\u0648\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A',
      findingsTitle: '\u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A',
      noEntries: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0645\u0636\u0627\u0641\u0629 \u0628\u0639\u062F.',
      footerNote:
        '\u062A\u0639\u062A\u0645\u062F \u0647\u0630\u0647 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0639\u0644\u0649 \u0645\u0633\u0627\u0631 \u062A\u0635\u062F\u064A\u0631 HTML/PDF \u0646\u0641\u0633\u0647\u060C \u0644\u0630\u0644\u0643 \u0641\u0625\u0646 \u0627\u0644\u062A\u0631\u062A\u064A\u0628 \u0648\u0627\u0644\u062A\u0646\u0633\u064A\u0642 \u064A\u0639\u0643\u0633\u0627\u0646 \u0627\u0644\u0645\u062E\u0631\u062C \u0627\u0644\u0646\u0647\u0627\u0626\u064A.',
      closingTag: '\u062E\u0627\u062A\u0645\u0629 \u0627\u0644\u062A\u0642\u0631\u064A\u0631',
      closingTitle: '\u0634\u0643\u0631\u0627\u064B \u0644\u0643\u0645',
      closingBody:
        '\u062A\u0645 \u0625\u0639\u062F\u0627\u062F \u0647\u0630\u0627 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0639\u062A\u0645\u0627\u062F\u0627\u064B \u0639\u0644\u0649 \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0645\u0646\u0638\u0645\u0629 \u0648\u0623\u062F\u0644\u0629 \u0645\u0631\u0641\u0642\u0629. \u064A\u0646\u0628\u063A\u064A \u0645\u0631\u0627\u062C\u0639\u062A\u0647 \u0648\u0627\u0639\u062A\u0645\u0627\u062F\u0647 \u0642\u0628\u0644 \u0645\u0634\u0627\u0631\u0643\u062A\u0647 \u0645\u0639 \u0627\u0644\u0639\u0645\u064A\u0644.',
      client: '\u0627\u0644\u0639\u0645\u064A\u0644',
      project: '\u0627\u0644\u0645\u0634\u0631\u0648\u0639',
      template: '\u0627\u0644\u0623\u062F\u0627\u0629',
      performedBy: '\u062A\u0645 \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0628\u0648\u0627\u0633\u0637\u0629',
      totalIssues: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A',
      clickHere: '\u0627\u0636\u063A\u0637 \u0647\u0646\u0627',
      viewImage: '\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629',
      viewVideo: '\u0639\u0631\u0636 \u0627\u0644\u0641\u064A\u062F\u064A\u0648',
      viewEvidence: '\u0639\u0631\u0636 \u0627\u0644\u062F\u0644\u064A\u0644',
      sampleDescription:
        '\u062A\u0639\u0631\u0636 \u0647\u0630\u0647 \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0634\u0643\u0644 \u0627\u0644\u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0646\u0647\u0627\u0626\u064A \u0628\u0639\u062F \u0625\u062F\u062E\u0627\u0644 \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u0627\u0644\u0623\u062F\u0644\u0629 \u0648\u0627\u0644\u0645\u0644\u062E\u0635\u0627\u062A \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064A.',
    };
  }

  private getSchemaField(version: { schemaJson?: any } | null | undefined, key: string) {
    const entryFields = Array.isArray(version?.schemaJson?.entryFields) ? version?.schemaJson?.entryFields : [];
    return entryFields.find((field: any) => field?.key === key);
  }

  private getSchemaLabel(
    version: { schemaJson?: any } | null | undefined,
    key: string,
    locale: 'ar' | 'en',
    fallback: string,
  ) {
    const field = this.getSchemaField(version, key);
    const rawLabel = typeof field?.label === 'string' ? field.label : undefined;
    const rawLabelEn = typeof field?.labelEn === 'string' ? field.labelEn : undefined;
    const rawLabelAr = typeof field?.labelAr === 'string' ? field.labelAr : undefined;
    const looksArabic = (value?: string) => !!value && /[\u0600-\u06FF]/.test(value);
    const value =
      locale === 'en'
        ? rawLabelEn || (!looksArabic(rawLabel) ? rawLabel : undefined) || fallback
        : rawLabelAr || (looksArabic(rawLabel) ? rawLabel : undefined) || fallback;
    return this.normalizeDisplayText(String(value || fallback));
  }

  private buildSampleTemplatePreviewData(template: any, version: any, localeOverride?: string) {
    const { locale, direction } = this.getPreviewLocaleConfig(version, localeOverride);
    const labels = this.getPreviewLabels(locale);
    const categoryValue =
      version?.taxonomyJson?.accessibilityCategories?.[0]?.value || ACCESSIBILITY_AUDIT_MAIN_CATEGORIES[0];
    const subcategoryValue =
      version?.taxonomyJson?.accessibilitySubcategories?.[categoryValue]?.[0]?.value ||
      ACCESSIBILITY_AUDIT_CATEGORIES[categoryValue as keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES]?.[0] ||
      '';
    const sampleImage =
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#f4e6ea" rx="18" /><rect x="24" y="28" width="272" height="18" fill="#8a1538" opacity="0.18" rx="9" /><rect x="24" y="64" width="184" height="14" fill="#8a1538" opacity="0.12" rx="7" /><rect x="24" y="90" width="220" height="14" fill="#8a1538" opacity="0.08" rx="7" /><rect x="24" y="132" width="112" height="32" fill="#8a1538" opacity="0.16" rx="10" /><text x="160" y="182" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" fill="#6b7280">Sample evidence</text></svg>',
      );

    const projectName = locale === 'ar' ? '\u0645\u0634\u0631\u0648\u0639 \u062A\u062C\u0631\u064A\u0628\u064A \u0644\u0644\u0648\u0635\u0648\u0644' : 'Accessibility Pilot Project';
    const clientName = locale === 'ar' ? '\u0639\u0645\u064A\u0644 \u062A\u062C\u0631\u064A\u0628\u064A' : 'Sample Client';
    const performerName = locale === 'ar' ? '\u0641\u0631\u064A\u0642 \u0627\u0644\u062C\u0648\u062F\u0629' : 'QA Team';
    const reportTitle =
      locale === 'ar'
        ? this.normalizeDisplayText(template.name) + ' - ' + '\u0645\u0639\u0627\u064A\u0646\u0629 \u062A\u062C\u0631\u064A\u0628\u064A\u0629'
        : this.normalizeDisplayText(template.name) + ' - Sample Preview';

    return {
      report: {
        title: reportTitle,
        description: labels.sampleDescription,
        client: { name: clientName, logo: null },
        project: { name: projectName },
        template: { name: this.normalizeDisplayText(template.name) },
        templateVersion: version,
        performedBy: { name: performerName },
        summaryJson: {
          introduction:
            locale === 'ar'
              ? '\u064A\u0642\u062F\u0645 \u0647\u0630\u0627 \u0627\u0644\u0642\u0627\u0644\u0628 \u0645\u0644\u062E\u0635\u0627\u064B \u0648\u0627\u0636\u062D\u0627\u064B \u0644\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0648\u064A\u0631\u0627\u0639\u064A \u0627\u0644\u0625\u062E\u0631\u0627\u062C \u0627\u0644\u0639\u0631\u0628\u064A \u0628\u0627\u062A\u062C\u0627\u0647 RTL.'
              : 'This tool preview demonstrates the final report layout with a polished cover, evidence handling, and structured findings.',
          executiveSummary:
            locale === 'ar'
              ? '\u064A\u0645\u0643\u0646 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0642\u0627\u0644\u0628 \u0642\u0628\u0644 \u062A\u0639\u064A\u064A\u0646\u0647 \u0644\u0644\u0639\u0645\u064A\u0644 \u0644\u0636\u0645\u0627\u0646 \u0623\u0646 \u0634\u0643\u0644 \u0627\u0644\u062A\u0635\u062F\u064A\u0631 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A.'
              : 'Admins can review the output here before assigning the tool to a client, so the exported PDF style is predictable.',
          recommendationsSummary:
            locale === 'ar'
              ? '\u064A\u0633\u062A\u0639\u0645\u0644 \u0647\u0630\u0627 \u0627\u0644\u0645\u062E\u0631\u062C \u0627\u0644\u0645\u0639\u0627\u064A\u0646\u0629 \u0628\u064A\u0627\u0646\u0627\u062A \u062A\u062C\u0631\u064A\u0628\u064A\u0629\u060C \u0623\u0645\u0627 \u0627\u0644\u062A\u0642\u0627\u0631\u064A\u0631 \u0627\u0644\u0641\u0639\u0644\u064A\u0629 \u0641\u062A\u0623\u062E\u0630 \u0645\u0646 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0634\u0631\u0648\u0639 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629.'
              : 'This sample uses mock data only. Real project reports will render with live findings, evidence, and AI-assisted summaries.',
        },
      },
      entries: [
        {
          serviceName: locale === 'ar' ? '\u0634\u0627\u0634\u0629 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644' : 'Login Screen',
          issueTitle: locale === 'ar' ? '\u063A\u064A\u0627\u0628 \u062A\u0633\u0645\u064A\u0627\u062A \u0648\u0627\u0636\u062D\u0629 \u0644\u0644\u062D\u0642\u0648\u0644' : 'Missing clear field labels',
          issueDescription:
            locale === 'ar'
              ? '\u0627\u0644\u062D\u0642\u0648\u0644 \u0627\u0644\u0623\u0633\u0627\u0633\u064A\u0629 \u0644\u0627 \u062A\u062D\u0645\u0644 \u0623\u0648\u0635\u0627\u0641\u064B\u0627 \u0628\u0635\u0631\u064A\u0629 \u0623\u0648 \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0642\u0631\u0627\u0621\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 \u0642\u0627\u0631\u0626 \u0627\u0644\u0634\u0627\u0634\u0629.'
              : 'Primary fields do not expose clear visual or assistive labels for screen reader users.',
          severity: 'HIGH',
          category: categoryValue,
          subcategory: subcategoryValue,
          pageUrl: 'https://example.com/login',
          recommendation:
            locale === 'ar'
              ? '\u0623\u0636\u0641 \u062A\u0633\u0645\u064A\u0627\u062A \u0635\u0631\u064A\u062D\u0629 \u0648\u0623\u0648\u0635\u0627\u0641 aria-label \u0645\u0646\u0627\u0633\u0628\u0629 \u0644\u0643\u0644 \u062D\u0642\u0644.'
              : 'Add explicit field labels and matching aria-label attributes for each input.',
          media: [
            {
              id: 'sample-image-1',
              mediaType: 'IMAGE',
              signedUrl: sampleImage,
              fileAsset: {
                filename: locale === 'ar' ? '\u062F\u0644\u064A\u0644-\u0628\u0635\u0631\u064A-\u0639\u064A\u0646\u0629.png' : 'sample-evidence.png',
              },
            },
          ],
        },
      ],
      locale,
      direction,
    };
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

  private renderReportHtml(previewData: { report: any; entries: any[]; locale?: 'ar' | 'en'; direction?: 'rtl' | 'ltr' }) {
    const { report, entries } = previewData;
    const localeConfig =
      previewData.locale && previewData.direction
        ? { locale: previewData.locale, direction: previewData.direction }
        : this.getTemplateLocale(report?.templateVersion);
    const labels = this.getPreviewLabels(localeConfig.locale);
    const summary = (report.summaryJson || {}) as Record<string, string>;
    const severityCounts = [
      { label: labels.totalIssues, count: entries.length, severity: null },
      { label: this.severityLabel('HIGH'), count: entries.filter((entry) => entry.severity === 'HIGH').length, severity: 'HIGH' },
      { label: this.severityLabel('MEDIUM'), count: entries.filter((entry) => entry.severity === 'MEDIUM').length, severity: 'MEDIUM' },
      { label: this.severityLabel('LOW'), count: entries.filter((entry) => entry.severity === 'LOW').length, severity: 'LOW' },
    ];
    const schemaVersion = report.templateVersion;
    const serviceHeader = this.getSchemaLabel(schemaVersion, 'serviceName', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0627\u0633\u0645 \u0627\u0644\u062E\u062F\u0645\u0629' : 'Service Name');
    const issueTitleHeader = this.getSchemaLabel(schemaVersion, 'issueTitle', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u0634\u0643\u0644\u0629' : 'Issue Title');
    const severityHeader = this.getSchemaLabel(schemaVersion, 'severity', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0627\u0644\u0623\u0647\u0645\u064A\u0629' : 'Severity');
    const categoryHeader = this.getSchemaLabel(schemaVersion, 'category', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0631\u0626\u064A\u0633\u064A' : 'Main Category');
    const subcategoryHeader = this.getSchemaLabel(schemaVersion, 'subcategory', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0627\u0644\u062A\u0635\u0646\u064A\u0641 \u0627\u0644\u0641\u0631\u0639\u064A' : 'Subcategory');
    const pageUrlHeader = this.getSchemaLabel(schemaVersion, 'pageUrl', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062D\u0629' : 'Page URL');
    const evidenceHeader = this.getSchemaLabel(schemaVersion, 'evidence', localeConfig.locale, localeConfig.locale === 'ar' ? '\u0627\u0644\u0623\u062F\u0644\u0629' : 'Evidence');

    const tableRows = entries
      .map((entry, index) => {
        const mediaItems = Array.isArray(entry.media) ? entry.media : [];
        const mediaHtml = mediaItems.length
          ? mediaItems
              .map((media: any) => {
                const fileName = this.escapeHtml(
                  this.normalizeDisplayText(media.fileAsset.filename || media.fileAsset.name || labels.viewEvidence),
                );
                const actionLabel =
                  media.mediaType === 'IMAGE'
                    ? labels.viewImage
                    : media.mediaType === 'VIDEO'
                      ? labels.viewVideo
                      : labels.viewEvidence;
                if (media.mediaType === 'IMAGE') {
                  return (
                    '<div class="evidence evidence-image">' +
                    '<img src="' + media.signedUrl + '" alt="' + fileName + '" />' +
                    '<a href="' + media.signedUrl + '" target="_blank" rel="noreferrer">' + this.escapeHtml(actionLabel) + '</a>' +
                    '</div>'
                  );
                }
                return (
                  '<div class="evidence evidence-link">' +
                  '<a href="' + media.signedUrl + '" target="_blank" rel="noreferrer">' + this.escapeHtml(actionLabel) + '</a>' +
                  '</div>'
                );
              })
              .join('')
          : '<span class="muted">-</span>';

        const pageUrlHtml = entry.pageUrl
          ? '<a href="' + this.escapeHtml(entry.pageUrl) + '" target="_blank" rel="noreferrer">' + this.escapeHtml(labels.clickHere) + '</a>'
          : '<span class="muted">-</span>';

        const serviceName = this.normalizeDisplayText(entry.serviceName);
        const issueTitle = this.normalizeDisplayText(entry.issueTitle);
        const issueDescription = this.normalizeDisplayText(entry.issueDescription);
        const category = this.normalizeDisplayText(entry.category);
        const subcategory = this.normalizeDisplayText(entry.subcategory);

        return (
          '<tr>' +
          '<td>' + (index + 1) + '</td>' +
          '<td>' + (this.escapeHtml(serviceName) || '<span class="muted">-</span>') + '</td>' +
          '<td><strong>' + this.escapeHtml(issueTitle) + '</strong>' +
          (issueDescription ? '<div class="cell-note">' + this.escapeHtml(issueDescription) + '</div>' : '') + '</td>' +
          '<td><span class="severity severity-' + ((entry.severity || 'LOW').toLowerCase()) + '">' + this.escapeHtml(this.severityLabel(entry.severity)) + '</span></td>' +
          '<td>' + (this.escapeHtml(category) || '<span class="muted">-</span>') + '</td>' +
          '<td>' + (this.escapeHtml(subcategory) || '<span class="muted">-</span>') + '</td>' +
          '<td>' + pageUrlHtml + '</td>' +
          '<td>' + mediaHtml + '</td>' +
          '</tr>'
        );
      })
      .join('');

    const summaryCards = severityCounts
      .map(
        (item) =>
          '<div class="summary-card ' + (item.severity ? 'summary-' + item.severity.toLowerCase() : 'summary-total') + '">' +
          '<div class="summary-value">' + item.count + '</div>' +
          '<div class="summary-label">' + this.escapeHtml(item.label) + '</div>' +
          '</div>',
      )
      .join('');

    const summarySection =
      summary.introduction || summary.executiveSummary || summary.recommendationsSummary
        ? '<section class="section">' +
          '<div class="eyebrow">' + this.escapeHtml(labels.executiveInsights) + '</div>' +
          '<h2>' + this.escapeHtml(labels.executiveSummary) + '</h2>' +
          (summary.introduction
            ? '<div class="summary-block"><h3>' + this.escapeHtml(labels.introduction) + '</h3><p>' + this.escapeHtml(this.normalizeDisplayText(summary.introduction)).replace(/\n/g, '<br />') + '</p></div>'
            : '') +
          (summary.executiveSummary
            ? '<div class="summary-block"><h3>' + this.escapeHtml(labels.executiveSummary) + '</h3><p>' + this.escapeHtml(this.normalizeDisplayText(summary.executiveSummary)).replace(/\n/g, '<br />') + '</p></div>'
            : '') +
          (summary.recommendationsSummary
            ? '<div class="summary-block"><h3>' + this.escapeHtml(labels.recommendationSummary) + '</h3><p>' + this.escapeHtml(this.normalizeDisplayText(summary.recommendationsSummary)).replace(/\n/g, '<br />') + '</p></div>'
            : '') +
          '</section>'
        : '';

    const coverDescription =
      this.escapeHtml(this.normalizeDisplayText(report.description)) || this.escapeHtml(labels.sampleDescription);

    return (
      '<!doctype html>' +
      '<html lang="' + localeConfig.locale + '" dir="' + localeConfig.direction + '">' +
      '<head>' +
      '<meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
      '<title>' + this.escapeHtml(this.normalizeDisplayText(report.title)) + '</title>' +
      '<style>' +
      ':root {--bg: #f6f2ec;--panel: #ffffff;--ink: #2d1b0f;--muted: #6b7280;--accent: #8a1538;--border: #eadfd4;--accent-soft: #f4e6ea;}' +
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
      '.summary-total { background: #f3f4f6; }' +
      '.summary-value { font-size: 30px; font-weight: 800; color: var(--accent); }' +
      '.summary-label { margin-top: 8px; font-size: 13px; color: var(--muted); }' +
      'table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 13px; }' +
      'th, td { border: 1px solid #e5e7eb; padding: 12px; vertical-align: top; }' +
      'th { background: var(--accent); color: #ffffff; font-size: 12px; }' +
      'td { background: #ffffff; }' +
      '.cell-note { margin-top: 8px; color: var(--muted); font-size: 12px; line-height: 1.6; }' +
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
      '<div class="eyebrow">' + this.escapeHtml(labels.previewTag) + '</div>' +
      '<h1>' + this.escapeHtml(this.normalizeDisplayText(report.title)) + '</h1>' +
      '</div>' +
      (report.client.logo ? '<img src="' + this.escapeHtml(report.client.logo) + '" alt="' + this.escapeHtml(this.normalizeDisplayText(report.client.name)) + '" />' : '') +
      '</div>' +
      '<p class="cover-lead">' + coverDescription + '</p>' +
      '<div class="meta">' +
      '<span>' + this.escapeHtml(labels.client) + ': ' + this.escapeHtml(this.normalizeDisplayText(report.client.name)) + '</span>' +
      '<span>' + this.escapeHtml(labels.project) + ': ' + this.escapeHtml(this.normalizeDisplayText(report.project.name)) + '</span>' +
      '<span>' + this.escapeHtml(labels.template) + ': ' + this.escapeHtml(this.normalizeDisplayText(report.template.name)) + ' / v' + report.templateVersion.versionNumber + '</span>' +
      '<span>' + this.escapeHtml(labels.performedBy) + ': ' + this.escapeHtml(this.normalizeDisplayText(report.performedBy?.name || 'Unknown')) + '</span>' +
      '</div>' +
      '<div class="summary-grid">' + summaryCards + '</div>' +
      '</section>' +
      summarySection +
      '<section class="section">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.findingsTag) + '</div>' +
      '<h2>' + this.escapeHtml(labels.findingsTitle) + '</h2>' +
      '<table><thead><tr>' +
      '<th style="width: 5%">ID</th>' +
      '<th style="width: 12%">' + this.escapeHtml(serviceHeader) + '</th>' +
      '<th style="width: 22%">' + this.escapeHtml(issueTitleHeader) + '</th>' +
      '<th style="width: 9%">' + this.escapeHtml(severityHeader) + '</th>' +
      '<th style="width: 12%">' + this.escapeHtml(categoryHeader) + '</th>' +
      '<th style="width: 15%">' + this.escapeHtml(subcategoryHeader) + '</th>' +
      '<th style="width: 10%">' + this.escapeHtml(pageUrlHeader) + '</th>' +
      '<th style="width: 15%">' + this.escapeHtml(evidenceHeader) + '</th>' +
      '</tr></thead><tbody>' +
      (tableRows || '<tr><td colspan="8" class="muted">' + this.escapeHtml(labels.noEntries) + '</td></tr>') +
      '</tbody></table>' +
      '<p class="footer-note">' + this.escapeHtml(labels.footerNote) + '</p>' +
      '</section>' +
      '<section class="section closing">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.closingTag) + '</div>' +
      '<h2>' + this.escapeHtml(labels.closingTitle) + '</h2>' +
      '<p>' + this.escapeHtml(labels.closingBody) + '</p>' +
      '</section>' +
      '</div>' +
      '</body>' +
      '</html>'
    );
  }

  private async renderProjectReportHtml(reportId: string, user: UserWithRoles, localeOverride?: string) {
    const previewData = await this.buildProjectReportPreviewData(reportId, user);
    const localeConfig = this.getPreviewLocaleConfig(previewData.report?.templateVersion, localeOverride);
    return this.renderReportHtml({
      ...previewData,
      locale: localeConfig.locale,
      direction: localeConfig.direction,
    });
  }

  async getTemplateVersionSamplePreview(orgId: string, templateId: string, versionId: string, localeOverride?: string) {
    const template = await this.ensureTemplateInOrg(templateId, orgId);
    const version = await this.prisma.reportBuilderTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!version) throw new NotFoundException('Tool version not found');

    const samplePreview = this.buildSampleTemplatePreviewData(template, version, localeOverride);
    return { html: this.renderReportHtml(samplePreview) };
  }

  async listTemplates(orgId: string) {
    return this.prisma.reportBuilderTemplate.findMany({
      where: this.accessibilityTemplateWhere(orgId),
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
    const code = this.canonicalAccessibilityTemplateCode;
    if (!code) throw new BadRequestException('Template code is required');
    const existing = await this.prisma.reportBuilderTemplate.findFirst({
      where: this.accessibilityTemplateWhere(orgId),
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('The accessibility tool already exists. Create a new version instead.');
    }
    const template = await this.prisma.reportBuilderTemplate.create({
      data: {
        orgId,
        name: dto.name.trim() || 'Accessibility Audit',
        code,
        description: dto.description?.trim(),
        category: 'ACCESSIBILITY',
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
      description: `Accessibility tool "${template.name}" created.`,
      metadata: { templateId: template.id, code: template.code, category: template.category },
    });
    return template;
  }

  async updateTemplate(orgId: string, id: string, dto: UpdateReportBuilderTemplateDto, user?: UserWithRoles) {
    const current = await this.ensureTemplateInOrg(id, orgId);
    if (current.code !== this.canonicalAccessibilityTemplateCode) {
      throw new BadRequestException('Only the canonical accessibility tool is available in this flow.');
    }
    const template = await this.prisma.reportBuilderTemplate.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name.trim() }),
        code: this.canonicalAccessibilityTemplateCode,
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.status != null && { status: dto.status }),
      },
    });
    await this.logActivity({
      orgId,
      userId: user?.id || current.createdById || 'system',
      action: 'report-template.updated',
      entityType: 'report_template',
      entityId: template.id,
      description: `Accessibility tool "${template.name}" updated.`,
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
    if (template.category !== 'ACCESSIBILITY') {
      throw new BadRequestException('Only accessibility tools are supported in the simplified audit flow.');
    }
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
      description: `Version ${version.versionNumber} created for tool "${template.name}".`,
      metadata: { templateId, versionNumber: version.versionNumber },
    });
    return version;
  }

  async publishTemplateVersion(orgId: string, templateId: string, versionId: string, user: UserWithRoles) {
    await this.ensureTemplateInOrg(templateId, orgId);
    const version = await this.prisma.reportBuilderTemplateVersion.findFirst({
      where: { id: versionId, templateId },
    });
    if (!version) throw new NotFoundException('Tool version not found');

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
      description: `Version ${version.versionNumber} published for the accessibility tool.`,
      metadata: { templateId, versionId, versionNumber: version.versionNumber },
    });

    return publishedVersion;
  }

  async listClientAssignments(orgId: string, clientId: string) {
    await this.ensureClientInOrg(clientId, orgId);
    return this.prisma.clientReportTemplateAssignment.findMany({
      where: {
        orgId,
        clientId,
        template: {
          code: this.canonicalAccessibilityTemplateCode,
          category: 'ACCESSIBILITY',
        },
      },
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
    if (!version) throw new NotFoundException('Published tool version not found');

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
      description: `Accessibility tool "${assignment.template.name}" assigned to client.`,
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
    if (!assignment) throw new NotFoundException('Client tool assignment not found');

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
        description: `Client tool assignment updated for "${updated.template.name}".`,
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
        template: {
          code: this.canonicalAccessibilityTemplateCode,
          category: 'ACCESSIBILITY',
        },
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
        template: {
          code: this.canonicalAccessibilityTemplateCode,
          category: 'ACCESSIBILITY',
        },
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
      throw new ForbiddenException('Tool version is not assigned to this project client');
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
      description: `Project report "${report.title}" created from tool "${report.template.name}".`,
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
    this.validateAccessibilityEntryInput(report, dto);
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
    this.validateAccessibilityEntryInput(report, {
      serviceName: dto.serviceName ?? entry.serviceName,
      issueTitle: dto.issueTitle ?? entry.issueTitle,
      issueDescription: dto.issueDescription ?? entry.issueDescription,
      severity: dto.severity ?? entry.severity,
      category: dto.category ?? entry.category,
      subcategory: dto.subcategory ?? entry.subcategory,
      pageUrl: dto.pageUrl ?? entry.pageUrl,
      recommendation: dto.recommendation ?? entry.recommendation,
    });

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

  async getProjectReportPreview(reportId: string, user: UserWithRoles, localeOverride?: string) {
    const html = await this.renderProjectReportHtml(reportId, user, localeOverride);
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
        template: {
          code: this.canonicalAccessibilityTemplateCode,
          category: 'ACCESSIBILITY',
        },
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

  async exportProjectReportPdf(reportId: string, user: UserWithRoles, localeOverride?: string) {
    const { report } = await this.buildProjectReportPreviewData(reportId, user);
    const localeConfig = this.getPreviewLocaleConfig(report.templateVersion, localeOverride);
    const html = await this.renderProjectReportHtml(reportId, user, localeOverride);
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

      const localeSuffix = localeConfig.locale === 'ar' ? '-ar' : '-en';
      const pdfFilename = `${this.sanitizeFilename(report.title || 'project-report')}${localeSuffix}.pdf`;
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
