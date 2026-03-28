import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Download,
  Eye,
  FileText,
  Filter,
  FolderOpen,
  ShieldCheck,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { Badge, Button, GlassCard, Input, KpiCard, Modal, Select } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Project, ProjectReport, Report, Role } from '@/types';

const INTERNAL_REPORT_ROLES = [Role.SUPER_ADMIN, Role.OPS, Role.PM, Role.FINANCE];
const CLIENT_REPORT_ROLES = [Role.CLIENT_OWNER, Role.CLIENT_MANAGER, Role.CLIENT_MEMBER];

const formatDate = (value?: string | null) => {
  if (!value) return 'Not published yet';
  return new Date(value).toLocaleString();
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  TECHNICAL: '#f43f5e',
  EXECUTIVE: '#10b981',
  COMPLIANCE: '#06b6d4',
  OTHER: '#6366f1',
};

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
};

const startOfWeek = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addWeeks = (value: Date, weeks: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + weeks * 7);
  return date;
};

const ClientReportsView: React.FC<{
  reports: ProjectReport[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onOpenWorkspace: (report: ProjectReport) => void;
  onPreview: (report: ProjectReport) => void;
  onDownloadLatest: (report: ProjectReport) => void;
}> = ({ reports, loading, searchTerm, setSearchTerm, onOpenWorkspace, onPreview, onDownloadLatest }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const copy = React.useMemo(
    () =>
      isArabic
        ? {
            title: 'التقارير المنشورة',
            subtitle: 'تظهر هنا تقارير إمكانية الوصول الموجهة للعميل بعد نشرها وتصديرها.',
            publishedOnly: 'منشور فقط. آمن للعميل بشكل افتراضي.',
            publishedReports: 'التقارير المنشورة',
            latestRelease: 'أحدث إصدار',
            notAvailable: 'غير متاح',
            toolVersions: 'إصدارات الأداة',
            reportLibrary: 'مكتبة التقارير',
            reportLibraryHelp: 'افتح التقرير، أو عاين المخرج النهائي، أو نزّل آخر نسخة معتمدة.',
            searchPlaceholder: 'ابحث في التقارير أو المشاريع أو الأدوات',
            loading: 'جاري تحميل التقارير المنشورة...',
            unknownProject: 'مشروع غير معروف',
            version: 'الإصدار',
            published: 'تم النشر',
            performedBy: 'تم التنفيذ بواسطة',
            unknown: 'غير معروف',
            preview: 'معاينة',
            openReport: 'فتح التقرير',
            downloadLatest: 'تنزيل آخر نسخة',
            noExport: 'لا توجد نسخة مصدرة بعد',
            noResults: 'لا توجد تقارير منشورة تطابق البحث الحالي.',
          }
        : {
            title: 'Published Reports',
            subtitle: 'Client-facing accessibility reports are available here once they are published and exported.',
            publishedOnly: 'Published only. Client-safe by default.',
            publishedReports: 'Published Reports',
            latestRelease: 'Latest Release',
            notAvailable: 'N/A',
            toolVersions: 'Tool Versions',
            reportLibrary: 'Report Library',
            reportLibraryHelp: 'Open a report, preview the rendered output, or download the latest approved export.',
            searchPlaceholder: 'Search reports, projects, or tools',
            loading: 'Loading published reports...',
            unknownProject: 'Unknown project',
            version: 'Version',
            published: 'Published',
            performedBy: 'Performed by',
            unknown: 'Unknown',
            preview: 'Preview',
            openReport: 'Open Report',
            downloadLatest: 'Download Latest Export',
            noExport: 'No Export Yet',
            noResults: 'No published reports match the current search.',
          },
    [isArabic],
  );

  const filteredReports = useMemo(
    () =>
      reports.filter((report) => {
        const haystack = [
          report.title,
          report.project?.name,
          report.client?.name,
          report.template?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(searchTerm.toLowerCase());
      }),
    [reports, searchTerm],
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{copy.title}</h1>
          <p className="text-slate-400">
            {copy.subtitle}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {copy.publishedOnly}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard label={copy.publishedReports} value={String(reports.length)} icon={<FileText />} />
        <KpiCard
          label={copy.latestRelease}
          value={reports[0]?.publishedAt ? new Date(reports[0].publishedAt).toLocaleDateString(isArabic ? 'ar' : 'en') : copy.notAvailable}
          icon={<ShieldCheck />}
        />
        <KpiCard
          label={copy.toolVersions}
          value={String(new Set(reports.map((report) => report.templateVersionId)).size)}
          icon={<BarChart3 />}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">{copy.reportLibrary}</h3>
          <p className="text-sm text-slate-400">{copy.reportLibraryHelp}</p>
        </div>
        <div className="relative flex-1 md:max-w-sm w-full">
          <Input
            placeholder={copy.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
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
                    <Badge variant="success">{report.status}</Badge>
                    <Badge variant="info">{report.template.category}</Badge>
                  </div>
                  <p className="text-sm text-slate-400">
                    {report.project?.name || copy.unknownProject} / {report.template.name} / {copy.version} {report.templateVersion.versionNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {copy.published} {formatDate(report.publishedAt)} / {copy.performedBy} {report.performedBy?.name || copy.unknown}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => onPreview(report)}>
                    <Eye className="w-4 h-4 mr-2" /> {copy.preview}
                  </Button>
                  <Button variant="outline" onClick={() => onOpenWorkspace(report)}>
                    <FolderOpen className="w-4 h-4 mr-2" /> {copy.openReport}
                  </Button>
                  <Button variant="outline" onClick={() => onDownloadLatest(report)} disabled={!hasExport}>
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
    </div>
  );
};

export const Reports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isArabic = i18n.language === 'ar';
  const isClientReportsUser = !!user && CLIENT_REPORT_ROLES.includes(user.role);
  const isInternalReportsUser = !!user && INTERNAL_REPORT_ROLES.includes(user.role);
  const internalCopy = React.useMemo(
    () =>
      isArabic
        ? {
            generatedSeries: 'تم الإنشاء',
            publishedSeries: 'تم النشر',
            noChartData: 'لا توجد بيانات تقارير كافية بعد.',
            technical: 'تقني',
            executive: 'تنفيذي',
            compliance: 'امتثال',
            other: 'أخرى',
            draft: 'مسودة',
            published: 'منشور',
            archived: 'مؤرشف',
            noGeneratedFile: 'لا يوجد ملف مُولد لهذا التقرير بعد.',
            reportDownloaded: 'تم بدء تنزيل التقرير.',
            reportDownloadFailed: 'فشل تنزيل التقرير.',
            generateTitle: 'إنشاء تقرير',
            projectLabel: 'المشروع',
            formatLabel: 'الصيغة',
            noProjects: 'لا توجد مشاريع متاحة',
            cancel: 'إلغاء',
            generate: 'إنشاء',
            generating: 'جارٍ الإنشاء...',
          }
        : {
            generatedSeries: 'Generated',
            publishedSeries: 'Published',
            noChartData: 'Not enough report data yet.',
            technical: 'Technical',
            executive: 'Executive',
            compliance: 'Compliance',
            other: 'Other',
            draft: 'DRAFT',
            published: 'PUBLISHED',
            archived: 'ARCHIVED',
            noGeneratedFile: 'No generated file is available for this report yet.',
            reportDownloaded: 'Report download started.',
            reportDownloadFailed: 'Failed to download report.',
            generateTitle: 'Generate Report',
            projectLabel: 'Project',
            formatLabel: 'Format',
            noProjects: 'No projects available',
            cancel: 'Cancel',
            generate: 'Generate',
            generating: 'Generating...',
          },
    [isArabic],
  );

  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [publishedReports, setPublishedReports] = useState<ProjectReport[]>([]);
  const [loadingPublishedReports, setLoadingPublishedReports] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  useEffect(() => {
    if (user && !isInternalReportsUser && !isClientReportsUser) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [isClientReportsUser, isInternalReportsUser, navigate, user]);

  const loadPublishedReports = React.useCallback(async () => {
    setLoadingPublishedReports(true);
    try {
      const data = await api.reportBuilderProjects.listClientVisibleReports();
      setPublishedReports(data || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load published reports.');
    } finally {
      setLoadingPublishedReports(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    if (isClientReportsUser) {
      loadPublishedReports();
      return;
    }

    if (!isInternalReportsUser) return;

    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const data = await api.reports.list();
        setReports(data || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load report archive.');
      } finally {
        setLoadingReports(false);
      }
    };
    const loadProjects = async () => {
      const data = await api.projects.list();
      setProjects(data || []);
      if (data && data.length > 0) setGenerateProjectId(data[0].id);
    };

    loadReports();
    loadProjects();
  }, [isClientReportsUser, isInternalReportsUser, loadPublishedReports, user]);

  const openPreview = async (report: ProjectReport) => {
    try {
      const html = await api.reportBuilderProjects.getPreviewHtml(report.id);
      setPreviewHtml(html);
      setPreviewTitle(report.title);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report preview.');
    }
  };

  const downloadLatestExport = async (report: ProjectReport) => {
    try {
      const latest = await api.reportBuilderProjects.getLatestExport(report.id);
      window.open(latest.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
      toast.error('No exported file is available for this report yet.');
    }
  };

  const openWorkspace = (report: ProjectReport) => {
    navigate(`/app/projects/${report.projectId}/report-builder/${report.id}`);
  };

  // Generate modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateProjectId, setGenerateProjectId] = useState('');
  const [generateFormat, setGenerateFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!generateProjectId) { toast.error('Please select a project'); return; }
    setGenerating(true);
    try {
      const res = await api.projects.generateReport(generateProjectId, { format: generateFormat });
      toast.success(`Report generated (${generateFormat.toUpperCase()})`);
      setGenerateModalOpen(false);
      const data = await api.reports.list();
      setReports(data || []);
      if (res?.reportId && res?.generatedFileKey) {
        const ext = generateFormat === 'pdf' ? 'pdf' : 'pptx';
        await api.projects.downloadReport(generateProjectId, res.reportId, `report.${ext}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const reportTypeLabel = React.useCallback(
    (type?: string) => {
      switch ((type || 'OTHER').toUpperCase()) {
        case 'TECHNICAL':
          return internalCopy.technical;
        case 'EXECUTIVE':
          return internalCopy.executive;
        case 'COMPLIANCE':
          return internalCopy.compliance;
        default:
          return internalCopy.other;
      }
    },
    [internalCopy.compliance, internalCopy.executive, internalCopy.other, internalCopy.technical],
  );

  const reportStatusLabel = React.useCallback(
    (status?: string) => {
      switch ((status || 'DRAFT').toUpperCase()) {
        case 'PUBLISHED':
          return internalCopy.published;
        case 'ARCHIVED':
          return internalCopy.archived;
        default:
          return internalCopy.draft;
      }
    },
    [internalCopy.archived, internalCopy.draft, internalCopy.published],
  );

  const downloadLegacyReport = React.useCallback(
    async (report: Report) => {
      if (!report.generatedFileKey) {
        toast.error(internalCopy.noGeneratedFile);
        return;
      }
      try {
        const extension = report.generatedFileKey.split('.').pop() || 'pdf';
        const safeTitle = (report.title || 'report').replace(/[<>:"/\\|?*\u0000-\u001F]+/g, '-');
        await api.projects.downloadReport(report.projectId, report.id, `${safeTitle}.${extension}`);
        toast.success(internalCopy.reportDownloaded);
      } catch (error) {
        console.error(error);
        toast.error(internalCopy.reportDownloadFailed);
      }
    },
    [internalCopy.noGeneratedFile, internalCopy.reportDownloadFailed, internalCopy.reportDownloaded],
  );

  const dashboardStats = React.useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalReports = reports.length;
    const generatedThisMonth = reports.filter((report) => report.generatedAt && new Date(report.generatedAt) >= monthStart).length;
    const storageUsedBytes = reports.reduce((sum, report) => sum + (report.generatedFileSizeBytes || 0), 0);

    const typeOrder = ['TECHNICAL', 'EXECUTIVE', 'COMPLIANCE', 'OTHER'];
    const compositionData = typeOrder
      .map((type) => {
        const value = reports.filter((report) => (report.type || 'OTHER').toUpperCase() === type).length;
        return {
          key: type,
          name: reportTypeLabel(type),
          value,
          color: REPORT_TYPE_COLORS[type] || REPORT_TYPE_COLORS.OTHER,
        };
      })
      .filter((entry) => entry.value > 0);

    const currentWeekStart = startOfWeek(now);
    const earliestWeekStart = addWeeks(currentWeekStart, -3);
    const trendData = Array.from({ length: 4 }).map((_, index) => {
      const weekStart = addWeeks(earliestWeekStart, index);
      const weekEnd = addWeeks(weekStart, 1);
      return {
        name: isArabic ? `الأسبوع ${index + 1}` : `Week ${index + 1}`,
        generated: reports.filter((report) => {
          if (!report.generatedAt) return false;
          const value = new Date(report.generatedAt);
          return value >= weekStart && value < weekEnd;
        }).length,
        published: reports.filter((report) => {
          if (!report.publishedAt) return false;
          const value = new Date(report.publishedAt);
          return value >= weekStart && value < weekEnd;
        }).length,
      };
    });

    return {
      totalReports,
      generatedThisMonth,
      storageUsedBytes,
      compositionData,
      trendData,
    };
  }, [isArabic, reportTypeLabel, reports]);

  const filteredReports = reports.filter((report) => {
    const haystack = [
      report.title,
      report.project?.name,
      report.generatedBy,
      report.type,
      report.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || (report.type || 'OTHER').toUpperCase() === filterType;
    return matchesSearch && matchesType;
  });

  if (isClientReportsUser) {
    return (
      <>
        <ClientReportsView
          reports={publishedReports}
          loading={loadingPublishedReports}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onOpenWorkspace={openWorkspace}
          onPreview={openPreview}
          onDownloadLatest={downloadLatestExport}
        />
        <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title={previewTitle || 'Report Preview'} maxWidth="max-w-6xl">
          <iframe
            title="Published Report Preview"
            className="w-full min-h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            srcDoc={previewHtml}
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-white">{t('reports')}</h1>
            <p className="text-slate-400">{t('reports_subtitle')}</p>
          </div>
          <Button className="shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={() => setGenerateModalOpen(true)}>
            <FileText className="w-4 h-4 mr-2" /> {t('generate_report')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiCard label={t('total_reports')} value={String(dashboardStats.totalReports)} icon={<FileText />} />
          <KpiCard label={t('generated_mo')} value={String(dashboardStats.generatedThisMonth)} icon={<Activity />} />
          <KpiCard label={t('storage_used')} value={formatBytes(dashboardStats.storageUsedBytes)} icon={<BarChart3 />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard title={t('report_composition')}>
            <div className="h-64 w-full min-h-[200px] flex items-center justify-center">
              {dashboardStats.compositionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                  <RePieChart>
                    <Pie
                      data={dashboardStats.compositionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {dashboardStats.compositionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </RePieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-500">{internalCopy.noChartData}</p>
              )}
            </div>
          </GlassCard>

          <GlassCard title={t('usage_trends')}>
            <div className="h-64 w-full min-h-[200px]">
              {dashboardStats.trendData.some((item) => item.generated > 0 || item.published > 0) ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                  <BarChart data={dashboardStats.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      cursor={{ fill: '#1e293b' }}
                    />
                    <Legend />
                    <Bar dataKey="generated" fill="#06b6d4" radius={[4, 4, 0, 0]} name={internalCopy.generatedSeries} />
                    <Bar dataKey="published" fill="#6366f1" radius={[4, 4, 0, 0]} name={internalCopy.publishedSeries} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-slate-500">{internalCopy.noChartData}</p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <h3 className="text-lg font-semibold text-white">{t('archives')}</h3>
            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Input
                  placeholder={t('search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              </div>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-40">
                <option value="all">{t('all_types')}</option>
                <option value="TECHNICAL">{reportTypeLabel('TECHNICAL')}</option>
                <option value="EXECUTIVE">{reportTypeLabel('EXECUTIVE')}</option>
                <option value="COMPLIANCE">{reportTypeLabel('COMPLIANCE')}</option>
                <option value="OTHER">{reportTypeLabel('OTHER')}</option>
              </Select>
            </div>
          </div>

          <GlassCard className="p-0 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
                <tr>
                  <th className="p-4 font-medium">{t('title')}</th>
                  <th className="p-4 font-medium">{t('type')}</th>
                  <th className="p-4 font-medium">{t('generated_at')}</th>
                  <th className="p-4 font-medium">{t('generated_by')}</th>
                  <th className="p-4 font-medium">{t('status')}</th>
                  <th className="p-4 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loadingReports && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">{t('loading')}</td>
                  </tr>
                )}
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${(report.type || 'OTHER').toUpperCase() === 'TECHNICAL'
                          ? 'bg-rose-900/20 text-rose-400'
                          : (report.type || 'OTHER').toUpperCase() === 'EXECUTIVE'
                            ? 'bg-emerald-900/20 text-emerald-400'
                            : (report.type || 'OTHER').toUpperCase() === 'COMPLIANCE'
                              ? 'bg-cyan-900/20 text-cyan-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{report.title}</p>
                          <p className="text-xs text-slate-500">{report.project?.name || report.generatedFileKey || 'Legacy export'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Badge variant="neutral">{reportTypeLabel(report.type)}</Badge></td>
                    <td className="p-4 text-slate-400">{formatDate(report.generatedAt || report.createdAt)}</td>
                    <td className="p-4 text-slate-300">{report.generatedBy || report.createdBy?.name || '-'}</td>
                    <td className="p-4">
                      <Badge variant={report.status === 'PUBLISHED' ? 'success' : report.status === 'ARCHIVED' ? 'neutral' : 'warning'}>
                        {reportStatusLabel(report.status)}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" className="hover:text-cyan-400" onClick={() => downloadLegacyReport(report)} disabled={!report.generatedFileKey}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {!loadingReports && filteredReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">{t('no_reports')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </GlassCard>
        </div>
      </div>

      <Modal isOpen={generateModalOpen} onClose={() => setGenerateModalOpen(false)} title={internalCopy.generateTitle}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">{internalCopy.projectLabel}</label>
            <Select value={generateProjectId} onChange={(e) => setGenerateProjectId(e.target.value)} className="w-full">
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
              {projects.length === 0 && <option value="">{internalCopy.noProjects}</option>}
            </Select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">{internalCopy.formatLabel}</label>
            <Select value={generateFormat} onChange={(e) => setGenerateFormat(e.target.value as 'pptx' | 'pdf')} className="w-full">
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF (.pdf)</option>
            </Select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setGenerateModalOpen(false)}>{internalCopy.cancel}</Button>
            <Button onClick={handleGenerate} disabled={generating || !generateProjectId}>
              {generating ? internalCopy.generating : internalCopy.generate}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Reports;
