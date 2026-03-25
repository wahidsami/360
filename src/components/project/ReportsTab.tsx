import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Check, Download, FileDown, FileText, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientReportTemplateAssignment, Permission, ProjectReport, ProjectReportVisibility, Report, isInternalRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Badge, Button, GlassCard, Input, Modal } from '../ui/UIComponents';
import { PermissionGate } from '../PermissionGate';

interface ReportsTabProps {
  reports: Report[];
  onRefresh?: () => void;
}

interface ApprovalInfo {
  id: string;
  status: string;
  requestedBy?: { name: string };
  reviewedBy?: { name: string };
  reviewedAt?: string;
  comment?: string | null;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ reports: initialReports, onRefresh }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reports, setReports] = useState<Report[]>(initialReports);
  const [accessibilityReports, setAccessibilityReports] = useState<ProjectReport[]>([]);
  const [assignedTemplates, setAssignedTemplates] = useState<ClientReportTemplateAssignment[]>([]);
  const [approvalByReportId, setApprovalByReportId] = useState<Record<string, ApprovalInfo | null>>({});
  const [reviewModal, setReviewModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isLegacyModalOpen, setLegacyModalOpen] = useState(false);
  const [isAccessibilityModalOpen, setAccessibilityModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateFormat, setGenerateFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [generateReportId, setGenerateReportId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editingReport, setEditingReport] = useState<Partial<Report> | null>(null);
  const [accessibilityDraft, setAccessibilityDraft] = useState({
    assignmentId: '',
    title: '',
    description: '',
    visibility: 'INTERNAL' as ProjectReportVisibility,
  });

  const accessibilityAssignments = useMemo(
    () => assignedTemplates.filter((assignment) => assignment.template.category === 'ACCESSIBILITY' && assignment.isActive),
    [assignedTemplates],
  );

  const hasAccessibilityFlow = accessibilityAssignments.length > 0;

  const refreshReports = async () => {
    if (!projectId) return;
    try {
      const data = await api.projects.getReports(projectId);
      setReports(data);
      onRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const refreshAccessibilityData = async () => {
    if (!projectId) return;
    try {
      const [templates, projectReports] = await Promise.all([
        api.reportBuilderProjects.listAvailableTemplates(projectId),
        api.reportBuilderProjects.listProjectReports(projectId),
      ]);
      const nextAssignments = templates.filter((assignment) => assignment.template.category === 'ACCESSIBILITY' && assignment.isActive);
      setAssignedTemplates(templates);
      setAccessibilityReports(projectReports.filter((report) => report.template.category === 'ACCESSIBILITY'));

      if (!accessibilityDraft.assignmentId && nextAssignments.length > 0) {
        const defaultAssignment = nextAssignments.find((assignment) => assignment.isDefault) || nextAssignments[0];
        setAccessibilityDraft((current) => ({
          ...current,
          assignmentId: defaultAssignment.id,
          title: current.title || `${defaultAssignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}`,
        }));
      }
    } catch (error) {
      console.error('Failed to load accessibility report data', error);
    }
  };

  useEffect(() => {
    refreshAccessibilityData();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    api.approvals
      .listByProject(projectId)
      .then((list: any[]) => {
        const byReport: Record<string, ApprovalInfo | null> = {};
        reports.forEach((report) => {
          byReport[report.id] = null;
        });
        (list || [])
          .filter((approval: any) => approval.entityType === 'REPORT')
          .forEach((approval: any) => {
            if (!byReport[approval.entityId] || new Date(approval.createdAt) > new Date((byReport[approval.entityId] as any)?.createdAt || 0)) {
              byReport[approval.entityId] = {
                id: approval.id,
                status: approval.status,
                requestedBy: approval.requestedBy,
                reviewedBy: approval.reviewedBy,
                reviewedAt: approval.reviewedAt,
                comment: approval.comment,
              };
            }
          });
        setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
      })
      .catch(() => undefined);
  }, [projectId, reports.map((report) => report.id).join(',')]);

  const handleCreateAccessibilityReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    const selectedAssignment = accessibilityAssignments.find((assignment) => assignment.id === accessibilityDraft.assignmentId);
    if (!selectedAssignment) {
      toast.error('Select an assigned accessibility template first.');
      return;
    }

    try {
      const report = await api.reportBuilderProjects.createProjectReport(projectId, {
        templateId: selectedAssignment.templateId,
        templateVersionId: selectedAssignment.templateVersionId,
        title: accessibilityDraft.title.trim(),
        description: accessibilityDraft.description.trim() || undefined,
        visibility: accessibilityDraft.visibility,
      });
      toast.success('Accessibility report created.');
      setAccessibilityModalOpen(false);
      await refreshAccessibilityData();
      navigate(`/app/projects/${projectId}/report-builder/${report.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to create accessibility report.');
    }
  };

  const handleDeleteReport = async (report: Report) => {
    if (!projectId || !window.confirm(`Delete "${report.title}"?`)) return;
    try {
      await api.projects.deleteReport(projectId, report.id);
      toast.success('Legacy report deleted.');
      await refreshReports();
    } catch {
      toast.error('Failed to delete legacy report.');
    }
  };

  const handleUploadFile = async (reportId: string, file: File) => {
    if (!projectId) return;
    const toastId = toast.loading('Uploading report...');
    try {
      const result = await api.projects.uploadReportFile(projectId, reportId, file);
      if (!result) throw new Error('Upload failed');
      toast.success('Legacy report uploaded.', { id: toastId });
      await refreshReports();
    } catch {
      toast.error('Failed to upload report.', { id: toastId });
    }
  };

  const handleSubmitLegacyReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    const formData = new FormData(event.target as HTMLFormElement);
    const payload = {
      title: String(formData.get('title') || ''),
      description: String(formData.get('description') || ''),
      type: formData.get('type') as any,
      status: 'DRAFT',
      visibility: formData.get('visibility') as any,
    };

    if (editingReport?.id) {
      await api.projects.updateReport(projectId, editingReport.id, payload);
    } else {
      await api.projects.createReport(projectId, payload);
    }

    await refreshReports();
    setLegacyModalOpen(false);
    setEditingReport(null);
  };

  const handlePublish = async (report: Report) => {
    if (!projectId || !window.confirm('Publish this report?')) return;
    await api.projects.updateReport(projectId, report.id, { status: 'PUBLISHED' });
    await refreshReports();
  };

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const result = await api.projects.generateReport(projectId, {
        reportId: generateReportId || undefined,
        format: generateFormat,
      });
      toast.success(`Legacy report generated (${generateFormat.toUpperCase()}).`);
      setGenerateModalOpen(false);
      setGenerateReportId('');
      await refreshReports();
      if (result?.reportId && result?.generatedFileKey) {
        const ext = generateFormat === 'pdf' ? 'pdf' : 'pptx';
        await api.projects.downloadReport(projectId, result.reportId, `report.${ext}`);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Legacy report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    if (!projectId || !report.generatedFileKey) return;
    const ext = report.generatedFileKey.endsWith('.pdf') ? 'pdf' : 'pptx';
    await api.projects.downloadReport(projectId, report.id, `${report.title || 'report'}.${ext}`);
    toast.success('Download started.');
  };

  const handleRequestApproval = async (report: Report) => {
    if (!projectId) return;
    try {
      await api.approvals.create({ entityType: 'REPORT', entityId: report.id, projectId });
      toast.success('Approval requested.');
      const list = await api.approvals.listByProject(projectId);
      const byReport: Record<string, ApprovalInfo | null> = {};
      (list || [])
        .filter((approval: any) => approval.entityType === 'REPORT')
        .forEach((approval: any) => {
          if (!byReport[approval.entityId] || new Date(approval.createdAt) > new Date((byReport[approval.entityId] as any)?.createdAt || 0)) {
            byReport[approval.entityId] = {
              id: approval.id,
              status: approval.status,
              requestedBy: approval.requestedBy,
              reviewedBy: approval.reviewedBy,
              reviewedAt: approval.reviewedAt,
              comment: approval.comment,
            };
          }
        });
      setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to request approval.');
    }
  };

  const handleApproveReject = async () => {
    if (!reviewModal) return;
    try {
      if (reviewModal.action === 'approve') {
        await api.approvals.approve(reviewModal.id, reviewComment);
      } else {
        await api.approvals.reject(reviewModal.id, reviewComment);
      }
      toast.success(reviewModal.action === 'approve' ? 'Approved.' : 'Rejected.');
      setReviewModal(null);
      setReviewComment('');
      if (projectId) {
        const list = await api.approvals.listByProject(projectId);
        const byReport: Record<string, ApprovalInfo | null> = {};
        (list || [])
          .filter((approval: any) => approval.entityType === 'REPORT')
          .forEach((approval: any) => {
            if (!byReport[approval.entityId] || new Date(approval.createdAt) > new Date((byReport[approval.entityId] as any)?.createdAt || 0)) {
              byReport[approval.entityId] = {
                id: approval.id,
                status: approval.status,
                requestedBy: approval.requestedBy,
                reviewedBy: approval.reviewedBy,
                reviewedAt: approval.reviewedAt,
                comment: approval.comment,
              };
            }
          });
        setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to complete review action.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Accessibility Reports</h3>
          <p className="mt-1 text-sm text-slate-400">
            Create project-level accessibility reports from the client-assigned template, add findings, and export the final audit PDF.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission={Permission.CREATE_PROJECT_REPORTS}>
            <Button variant="secondary" onClick={() => setAccessibilityModalOpen(true)} disabled={!hasAccessibilityFlow}>
              <Plus className="mr-2 h-4 w-4" /> New Accessibility Report
            </Button>
          </PermissionGate>
          <PermissionGate permission={Permission.MANAGE_PROJECTS}>
            <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" /> Generate Legacy Export
            </Button>
            <Button onClick={() => { setEditingReport(null); setLegacyModalOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> {hasAccessibilityFlow ? 'Create Legacy Report' : 'Create Report'}
            </Button>
          </PermissionGate>
        </div>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <h4 className="text-lg font-bold text-white">Accessibility Audit Tool</h4>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              This project now uses a fixed accessibility workflow: assigned template, structured findings, AI summaries, preview, and PDF export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{accessibilityAssignments.length} assigned templates</Badge>
            <Badge variant="neutral">{accessibilityReports.length} accessibility reports</Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned Accessibility Templates</p>
            <div className="mt-3 space-y-3">
              {accessibilityAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() =>
                    setAccessibilityDraft((current) => ({
                      ...current,
                      assignmentId: assignment.id,
                      title: `${assignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}`,
                    }))
                  }
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    accessibilityDraft.assignmentId === assignment.id
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-200">{assignment.template.name}</p>
                    {assignment.isDefault && <Badge variant="success">Default</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">v{assignment.templateVersion.versionNumber} / Accessibility</p>
                </button>
              ))}
              {accessibilityAssignments.length === 0 && (
                <p className="text-sm text-slate-500">
                  No accessibility template is assigned to this client yet. Add one from the admin Accessibility Templates screen first.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {accessibilityReports.map((report) => (
              <GlassCard key={report.id} className="border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'info'}>{report.status}</Badge>
                      <Badge variant="neutral">{report.visibility}</Badge>
                      <Badge variant="warning">v{report.templateVersion.versionNumber}</Badge>
                    </div>
                    <h4 className="mt-3 text-lg font-bold text-white">{report.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{report.description || 'No scope notes added yet.'}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <p>Template: {report.template.name}</p>
                  <p>Performed by: {report.performedBy?.name || 'Unknown'}</p>
                  <p>Findings: {report._count?.entries ?? 0}</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => navigate(`/app/projects/${projectId}/report-builder/${report.id}`)}>
                    Open Accessibility Report <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}

            {accessibilityReports.length === 0 && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
                <h4 className="font-semibold text-slate-200">No accessibility reports yet</h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                  Create the first accessibility report for this project, then use the findings workspace to document issues, evidence, AI summaries, and export-ready output.
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {hasAccessibilityFlow && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
          Accessibility reporting now uses the new project-level workflow above. The legacy report area below remains available only for older generic exports.
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-semibold text-white">{hasAccessibilityFlow ? 'Legacy Report Archive' : 'Legacy Reports'}</h4>
          <p className="text-sm text-slate-500">{hasAccessibilityFlow ? 'Older reports and manual exports remain here during migration.' : 'Generic reports and uploads.'}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <GlassCard key={report.id} className="group flex flex-col justify-between p-5 transition-all hover:border-cyan-500/50">
              <div>
                <div className="mb-2 flex flex-wrap items-start justify-between gap-1">
                  <Badge variant={report.type === 'TECHNICAL' ? 'info' : report.type === 'EXECUTIVE' ? 'warning' : 'neutral'}>{report.type}</Badge>
                  <div className="flex items-center gap-1">
                    {approvalByReportId[report.id]?.status === 'PENDING' && <Badge variant="warning">Pending approval</Badge>}
                    {approvalByReportId[report.id]?.status === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                    {approvalByReportId[report.id]?.status === 'REJECTED' && <Badge variant="danger">Rejected</Badge>}
                    <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'neutral'}>{report.status}</Badge>
                  </div>
                </div>
                <h4 className="mb-2 text-lg font-bold text-white">{report.title}</h4>
                <p className="line-clamp-2 text-sm text-slate-400">{report.description}</p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="flex items-center text-xs text-slate-500">
                  <Calendar className="mr-1 h-3 w-3" />
                  {report.publishedAt
                    ? `Published ${format(new Date(report.publishedAt), 'MMM dd, yyyy')}`
                    : `Created ${format(new Date(report.createdAt), 'MMM dd')}`}
                </span>

                <div className="flex gap-2">
                  {approvalByReportId[report.id]?.status === 'PENDING' && isInternalRole(user?.role) && (
                    <>
                      <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10" onClick={() => setReviewModal({ id: approvalByReportId[report.id]!.id, action: 'approve' })}>
                        <Check className="mr-1 h-3 w-3" /> Approve
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-400 hover:bg-rose-500/10" onClick={() => setReviewModal({ id: approvalByReportId[report.id]!.id, action: 'reject' })}>
                        <X className="mr-1 h-3 w-3" /> Reject
                      </Button>
                    </>
                  )}
                  {(!approvalByReportId[report.id] || approvalByReportId[report.id]?.status !== 'PENDING') && (
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                      <Button variant="ghost" size="sm" className="text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleRequestApproval(report)}>
                        <Send className="mr-1 h-3 w-3" /> Request approval
                      </Button>
                    </PermissionGate>
                  )}
                  {report.status === 'DRAFT' && (
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                      <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10" onClick={() => handlePublish(report)}>
                        Publish
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingReport(report); setLegacyModalOpen(true); }}>
                        Edit
                      </Button>
                    </PermissionGate>
                  )}
                  {report.generatedFileKey ? (
                    <Button variant="secondary" size="sm" onClick={() => handleDownload(report)}>
                      <Download className="mr-1 h-3 w-3" /> Download
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="h-8 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10" onClick={() => { setGenerateReportId(report.id); setGenerateModalOpen(true); }}>
                        <FileDown className="mr-1 h-3 w-3" /> Generate
                      </Button>
                      <div className="relative">
                        <input
                          type="file"
                          id={`upload-${report.id}`}
                          className="hidden"
                          onChange={(event) => event.target.files?.[0] && handleUploadFile(report.id, event.target.files[0])}
                          accept=".pdf,.pptx"
                        />
                        <Button variant="outline" size="sm" className="h-8 border-slate-700 text-slate-400 hover:bg-slate-800" onClick={() => document.getElementById(`upload-${report.id}`)?.click()}>
                          <Upload className="mr-1 h-3 w-3" /> Upload
                        </Button>
                      </div>
                    </div>
                  )}
                  <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400" onClick={() => handleDeleteReport(report)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                </div>
              </div>
            </GlassCard>
          ))}

          {reports.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-700 bg-slate-800/20 py-16 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-slate-600 opacity-20" />
              <h4 className="font-medium italic text-slate-300">No legacy reports found for this project.</h4>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">Use the accessibility report workflow above for the new audit flow.</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={generateModalOpen} onClose={() => setGenerateModalOpen(false)} title="Generate Legacy Report">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Format</label>
            <select value={generateFormat} onChange={(event) => setGenerateFormat(event.target.value as 'pptx' | 'pdf')} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white">
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Attach to report (optional)</label>
            <select value={generateReportId} onChange={(event) => setGenerateReportId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white">
              <option value="">New report</option>
              {reports.map((report) => (
                <option key={report.id} value={report.id}>{report.title}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleGenerate} disabled={generating}>{generating ? 'Generating...' : 'Generate & Download'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isAccessibilityModalOpen} onClose={() => setAccessibilityModalOpen(false)} title="Create Accessibility Report">
        <form onSubmit={handleCreateAccessibilityReport} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Assigned accessibility template</label>
            <select
              value={accessibilityDraft.assignmentId}
              onChange={(event) => {
                const nextAssignmentId = event.target.value;
                const nextAssignment = accessibilityAssignments.find((assignment) => assignment.id === nextAssignmentId);
                setAccessibilityDraft((current) => ({
                  ...current,
                  assignmentId: nextAssignmentId,
                  title: nextAssignment ? `${nextAssignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}` : current.title,
                }));
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white"
              required
            >
              <option value="">Select accessibility template</option>
              {accessibilityAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.template.name} / v{assignment.templateVersion.versionNumber}
                </option>
              ))}
            </select>
          </div>
          <Input label="Report title" value={accessibilityDraft.title} onChange={(event) => setAccessibilityDraft((current) => ({ ...current, title: event.target.value }))} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Visibility</label>
            <select value={accessibilityDraft.visibility} onChange={(event) => setAccessibilityDraft((current) => ({ ...current, visibility: event.target.value as ProjectReportVisibility }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white">
              <option value="INTERNAL">Internal</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Scope notes</label>
            <textarea rows={4} value={accessibilityDraft.description} onChange={(event) => setAccessibilityDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500" placeholder="Audit scope, environment notes, or delivery context" />
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-400">
            The assigned template version is locked to this report, so later admin edits do not change existing reports.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAccessibilityModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!hasAccessibilityFlow}>Create Accessibility Report</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isLegacyModalOpen} onClose={() => setLegacyModalOpen(false)} title={editingReport ? 'Edit Legacy Report' : 'Create Legacy Report'}>
        <form onSubmit={handleSubmitLegacyReport} className="space-y-4">
          <Input name="title" label="Report Title" defaultValue={editingReport?.title} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Type</label>
            <select name="type" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white" defaultValue={editingReport?.type || 'TECHNICAL'}>
              <option value="TECHNICAL">Technical Report</option>
              <option value="EXECUTIVE">Executive Summary</option>
              <option value="COMPLIANCE">Compliance Audit</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Visibility</label>
            <select name="visibility" className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white" defaultValue={editingReport?.visibility || 'INTERNAL'}>
              <option value="INTERNAL">Internal Team Only</option>
              <option value="CLIENT">Visible to Client</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Description</label>
            <textarea name="description" rows={4} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500" defaultValue={editingReport?.description}></textarea>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setLegacyModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Save Report</Button>
          </div>
        </form>
      </Modal>

      {reviewModal && (
        <Modal isOpen={!!reviewModal} onClose={() => { setReviewModal(null); setReviewComment(''); }} title={reviewModal.action === 'approve' ? 'Approve Request' : 'Reject Request'}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Comment (optional)</label>
              <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500" placeholder="Add a comment..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setReviewModal(null); setReviewComment(''); }}>Cancel</Button>
              <Button variant={reviewModal.action === 'reject' ? 'danger' : 'primary'} onClick={handleApproveReject}>
                {reviewModal.action === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
