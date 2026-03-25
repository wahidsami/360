import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientReportTemplateAssignment, Permission, ProjectReport, ProjectReportVisibility, Report } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { Badge, Button, GlassCard, Input, Modal } from '../ui/UIComponents';
import { PermissionGate } from '../PermissionGate';

interface ReportsTabProps {
  reports: Report[];
  projectName?: string | null;
  onRefresh?: () => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ onRefresh, projectName }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [assignments, setAssignments] = useState<ClientReportTemplateAssignment[]>([]);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({
    assignmentId: '',
    title: '',
    description: '',
    visibility: 'INTERNAL' as ProjectReportVisibility,
  });

  const canCreateReports = hasPermission(Permission.CREATE_PROJECT_REPORTS);

  const activeAssignments = useMemo(
    () => assignments.filter((assignment) => assignment.isActive),
    [assignments],
  );

  const buildDefaultReportTitle = React.useCallback(
    () => `${(projectName || 'Project').trim()} - Accessibility Report - ${format(new Date(), 'yyyy-MM-dd')}`,
    [projectName],
  );

  const loadData = React.useCallback(async () => {
    if (!projectId) return;
    try {
      const [templateAssignments, projectReports] = await Promise.all([
        api.reportBuilderProjects.listAvailableTemplates(projectId),
        api.reportBuilderProjects.listProjectReports(projectId),
      ]);
      setAssignments(templateAssignments);
      setReports(projectReports);

      if (!draft.assignmentId && templateAssignments.length > 0) {
        const defaultAssignment = templateAssignments.find((assignment) => assignment.isDefault) || templateAssignments[0];
        setDraft((current) => ({
          ...current,
          assignmentId: defaultAssignment.id,
          title: current.title || buildDefaultReportTitle(),
        }));
      }
      onRefresh?.();
    } catch (error) {
      console.error(error);
      toast.error('Failed to load accessibility reports.');
    }
  }, [buildDefaultReportTitle, draft.assignmentId, onRefresh, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateReport = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    const selectedAssignment = activeAssignments.find((assignment) => assignment.id === draft.assignmentId);
    if (!selectedAssignment) {
      toast.error('Assign the accessibility tool to this client first.');
      return;
    }

    try {
      const report = await api.reportBuilderProjects.createProjectReport(projectId, {
        templateId: selectedAssignment.templateId,
        templateVersionId: selectedAssignment.templateVersionId,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        visibility: draft.visibility,
      });
      toast.success('Accessibility report created.');
      setCreateOpen(false);
      await loadData();
      navigate(`/app/projects/${projectId}/report-builder/${report.id}`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to create accessibility report.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Accessibility Reports</h3>
          <p className="mt-1 text-sm text-slate-400">
            Create project-level accessibility reports, add structured findings, preview the final output, and export the audit PDF.
          </p>
        </div>
        <PermissionGate permission={Permission.CREATE_PROJECT_REPORTS}>
          <Button variant="secondary" onClick={() => setCreateOpen(true)} disabled={!activeAssignments.length}>
            <Plus className="mr-2 h-4 w-4" /> New Accessibility Report
          </Button>
        </PermissionGate>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <h4 className="text-lg font-bold text-white">Accessibility Audit Tool</h4>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              This project uses one fixed accessibility tool. The assigned client tool controls audit creation, while the findings workspace handles evidence, AI summaries, preview, and PDF export.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{activeAssignments.length} assigned tool</Badge>
            <Badge variant="neutral">{reports.length} reports</Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned Tool</p>
            <div className="mt-3 space-y-3">
              {activeAssignments.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      assignmentId: assignment.id,
                      title: buildDefaultReportTitle(),
                    }))
                  }
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    draft.assignmentId === assignment.id
                      ? 'border-cyan-500/50 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-200">{assignment.template.name}</p>
                    {assignment.isDefault && <Badge variant="success">Default</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Version {assignment.templateVersion.versionNumber}</p>
                </button>
              ))}
              {!activeAssignments.length && (
                <p className="text-sm text-slate-500">
                  No accessibility tool is assigned to this client yet. Assign it from the admin Accessibility Tool screen first.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {reports.map((report) => (
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
                  <p>Performed by: {report.performedBy?.name || 'Unknown'}</p>
                  <p>Findings: {report._count?.entries ?? 0}</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => navigate(`/app/projects/${projectId}/report-builder/${report.id}`)}>
                    Open Report <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}

            {!reports.length && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
                <h4 className="font-semibold text-slate-200">No accessibility reports yet</h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                  Create the first accessibility report for this project, then document findings, evidence, AI summaries, and export-ready output in one workspace.
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <Modal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} title="Create Accessibility Report">
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Assigned tool</label>
            <select
              value={draft.assignmentId}
              onChange={(event) => {
                const nextAssignmentId = event.target.value;
                setDraft((current) => ({
                  ...current,
                  assignmentId: nextAssignmentId,
                  title: buildDefaultReportTitle(),
                }));
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white"
              required
            >
              <option value="">Select tool</option>
              {activeAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.template.name} / v{assignment.templateVersion.versionNumber}
                </option>
              ))}
            </select>
          </div>
          <Input label="Report title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Visibility</label>
            <select value={draft.visibility} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as ProjectReportVisibility }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white">
              <option value="INTERNAL">Internal</option>
              <option value="CLIENT">Client</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Scope notes</label>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500"
              placeholder="Audit scope, environment notes, or delivery context"
            />
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-400">
            This project only uses the new accessibility audit tool workflow. Older generic report creation paths are removed from this screen.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!canCreateReports || !activeAssignments.length}>Create Accessibility Report</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
