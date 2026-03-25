import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Download, Eye, FileImage, FileText, Pencil, Plus, Search, Trash2, Upload, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, GlassCard, Input, Modal, Select, TextArea } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES,
  AccessibilityAuditMainCategory,
  AccessibilityAuditOutputLocale,
  getAccessibilityOutputLocale,
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
  const navigate = useNavigate();
  const { projectId, reportId } = useParams();
  const { user, hasPermission } = useAuth();

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
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [previewLocale, setPreviewLocale] = React.useState<AccessibilityAuditOutputLocale>('en');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [severityFilter, setSeverityFilter] = React.useState<'ALL' | ProjectReportEntrySeverity>('ALL');
  const [categoryFilter, setCategoryFilter] = React.useState<'ALL' | AccessibilityAuditMainCategory>('ALL');

  const canEditEntries = hasPermission(Permission.EDIT_PROJECT_REPORT_ENTRIES);
  const canEditReport = hasPermission(Permission.EDIT_PROJECT_REPORTS);
  const canGenerate = hasPermission(Permission.GENERATE_PROJECT_REPORT_EXPORTS);
  const isClientUser = user?.role === Role.CLIENT_OWNER || user?.role === Role.CLIENT_MANAGER || user?.role === Role.CLIENT_MEMBER;

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

  const handleExportPdf = async (locale: AccessibilityAuditOutputLocale = previewLocale) => {
    if (!reportId) return;
    setExportingPdf(true);
    try {
      const result = await api.reportBuilderProjects.exportPdf(reportId, locale);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      await loadData();
      toast.success('PDF export generated.');
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || 'Failed to export PDF. Open preview and use Print / Save PDF while the server runtime is being fixed.',
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const handlePrintPreview = () => {
    const iframe = document.getElementById('project-report-preview-frame') as HTMLIFrameElement | null;
    const frameWindow = iframe?.contentWindow;
    if (!frameWindow) {
      toast.error('Preview frame is not ready yet.');
      return;
    }
    frameWindow.focus();
    frameWindow.print();
  };

  const handleGenerateAiSummary = async () => {
    if (!reportId) return;
    try {
      const result = await api.reportBuilderProjects.generateAiSummary(reportId);
      setReport((current) => (current ? { ...current, summaryJson: result.narratives } : current));
      toast.success('AI report summary generated.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to generate AI summary.');
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
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">Loading accessibility report...</p></GlassCard>;
  }

  if (!report) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">Accessibility report not found.</p></GlassCard>;
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
              {report.template.name} / Tool version {report.templateVersion.versionNumber} / Performed by {report.performedBy?.name || 'Unknown'}
            </p>
            {isClientUser && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Client access is read-only. Only published client-visible accessibility reports are available here.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
            <Eye className="mr-2 h-4 w-4" /> {previewLoading ? 'Loading Preview...' : 'Preview Report'}
          </Button>
          {(report.exports?.length || 0) > 0 && (
            <Button variant="outline" onClick={handleDownloadLatestExport}>
              <Download className="mr-2 h-4 w-4" /> Download Latest Export
            </Button>
          )}
          {canGenerate && (
            <>
              <Button variant="outline" onClick={handleGenerateAiSummary}>
                <Bot className="mr-2 h-4 w-4" /> Generate AI Summary
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
                <Download className="mr-2 h-4 w-4" /> {exportingPdf ? 'Exporting...' : 'Export PDF'}
              </Button>
            </>
          )}
          {canEditReport && (
            <Select value={report.status} onChange={(event) => handleStatusChange(event.target.value as ProjectReport['status'])} className="min-w-[180px]">
              <option value="DRAFT">DRAFT</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          )}
          {canEditEntries && (
            <Button onClick={() => openEntryModal()}>
              <Plus className="mr-2 h-4 w-4" /> Add Finding
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total Findings</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{summaryCounts.total}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">High</p><p className="mt-2 text-3xl font-bold text-rose-600">{summaryCounts.high}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Medium</p><p className="mt-2 text-3xl font-bold text-amber-500">{summaryCounts.medium}</p></GlassCard>
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Low</p><p className="mt-2 text-3xl font-bold text-emerald-500">{summaryCounts.low}</p></GlassCard>
      </div>

      {(report.summaryJson as any)?.introduction || (report.summaryJson as any)?.executiveSummary || (report.summaryJson as any)?.recommendationsSummary ? (
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-cyan-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Report Summary</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {(report.summaryJson as any)?.introduction && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Introduction</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).introduction}</p>
              </div>
            )}
            {(report.summaryJson as any)?.executiveSummary && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Executive Summary</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).executiveSummary}</p>
              </div>
            )}
            {(report.summaryJson as any)?.recommendationsSummary && (
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Recommendations Summary</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{(report.summaryJson as any).recommendationsSummary}</p>
              </div>
            )}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Findings List</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Fixed accessibility findings structure from the assigned tool. Categories and subcategories stay aligned with the product definition.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative min-w-[220px]">
              <Input placeholder="Search findings" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" />
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            </div>
            <Select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | ProjectReportEntrySeverity)}>
              <option value="ALL">All severities</option>
              {SEVERITIES.map((severity) => <option key={severity} value={severity}>{severityCopy[severity]}</option>)}
            </Select>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'ALL' | AccessibilityAuditMainCategory)}>
              <option value="ALL">All categories</option>
              {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </Select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4">Service Name</th>
                <th className="pb-3 pr-4">Issue Title</th>
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Subcategory</th>
                <th className="pb-3 pr-4">Page URL</th>
                <th className="pb-3 pr-4">Media</th>
                {canEditEntries && <th className="pb-3 text-right">Actions</th>}
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
                    <td className="py-4 pr-4"><Badge variant={severityBadgeVariant[(entry.severity || 'MEDIUM') as ProjectReportEntrySeverity]}>{severityCopy[(entry.severity || 'MEDIUM') as ProjectReportEntrySeverity]}</Badge></td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.category || '-'}</td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.subcategory || '-'}</td>
                    <td className="py-4 pr-4">
                      {entry.pageUrl ? <a href={entry.pageUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-600 hover:underline dark:text-cyan-400">Click Here</a> : <span className="text-slate-500">-</span>}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {(entry.media || []).length > 0 ? (entry.media || []).map((media) => (
                          <button key={media.id} type="button" onClick={() => handleOpenEvidence(media)} className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition-colors hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300">
                            {mediaActionLabel(media)}
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
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEvidence(media)}>{mediaActionLabel(media)}</Button>
                              {canEditEntries && <button type="button" className="text-xs text-rose-500" onClick={() => handleDeleteEvidence(entry, media)}>Remove</button>}
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
                    No findings match the current filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} title={editingEntry ? 'Edit Accessibility Finding' : 'New Accessibility Observation'} maxWidth="max-w-5xl">
        <form className="space-y-8" onSubmit={handleSaveEntry}>
          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-blue-600">
              <span className="h-6 w-1 rounded-full bg-blue-500" /> Basic Information
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Service Name / Module" placeholder="e.g., Mobile Checkout Flow" value={entryDraft.serviceName} onChange={(event) => setEntryDraft((current) => ({ ...current, serviceName: event.target.value }))} required />
              <Input label="Issue Title" placeholder="Short descriptive summary of the problem" value={entryDraft.issueTitle} onChange={(event) => setEntryDraft((current) => ({ ...current, issueTitle: event.target.value }))} required />
            </div>
            <TextArea label="Issue Description" placeholder="Detailed breakdown of the accessibility barrier..." value={entryDraft.issueDescription} onChange={(event) => setEntryDraft((current) => ({ ...current, issueDescription: event.target.value }))} required />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-orange-500">
              <span className="h-6 w-1 rounded-full bg-orange-500" /> Severity Classification
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {SEVERITIES.map((severity) => (
                <button key={severity} type="button" onClick={() => setEntryDraft((current) => ({ ...current, severity }))} className={`rounded-2xl border px-4 py-5 text-center text-sm font-bold uppercase tracking-[0.28em] transition-all ${entryDraft.severity === severity ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-500/10 dark:text-blue-300' : 'border-slate-200 text-slate-500 hover:border-blue-300 dark:border-slate-700 dark:text-slate-300'}`}>
                  {severityCopy[severity]}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-fuchsia-500">
              <span className="h-6 w-1 rounded-full bg-fuchsia-500" /> Accessibility Category
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Main Category" value={entryDraft.category} onChange={(event) => setEntryDraft((current) => ({ ...current, category: event.target.value as AccessibilityAuditMainCategory, subcategory: '' }))} required>
                <option value="">Select Category</option>
                {availableCategories.map((category) => <option key={category} value={category}>{category}</option>)}
              </Select>
              <Select label="Subcategory" value={entryDraft.subcategory} onChange={(event) => setEntryDraft((current) => ({ ...current, subcategory: event.target.value }))} required>
                <option value="">Select Sub-Category</option>
                {subcategoryOptions.map((subcategory) => <option key={subcategory} value={subcategory}>{subcategory}</option>)}
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-emerald-500">
              <span className="h-6 w-1 rounded-full bg-emerald-500" /> Evidence Media
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Image Proof</label>
                <label className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 transition-all hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300">
                  <input type="file" accept="image/*" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
                  <Upload className="mr-2 h-4 w-4" /> {imageFile ? imageFile.name : 'Image Proof'}
                </label>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Video Demo</label>
                <label className="flex min-h-[56px] cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 px-4 text-sm font-semibold text-slate-500 transition-all hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300">
                  <input type="file" accept="video/*" className="hidden" onChange={(event) => setVideoFile(event.target.files?.[0] || null)} />
                  <Video className="mr-2 h-4 w-4" /> {videoFile ? videoFile.name : 'Video Demo'}
                </label>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-cyan-500">
              <span className="h-6 w-1 rounded-full bg-cyan-500" /> Digital Location
            </div>
            <Input label="Exact Page URL" placeholder="https://app.client.com/specific-route" value={entryDraft.pageUrl} onChange={(event) => setEntryDraft((current) => ({ ...current, pageUrl: event.target.value }))} required />
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.28em] text-indigo-500">
              <span className="h-6 w-1 rounded-full bg-indigo-500" /> Developer Recommendations
            </div>
            <TextArea label="Remediation Steps" placeholder="Specific guidance for the development team to resolve this issue..." value={entryDraft.recommendation} onChange={(event) => setEntryDraft((current) => ({ ...current, recommendation: event.target.value }))} required />
          </section>

          {editingEntry && (editingEntry.media || []).length > 0 && (
            <section className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Existing Evidence</h3>
              <div className="flex flex-wrap gap-3">
                {(editingEntry.media || []).map((media) => (
                  <div key={media.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
                    {media.mediaType === 'VIDEO' ? <Video className="h-4 w-4 text-cyan-500" /> : <FileImage className="h-4 w-4 text-cyan-500" />}
                    <span>{media.fileAsset.filename || media.fileAsset.name}</span>
                    <button type="button" className="text-rose-500" onClick={() => handleDeleteEvidence(editingEntry, media)}>Remove</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
            <Button type="button" variant="ghost" onClick={() => setEntryModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingEntry ? 'Update Finding' : 'Commit Finding'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title="Accessibility Report Preview" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This preview is rendered from the backend HTML/PDF pipeline and shows the final accessibility report layout using the current findings and evidence.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={previewLocale === 'en' ? 'primary' : 'outline'} onClick={() => handlePreview('en')}>
                English
              </Button>
              <Button type="button" size="sm" variant={previewLocale === 'ar' ? 'primary' : 'outline'} onClick={() => handlePreview('ar')}>
                العربية
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={handlePrintPreview}>
                Print / Save PDF
              </Button>
            </div>
          </div>
          <iframe id="project-report-preview-frame" title="Accessibility Report Preview" className="min-h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" srcDoc={previewHtml} />
        </div>
      </Modal>
    </div>
  );
};

export default ProjectReportWorkspace;
