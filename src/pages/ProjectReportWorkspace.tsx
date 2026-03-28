import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Bot, Download, Eye, FileImage, FileText, Pencil, Plus, Search, Sparkles, Trash2, Upload, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, GlassCard, Input, Modal, Select, TextArea } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES,
  AccessibilityAuditMainCategory,
  AccessibilityAuditOutputLocale,
  getAccessibilityCategoryLabel,
  getAccessibilityOutputLocale,
  getAccessibilitySubcategoryLabel,
  resolveAccessibilityTaxonomy,
} from '@/features/accessibility/accessibilityAuditConfig';
import { Permission, ProjectReport, ProjectReportEntry, ProjectReportEntryMedia, ProjectReportEntrySeverity, ProjectReportEntryStatus, ReportBuilderTemplateVersion, Role } from '@/types';

const SEVERITIES: ProjectReportEntrySeverity[] = ['HIGH', 'MEDIUM', 'LOW'];
const DEFAULT_ENTRY_STATUS: ProjectReportEntryStatus = 'OPEN';

const emptyEntryDraft = {
  serviceName: '',
  issueTitle: '',
  issueDescription: '',
  severity: 'MEDIUM' as ProjectReportEntrySeverity,
  category: '' as AccessibilityAuditMainCategory | '',
  subcategory: '',
  pageUrl: '',
  recommendation: '',
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z]+:\/\//i.test(trimmed)) return trimmed;
  if (/^([a-z0-9-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
};

const severityBadgeVariant: Record<ProjectReportEntrySeverity, 'danger' | 'warning' | 'success'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'success',
  CRITICAL: 'danger',
};

const severityCopy: Record<ProjectReportEntrySeverity, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  CRITICAL: 'Critical',
};

const mediaActionLabel = (media: ProjectReportEntryMedia) => {
  if (media.mediaType === 'IMAGE') return 'View Image';
  if (media.mediaType === 'VIDEO') return 'View Video';
  return 'View Evidence';
};

const getVersionTaxonomy = (version?: ReportBuilderTemplateVersion | null) => resolveAccessibilityTaxonomy(version?.taxonomyJson);

