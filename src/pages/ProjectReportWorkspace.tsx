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
import { Permission, ProjectReport, ProjectReportEntry, ProjectReportEntryMedia, ProjectReportEntryOutcome, ProjectReportEntrySeverity, ProjectReportEntryStatus, ProjectReportOutputLocale, ReportBuilderTemplateVersion, Role } from '@/types';

const SEVERITIES: ProjectReportEntrySeverity[] = ['HIGH', 'MEDIUM', 'LOW'];
const DEFAULT_ENTRY_STATUS: ProjectReportEntryStatus = 'OPEN';
const AUDIT_OUTCOMES: ProjectReportEntryOutcome[] = ['PASS', 'FAIL', 'PARTIAL', 'NOT_APPLICABLE', 'NOT_TESTED'];

const emptyEntryDraft = {
  serviceName: '',
  issueTitle: '',
  issueDescription: '',
  auditOutcome: 'FAIL' as ProjectReportEntryOutcome,
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

const outcomeVariant: Record<ProjectReportEntryOutcome, 'success' | 'danger' | 'warning' | 'info' | 'neutral'> = {
  PASS: 'success',
  FAIL: 'danger',
  PARTIAL: 'warning',
  NOT_APPLICABLE: 'info',
  NOT_TESTED: 'neutral',
};

const getAuditOutcome = (entry?: Pick<ProjectReportEntry, 'auditOutcome' | 'rowDataJson'> | null): ProjectReportEntryOutcome => {
  const candidate = entry?.auditOutcome ?? entry?.rowDataJson?.auditOutcome;
  if (candidate === 'PASS' || candidate === 'FAIL' || candidate === 'PARTIAL' || candidate === 'NOT_APPLICABLE' || candidate === 'NOT_TESTED') {
    return candidate;
  }
  return 'FAIL';
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
            addFinding: 'إضافة نتيجة تدقيق',
            totalFindings: 'إجمالي النتائج',
            complianceScore: 'نسبة الامتثال',
            workingChecks: 'ما يعمل بشكل صحيح',
            needsAttention: 'يحتاج معالجة',
            partialChecks: 'يعمل جزئيا',
            notTested: 'لم يتم اختباره',
            high: 'عالية',
            medium: 'متوسطة',
            low: 'منخفضة',
            aiReportSummary: 'ملخص التقرير بالذكاء الاصطناعي',
            introduction: 'المقدمة',
            executiveSummary: 'الملخص التنفيذي',
            strengthsSummary: 'ما يعمل بشكل جيد',
            complianceSummary: 'ملخص الامتثال',
            recommendationsSummary: 'ملخص التوصيات',
            findingsList: 'قائمة الملاحظات',
            findingsListDescription: 'سجل بسيط لنتائج التدقيق يوضح ما يعمل وما يحتاج معالجة، مع الحفاظ على نفس التصنيفات المعتمدة في الأداة.',
            searchFindings: 'ابحث في الملاحظات',
            allSeverities: 'كل مستويات الشدة',
            allOutcomes: 'كل النتائج',
            allCategories: 'كل التصنيفات',
            serviceName: 'اسم الخدمة / الوحدة',
            issueTitle: 'عنوان المشكلة',
            outcome: 'النتيجة',
            severity: 'الشدة',
            category: 'التصنيف',
            subcategory: 'التصنيف الفرعي',
            pageUrl: 'رابط الصفحة',
            media: 'الوسائط',
            actions: 'الإجراءات',
            clickHere: 'اضغط هنا',
            remove: 'إزالة',
            noFindings: 'لا توجد ملاحظات تطابق عوامل التصفية الحالية بعد.',
            editFinding: 'تعديل نتيجة التدقيق',
            newObservation: 'نتيجة تدقيق جديدة',
            basicInformation: 'المعلومات الأساسية',
            auditResult: 'نتيجة التدقيق',
            auditResultHelp: 'اختر هل هذا الجزء يعمل بشكل صحيح أم يحتاج معالجة.',
            outcomePass: 'يعمل بشكل صحيح',
            outcomeFail: 'وجدنا مشكلة',
            outcomePartial: 'يعمل جزئيا',
            outcomeNotApplicable: 'غير منطبق',
            outcomeNotTested: 'لم يتم اختباره',
            servicePlaceholder: 'مثال: تدفق الدفع عبر الجوال',
            issueTitlePlaceholder: 'وصف قصير وواضح للمشكلة',
            issueDescription: 'وصف المشكلة',
            issueDescriptionPlaceholder: 'شرح تفصيلي لعائق إمكانية الوصول...',
            positiveNotePlaceholder: 'اكتب ببساطة ما الذي يعمل بشكل جيد هنا...',
            severityClassification: 'تصنيف الشدة',
            accessibilityCategory: 'تصنيف إمكانية الوصول',
            mainCategory: 'التصنيف الرئيسي',
            subcategoryLabelOptional: 'التصنيف الفرعي (اختياري)',
            subcategoryHelpOptional: 'يمكن ترك التصنيف الفرعي فارغًا عندما تكون النتيجة إيجابية أو غير منطبقة أو غير مختبرة.',
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
            recommendationOptionalHelp: 'يفضل كتابة خطوات المعالجة فقط عند وجود مشكلة أو حالة جزئية.',
            existingEvidence: 'الأدلة الحالية',
            cancel: 'إلغاء',
            updateFinding: 'تحديث الملاحظة',
            commitFinding: 'حفظ الملاحظة',
            reportPreview: 'معاينة تقرير إمكانية الوصول',
            previewDescription: 'تُعرض هذه المعاينة من مسار HTML/PDF في الخلفية وتُظهر شكل التقرير النهائي باستخدام الملاحظات والأدلة الحالية.',
            english: 'English',
            arabic: 'العربية',
            printPdf: 'طباعة / حفظ PDF',
            statusDraft: 'مسودة',
            statusInReview: 'قيد المراجعة',
            statusApproved: 'معتمد',
            statusPublished: 'منشور',
            statusArchived: 'مؤرشف',
            submitForReview: 'إرسال للمراجعة',
            approveReport: 'اعتماد التقرير',
            publishReport: 'نشر للعميل',
            returnToDraft: 'إعادة إلى المسودة',
            reportLockedTitle: 'الملاحظات مقفلة خارج حالة المسودة',
            reportLockedHelp: 'بعد إرسال التقرير للمراجعة، تتوقف تعديلات الملاحظات والأدلة حتى يعيد PM أو Admin التقرير إلى المسودة.',
            statusUpdateSuccess: 'تم تحديث حالة التقرير.',
            statusUpdateError: 'فشل تحديث حالة التقرير.'
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
            addFinding: 'Add Audit Result',
            totalFindings: 'Total Results',
            complianceScore: 'Compliance Score',
            workingChecks: 'Working',
            needsAttention: 'Needs Attention',
            partialChecks: 'Partially Working',
            notTested: 'Not Tested',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
            aiReportSummary: 'AI Report Summary',
            introduction: 'Introduction',
            executiveSummary: 'Executive Summary',
            strengthsSummary: "What's Working",
            complianceSummary: 'Compliance Summary',
            recommendationsSummary: 'Recommendations Summary',
            findingsList: 'Audit Results',
            findingsListDescription: 'A beginner-friendly audit log that shows what is working, what needs attention, and what still needs testing.',
            searchFindings: 'Search findings',
            allSeverities: 'All severities',
            allOutcomes: 'All results',
            allCategories: 'All categories',
            serviceName: 'Service Name',
            issueTitle: 'Issue Title',
            outcome: 'Result',
            severity: 'Severity',
            category: 'Category',
            subcategory: 'Subcategory',
            pageUrl: 'Page URL',
            media: 'Media',
            actions: 'Actions',
            clickHere: 'Click Here',
            remove: 'Remove',
            noFindings: 'No findings match the current filters yet.',
            editFinding: 'Edit Audit Result',
            newObservation: 'New Audit Result',
            basicInformation: 'Basic Information',
            auditResult: 'Audit Result',
            auditResultHelp: 'Choose whether this area is working correctly or needs attention.',
            outcomePass: 'Working',
            outcomeFail: 'Issue found',
            outcomePartial: 'Partially working',
            outcomeNotApplicable: 'Not applicable',
            outcomeNotTested: 'Not tested',
            servicePlaceholder: 'e.g., Mobile Checkout Flow',
            issueTitlePlaceholder: 'Short descriptive summary of the problem',
            issueDescription: 'Issue Description',
            issueDescriptionPlaceholder: 'Detailed breakdown of the accessibility barrier...',
            positiveNotePlaceholder: 'Briefly explain what is working well here...',
            severityClassification: 'Severity Classification',
            accessibilityCategory: 'Accessibility Category',
            mainCategory: 'Main Category',
            subcategoryLabelOptional: 'Subcategory (Optional)',
            subcategoryHelpOptional: 'You can leave subcategory empty when the result is positive, not applicable, or not tested.',
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
            recommendationOptionalHelp: 'Add remediation steps only when this result needs follow-up.',
            existingEvidence: 'Existing Evidence',
            cancel: 'Cancel',
            updateFinding: 'Update Finding',
            commitFinding: 'Commit Finding',
            reportPreview: 'Accessibility Report Preview',
            previewDescription: 'This preview is rendered from the backend HTML/PDF pipeline and shows the final accessibility report layout using the current findings and evidence.',
            english: 'English',
            arabic: 'العربية',
            printPdf: 'Print / Save PDF',
            statusDraft: 'DRAFT',
            statusInReview: 'IN REVIEW',
            statusApproved: 'APPROVED',
            statusPublished: 'PUBLISHED',
            statusArchived: 'ARCHIVED',
            submitForReview: 'Submit for Review',
            approveReport: 'Approve Report',
            publishReport: 'Publish to Client',
            returnToDraft: 'Return to Draft',
            reportLockedTitle: 'Findings are locked outside draft status',
            reportLockedHelp: 'Once a report is submitted for review, findings and evidence stay frozen until PM or Admin returns it to draft.',
            statusUpdateSuccess: 'Report status updated.',
            statusUpdateError: 'Failed to update report status.'
          },
    [isArabic],
  );

  const severityLabel = React.useCallback((severity: ProjectReportEntrySeverity) => {
    if (isArabic) {
      return severity === 'HIGH' ? copy.high : severity === 'MEDIUM' ? copy.medium : severity === 'LOW' ? copy.low : 'حرجة';
    }
    return severityCopy[severity] || severity;
  }, [copy.high, copy.low, copy.medium, isArabic]);

  const outcomeLabel = React.useCallback((outcome: ProjectReportEntryOutcome) => {
    if (outcome === 'PASS') return copy.outcomePass;
    if (outcome === 'PARTIAL') return copy.outcomePartial;
    if (outcome === 'NOT_APPLICABLE') return copy.outcomeNotApplicable;
    if (outcome === 'NOT_TESTED') return copy.outcomeNotTested;
    return copy.outcomeFail;
  }, [copy.outcomeFail, copy.outcomeNotApplicable, copy.outcomeNotTested, copy.outcomePartial, copy.outcomePass]);

  const evidenceActionLabel = React.useCallback((media: ProjectReportEntryMedia) => {
    if (isArabic) {
      if (media.mediaType === 'IMAGE') return 'عرض الصورة';
      if (media.mediaType === 'VIDEO') return 'عرض الفيديو';
      return 'عرض الدليل';
    }
    return mediaActionLabel(media);
  }, [isArabic]);

  const reportStatusLabel = React.useCallback((status: string) => {
    if (status === 'DRAFT') return copy.statusDraft;
    if (status === 'IN_REVIEW') return copy.statusInReview;
    if (status === 'APPROVED') return copy.statusApproved;
    if (status === 'PUBLISHED') return copy.statusPublished;
    if (status === 'ARCHIVED') return copy.statusArchived;
    return status;
  }, [copy.statusApproved, copy.statusArchived, copy.statusDraft, copy.statusInReview, copy.statusPublished]);

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
  const [outcomeFilter, setOutcomeFilter] = React.useState<'ALL' | ProjectReportEntryOutcome>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<'ALL' | AccessibilityAuditMainCategory>('ALL');

  const canEditEntries = hasPermission(Permission.EDIT_PROJECT_REPORT_ENTRIES);
  const canEditReport = hasPermission(Permission.EDIT_PROJECT_REPORTS);
  const canPublishReports = hasPermission(Permission.PUBLISH_PROJECT_REPORTS);
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
  const reportOutputLocale: ProjectReportOutputLocale = report?.outputLocale || getAccessibilityOutputLocale(report?.templateVersion);
  const entryNeedsSeverity = entryDraft.auditOutcome === 'FAIL' || entryDraft.auditOutcome === 'PARTIAL';
  const entryNeedsRecommendation = entryNeedsSeverity;
  const entryNeedsSubcategory = entryNeedsSeverity;

  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      const auditOutcome = getAuditOutcome(entry);
      const matchesSearch = [entry.serviceName, entry.issueTitle, entry.issueDescription, entry.category, entry.subcategory]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesSeverity = severityFilter === 'ALL' || (!!entry.severity && entry.severity === severityFilter);
      const matchesOutcome = outcomeFilter === 'ALL' || auditOutcome === outcomeFilter;
      const matchesCategory = categoryFilter === 'ALL' || entry.category === categoryFilter;
      return matchesSearch && matchesSeverity && matchesOutcome && matchesCategory;
    });
  }, [categoryFilter, entries, outcomeFilter, searchTerm, severityFilter]);

  const summaryCounts = React.useMemo(() => {
    const counts = entries.reduce(
      (acc, entry) => {
        const auditOutcome = getAuditOutcome(entry);
        acc.total += 1;
        if (auditOutcome === 'PASS') acc.pass += 1;
        if (auditOutcome === 'FAIL') acc.fail += 1;
        if (auditOutcome === 'PARTIAL') acc.partial += 1;
        if (auditOutcome === 'NOT_TESTED') acc.notTested += 1;
        if (auditOutcome === 'NOT_APPLICABLE') acc.notApplicable += 1;
        if (entry.severity === 'HIGH') acc.high += 1;
        if (entry.severity === 'MEDIUM') acc.medium += 1;
        if (entry.severity === 'LOW') acc.low += 1;
        return acc;
      },
      { total: 0, pass: 0, fail: 0, partial: 0, notTested: 0, notApplicable: 0, high: 0, medium: 0, low: 0 },
    );
    const scoredChecks = counts.pass + counts.fail + counts.partial;
    const compliance = scoredChecks > 0 ? Math.round(((counts.pass + counts.partial * 0.5) / scoredChecks) * 100) : 0;
    return { ...counts, compliance, scoredChecks };
  }, [entries]);

  const loadData = React.useCallback(async () => {
    if (!reportId) return;
    try {
      const [reportData, entryData] = await Promise.all([
        api.reportBuilderProjects.getProjectReport(reportId),
        api.reportBuilderProjects.listEntries(reportId),
      ]);
      setReport(reportData);
      setEntries(entryData);
      setPreviewLocale(reportData.outputLocale || getAccessibilityOutputLocale(reportData.templateVersion));
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

  const openEntryModal = (entry?: ProjectReportEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setEntryDraft({
        serviceName: entry.serviceName || '',
        issueTitle: entry.issueTitle,
        issueDescription: entry.issueDescription,
        auditOutcome: getAuditOutcome(entry),
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
      severity: entryNeedsSeverity ? entryDraft.severity : undefined,
      category: entryDraft.category,
      subcategory: entryDraft.subcategory,
      pageUrl: normalizeUrl(entryDraft.pageUrl),
      recommendation: entryNeedsRecommendation ? entryDraft.recommendation.trim() : '',
      status: editingEntry?.status || DEFAULT_ENTRY_STATUS,
      rowDataJson: {
        ...(editingEntry?.rowDataJson || {}),
        auditOutcome: entryDraft.auditOutcome,
      },
    };

    try {
      const savedEntry = editingEntry
        ? await api.reportBuilderProjects.updateEntry(reportId, editingEntry.id, payload)
        : await api.reportBuilderProjects.createEntry(reportId, { ...payload, sortOrder: entries.length });

      await uploadSelectedEvidence(savedEntry);
      await loadData();
      setEntryModalOpen(false);
      toast.success(editingEntry ? (isArabic ? 'تم تحديث النتيجة.' : 'Audit result updated.') : (isArabic ? 'تمت إضافة النتيجة.' : 'Audit result added.'));
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || (isArabic ? 'تعذر حفظ نتيجة التدقيق.' : 'Failed to save audit result.'));
    }
  };

  const handleDeleteEntry = async (entry: ProjectReportEntry) => {
    if (!reportId || !window.confirm(`Delete "${entry.issueTitle}"?`)) return;
    try {
      await api.reportBuilderProjects.deleteEntry(reportId, entry.id);
      await loadData();
      toast.success(isArabic ? 'تمت إزالة النتيجة.' : 'Audit result removed.');
    } catch (error) {
      console.error(error);
      toast.error(isArabic ? 'تعذر حذف النتيجة.' : 'Failed to delete audit result.');
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

  const resolveExportLocale = React.useCallback(
    (value?: unknown): AccessibilityAuditOutputLocale => (value === 'ar' ? 'ar' : 'en'),
    [],
  );

  const handlePreview = React.useCallback(async (locale?: unknown) => {
    if (!reportId) return;
    setPreviewLoading(true);
    try {
      const nextLocale = resolveExportLocale(locale ?? previewLocale);
      const html = await api.reportBuilderProjects.getPreviewHtml(reportId, nextLocale);
      setPreviewLocale(nextLocale);
      setPreviewHtml(html);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report preview.');
    } finally {
      setPreviewLoading(false);
    }
  }, [previewLocale, reportId, resolveExportLocale]);

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

  const handleExportPdf = React.useCallback(async (locale?: unknown) => {
    if (!reportId || !canGenerateExports) return;
    setExportingPdf(true);
    try {
      const nextLocale = resolveExportLocale(locale ?? previewLocale);
      const result = await api.reportBuilderProjects.exportPdf(reportId, nextLocale);
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
  }, [canGenerateExports, isArabic, loadData, previewLocale, reportId, resolveExportLocale]);

  const handleGoBack = React.useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(`/app/projects/${projectId}`);
  }, [navigate, projectId]);

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
      toast.success(copy.statusUpdateSuccess);
    } catch (error) {
      console.error(error);
      toast.error(copy.statusUpdateError);
    }
  };

  const handleOutputLocaleChange = async (locale: ProjectReportOutputLocale) => {
    if (!reportId || !canEditReport || !report || report.outputLocale === locale) return;
    try {
      const updated = await api.reportBuilderProjects.updateProjectReport(reportId, { outputLocale: locale });
      setReport(updated);
      setPreviewLocale(locale);
      toast.success(isArabic ? 'تم تحديث لغة التقرير.' : 'Report language updated.');
    } catch (error) {
      console.error(error);
      toast.error(isArabic ? 'تعذر تحديث لغة التقرير.' : 'Failed to update report language.');
    }
  };

  if (loading) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">{copy.loadingReport}</p></GlassCard>;
  }

  if (!report) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">{copy.reportNotFound}</p></GlassCard>;
  }

  const isDraftReport = report.status === 'DRAFT';
  const canManageDraftContent = canEditEntries && isDraftReport;

  return (
    <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">{report.title}</h1>
              <Badge
                variant={
                  report.status === 'PUBLISHED'
                    ? 'success'
                    : report.status === 'APPROVED'
                      ? 'warning'
                      : report.status === 'ARCHIVED'
                        ? 'neutral'
                        : 'info'
                }
              >
                {reportStatusLabel(report.status)}
              </Badge>
              <Badge variant="neutral">{report.visibility}</Badge>
              <Badge variant="neutral">{reportOutputLocale.toUpperCase()}</Badge>
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

        <div className="flex flex-col gap-3 lg:items-end">
          {!isClientUser && canEditReport && (
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                {isArabic ? 'لغة التقرير' : 'Report Language'}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {isArabic
                  ? 'احفظ لغة الإخراج التي سيُراجع ويُنشر ويُصدر بها هذا التقرير.'
                  : 'Save the output language this report should be reviewed, published, and exported in.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={reportOutputLocale === 'en' ? 'primary' : 'outline'} onClick={() => handleOutputLocaleChange('en')}>
                  {copy.english}
                </Button>
                <Button type="button" size="sm" variant={reportOutputLocale === 'ar' ? 'primary' : 'outline'} onClick={() => handleOutputLocaleChange('ar')}>
                  {copy.arabic}
                </Button>
              </div>
            </div>
          )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handlePreview(previewLocale)} disabled={previewLoading}>
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
          {canEditReport && report.status === 'DRAFT' && (
            <Button variant="outline" onClick={() => handleStatusChange('IN_REVIEW')}>
              {copy.submitForReview}
            </Button>
          )}
          {canPublishReports && report.status === 'IN_REVIEW' && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange('DRAFT')}>
                {copy.returnToDraft}
              </Button>
              <Button onClick={() => handleStatusChange('APPROVED')}>
                {copy.approveReport}
              </Button>
            </>
          )}
          {canPublishReports && report.status === 'APPROVED' && (
            <>
              <Button variant="outline" onClick={() => handleStatusChange('DRAFT')}>
                {copy.returnToDraft}
              </Button>
              <Button onClick={() => handleStatusChange('PUBLISHED')}>
                {copy.publishReport}
              </Button>
            </>
          )}
          {canPublishReports && report.status === 'PUBLISHED' && (
            <Button variant="outline" onClick={() => handleStatusChange('DRAFT')}>
              {copy.returnToDraft}
            </Button>
          )}
          {canManageDraftContent && (
            <Button onClick={() => openEntryModal()}>
              <Plus className="mr-2 h-4 w-4" /> {copy.addFinding}
            </Button>
          )}
        </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <GlassCard className="p-3 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.complianceScore}</p>
          <p className="mt-1.5 text-xl font-bold text-cyan-600 md:text-2xl">{summaryCounts.compliance}%</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{summaryCounts.scoredChecks} {isArabic ? 'عنصرًا تم تقييمه' : 'scored checks'}</p>
        </GlassCard>
        <GlassCard className="p-3 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.workingChecks}</p>
          <p className="mt-1.5 text-xl font-bold text-emerald-600 md:text-2xl">{summaryCounts.pass}</p>
        </GlassCard>
        <GlassCard className="p-3 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.needsAttention}</p>
          <p className="mt-1.5 text-xl font-bold text-rose-600 md:text-2xl">{summaryCounts.fail}</p>
        </GlassCard>
        <GlassCard className="p-3 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.partialChecks}</p>
          <p className="mt-1.5 text-xl font-bold text-amber-500 md:text-2xl">{summaryCounts.partial}</p>
        </GlassCard>
        <GlassCard className="p-3 md:p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{copy.notTested}</p>
          <p className="mt-1.5 text-xl font-bold text-slate-700 dark:text-slate-200 md:text-2xl">{summaryCounts.notTested}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {summaryCounts.notApplicable} {isArabic ? 'غير منطبق' : 'not applicable'}
          </p>
        </GlassCard>
      </div>

      {!isDraftReport && !isClientUser && (
        <GlassCard className="border-amber-200/70 bg-amber-50/80 dark:border-amber-500/20 dark:bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{copy.reportLockedTitle}</p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{copy.reportLockedHelp}</p>
        </GlassCard>
      )}

      {(report.summaryJson as any)?.introduction || (report.summaryJson as any)?.statisticsSummary || (report.summaryJson as any)?.executiveSummary || (report.summaryJson as any)?.strengthsSummary || (report.summaryJson as any)?.complianceSummary || (report.summaryJson as any)?.recommendationsSummary ? (
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
            {(report.summaryJson as any)?.strengthsSummary && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{copy.strengthsSummary}</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).strengthsSummary}</p>
              </div>
            )}
            {(report.summaryJson as any)?.complianceSummary && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">{copy.complianceSummary}</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).complianceSummary}</p>
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
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative min-w-[220px]">
              <Input placeholder={copy.searchFindings} value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            <Select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value as 'ALL' | ProjectReportEntryOutcome)}>
              <option value="ALL">{copy.allOutcomes}</option>
              {AUDIT_OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{outcomeLabel(outcome)}</option>)}
            </Select>
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
                <th className="pb-3 pr-4">{copy.outcome}</th>
                <th className="pb-3 pr-4">{copy.severity}</th>
                <th className="pb-3 pr-4">{copy.category}</th>
                <th className="pb-3 pr-4">{copy.subcategory}</th>
                <th className="pb-3 pr-4">{copy.pageUrl}</th>
                <th className="pb-3 pr-4">{copy.media}</th>
                {canManageDraftContent && <th className="pb-3 text-right">{copy.actions}</th>}
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
                    <td className="py-4 pr-4"><Badge variant={outcomeVariant[getAuditOutcome(entry)]}>{outcomeLabel(getAuditOutcome(entry))}</Badge></td>
                    <td className="py-4 pr-4">
                      {entry.severity ? (
                        <Badge variant={severityBadgeVariant[(entry.severity || 'MEDIUM') as ProjectReportEntrySeverity]}>
                          {severityLabel((entry.severity || 'MEDIUM') as ProjectReportEntrySeverity)}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
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
                    {canManageDraftContent && (
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
                      <td colSpan={canManageDraftContent ? 9 : 8} className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3">
                          {(entry.media || []).map((media) => (
                            <div key={media.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                              {media.mediaType === 'VIDEO' ? <Video className="h-4 w-4 text-cyan-500" /> : <FileImage className="h-4 w-4 text-cyan-500" />}
                              <span className="text-xs text-slate-700 dark:text-slate-300">{media.fileAsset.filename || media.fileAsset.name}</span>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEvidence(media)}>{evidenceActionLabel(media)}</Button>
                              {canManageDraftContent && <button type="button" className="text-xs text-rose-500" onClick={() => handleDeleteEvidence(entry, media)}>{copy.remove}</button>}
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
                  <td colSpan={canManageDraftContent ? 9 : 8} className="py-12 text-center text-slate-500 dark:text-slate-400">
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
              <Input label={copy.issueTitle} placeholder={entryNeedsRecommendation ? copy.issueTitlePlaceholder : copy.positiveNotePlaceholder} value={entryDraft.issueTitle} onChange={(event) => setEntryDraft((current) => ({ ...current, issueTitle: event.target.value }))} required />
            </div>
            <TextArea label={copy.issueDescription} placeholder={entryNeedsRecommendation ? copy.issueDescriptionPlaceholder : copy.positiveNotePlaceholder} value={entryDraft.issueDescription} onChange={(event) => setEntryDraft((current) => ({ ...current, issueDescription: event.target.value }))} required />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-emerald-500">
              <span className="h-6 w-1 rounded-full bg-emerald-500" /> {copy.auditResult}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.auditResultHelp}</p>
            <div className="grid gap-3 md:grid-cols-5">
              {AUDIT_OUTCOMES.map((outcome) => (
                <button
                  key={outcome}
                  type="button"
                  onClick={() => setEntryDraft((current) => ({ ...current, auditOutcome: outcome }))}
                  className={`rounded-2xl border px-4 py-5 text-center text-sm font-bold transition-all ${
                    entryDraft.auditOutcome === outcome
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm dark:bg-cyan-500/10 dark:text-cyan-300'
                      : 'border-slate-200 text-slate-500 hover:border-cyan-300 dark:border-slate-700 dark:text-slate-300'
                  }`}
                >
                  {outcomeLabel(outcome)}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-orange-500">
              <span className="h-6 w-1 rounded-full bg-orange-500" /> {copy.severityClassification}
            </div>
            {entryNeedsSeverity ? (
              <div className="grid gap-3 md:grid-cols-3">
                {SEVERITIES.map((severity) => (
                  <button key={severity} type="button" onClick={() => setEntryDraft((current) => ({ ...current, severity }))} className={`rounded-2xl border px-4 py-5 text-center text-sm font-bold uppercase tracking-[0.28em] transition-all ${entryDraft.severity === severity ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-500 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300'}`}>
                    {severityLabel(severity)}
                  </button>
                ))}
              </div>
            ) : (
              <GlassCard className="border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  {isArabic ? 'ليست هناك حاجة لتحديد شدة عندما تكون النتيجة ناجحة أو غير منطبقة أو غير مختبرة.' : 'Severity is only needed when the result has an issue or is partially working.'}
                </p>
              </GlassCard>
            )}
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
              <div>
                {!entryNeedsSubcategory && (
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{copy.subcategoryHelpOptional}</p>
                )}
                <Select label={entryNeedsSubcategory ? copy.subcategory : copy.subcategoryLabelOptional} value={entryDraft.subcategory} onChange={(event) => setEntryDraft((current) => ({ ...current, subcategory: event.target.value }))} required={entryNeedsSubcategory}>
                <option value="">{copy.selectSubcategory}</option>
                {subcategoryOptions.map((subcategory) => <option key={subcategory} value={subcategory}>{getAccessibilitySubcategoryLabel(entryDraft.category, subcategory, uiLocale)}</option>)}
                </Select>
              </div>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">{copy.recommendationOptionalHelp}</p>
            <TextArea
              label={copy.remediationSteps}
              placeholder={entryNeedsRecommendation ? copy.remediationPlaceholder : copy.positiveNotePlaceholder}
              value={entryDraft.recommendation}
              onChange={(event) => setEntryDraft((current) => ({ ...current, recommendation: event.target.value }))}
              required={entryNeedsRecommendation}
            />
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
              {canGenerateExports && (
                <Button type="button" size="sm" variant="outline" onClick={() => handleExportPdf(previewLocale)} disabled={exportingPdf}>
                  {exportingPdf ? exportInProgressLabel : exportPdfLabel}
                </Button>
              )}
            </div>
          </div>
          <iframe id="project-report-preview-frame" title={copy.reportPreview} className="min-h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" srcDoc={previewHtml} />
        </div>
      </Modal>
    </div>
  );
};

export default ProjectReportWorkspace;





