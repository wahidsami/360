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

  private normalizeAccessibilityToken(value?: string | null) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private normalizeAccessibilityCategory(value?: string | null) {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const directMatch = ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.find((category) => category === trimmed);
    if (directMatch) return directMatch;

    const normalized = this.normalizeAccessibilityToken(trimmed);
    const aliasMap: Record<string, string> = {
      content: 'Content',
      images: 'Images',
      color: 'Color & Contrast',
      contrast: 'Color & Contrast',
      'color-contrast': 'Color & Contrast',
      'colour-contrast': 'Color & Contrast',
      navigation: 'Keyboard & Navigation',
      keyboard: 'Keyboard & Navigation',
      'keyboard-navigation': 'Keyboard & Navigation',
      'keyboard-and-navigation': 'Keyboard & Navigation',
      forms: 'Forms & Inputs',
      inputs: 'Forms & Inputs',
      'forms-inputs': 'Forms & Inputs',
      'forms-and-inputs': 'Forms & Inputs',
      multimedia: 'Multimedia',
      touch: 'Touch & Mobile',
      mobile: 'Touch & Mobile',
      'touch-mobile': 'Touch & Mobile',
      'touch-and-mobile': 'Touch & Mobile',
      structure: 'Structure & Semantics',
      semantics: 'Structure & Semantics',
      'structure-semantics': 'Structure & Semantics',
      'structure-and-semantics': 'Structure & Semantics',
      timing: 'Timing & Interaction',
      interaction: 'Timing & Interaction',
      'timing-interaction': 'Timing & Interaction',
      'timing-and-interaction': 'Timing & Interaction',
      assistive: 'Assistive Technology',
      technology: 'Assistive Technology',
      'assistive-technology': 'Assistive Technology',
      authentication: 'Authentication & Security',
      security: 'Authentication & Security',
      'authentication-security': 'Authentication & Security',
      'authentication-and-security': 'Authentication & Security',
    };

    if (aliasMap[normalized]) return aliasMap[normalized];

    return (
      ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.find(
        (category) => this.normalizeAccessibilityToken(category) === normalized,
      ) || null
    );
  }

  private normalizeAccessibilitySubcategory(category: string, value?: string | null) {
    const trimmed = value?.trim();
    if (!trimmed) return null;

    const options = ACCESSIBILITY_AUDIT_CATEGORIES[category as keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES] || [];
    const directMatch = options.find((option) => option === trimmed);
    if (directMatch) return directMatch;

    const normalized = this.normalizeAccessibilityToken(trimmed);
    return options.find((option) => this.normalizeAccessibilityToken(option) === normalized) || null;
  }

  private getAllowedAccessibilityTaxonomy(version?: { taxonomyJson?: any } | null) {
    const rawCategories = Array.isArray(version?.taxonomyJson?.accessibilityCategories)
      ? version?.taxonomyJson?.accessibilityCategories
      : [];
    const selectedCategories = rawCategories
      .map((item: any) =>
        this.normalizeAccessibilityCategory(typeof item === 'string' ? item : item?.value),
      )
      .filter(
        (value: any): value is string => typeof value === 'string' && value.trim().length > 0,
      );

    const categories: string[] = Array.from(
      new Set(selectedCategories.length > 0 ? selectedCategories : [...ACCESSIBILITY_AUDIT_MAIN_CATEGORIES]),
    );

    const subcategorySource = version?.taxonomyJson?.accessibilitySubcategories || {};
    const subcategories: Record<string, string[]> = {};

    categories.forEach((category: string) => {
      const rawItems = Array.isArray(subcategorySource?.[category]) ? subcategorySource[category] : [];
      const selected = rawItems.reduce<string[]>((acc, item: any) => {
        const normalized = this.normalizeAccessibilitySubcategory(
          category,
          typeof item === 'string' ? item : item?.value,
        );
        if (typeof normalized === 'string' && normalized.trim().length > 0) {
          acc.push(normalized);
        }
        return acc;
      }, []);
      const categoryOptions = [
        ...(ACCESSIBILITY_AUDIT_CATEGORIES[category as keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES] || []),
      ] as string[];

      subcategories[category] =
        selected.length > 0
          ? Array.from(new Set(selected))
          : categoryOptions;
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

    const category = this.normalizeAccessibilityCategory(input.category);
    const subcategory = category
      ? this.normalizeAccessibilitySubcategory(category, input.subcategory)
      : input.subcategory?.trim();

    if (!category && subcategory) {
      throw new BadRequestException('Select a main category before choosing a subcategory.');
    }

    const allowedTaxonomy = this.getAllowedAccessibilityTaxonomy(report.templateVersion);

    if (category && !allowedTaxonomy.categories.includes(category) && !ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.includes(category)) {
      throw new BadRequestException('Category must match the accessibility audit category list.');
    }

    if (subcategory) {
      const allowedSubcategories: string[] = category ? [...(allowedTaxonomy.subcategories[category] || [])] : [];
      const categoryOptions: string[] = category
        ? ([...(ACCESSIBILITY_AUDIT_CATEGORIES[category as keyof typeof ACCESSIBILITY_AUDIT_CATEGORIES] || [])] as string[])
        : [];

      if (
        !allowedSubcategories.includes(subcategory) &&
        !categoryOptions.includes(subcategory)
      ) {
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

  private severityLabel(severity: string | null | undefined, locale: 'ar' | 'en' = 'ar') {
    const labels: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', string> =
      locale === 'en'
        ? {
            CRITICAL: 'Critical',
            HIGH: 'High',
            MEDIUM: 'Medium',
            LOW: 'Low',
          }
        : {
            CRITICAL: '\u062D\u0631\u062C\u0629',
            HIGH: '\u0639\u0627\u0644\u064A\u0629',
            MEDIUM: '\u0645\u062A\u0648\u0633\u0637\u0629',
            LOW: '\u0645\u0646\u062E\u0641\u0636\u0629',
          };
    const normalizedSeverity = (severity || 'LOW') as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    return labels[normalizedSeverity] || labels.LOW;
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
        previewTag: 'Arena360 accessibility report',
        coverTag: 'Accessibility audit report',
        introduction: 'Introduction',
        executiveSummary: 'Statistics summary',
        recommendationSummary: 'Recommendations summary',
        findingsTag: 'Detailed issues log',
        findingsTitle: 'Issues table',
        noEntries: 'No findings have been added yet.',
        footerNote:
          'This report is generated from the structured accessibility findings pipeline and exported directly to PDF from the server.',
        closingTag: 'End cover',
        closingTitle: 'Thank you',
        closingBody:
          'Improving accessibility for everyone.',
        client: 'Client',
        project: 'Project',
        template: 'Tool',
        reportDate: 'Report date',
        performedBy: 'Performed by',
        createdBy: 'Auditor',
        totalIssues: 'Total issues',
        clickHere: 'Click here',
        viewImage: 'View Image',
        viewVideo: 'View Video',
        viewEvidence: 'View Evidence',
        serviceName: 'Service Name',
        issueTitle: 'Issue Title',
        severity: 'Severity',
        category: 'Category',
        subcategory: 'Subcategory',
        pageUrl: 'Page URL',
        media: 'Media',
        statisticsTitle: 'Statistical snapshot',
        severityBreakdown: 'Issues by severity',
        categoryBreakdown: 'Issues by category',
        scopeTitle: 'Audit scope',
        scopeBody: 'This audit reviews the recorded services, pages, and interface flows documented in the structured findings below.',
        methodologyTitle: 'Methodology',
        methodologyBody: 'The review combines manual expert inspection with assisted tooling checks to identify barriers affecting usability and compliance.',
        standardsTitle: 'Reference standards',
        standardsBody: 'Findings are documented against accessibility best practices aligned with WCAG success criteria where applicable.',
        recommendationsTitle: 'Recommendations summary',
        closingThanks: 'Thank you for reviewing this report.',
        generatedWith: 'Generated by Arena360',
        sampleDescription:
          'This accessibility audit report consolidates project findings, evidence, AI-generated narrative sections, and export-ready formatting in one landscape document.',
      };
    }

    return {
      previewTag: 'تقرير إمكانية الوصول من Arena360',
      coverTag: 'تقرير تدقيق إمكانية الوصول',
      introduction: '\u0627\u0644\u0645\u0642\u062F\u0645\u0629',
      executiveSummary: 'ملخص الإحصاءات',
      recommendationSummary: 'ملخص التوصيات',
      findingsTag: 'سجل الملاحظات التفصيلي',
      findingsTitle: 'جدول الملاحظات',
      noEntries: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0644\u0627\u062D\u0638\u0627\u062A \u0645\u0636\u0627\u0641\u0629 \u0628\u0639\u062F.',
      footerNote:
        'يتم إنشاء هذا التقرير من مسار التصدير المنظم للملاحظات ثم تصديره مباشرة إلى PDF من الخادم.',
      closingTag: 'الغلاف الختامي',
      closingTitle: 'شكراً لكم',
      closingBody:
        'نعمل من أجل تحسين إمكانية الوصول للجميع.',
      client: '\u0627\u0644\u0639\u0645\u064A\u0644',
      project: '\u0627\u0644\u0645\u0634\u0631\u0648\u0639',
      template: '\u0627\u0644\u0623\u062F\u0627\u0629',
      reportDate: 'تاريخ التقرير',
      performedBy: '\u062A\u0645 \u0627\u0644\u062A\u0646\u0641\u064A\u0630 \u0628\u0648\u0627\u0633\u0637\u0629',
      createdBy: 'المدقق',
      totalIssues: '\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0644\u0627\u062D\u0638\u0627\u062A',
      clickHere: '\u0627\u0636\u063A\u0637 \u0647\u0646\u0627',
      viewImage: '\u0639\u0631\u0636 \u0627\u0644\u0635\u0648\u0631\u0629',
      viewVideo: '\u0639\u0631\u0636 \u0627\u0644\u0641\u064A\u062F\u064A\u0648',
      viewEvidence: '\u0639\u0631\u0636 \u0627\u0644\u062F\u0644\u064A\u0644',
      serviceName: 'اسم الخدمة',
      issueTitle: 'عنوان المشكلة',
      severity: 'الشدة',
      category: 'التصنيف',
      subcategory: 'التصنيف الفرعي',
      pageUrl: '\u0631\u0627\u0628\u0637 \u0627\u0644\u0635\u0641\u062D\u0629',
      media: 'الوسائط',
      statisticsTitle: 'اللقطة الإحصائية',
      severityBreakdown: 'الملاحظات حسب الشدة',
      categoryBreakdown: 'الملاحظات حسب التصنيف',
      scopeTitle: 'نطاق التدقيق',
      scopeBody: 'يغطي هذا التدقيق الخدمات والصفحات وتدفقات الاستخدام الموثقة ضمن الملاحظات المنظمة الواردة أدناه.',
      methodologyTitle: 'منهجية العمل',
      methodologyBody: 'تمت المراجعة بالجمع بين الفحص اليدوي المتخصص والاختبارات المساندة بالأدوات لتحديد العوائق المؤثرة على قابلية الاستخدام والامتثال.',
      standardsTitle: 'المعايير المرجعية',
      standardsBody: 'تم توثيق الملاحظات وفق أفضل ممارسات إمكانية الوصول وبما يتوافق مع معايير WCAG عند الحاجة.',
      recommendationsTitle: 'ملخص التوصيات',
      closingThanks: 'شكراً لكم على مراجعة هذا التقرير.',
      generatedWith: 'تم الإنشاء بواسطة Arena360',
      sampleDescription:
        'يجمع هذا التقرير بين ملاحظات المشروع وأدلته والنصوص المولدة بالذكاء الاصطناعي والتنسيق الجاهز للتصدير ضمن مستند أفقي واحد.',
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

  private formatReportDate(value: string | Date | null | undefined, locale: 'ar' | 'en') {
    if (!value) return locale === 'ar' ? 'غير متوفر' : 'Not available';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return locale === 'ar' ? 'غير متوفر' : 'Not available';
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private getAccessibilityCategoryDisplay(value: string | null | undefined, locale: 'ar' | 'en') {
    const normalized = this.normalizeAccessibilityCategory(value);
    if (!normalized) return this.normalizeDisplayText(value);
    if (locale === 'en') return normalized;

    const labels: Record<string, string> = {
      Images: 'الصور',
      Content: 'المحتوى',
      'Color & Contrast': 'الألوان والتباين',
      'Keyboard & Navigation': 'لوحة المفاتيح والتنقل',
      'Forms & Inputs': 'النماذج وحقول الإدخال',
      Multimedia: 'الوسائط المتعددة',
      'Touch & Mobile': 'اللمس والجوال',
      'Structure & Semantics': 'البنية والدلالات',
      'Timing & Interaction': 'التوقيت والتفاعل',
      'Assistive Technology': 'التقنيات المساعدة',
      'Authentication & Security': 'المصادقة والأمان',
    };
    return labels[normalized] || normalized;
  }

  private buildRecommendationBullets(summaryText: string | null | undefined, entries: Array<{ recommendation?: string | null }>, locale: 'ar' | 'en') {
    const directBullets = this.normalizeDisplayText(summaryText)
      .split(/\n+/)
      .map((line) => line.replace(/^[\s•\-\u2022]+/, '').trim())
      .filter(Boolean);

    if (directBullets.length > 1) {
      return directBullets;
    }

    const deduped = Array.from(
      new Set(
        entries
          .map((entry) => this.normalizeDisplayText(entry.recommendation))
          .map((value) => value.replace(/^[\s•\-\u2022]+/, '').trim())
          .filter(Boolean),
      ),
    );

    if (deduped.length > 0) {
      return deduped;
    }

    return [
      locale === 'ar'
        ? 'مراجعة العناصر عالية ومتوسطة الشدة أولاً، ثم تنفيذ التحسينات المتكررة على مستوى النظام.'
        : 'Prioritize high and medium severity issues first, then address repeated accessibility patterns across the system.',
    ];
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
          statisticsSummary:
            locale === 'ar'
              ? '\u064A\u0645\u0643\u0646 \u0644\u0644\u0625\u062F\u0627\u0631\u0629 \u0645\u0639\u0627\u064A\u0646\u0629 \u0627\u0644\u0642\u0627\u0644\u0628 \u0642\u0628\u0644 \u062A\u0639\u064A\u064A\u0646\u0647 \u0644\u0644\u0639\u0645\u064A\u0644 \u0644\u0636\u0645\u0627\u0646 \u0623\u0646 \u0634\u0643\u0644 \u0627\u0644\u062A\u0635\u062F\u064A\u0631 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u062A\u0648\u0642\u0639\u0627\u062A.'
              : 'Admins can review the output here before assigning the tool to a client, so the exported PDF style is predictable.',
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
    const statisticsNarrative = this.normalizeDisplayText(summary.statisticsSummary || summary.executiveSummary);
    const severityCounts = [
      { label: labels.totalIssues, count: entries.length, severity: 'TOTAL' },
      { label: this.severityLabel('HIGH', localeConfig.locale), count: entries.filter((entry) => entry.severity === 'HIGH').length, severity: 'HIGH' },
      { label: this.severityLabel('MEDIUM', localeConfig.locale), count: entries.filter((entry) => entry.severity === 'MEDIUM').length, severity: 'MEDIUM' },
      { label: this.severityLabel('LOW', localeConfig.locale), count: entries.filter((entry) => entry.severity === 'LOW').length, severity: 'LOW' },
    ];
    const criticalCount = entries.filter((entry) => entry.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      severityCounts.splice(1, 0, {
        label: this.severityLabel('CRITICAL', localeConfig.locale),
        count: criticalCount,
        severity: 'CRITICAL',
      });
    }

    const categoryCounts = Array.from(
      entries.reduce((map, entry) => {
        const key = entry.category || 'Uncategorized';
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map<string, number>()),
    )
      .map(([name, count]) => ({
        key: name,
        label: this.getAccessibilityCategoryDisplay(name, localeConfig.locale),
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const schemaVersion = report.templateVersion;
    const serviceHeader = this.getSchemaLabel(schemaVersion, 'serviceName', localeConfig.locale, labels.serviceName);
    const issueTitleHeader = this.getSchemaLabel(schemaVersion, 'issueTitle', localeConfig.locale, labels.issueTitle);
    const severityHeader = this.getSchemaLabel(schemaVersion, 'severity', localeConfig.locale, labels.severity);
    const categoryHeader = this.getSchemaLabel(schemaVersion, 'category', localeConfig.locale, labels.category);
    const subcategoryHeader = this.getSchemaLabel(schemaVersion, 'subcategory', localeConfig.locale, labels.subcategory);
    const pageUrlHeader = this.getSchemaLabel(schemaVersion, 'pageUrl', localeConfig.locale, labels.pageUrl);
    const evidenceHeader = this.getSchemaLabel(schemaVersion, 'evidence', localeConfig.locale, labels.media);
    const reportDate = this.formatReportDate(report.publishedAt || report.updatedAt || report.createdAt, localeConfig.locale);
    const recommendationBullets = this.buildRecommendationBullets(summary.recommendationsSummary, entries, localeConfig.locale);
    const scopeServices = Array.from(new Set(entries.map((entry) => this.normalizeDisplayText(entry.serviceName)).filter(Boolean)));
    const scopePages = entries.filter((entry) => entry.pageUrl).length;

    const tableRows = entries
      .map((entry, index) => {
        const mediaItems = Array.isArray(entry.media) ? entry.media : [];
        const mediaHtml = mediaItems.length
          ? mediaItems
              .map((media: any) => {
                const actionLabel =
                  media.mediaType === 'IMAGE'
                    ? labels.viewImage
                    : media.mediaType === 'VIDEO'
                      ? labels.viewVideo
                      : labels.viewEvidence;
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
          '<td><span class="severity severity-' + ((entry.severity || 'LOW').toLowerCase()) + '">' + this.escapeHtml(this.severityLabel(entry.severity, localeConfig.locale)) + '</span></td>' +
          '<td>' + (this.escapeHtml(category) || '<span class="muted">-</span>') + '</td>' +
          '<td>' + (this.escapeHtml(subcategory) || '<span class="muted">-</span>') + '</td>' +
          '<td>' + pageUrlHtml + '</td>' +
          '<td>' + mediaHtml + '</td>' +
          '</tr>'
        );
      })
      .join('');

    const severityCards = severityCounts
      .map(
        (item) =>
          '<div class="stat-card stat-' + item.severity.toLowerCase() + '">' +
          '<div class="summary-value">' + item.count + '</div>' +
          '<div class="summary-label">' + this.escapeHtml(item.label) + '</div>' +
          '</div>',
      )
      .join('');

    const coverDescription =
      this.escapeHtml(this.normalizeDisplayText(report.description)) || this.escapeHtml(labels.sampleDescription);
    const introductionBody = this.normalizeDisplayText(summary.introduction) || this.normalizeDisplayText(report.description) || labels.sampleDescription;
    const categoryRows = categoryCounts.length
      ? categoryCounts
          .map((item) => {
            const width = entries.length ? Math.max(8, Math.round((item.count / entries.length) * 100)) : 0;
            return (
              '<div class="category-row">' +
              '<div class="category-row-head">' +
              '<span>' + this.escapeHtml(item.label || item.key) + '</span>' +
              '<strong>' + item.count + '</strong>' +
              '</div>' +
              '<div class="category-bar-track"><div class="category-bar-fill" style="width:' + width + '%"></div></div>' +
              '</div>'
            );
          })
          .join('')
      : '<p class="muted">-</p>';
    const recommendationsHtml = recommendationBullets
      .map((item) => '<li>' + this.escapeHtml(item) + '</li>')
      .join('');

    return (
      '<!doctype html>' +
      '<html lang="' + localeConfig.locale + '" dir="' + localeConfig.direction + '">' +
      '<head>' +
      '<meta charset="utf-8" />' +
      '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
      '<title>' + this.escapeHtml(this.normalizeDisplayText(report.title)) + '</title>' +
      '<style>' +
      ':root {--bg: #0b1020;--panel: #ffffff;--ink: #162033;--muted: #667085;--accent: #0f7cff;--accent-2: #00b3c7;--accent-soft: #eef6ff;--border: #dbe5f0;--cover: #08111f;--cover-ink: #f8fbff;}' +
      '* { box-sizing: border-box; }' +
      'body { margin: 0; font-family: "Noto Naskh Arabic", Tahoma, "Segoe UI", Arial, sans-serif; background: #eef3f8; color: var(--ink); }' +
      '.document { padding: 0; }' +
      '.pdf-page { position: relative; min-height: 178mm; padding: 14mm; page-break-after: always; background: var(--panel); }' +
      '.pdf-page:last-child { page-break-after: auto; }' +
      '.page-shell { height: 100%; border: 1px solid var(--border); border-radius: 22px; overflow: hidden; background: var(--panel); }' +
      '.page-body { padding: 18px 22px 22px; }' +
      '.page-header-strip { height: 10px; background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%); }' +
      '.eyebrow { color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; margin-bottom: 10px; }' +
      'h1, h2, h3, p { margin: 0; }' +
      'h1 { font-size: 34px; margin-bottom: 10px; }' +
      'h2 { font-size: 22px; margin-bottom: 10px; }' +
      'h3 { font-size: 15px; }' +
      'p { line-height: 1.8; }' +
      '.meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }' +
      '.meta-card { border: 1px solid var(--border); border-radius: 16px; padding: 14px; background: #fff; }' +
      '.meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--muted); margin-bottom: 6px; }' +
      '.meta-value { font-size: 15px; font-weight: 700; }' +
      '.cover-page { background: linear-gradient(140deg, #07111e 0%, #0c1a32 55%, #0f7cff 140%); color: var(--cover-ink); }' +
      '.cover-page .page-shell, .closing-page .page-shell { background: transparent; border-color: rgba(255,255,255,0.12); }' +
      '.cover-page .page-body, .closing-page .page-body { height: calc(178mm - 28px); display: flex; flex-direction: column; justify-content: space-between; }' +
      '.cover-page .eyebrow, .closing-page .eyebrow { color: #9bd7ff; }' +
      '.cover-page .meta-card { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }' +
      '.cover-page .meta-label { color: rgba(255,255,255,0.66); }' +
      '.cover-page .meta-value { color: #fff; }' +
      '.cover-brand { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }' +
      '.cover-logo { max-height: 70px; max-width: 220px; object-fit: contain; background: rgba(255,255,255,0.95); padding: 10px 14px; border-radius: 18px; }' +
      '.cover-accent { width: 110px; height: 8px; border-radius: 999px; background: linear-gradient(90deg, #22d3ee, #38bdf8); margin: 18px 0; }' +
      '.cover-summary { max-width: 70%; font-size: 15px; color: rgba(255,255,255,0.86); }' +
      '.section-grid { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 18px; }' +
      '.content-card { border: 1px solid var(--border); border-radius: 18px; padding: 18px; background: #fff; }' +
      '.content-card.soft { background: var(--accent-soft); }' +
      '.bullet-list { margin: 0; padding-' + (localeConfig.direction === 'rtl' ? 'right' : 'left') + ': 18px; }' +
      '.bullet-list li { margin: 0 0 10px; line-height: 1.8; }' +
      '.stats-layout { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 18px; }' +
      '.stats-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }' +
      '.stat-card { border-radius: 18px; border: 1px solid var(--border); background: #fff; padding: 18px; min-height: 100px; display: flex; flex-direction: column; justify-content: center; }' +
      '.stat-total { background: linear-gradient(180deg, #eff6ff, #ffffff); }' +
      '.stat-critical { background: linear-gradient(180deg, #fff1f2, #ffffff); }' +
      '.stat-high { background: linear-gradient(180deg, #fff1f2, #ffffff); }' +
      '.stat-medium { background: linear-gradient(180deg, #fffbeb, #ffffff); }' +
      '.stat-low { background: linear-gradient(180deg, #ecfdf3, #ffffff); }' +
      '.summary-value { font-size: 32px; font-weight: 800; color: var(--ink); }' +
      '.summary-label { margin-top: 8px; font-size: 13px; color: var(--muted); }' +
      '.category-panel { border: 1px solid var(--border); border-radius: 18px; padding: 18px; background: #fff; }' +
      '.category-row { margin-bottom: 14px; }' +
      '.category-row:last-child { margin-bottom: 0; }' +
      '.category-row-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; font-size: 13px; }' +
      '.category-bar-track { height: 9px; border-radius: 999px; background: #e8eef5; overflow: hidden; }' +
      '.category-bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%); }' +
      '.table-page .page-body { padding-bottom: 10px; }' +
      'table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; }' +
      'thead { display: table-header-group; }' +
      'tfoot { display: table-footer-group; }' +
      'th, td { border: 1px solid #e5e7eb; padding: 12px; vertical-align: top; }' +
      'th { background: #0d4f8b; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }' +
      'td { background: #ffffff; }' +
      'tr { page-break-inside: avoid; }' +
      '.cell-note { margin-top: 8px; color: var(--muted); font-size: 12px; line-height: 1.6; }' +
      '.severity { display: inline-block; border-radius: 999px; padding: 4px 10px; font-weight: 700; font-size: 11px; }' +
      '.severity-critical, .severity-high { background: #fee2e2; color: #b91c1c; }' +
      '.severity-medium { background: #fef3c7; color: #b45309; }' +
      '.severity-low { background: #dcfce7; color: #166534; }' +
      '.evidence { margin-bottom: 6px; }' +
      '.evidence a { color: #2563eb; text-decoration: none; font-weight: 600; }' +
      '.muted { color: var(--muted); }' +
      '.footer-note { color: var(--muted); font-size: 11px; margin-top: 14px; }' +
      '.narrative { white-space: pre-wrap; }' +
      '.closing-page { background: linear-gradient(160deg, #07111e 0%, #123766 60%, #0f7cff 160%); color: var(--cover-ink); }' +
      '.closing-page .page-body { align-items: center; text-align: center; }' +
      '.closing-mark { width: 120px; height: 120px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.16); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; margin: 0 auto; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.14), rgba(255,255,255,0.02)); }' +
      '.closing-page p { color: rgba(255,255,255,0.86); }' +
      '@page { size: A4 landscape; margin: 14mm; }' +
      '</style>' +
      '</head>' +
      '<body>' +
      '<div class="document">' +
      '<section class="pdf-page cover-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
      '<div>' +
      '<div class="cover-brand">' +
      '<div>' +
      '<div class="eyebrow">' + this.escapeHtml(labels.coverTag) + '</div>' +
      '<h1>' + this.escapeHtml(this.normalizeDisplayText(report.title)) + '</h1>' +
      '<div class="cover-accent"></div>' +
      '<p class="cover-summary">' + coverDescription + '</p>' +
      '</div>' +
      (report.client.logo ? '<img class="cover-logo" src="' + this.escapeHtml(report.client.logo) + '" alt="' + this.escapeHtml(this.normalizeDisplayText(report.client.name)) + '" />' : '') +
      '</div>' +
      '</section>' +
      '<div class="meta-grid">' +
      '<div class="meta-card"><div class="meta-label">' + this.escapeHtml(labels.client) + '</div><div class="meta-value">' + this.escapeHtml(this.normalizeDisplayText(report.client.name)) + '</div></div>' +
      '<div class="meta-card"><div class="meta-label">' + this.escapeHtml(labels.project) + '</div><div class="meta-value">' + this.escapeHtml(this.normalizeDisplayText(report.project.name)) + '</div></div>' +
      '<div class="meta-card"><div class="meta-label">' + this.escapeHtml(labels.reportDate) + '</div><div class="meta-value">' + this.escapeHtml(reportDate) + '</div></div>' +
      '<div class="meta-card"><div class="meta-label">' + this.escapeHtml(labels.createdBy) + '</div><div class="meta-value">' + this.escapeHtml(this.normalizeDisplayText(report.performedBy?.name || labels.performedBy)) + '</div></div>' +
      '</div>' +
      '</div>' +
      '<div><p>' + this.escapeHtml(labels.generatedWith) + '</p></div>' +
      '</div></div>' +
      '</section>' +

      '<section class="pdf-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.introduction) + '</div>' +
      '<h2>' + this.escapeHtml(labels.introduction) + '</h2>' +
      '<div class="section-grid">' +
      '<div class="content-card"><p class="narrative">' + this.escapeHtml(introductionBody).replace(/\n/g, '<br />') + '</p></div>' +
      '<div class="content-card soft">' +
      '<h3>' + this.escapeHtml(labels.scopeTitle) + '</h3>' +
      '<p class="muted" style="margin-top:8px;">' + this.escapeHtml(labels.scopeBody) + '</p>' +
      '<ul class="bullet-list" style="margin-top:12px;">' +
      '<li>' + this.escapeHtml(scopeServices.length ? scopeServices.slice(0, 6).join(localeConfig.locale === 'ar' ? '، ' : ', ') : (localeConfig.locale === 'ar' ? 'لم يتم تحديد خدمات بعد' : 'No services listed yet')) + '</li>' +
      '<li>' + this.escapeHtml((localeConfig.locale === 'ar' ? 'عدد الصفحات/المسارات الموثقة: ' : 'Documented pages/routes: ') + scopePages) + '</li>' +
      '</ul>' +
      '<div style="height:14px"></div>' +
      '<h3>' + this.escapeHtml(labels.methodologyTitle) + '</h3>' +
      '<p class="muted" style="margin-top:8px;">' + this.escapeHtml(labels.methodologyBody) + '</p>' +
      '<div style="height:14px"></div>' +
      '<h3>' + this.escapeHtml(labels.standardsTitle) + '</h3>' +
      '<p class="muted" style="margin-top:8px;">' + this.escapeHtml(labels.standardsBody) + '</p>' +
      '</div>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<section class="pdf-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.statisticsTitle) + '</div>' +
      '<h2>' + this.escapeHtml(labels.statisticsTitle) + '</h2>' +
      '<div class="stats-layout">' +
      '<div>' +
      '<div class="stats-grid">' + severityCards + '</div>' +
      (statisticsNarrative
        ? '<div class="content-card" style="margin-top:16px;"><h3>' + this.escapeHtml(labels.executiveSummary) + '</h3><p class="narrative muted" style="margin-top:10px;">' + this.escapeHtml(statisticsNarrative).replace(/\n/g, '<br />') + '</p></div>'
        : '') +
      '</div>' +
      '<div class="category-panel">' +
      '<h3>' + this.escapeHtml(labels.categoryBreakdown) + '</h3>' +
      '<div style="margin-top:16px;">' + categoryRows + '</div>' +
      '</div>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<section class="pdf-page table-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
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
      '</div></div>' +
      '</section>' +

      '<section class="pdf-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.recommendationSummary) + '</div>' +
      '<h2>' + this.escapeHtml(labels.recommendationsTitle) + '</h2>' +
      '<div class="content-card soft">' +
      '<ul class="bullet-list">' + recommendationsHtml + '</ul>' +
      '</div>' +
      '</div></div>' +
      '</section>' +

      '<section class="pdf-page closing-page">' +
      '<div class="page-shell"><div class="page-header-strip"></div><div class="page-body">' +
      '<div class="eyebrow">' + this.escapeHtml(labels.closingTag) + '</div>' +
      '<div class="closing-mark">A360</div>' +
      '<h2>' + this.escapeHtml(labels.closingTitle) + '</h2>' +
      '<p>' + this.escapeHtml(labels.closingThanks) + '</p>' +
      '<p>' + this.escapeHtml(labels.closingBody) + '</p>' +
      '<p>' + this.escapeHtml(this.normalizeDisplayText(report.client.name)) + '</p>' +
      '</section>' +
      '</div></div>' +
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
    const normalizedCategory =
      report.template?.category === 'ACCESSIBILITY'
        ? this.normalizeAccessibilityCategory(dto.category) || dto.category?.trim()
        : dto.category?.trim();
    const normalizedSubcategory =
      normalizedCategory && report.template?.category === 'ACCESSIBILITY'
        ? this.normalizeAccessibilitySubcategory(normalizedCategory, dto.subcategory) || dto.subcategory?.trim()
        : dto.subcategory?.trim();
    const entry = await this.prisma.projectReportEntry.create({
      data: {
        orgId: user.orgId,
        projectReportId: reportId,
        sortOrder: dto.sortOrder ?? 0,
        serviceName: dto.serviceName?.trim(),
        issueTitle: dto.issueTitle.trim(),
        issueDescription: dto.issueDescription.trim(),
        severity: dto.severity,
        category: normalizedCategory,
        subcategory: normalizedSubcategory,
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
    const nextCategoryInput = dto.category ?? entry.category;
    const normalizedCategory =
      report.template?.category === 'ACCESSIBILITY'
        ? this.normalizeAccessibilityCategory(nextCategoryInput) || nextCategoryInput?.trim()
        : nextCategoryInput?.trim();
    const nextSubcategoryInput = dto.subcategory ?? entry.subcategory;
    const normalizedSubcategory =
      normalizedCategory && report.template?.category === 'ACCESSIBILITY'
        ? this.normalizeAccessibilitySubcategory(normalizedCategory, nextSubcategoryInput) || nextSubcategoryInput?.trim()
        : nextSubcategoryInput?.trim();

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
        ...(dto.category !== undefined && { category: normalizedCategory || null }),
        ...(dto.subcategory !== undefined && { subcategory: normalizedSubcategory || null }),
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