export const ProjectReportWorkspace: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { projectId, reportId } = useParams();
  const { user, hasPermission } = useAuth();

  const isArabic = i18n.language === 'ar';
  const uiLocale: AccessibilityAuditOutputLocale = isArabic ? 'ar' : 'en';
  const copy = React.useMemo(
    () =>
      isArabic
        ? {
            loadingReport: 'جاري تحميل تقرير إمكانية الوصول...',
            reportNotFound: 'تعذر العثور على تقرير إمكانية الوصول.',
            reportVersion: 'إصدار الأداة',
            performedBy: 'تم التنفيذ بواسطة',
            unknown: 'غير معروف',
            clientReadOnly: 'وصول العميل للقراءة فقط. تظهر هنا فقط تقارير إمكانية الوصول المنشورة والمرئية للعميل.',
            loadingPreview: 'جاري تحميل المعاينة...',
            previewReport: 'معاينة التقرير',
            downloadLatestExport: 'تنزيل آخر نسخة',
            addFinding: 'إضافة ملاحظة',
            totalFindings: 'إجمالي الملاحظات',
            high: 'عالية',
            medium: 'متوسطة',
            low: 'منخفضة',
            aiReportSummary: 'ملخص التقرير بالذكاء الاصطناعي',
            introduction: 'المقدمة',
            executiveSummary: 'الملخص التنفيذي',
            recommendationsSummary: 'ملخص التوصيات',
            findingsList: 'قائمة الملاحظات',
            findingsListDescription: 'هيكل ثابت لملاحظات إمكانية الوصول وفق الأداة المعينة. تبقى التصنيفات والتصنيفات الفرعية متوافقة مع تعريف المنتج.',
            searchFindings: 'ابحث في الملاحظات',
            allSeverities: 'كل مستويات الشدة',
            allCategories: 'كل التصنيفات',
            serviceName: 'اسم الخدمة / الوحدة',
            issueTitle: 'عنوان المشكلة',
            severity: 'الشدة',
            category: 'التصنيف',
            subcategory: 'التصنيف الفرعي',
            pageUrl: 'رابط الصفحة',
            media: 'الوسائط',
            actions: 'الإجراءات',
            clickHere: 'اضغط هنا',
            remove: 'إزالة',
            noFindings: 'لا توجد ملاحظات تطابق عوامل التصفية الحالية بعد.',
            editFinding: 'تعديل ملاحظة إمكانية الوصول',
            newObservation: 'ملاحظة إمكانية وصول جديدة',
            basicInformation: 'المعلومات الأساسية',
            servicePlaceholder: 'مثال: تدفق الدفع عبر الجوال',
            issueTitlePlaceholder: 'وصف قصير وواضح للمشكلة',
            issueDescription: 'وصف المشكلة',
            issueDescriptionPlaceholder: 'شرح تفصيلي لعائق إمكانية الوصول...',
            severityClassification: 'تصنيف الشدة',
            accessibilityCategory: 'تصنيف إمكانية الوصول',
            mainCategory: 'التصنيف الرئيسي',
            selectCategory: 'اختر التصنيف',
            selectSubcategory: 'اختر التصنيف الفرعي',
            evidenceMedia: 'وسائط الإثبات',
            imageProof: 'إثبات بالصورة',
            videoDemo: 'عرض فيديو',
            digitalLocation: 'الموقع الرقمي',
            exactPageUrl: 'رابط الصفحة الدقيق',
            pageUrlPlaceholder: 'https://app.client.com/specific-route',
            developerRecommendations: 'توصيات لفريق التطوير',
            remediationSteps: 'خطوات المعالجة',
            remediationPlaceholder: 'إرشادات محددة لفريق التطوير لمعالجة هذه المشكلة...',
            existingEvidence: 'الأدلة الحالية',
            cancel: 'إلغاء',
            updateFinding: 'تحديث الملاحظة',
            commitFinding: 'حفظ الملاحظة',
            reportPreview: 'معاينة تقرير إمكانية الوصول',
            previewDescription: 'تُعرض هذه المعاينة من مسار HTML/PDF في الخلفية وتُظهر شكل التقرير النهائي باستخدام الملاحظات والأدلة الحالية.',
            english: 'English',
            arabic: 'العربية',
            printPdf: 'طباعة / حفظ PDF'
          }
        : {
            loadingReport: 'Loading accessibility report...',
            reportNotFound: 'Accessibility report not found.',
            reportVersion: 'Tool version',
            performedBy: 'Performed by',
            unknown: 'Unknown',
            clientReadOnly: 'Client access is read-only. Only published client-visible accessibility reports are available here.',
            loadingPreview: 'Loading Preview...',
            previewReport: 'Preview Report',
            downloadLatestExport: 'Download Latest Export',
            addFinding: 'Add Finding',
            totalFindings: 'Total Findings',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
            aiReportSummary: 'AI Report Summary',
            introduction: 'Introduction',
            executiveSummary: 'Executive Summary',
            recommendationsSummary: 'Recommendations Summary',
            findingsList: 'Findings List',
            findingsListDescription: 'Fixed accessibility findings structure from the assigned tool. Categories and subcategories stay aligned with the product definition.',
            searchFindings: 'Search findings',
            allSeverities: 'All severities',
            allCategories: 'All categories',
            serviceName: 'Service Name',
            issueTitle: 'Issue Title',
            severity: 'Severity',
            category: 'Category',
            subcategory: 'Subcategory',
            pageUrl: 'Page URL',
            media: 'Media',
            actions: 'Actions',
            clickHere: 'Click Here',
            remove: 'Remove',
            noFindings: 'No findings match the current filters yet.',
            editFinding: 'Edit Accessibility Finding',
            newObservation: 'New Accessibility Observation',
            basicInformation: 'Basic Information',
            servicePlaceholder: 'e.g., Mobile Checkout Flow',
            issueTitlePlaceholder: 'Short descriptive summary of the problem',
            issueDescription: 'Issue Description',
            issueDescriptionPlaceholder: 'Detailed breakdown of the accessibility barrier...',
            severityClassification: 'Severity Classification',
            accessibilityCategory: 'Accessibility Category',
            mainCategory: 'Main Category',
            selectCategory: 'Select Category',
            selectSubcategory: 'Select Sub-Category',
            evidenceMedia: 'Evidence Media',
            imageProof: 'Image Proof',
            videoDemo: 'Video Demo',
            digitalLocation: 'Digital Location',
            exactPageUrl: 'Exact Page URL',
            pageUrlPlaceholder: 'https://app.client.com/specific-route',
            developerRecommendations: 'Developer Recommendations',
            remediationSteps: 'Remediation Steps',
            remediationPlaceholder: 'Specific guidance for the development team to resolve this issue...',
            existingEvidence: 'Existing Evidence',
            cancel: 'Cancel',
            updateFinding: 'Update Finding',
            commitFinding: 'Commit Finding',
            reportPreview: 'Accessibility Report Preview',
            previewDescription: 'This preview is rendered from the backend HTML/PDF pipeline and shows the final accessibility report layout using the current findings and evidence.',
            english: 'English',
            arabic: 'العربية',
            printPdf: 'Print / Save PDF'
          },
    [isArabic],
  );

  const severityLabel = React.useCallback((severity: ProjectReportEntrySeverity) => {
    if (isArabic) {
      return severity === 'HIGH' ? copy.high : severity === 'MEDIUM' ? copy.medium : severity === 'LOW' ? copy.low : 'حرجة';
    }
    return severityCopy[severity] || severity;
  }, [copy.high, copy.low, copy.medium, isArabic]);

  const evidenceActionLabel = React.useCallback((media: ProjectReportEntryMedia) => {
    if (isArabic) {
      if (media.mediaType === 'IMAGE') return 'عرض الصورة';
      if (media.mediaType === 'VIDEO') return 'عرض الفيديو';
      return 'عرض الدليل';
    }
    return mediaActionLabel(media);
  }, [isArabic]);

  const [loading, setLoading] = React.useState(true);
  const [report, setReport] = React.useState<ProjectReport | null>(null);
  const [entries, setEntries] = React.useState<ProjectReportEntry[]>([]);
  const [entryModalOpen, setEntryModalOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<ProjectReportEntry | null>(null);
  const [entryDraft, setEntryDraft] = React.useState(emptyEntryDraft);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [videoFile, setVideoFile] = React.useState<File | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewLocale, setPreviewLocale] = React.useState<AccessibilityAuditOutputLocale>('en');
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [generatingAi, setGeneratingAi] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState<'ALL' | ProjectReportEntrySeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<'ALL' | AccessibilityAuditMainCategory>('ALL');

  const canEditEntries = hasPermission(Permission.EDIT_PROJECT_REPORT_ENTRIES);
  const canEditReport = hasPermission(Permission.EDIT_PROJECT_REPORTS);
  const canGenerateExports = hasPermission(Permission.GENERATE_PROJECT_REPORT_EXPORTS);
  const isClientUser = user?.role === Role.CLIENT_OWNER || user?.role === Role.CLIENT_MANAGER || user?.role === Role.CLIENT_MEMBER;
  const exportPdfLabel = isArabic ? 'تصدير PDF' : 'Export PDF';
  const exportInProgressLabel = isArabic ? 'جارٍ تصدير PDF...' : 'Exporting PDF...';
  const generateAiLabel = isArabic ? 'إنشاء ملخص ذكي' : 'Generate AI Summary';
  const generatingAiLabel = isArabic ? 'إنشاء النصوص الذكية...' : 'Generating AI narrative...';

  const taxonomy = React.useMemo(() => getVersionTaxonomy(report?.templateVersion), [report?.templateVersion]);
  const availableCategories = React.useMemo(
    () => taxonomy.categories.filter((category): category is AccessibilityAuditMainCategory => ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.includes(category)),
    [taxonomy.categories],
  );
  const subcategoryOptions = entryDraft.category ? taxonomy.subcategories[entryDraft.category] || [] : [];

  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch = [entry.serviceName, entry.issueTitle, entry.issueDescription, entry.category, entry.subcategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || entry.severity === severityFilter;
      const matchesCategory = categoryFilter === 'ALL' || entry.category === categoryFilter;
      return matchesSearch && matchesSeverity && matchesCategory;
    });
  }, [categoryFilter, entries, searchTerm, severityFilter]);

  const summaryCounts = React.useMemo(
    () => ({
      total: entries.length,
      high: entries.filter((entry) => entry.severity === 'HIGH').length,
      medium: entries.filter((entry) => entry.severity === 'MEDIUM').length,
      low: entries.filter((entry) => entry.severity === 'LOW').length,
    }),
    [entries],
  );

  const loadData = React.useCallback(async () => {
    if (!reportId) return;
    try {
      const [reportData, entryData] = await Promise.all([
        api.reportBuilderProjects.getProjectReport(reportId),
        api.reportBuilderProjects.listEntries(reportId),
      ]);
      setReport(reportData);
      setEntries(entryData);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load accessibility report.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    if (!report?.templateVersion) return;
    setPreviewLocale(getAccessibilityOutputLocale(report.templateVersion));
  }, [report?.templateVersion]);

  const openEntryModal = (entry?: ProjectReportEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setEntryDraft({
        serviceName: entry.serviceName || '',
        issueTitle: entry.issueTitle,
        issueDescription: entry.issueDescription,
        severity: (entry.severity || 'MEDIUM') as ProjectReportEntrySeverity,
        category: (entry.category as AccessibilityAuditMainCategory | '') || '',
        subcategory: entry.subcategory || '',
        pageUrl: entry.pageUrl || '',
        recommendation: entry.recommendation || '',
      });
    } else {
      setEditingEntry(null);
      setEntryDraft(emptyEntryDraft);
    }
    setImageFile(null);
    setVideoFile(null);
    setEntryModalOpen(true);
  };

  const uploadSelectedEvidence = async (entry: ProjectReportEntry) => {
    const uploads = [imageFile, videoFile].filter(Boolean) as File[];
    for (const file of uploads) {
      await api.reportBuilderProjects.uploadEntryMedia(entry.projectReportId, entry.id, file);
    }
  };

  const handleSaveEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportId) return;

    const payload = {
      serviceName: entryDraft.serviceName.trim(),
      issueTitle: entryDraft.issueTitle.trim(),
      issueDescription: entryDraft.issueDescription.trim(),
      severity: entryDraft.severity,
      category: entryDraft.category,
      subcategory: entryDraft.subcategory,
      pageUrl: normalizeUrl(entryDraft.pageUrl),
      recommendation: entryDraft.recommendation.trim(),
      status: editingEntry?.status || DEFAULT_ENTRY_STATUS,
    };

    try {
      const savedEntry = editingEntry
        ? await api.reportBuilderProjects.updateEntry(reportId, editingEntry.id, payload)
        : await api.reportBuilderProjects.createEntry(reportId, { ...payload, sortOrder: entries.length });

      await uploadSelectedEvidence(savedEntry);
      await loadData();
      setEntryModalOpen(false);
      toast.success(editingEntry ? 'Finding updated.' : 'Finding added.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to save finding.');
    }
  };

  const handleDeleteEntry = async (entry: ProjectReportEntry) => {
    if (!reportId || !window.confirm(`Delete "${entry.issueTitle}"?`)) return;
    try {
      await api.reportBuilderProjects.deleteEntry(reportId, entry.id);
      await loadData();
      toast.success('Finding removed.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete finding.');
    }
  };

  const handleDeleteEvidence = async (entry: ProjectReportEntry, media: ProjectReportEntryMedia) => {
    if (!reportId || !window.confirm(`Remove "${media.fileAsset.filename || media.fileAsset.name || 'file'}"?`)) return;
    try {
      await api.reportBuilderProjects.deleteEntryMedia(reportId, entry.id, media.id);
      await loadData();
      toast.success('Evidence removed.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove evidence.');
    }
  };

  const handleOpenEvidence = async (media: ProjectReportEntryMedia) => {
    if (!projectId) return;
    try {
      const url = await api.projects.downloadFile(projectId, media.fileAsset.id, false);
      if (!url) throw new Error('Evidence file is unavailable');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to open evidence.');
    }
  };

  const handlePreview = async (locale: AccessibilityAuditOutputLocale = previewLocale) => {
    if (!reportId) return;
    setPreviewLoading(true);
    try {
      const html = await api.reportBuilderProjects.getPreviewHtml(reportId, locale);
      setPreviewLocale(locale);
      setPreviewHtml(html);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!reportId) return;
    setGeneratingAi(true);
    try {
      await api.reportBuilderProjects.generateAiSummary(reportId);
      await loadData();
      toast.success(isArabic ? 'تم إنشاء النصوص الذكية للتقرير.' : 'AI report narrative generated.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || (isArabic ? 'تعذر إنشاء النصوص الذكية للتقرير.' : 'Failed to generate AI report narrative.'));
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleExportPdf = async (locale: AccessibilityAuditOutputLocale = previewLocale) => {
    if (!reportId) return;
    setExportingPdf(true);
    try {
      const result = await api.reportBuilderProjects.exportPdf(reportId, locale);
      await loadData();
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success(isArabic ? 'تم إنشاء ملف PDF بنجاح.' : 'PDF exported successfully.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || (isArabic ? 'تعذر تصدير ملف PDF.' : 'Failed to export PDF.'));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleDownloadLatestExport = async () => {
    if (!reportId) return;
    try {
      const latest = await api.reportBuilderProjects.getLatestExport(reportId);
      window.open(latest.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'No exported PDF is available yet.');
    }
  };

  const handleStatusChange = async (nextStatus: ProjectReport['status']) => {
    if (!reportId) return;
    try {
      const updated = await api.reportBuilderProjects.updateProjectReport(reportId, { status: nextStatus });
      setReport(updated);
      toast.success('Report status updated.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update report status.');
    }
  };

  if (loading) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">{copy.loadingReport}</p></GlassCard>;
  }

  if (!report) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">{copy.reportNotFound}</p></GlassCard>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate(`/app/projects/${projectId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">{report.title}</h1>
              <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'info'}>{report.status}</Badge>
              <Badge variant="neutral">{report.visibility}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {report.template.name} / {copy.reportVersion} {report.templateVersion.versionNumber} / {copy.performedBy} {report.performedBy?.name || copy.unknown}
            </p>
            {isClientUser && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {copy.clientReadOnly}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
            <Eye className="mr-2 h-4 w-4" /> {previewLoading ? copy.loadingPreview : copy.previewReport}
          </Button>
          {canGenerateExports && (
            <>
              <Button variant="outline" onClick={handleGenerateAiSummary} disabled={generatingAi || entries.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" /> {generatingAi ? generatingAiLabel : generateAiLabel}
              </Button>
              <Button onClick={() => handleExportPdf(previewLocale)} disabled={exportingPdf}>
                <Download className="mr-2 h-4 w-4" /> {exportingPdf ? exportInProgressLabel : exportPdfLabel}
              </Button>
            </>
          )}
          {(report.exports?.length || 0) > 0 && (
            <Button variant="outline" onClick={handleDownloadLatestExport}>
              <Download className="mr-2 h-4 w-4" /> {copy.downloadLatestExport}
            </Button>
          )}
          {canEditReport && (
            <Select value={report.status} onChange={(event) => handleStatusChange(event.target.value as ProjectReport['status'])} className="min-w-[180px]">
              <option value="DRAFT">{isArabic ? 'مسودة' : 'DRAFT'}</option>
              <option value="IN_REVIEW">{isArabic ? 'قيد المراجعة' : 'IN_REVIEW'}</option>
              <option value="APPROVED">{isArabic ? 'معتمد' : 'APPROVED'}</option>
              <option value="PUBLISHED">{isArabic ? 'منشور' : 'PUBLISHED'}</option>
              <option value="ARCHIVED">{isArabic ? 'مؤرشف' : 'ARCHIVED'}</option>
            </Select>
          )}
          {canEditEntries && (
            <Button onClick={() => openEntryModal()}>
              <Plus className="mr-2 h-4 w-4" /> {copy.addFinding}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.totalFindings}</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summaryCounts.total}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.high}</p><p className="mt-2 text-3xl font-bold text-rose-600">{summaryCounts.high}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.medium}</p><p className="mt-2 text-3xl font-bold text-amber-500">{summaryCounts.medium}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.low}</p><p className="mt-2 text-3xl font-bold text-emerald-500">{summaryCounts.low}</p></GlassCard>
      </div>

      {(report.summaryJson as any)?.introduction || (report.summaryJson as any)?.statisticsSummary || (report.summaryJson as any)?.executiveSummary || (report.summaryJson as any)?.recommendationsSummary ? (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.aiReportSummary}</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {(report.summaryJson as any)?.introduction && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{copy.introduction}</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).introduction}</p>
              </div>
            )}
            {((report.summaryJson as any)?.statisticsSummary || (report.summaryJson as any)?.executiveSummary) && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{copy.executiveSummary}</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).statisticsSummary || (report.summaryJson as any).executiveSummary}</p>
              </div>
            )}
            {(report.summaryJson as any)?.recommendationsSummary && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{copy.recommendationsSummary}</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).recommendationsSummary}</p>
              </div>
            )}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{copy.findingsList}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {copy.findingsListDescription}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative min-w-[220px]">
              <Input placeholder={copy.searchFindings} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            <Select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | ProjectReportEntrySeverity)}>
              <option value="ALL">{copy.allSeverities}</option>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severityLabel(severity)}</option>)}
            </Select>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | AccessibilityAuditMainCategory)}>
              <option value="ALL">{copy.allCategories}</option>
              {availableCategories.map((category) => <option key={category} value={category}>{getAccessibilityCategoryLabel(category, uiLocale)}</option>)}
            </Select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4">{copy.serviceName}</th>
                <th className="pb-3 pr-4">{copy.issueTitle}</th>
                <th className="pb-3 pr-4">{copy.severity}</th>
                <th className="pb-3 pr-4">{copy.category}</th>
                <th className="pb-3 pr-4">{copy.subcategory}</th>
                <th className="pb-3 pr-4">{copy.pageUrl}</th>
                <th className="pb-3 pr-4">{copy.media}</th>
                {canEditEntries && <th className="pb-3 text-right">{copy.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredEntries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.serviceName || '-'}</td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">{entry.issueTitle}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{entry.issueDescription}</p>
                    </td>
                    <td className="py-4 pr-4"><Badge variant={severityBadgeVariant[(entry.severity || 'MEDIUM') as ProjectReportEntrySeverity]}>{severityLabel((entry.severity || 'MEDIUM') as ProjectReportEntrySeverity)}</Badge></td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.category ? getAccessibilityCategoryLabel(entry.category, uiLocale) : '-'}</td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.category && entry.subcategory ? getAccessibilitySubcategoryLabel(entry.category, entry.subcategory, uiLocale) : entry.subcategory || '-'}</td>
                    <td className="py-4 pr-4">
                      {entry.pageUrl ? <a href={entry.pageUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-600 hover:underline dark:text-cyan-400">{copy.clickHere}</a> : <span className="text-slate-500">-</span>}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {(entry.media || []).length > 0 ? (entry.media || []).map((media) => (
                          <button key={media.id} type="button" onClick={() => handleOpenEvidence(media)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300">
                            {evidenceActionLabel(media)}
                          </button>
                        )) : <span className="text-slate-500">-</span>}
                      </div>
                    </td>
                    {canEditEntries && (
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => openEntryModal(entry)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => handleDeleteEntry(entry)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {(entry.media || []).length > 0 && (
                    <tr className="bg-slate-50/70 dark:bg-slate-900/20">
                      <td colSpan={canEditEntries ? 8 : 7} className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3">
                          {(entry.media || []).map((media) => (
                            <div key={media.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                              {media.mediaType === 'VIDEO' ? <Video className="h-4 w-4 text-cyan-500" /> : <FileImage className="h-4 w-4 text-cyan-500" />}
                              <span className="text-xs text-slate-700 dark:text-slate-300">{media.fileAsset.filename || media.fileAsset.name}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEvidence(media)}>{evidenceActionLabel(media)}</Button>
                              {canEditEntries && <button type="button" className="text-xs text-rose-500" onClick={() => handleDeleteEvidence(entry, media)}>{copy.remove}</button>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={canEditEntries ? 8 : 7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                    {copy.noFindings}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} title={editingEntry ? copy.editFinding : copy.newObservation} maxWidth="max-w-5xl">
        <form className="space-y-8" onSubmit={handleSaveEntry}>
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-blue-600">
              <span className="h-6 w-1 rounded-full bg-blue-500" /> {copy.basicInformation}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={copy.serviceName} placeholder={copy.servicePlaceholder} value={entryDraft.serviceName} onChange={(event) => setEntryDraft((current) => ({ ...current, serviceName: event.target.value }))} required />
              <Input label={copy.issueTitle} placeholder={copy.issueTitlePlaceholder} value={entryDraft.issueTitle} onChange={(event) => setEntryDraft((current) => ({ ...current, issueTitle: event.target.value }))} required />
            </div>
            <TextArea label={copy.issueDescription} placeholder={copy.issueDescriptionPlaceholder} value={entryDraft.issueDescription} onChange={(event) => setEntryDraft((current) => ({ ...current, issueDescription: event.target.value }))} required />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-orange-500">
              <span className="h-6 w-1 rounded-full bg-orange-500" /> {copy.severityClassification}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {SEVERITIES.map((severity) => (
                <button key={severity} type="button" onClick={() => setEntryDraft((current) => ({ ...current, severity }))} className={`rounded-2xl border px-4 py-5 text-center text-sm font-bold uppercase tracking-[0.28em] transition-all ${entryDraft.severity === severity ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-500 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300'}`}>
                  {severityLabel(severity)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-fuchsia-500">
              <span className="h-6 w-1 rounded-full bg-fuchsia-500" /> {copy.accessibilityCategory}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label={copy.mainCategory} value={entryDraft.category} onChange={(event) => setEntryDraft((current) => ({ ...current, category: event.target.value as AccessibilityAuditMainCategory, subcategory: '' }))} required>
                <option value="">{copy.selectCategory}</option>
                {availableCategories.map((category) => <option key={category} value={category}>{getAccessibilityCategoryLabel(category, uiLocale)}</option>)}
              </Select>
              <Select label={copy.subcategory} value={entryDraft.subcategory} onChange={(event) => setEntryDraft((current) => ({ ...current, subcategory: event.target.value }))} required>
                <option value="">{copy.selectSubcategory}</option>
                {subcategoryOptions.map((subcategory) => <option key={subcategory} value={subcategory}>{getAccessibilitySubcategoryLabel(entryDraft.category, subcategory, uiLocale)}</option>)}
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-emerald-500">
              <span className="h-6 w-1 rounded-full bg-emerald-500" /> {copy.evidenceMedia}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">{copy.imageProof}</label>
                <label className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 transition-all hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                  <Upload className="mr-2 h-4 w-4" /> {imageFile ? imageFile.name : copy.imageProof}
                </label>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">{copy.videoDemo}</label>
                <label className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 transition-all hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300">
                  <input type="file" accept="video/*" className="hidden" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} />
                  <Video className="mr-2 h-4 w-4" /> {videoFile ? videoFile.name : copy.videoDemo}
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-cyan-500">
              <span className="h-6 w-1 rounded-full bg-cyan-500" /> {copy.digitalLocation}
            </div>
            <Input label={copy.exactPageUrl} placeholder={copy.pageUrlPlaceholder} value={entryDraft.pageUrl} onChange={(event) => setEntryDraft((current) => ({ ...current, pageUrl: event.target.value }))} required />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-indigo-500">
              <span className="h-6 w-1 rounded-full bg-indigo-500" /> {copy.developerRecommendations}
            </div>
            <TextArea label={copy.remediationSteps} placeholder={copy.remediationPlaceholder} value={entryDraft.recommendation} onChange={(event) => setEntryDraft((current) => ({ ...current, recommendation: event.target.value }))} required />
          </section>

          {editingEntry && (editingEntry.media || []).length > 0 && (
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{copy.existingEvidence}</h3>
              <div className="flex flex-wrap gap-3">
                {(editingEntry.media || []).map((media) => (
                  <div key={media.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                    {media.mediaType === 'VIDEO' ? <Video className="h-4 w-4 text-cyan-500" /> : <FileImage className="h-4 w-4 text-cyan-500" />}
                    <span>{media.fileAsset.filename || media.fileAsset.name}</span>
                    <button type="button" className="text-rose-500" onClick={() => handleDeleteEvidence(editingEntry, media)}>{copy.remove}</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEntryModalOpen(false)}>{copy.cancel}</Button>
            <Button type="submit">{editingEntry ? copy.updateFinding : copy.commitFinding}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title={copy.reportPreview} maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {copy.previewDescription}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={previewLocale === 'en' ? 'primary' : 'outline'} onClick={() => handlePreview('en')}>
                {copy.english}
              </Button>
              <Button type="button" size="sm" variant={previewLocale === 'ar' ? 'primary' : 'outline'} onClick={() => handlePreview('ar')}>
                {copy.arabic}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => handleExportPdf(previewLocale)} disabled={exportingPdf}>
                {exportingPdf ? exportInProgressLabel : exportPdfLabel}
              </Button>
            </div>
          </div>
          <iframe id="project-report-preview-frame" title={copy.reportPreview} className="min-h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" srcDoc={previewHtml} />
        </div>
      </Modal>
    </div>
  );
};

export default ProjectReportWorkspace;





