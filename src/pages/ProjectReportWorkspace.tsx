import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Bot, Download, Eye, FileText, Paperclip, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, GlassCard, Input, Modal, Select, TextArea } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  Permission,
  ProjectReport,
  ProjectReportEntry,
  ProjectReportEntryMedia,
  ProjectReportEntrySeverity,
  ProjectReportEntryStatus,
  Role,
} from '@/types';

const ENTRY_STATUSES: ProjectReportEntryStatus[] = ['OPEN', 'ACCEPTED', 'FIXED', 'VERIFIED', 'DISMISSED'];
const SEVERITIES: ProjectReportEntrySeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const emptyEntryDraft = {
  serviceName: '',
  issueTitle: '',
  issueDescription: '',
  severity: 'MEDIUM' as ProjectReportEntrySeverity,
  category: '',
  subcategory: '',
  pageUrl: '',
  recommendation: '',
  status: 'OPEN' as ProjectReportEntryStatus,
};

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
  const [previewModalOpen, setPreviewModalOpen] = React.useState(false);
  const [previewHtml, setPreviewHtml] = React.useState('');
  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [previewLoading, setPreviewLoading] = React.useState(false);

  const canEditEntries = hasPermission(Permission.EDIT_PROJECT_REPORT_ENTRIES);
  const canEditReport = hasPermission(Permission.EDIT_PROJECT_REPORTS);
  const canGenerate = hasPermission(Permission.GENERATE_PROJECT_REPORT_EXPORTS);
  const isClientUser = user?.role === Role.CLIENT_OWNER || user?.role === Role.CLIENT_MANAGER || user?.role === Role.CLIENT_MEMBER;
  const findingsColSpan = canEditEntries ? 7 : 6;

  const taxonomy = (report?.templateVersion?.taxonomyJson as any) || {};
  const categoryOptions = Array.isArray(taxonomy.accessibilityCategories) ? taxonomy.accessibilityCategories : [];
  const subcategoryOptions = entryDraft.category
    ? Array.isArray(taxonomy.accessibilitySubcategories?.[entryDraft.category])
      ? taxonomy.accessibilitySubcategories[entryDraft.category]
      : []
    : [];

  const severityCounts = React.useMemo(
    () =>
      SEVERITIES.map((severity) => ({
        severity,
        count: entries.filter((entry) => entry.severity === severity).length,
      })),
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
      toast.error('Failed to load report workspace.');
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
        severity: entry.severity || 'MEDIUM',
        category: entry.category || '',
        subcategory: entry.subcategory || '',
        pageUrl: entry.pageUrl || '',
        recommendation: entry.recommendation || '',
        status: entry.status,
      });
    } else {
      setEditingEntry(null);
      setEntryDraft(emptyEntryDraft);
    }
    setEntryModalOpen(true);
  };

  const handleSaveEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reportId) return;
    try {
      if (editingEntry) {
        await api.reportBuilderProjects.updateEntry(reportId, editingEntry.id, entryDraft);
      } else {
        await api.reportBuilderProjects.createEntry(reportId, {
          ...entryDraft,
          sortOrder: entries.length,
        });
      }
      await loadData();
      setEntryModalOpen(false);
      toast.success(editingEntry ? 'Entry updated.' : 'Entry created.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to save entry.');
    }
  };

  const handleDeleteEntry = async (entry: ProjectReportEntry) => {
    if (!reportId || !confirm(`Delete "${entry.issueTitle}"?`)) return;
    try {
      await api.reportBuilderProjects.deleteEntry(reportId, entry.id);
      await loadData();
      toast.success('Entry removed.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete entry.');
    }
  };

  const handleUploadEvidence = async (entry: ProjectReportEntry, file?: File | null) => {
    if (!reportId || !file) return;
    try {
      await api.reportBuilderProjects.uploadEntryMedia(reportId, entry.id, file);
      await loadData();
      toast.success('Evidence uploaded.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to upload evidence.');
    }
  };

  const handleDeleteEvidence = async (entry: ProjectReportEntry, media: ProjectReportEntryMedia) => {
    if (!reportId || !confirm(`Remove "${media.fileAsset.name || media.fileAsset.filename || 'file'}"?`)) return;
    try {
      await api.reportBuilderProjects.deleteEntryMedia(reportId, entry.id, media.id);
      await loadData();
      toast.success('Evidence removed.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove evidence.');
    }
  };

  const handlePreview = async () => {
    if (!reportId) return;
    setPreviewLoading(true);
    try {
      const html = await api.reportBuilderProjects.getPreviewHtml(reportId);
      setPreviewHtml(html);
      setPreviewModalOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportId) return;
    setExportingPdf(true);
    try {
      const res = await api.reportBuilderProjects.exportPdf(reportId);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success('PDF export generated.');
      await loadData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to export PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!reportId) return;
    try {
      const res = await api.reportBuilderProjects.generateAiSummary(reportId);
      setReport((current) => (current ? { ...current, summaryJson: res.narratives } : current));
      toast.success('AI summary generated.');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to generate AI summary.');
    }
  };

  const handleDownloadLatestExport = async () => {
    if (!reportId) return;
    try {
      const res = await api.reportBuilderProjects.getLatestExport(reportId);
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'No exported file available.');
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
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">Loading report workspace...</p></GlassCard>;
  }

  if (!report) {
    return <GlassCard><p className="text-sm text-slate-600 dark:text-slate-400">Report workspace not found.</p></GlassCard>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate(`/app/projects/${projectId}`)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white">{report.title}</h1>
              <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'info'}>{report.status}</Badge>
              <Badge variant="neutral">{report.visibility}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {report.template.name} / Version {report.templateVersion.versionNumber} / Performed by {report.performedBy?.name || 'Unknown'}
            </p>
            {isClientUser && (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Client access is read-only. Only published client-visible reports are available here.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={previewLoading}>
            <Eye className="w-4 h-4 mr-2" /> {previewLoading ? 'Loading Preview...' : 'Preview'}
          </Button>
          {(report.exports?.length || 0) > 0 && (
            <Button variant="outline" onClick={handleDownloadLatestExport}>
              <Download className="w-4 h-4 mr-2" /> Download Latest Export
            </Button>
          )}
          {canGenerate && (
            <>
              <Button variant="outline" onClick={handleGenerateAiSummary}>
                <Bot className="w-4 h-4 mr-2" /> Generate AI Summary
              </Button>
              <Button variant="outline" onClick={handleExportPdf} disabled={exportingPdf}>
                <Download className="w-4 h-4 mr-2" /> {exportingPdf ? 'Exporting...' : 'Export PDF'}
              </Button>
            </>
          )}
          {canEditReport && (
            <Select value={report.status} onChange={(e) => handleStatusChange(e.target.value as ProjectReport['status'])} className="min-w-[180px]">
              <option value="DRAFT">DRAFT</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </Select>
          )}
          {canEditEntries && (
            <Button onClick={() => openEntryModal()}>
              <Plus className="w-4 h-4 mr-2" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard><p className="text-xs uppercase tracking-[0.2em] text-slate-500">Entries</p><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{entries.length}</p></GlassCard>
        {severityCounts.map((item) => (
          <GlassCard key={item.severity}>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><BarChart3 className="w-4 h-4 text-cyan-500" />{item.severity}</div>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{item.count}</p>
          </GlassCard>
        ))}
      </div>

      {(report.summaryJson as any)?.introduction || (report.summaryJson as any)?.executiveSummary || (report.summaryJson as any)?.recommendationsSummary ? (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-cyan-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Summary</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {(report.summaryJson as any)?.introduction && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Introduction</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{(report.summaryJson as any).introduction}</p>
              </div>
            )}
            {(report.summaryJson as any)?.executiveSummary && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Executive Summary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{(report.summaryJson as any).executiveSummary}</p>
              </div>
            )}
            {(report.summaryJson as any)?.recommendationsSummary && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Recommendations</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{(report.summaryJson as any).recommendationsSummary}</p>
              </div>
            )}
          </div>
        </GlassCard>
      ) : null}

      <GlassCard>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Structured Findings</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">This workspace reads the assigned template version and stores findings as structured entries for the new export flow.</p>
          </div>
          <Badge variant="info">Arabic-first</Badge>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3 pr-4">Service</th>
                <th className="pb-3 pr-4">Issue</th>
                <th className="pb-3 pr-4">Severity</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Evidence</th>
                <th className="pb-3 pr-4">Status</th>
                {canEditEntries && <th className="pb-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <tr>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.serviceName || '-'}</td>
                    <td className="py-4 pr-4">
                      <p className="font-medium text-slate-900 dark:text-white">{entry.issueTitle}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{entry.issueDescription}</p>
                    </td>
                    <td className="py-4 pr-4"><Badge variant="warning">{entry.severity || 'N/A'}</Badge></td>
                    <td className="py-4 pr-4 text-slate-700 dark:text-slate-300">{entry.category || '-'}</td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {(entry.media || []).map((media) => (
                          <span key={media.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
                            <Paperclip className="w-3 h-3" />
                            {media.fileAsset.filename || media.fileAsset.name}
                          </span>
                        ))}
                        {(!entry.media || entry.media.length === 0) && <span className="text-xs text-slate-500">-</span>}
                      </div>
                    </td>
                    <td className="py-4 pr-4"><Badge variant="neutral">{entry.status}</Badge></td>
                    {canEditEntries && (
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <label className="inline-flex">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                handleUploadEvidence(entry, e.target.files?.[0] || null);
                                e.currentTarget.value = '';
                              }}
                            />
                            <span className="inline-flex">
                              <Button variant="ghost" size="sm" type="button">
                                <Upload className="w-4 h-4" />
                              </Button>
                            </span>
                          </label>
                          <Button variant="ghost" size="sm" onClick={() => openEntryModal(entry)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-rose-500" onClick={() => handleDeleteEntry(entry)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    )}
                  </tr>
                  {(entry.media || []).length > 0 && (
                    <tr className="bg-slate-50/70 dark:bg-slate-900/20">
                      <td colSpan={findingsColSpan} className="py-3 pr-4">
                        <div className="flex flex-wrap gap-3">
                          {(entry.media || []).map((media) => (
                            <div key={media.id} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                              <Paperclip className="w-4 h-4 text-cyan-500" />
                              <span className="text-xs text-slate-700 dark:text-slate-300">
                                {media.fileAsset.filename || media.fileAsset.name}
                              </span>
                              {canEditEntries && (
                                <button
                                  type="button"
                                  className="text-rose-500 text-xs"
                                  onClick={() => handleDeleteEvidence(entry, media)}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={findingsColSpan} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    No entries yet. Start adding findings into the new report workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={entryModalOpen} onClose={() => setEntryModalOpen(false)} title={editingEntry ? 'Edit Entry' : 'Add Entry'} maxWidth="max-w-3xl">
        <form className="space-y-4" onSubmit={handleSaveEntry}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Service name" value={entryDraft.serviceName} onChange={(e) => setEntryDraft((current) => ({ ...current, serviceName: e.target.value }))} />
            <Input label="Issue title" value={entryDraft.issueTitle} onChange={(e) => setEntryDraft((current) => ({ ...current, issueTitle: e.target.value }))} required />
          </div>
          <TextArea label="Issue description" value={entryDraft.issueDescription} onChange={(e) => setEntryDraft((current) => ({ ...current, issueDescription: e.target.value }))} required />
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Severity" value={entryDraft.severity} onChange={(e) => setEntryDraft((current) => ({ ...current, severity: e.target.value as ProjectReportEntrySeverity }))}>{SEVERITIES.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</Select>
            <Select label="Status" value={entryDraft.status} onChange={(e) => setEntryDraft((current) => ({ ...current, status: e.target.value as ProjectReportEntryStatus }))}>{ENTRY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Select label="Category" value={entryDraft.category} onChange={(e) => setEntryDraft((current) => ({ ...current, category: e.target.value, subcategory: '' }))}>
              <option value="">Select category</option>
              {categoryOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label || option.value}</option>)}
            </Select>
            <Select label="Subcategory" value={entryDraft.subcategory} onChange={(e) => setEntryDraft((current) => ({ ...current, subcategory: e.target.value }))}>
              <option value="">Select subcategory</option>
              {subcategoryOptions.map((option: any) => <option key={option.value} value={option.value}>{option.label || option.value}</option>)}
            </Select>
          </div>
          <Input label="Page URL" value={entryDraft.pageUrl} onChange={(e) => setEntryDraft((current) => ({ ...current, pageUrl: e.target.value }))} />
          <TextArea label="Recommendation" value={entryDraft.recommendation} onChange={(e) => setEntryDraft((current) => ({ ...current, recommendation: e.target.value }))} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEntryModalOpen(false)}>Cancel</Button>
            <Button type="submit">{editingEntry ? 'Save Changes' : 'Create Entry'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={previewModalOpen} onClose={() => setPreviewModalOpen(false)} title="Report Preview" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-600 dark:text-slate-300">
            This preview is rendered from the backend HTML/RTL export pipeline. It uses the exact report version and current entry evidence.
          </div>
          <iframe
            title="Report Preview"
            className="w-full min-h-[70vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
            srcDoc={previewHtml}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ProjectReportWorkspace;
