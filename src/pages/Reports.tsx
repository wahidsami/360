import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, FileText, Filter, FolderOpen, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, GlassCard, Input, KpiCard, Modal, Select } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ProjectReport, Role } from '@/types';

const INTERNAL_REPORT_ROLES = [Role.SUPER_ADMIN, Role.OPS, Role.PM, Role.DEV, Role.QA, Role.FINANCE];
const CLIENT_REPORT_ROLES = [Role.CLIENT_OWNER, Role.CLIENT_MANAGER, Role.CLIENT_MEMBER];

const statusVariant = (status: string) => {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'APPROVED') return 'warning';
  if (status === 'ARCHIVED') return 'neutral';
  return 'info';
};

export const Reports: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === 'ar';
  const isClientReportsUser = !!user && CLIENT_REPORT_ROLES.includes(user.role);
  const isInternalReportsUser = !!user && INTERNAL_REPORT_ROLES.includes(user.role);

  const copy = useMemo(
    () =>
      isArabic
        ? {
            title: 'تقارير إمكانية الوصول',
            subtitleClient: 'تظهر هنا التقارير المنشورة الجاهزة لمشاركة العميل.',
            subtitleInternal: 'مكتبة موحدة لتقارير إمكانية الوصول المنشأة من القوالب فقط.',
            publishedOnly: 'التقارير المنشورة فقط',
            totalReports: 'إجمالي التقارير',
            projects: 'المشاريع',
            latestRelease: 'أحدث إصدار',
            notAvailable: 'غير متاح',
            library: 'مكتبة التقارير',
            libraryHelpClient: 'افتح التقرير أو عاين النسخة النهائية أو نزّل آخر ملف PDF معتمد.',
            libraryHelpInternal: 'راجع حالة التقارير وافتح مساحة العمل أو عاين المخرجات النهائية أو نزّل آخر ملف PDF.',
            searchPlaceholder: 'ابحث في التقارير أو المشاريع أو العملاء',
            allStatuses: 'كل الحالات',
            statusDraft: 'مسودة',
            statusInReview: 'قيد المراجعة',
            statusApproved: 'معتمد',
            statusPublished: 'منشور',
            statusArchived: 'مؤرشف',
            loading: 'جارٍ تحميل التقارير...',
            noResults: 'لا توجد تقارير مطابقة للبحث الحالي.',
            project: 'المشروع',
            client: 'العميل',
            version: 'الإصدار',
            findings: 'الملاحظات',
            performedBy: 'تم التنفيذ بواسطة',
            unknown: 'غير معروف',
            visibilityClient: 'للعميل',
            visibilityInternal: 'داخلي',
            preview: 'معاينة',
            openReport: 'فتح التقرير',
            downloadLatest: 'تنزيل آخر نسخة',
            noExport: 'لا توجد نسخة PDF بعد',
            previewTitle: 'معاينة التقرير',
            loadError: 'فشل تحميل التقارير.',
            previewError: 'فشل تحميل معاينة التقرير.',
            exportError: 'لا توجد نسخة PDF متاحة لهذا التقرير حتى الآن.',
          }
        : {
            title: 'Accessibility Reports',
            subtitleClient: 'Published client-ready reports appear here.',
            subtitleInternal: 'A single library of accessibility reports created from templates only.',
            publishedOnly: 'Published only',
            totalReports: 'Total Reports',
            projects: 'Projects',
            latestRelease: 'Latest Release',
            notAvailable: 'N/A',
            library: 'Report Library',
            libraryHelpClient: 'Open the report, preview the final output, or download the latest approved PDF.',
            libraryHelpInternal: 'Review report status, open the workspace, preview the rendered output, or download the latest PDF.',
            searchPlaceholder: 'Search reports, projects, or clients',
            allStatuses: 'All statuses',
            statusDraft: 'DRAFT',
            statusInReview: 'IN REVIEW',
            statusApproved: 'APPROVED',
            statusPublished: 'PUBLISHED',
            statusArchived: 'ARCHIVED',
            loading: 'Loading reports...',
            noResults: 'No reports match the current search.',
            project: 'Project',
            client: 'Client',
            version: 'Version',
            findings: 'Findings',
            performedBy: 'Performed by',
            unknown: 'Unknown',
            visibilityClient: 'CLIENT',
            visibilityInternal: 'INTERNAL',
            preview: 'Preview',
            openReport: 'Open Report',
            downloadLatest: 'Download Latest PDF',
            noExport: 'No PDF Yet',
            previewTitle: 'Report Preview',
            loadError: 'Failed to load reports.',
            previewError: 'Failed to load report preview.',
            exportError: 'No PDF export is available for this report yet.',
          },
    [isArabic],
  );

  const statusLabel = useCallback(
    (status: string) => {
      if (status === 'DRAFT') return copy.statusDraft;
      if (status === 'IN_REVIEW') return copy.statusInReview;
      if (status === 'APPROVED') return copy.statusApproved;
      if (status === 'PUBLISHED') return copy.statusPublished;
      if (status === 'ARCHIVED') return copy.statusArchived;
      return status;
    },
    [copy.statusApproved, copy.statusArchived, copy.statusDraft, copy.statusInReview, copy.statusPublished],
  );

  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ProjectReport['status']>('ALL');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    if (user && !isInternalReportsUser && !isClientReportsUser) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isClientReportsUser, isInternalReportsUser, navigate, user]);

  const loadReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = isClientReportsUser
        ? await api.reportBuilderProjects.listClientVisibleReports()
        : await api.reportBuilderProjects.listAccessibleReports();
      setReports(data || []);
    } catch (error) {
      console.error(error);
      toast.error(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, isClientReportsUser, user]);

  useEffect(() => {
    if (!user) return;
    if (!isInternalReportsUser && !isClientReportsUser) return;
    loadReports();
  }, [isClientReportsUser, isInternalReportsUser, loadReports, user]);

  const openPreview = useCallback(
    async (report: ProjectReport) => {
      try {
        const html = await api.reportBuilderProjects.getPreviewHtml(report.id);
        setPreviewHtml(html);
        setPreviewTitle(report.title);
        setPreviewModalOpen(true);
      } catch (error) {
        console.error(error);
        toast.error(copy.previewError);
      }
    },
    [copy.previewError],
  );

  const downloadLatestExport = useCallback(
    async (report: ProjectReport) => {
      try {
        const latest = await api.reportBuilderProjects.getLatestExport(report.id);
        window.open(latest.url, '_blank', 'noopener,noreferrer');
      } catch (error) {
        console.error(error);
        toast.error(copy.exportError);
      }
    },
    [copy.exportError],
  );

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const haystack = [
          report.title,
          report.project?.name,
          report.client?.name,
          report.template?.name,
          report.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const matchesSearch = haystack.includes(searchTerm.toLowerCase());
        const matchesStatus = isClientReportsUser || statusFilter === 'ALL' || report.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [isClientReportsUser, reports, searchTerm, statusFilter],
  );

  const latestPublishedAt = useMemo(() => {
    const published = reports
      .map((report) => report.publishedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return published[0] || null;
  }, [reports]);

  const uniqueProjectCount = useMemo(
    () => new Set(reports.map((report) => report.projectId)).size,
    [reports],
  );

  if (!isInternalReportsUser && !isClientReportsUser) {
    return null;
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-white">{copy.title}</h1>
            <p className="text-slate-400">{isClientReportsUser ? copy.subtitleClient : copy.subtitleInternal}</p>
          </div>
          {isClientReportsUser && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {copy.publishedOnly}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard label={copy.totalReports} value={String(reports.length)} icon={<FileText />} />
          <KpiCard label={copy.projects} value={String(uniqueProjectCount)} icon={<FolderOpen />} />
          <KpiCard
            label={copy.latestRelease}
            value={latestPublishedAt ? new Date(latestPublishedAt).toLocaleDateString(isArabic ? 'ar' : 'en') : copy.notAvailable}
            icon={<ShieldCheck />}
          />
        </div>

        <GlassCard className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-white">{copy.library}</h3>
              <p className="text-sm text-slate-400">
                {isClientReportsUser ? copy.libraryHelpClient : copy.libraryHelpInternal}
              </p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Input
                  placeholder={copy.searchPlaceholder}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              </div>
              {!isClientReportsUser && (
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'ALL' | ProjectReport['status'])}
                  className="w-44"
                >
                  <option value="ALL">{copy.allStatuses}</option>
                  <option value="DRAFT">{copy.statusDraft}</option>
                  <option value="IN_REVIEW">{copy.statusInReview}</option>
                  <option value="APPROVED">{copy.statusApproved}</option>
                  <option value="PUBLISHED">{copy.statusPublished}</option>
                  <option value="ARCHIVED">{copy.statusArchived}</option>
                </Select>
              )}
            </div>
          </div>

          <div className="grid gap-4">
            {loading && (
              <GlassCard>
                <p className="text-sm text-slate-400">{copy.loading}</p>
              </GlassCard>
            )}

            {!loading && filteredReports.map((report) => {
              const hasExport = (report.exports?.length || 0) > 0;
              return (
                <GlassCard key={report.id} className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-white">{report.title}</h2>
                        <Badge variant={statusVariant(report.status)}>{statusLabel(report.status)}</Badge>
                        <Badge variant="neutral">
                          {report.visibility === 'CLIENT' ? copy.visibilityClient : copy.visibilityInternal}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        {copy.project}: {report.project?.name || copy.unknown} / {copy.client}: {report.client?.name || copy.unknown}
                      </p>
                      <p className="text-sm text-slate-400">
                        {report.template.name} / {copy.version} {report.templateVersion.versionNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {copy.findings}: {report._count?.entries ?? 0} / {copy.performedBy} {report.performedBy?.name || copy.unknown}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => openPreview(report)}>
                        <Eye className="w-4 h-4 mr-2" /> {copy.preview}
                      </Button>
                      <Button variant="outline" onClick={() => navigate(`/app/projects/${report.projectId}/report-builder/${report.id}`)}>
                        <FolderOpen className="w-4 h-4 mr-2" /> {copy.openReport}
                      </Button>
                      <Button variant="outline" onClick={() => downloadLatestExport(report)} disabled={!hasExport}>
                        <Download className="w-4 h-4 mr-2" /> {hasExport ? copy.downloadLatest : copy.noExport}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}

            {!loading && filteredReports.length === 0 && (
              <GlassCard>
                <div className="py-10 text-center text-slate-400">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  {copy.noResults}
                </div>
              </GlassCard>
            )}
          </div>
        </GlassCard>
      </div>

      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title={previewTitle || copy.previewTitle} maxWidth="max-w-6xl">
        <iframe
          title={copy.previewTitle}
          className="w-full min-h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
          srcDoc={previewHtml}
        />
      </Modal>
    </>
  );
};

export default Reports;
