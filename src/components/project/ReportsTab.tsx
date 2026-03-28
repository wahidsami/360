import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
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
  const { i18n } = useTranslation();
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isArabic = i18n.language === 'ar';

  const copy = React.useMemo(
    () =>
      isArabic
        ? {
            fallbackProject: 'المشروع',
            loadError: 'فشل تحميل تقارير إمكانية الوصول.',
            assignToolFirst: 'قم بتعيين أداة إمكانية الوصول لهذا العميل أولاً.',
            createSuccess: 'تم إنشاء تقرير إمكانية الوصول.',
            createError: 'فشل إنشاء تقرير إمكانية الوصول.',
            title: 'تقارير إمكانية الوصول',
            subtitle: 'أنشئ تقارير إمكانية وصول على مستوى المشروع، وأضف ملاحظات منظمة، وعاين الناتج النهائي، وصدّر ملف التدقيق بصيغة PDF.',
            newReport: 'تقرير إمكانية وصول جديد',
            toolTitle: 'أداة تدقيق إمكانية الوصول',
            toolDescription: 'يستخدم هذا المشروع أداة واحدة ثابتة لإمكانية الوصول. تتحكم الأداة المعينة للعميل في إنشاء التدقيق، بينما تتولى مساحة العمل إدارة الأدلة والملخصات بالذكاء الاصطناعي والمعاينة وتصدير PDF.',
            assignedTool: 'أداة معينة',
            reports: 'تقارير',
            assignedToolLabel: 'الأداة المعينة',
            default: 'افتراضي',
            version: 'الإصدار',
            noAssignedTool: 'لا توجد أداة إمكانية وصول معينة لهذا العميل بعد. قم بتعيينها أولاً من شاشة إدارة أداة إمكانية الوصول.',
            noScopeNotes: 'لم تتم إضافة ملاحظات نطاق بعد.',
            performedBy: 'تم التنفيذ بواسطة',
            unknown: 'غير معروف',
            findings: 'الملاحظات',
            openReport: 'فتح التقرير',
            noReports: 'لا توجد تقارير إمكانية وصول بعد',
            noReportsHelp: 'أنشئ أول تقرير إمكانية وصول لهذا المشروع، ثم وثّق الملاحظات والأدلة والملخصات بالذكاء الاصطناعي والمخرجات الجاهزة للتصدير في مساحة عمل واحدة.',
            createModalTitle: 'إنشاء تقرير إمكانية الوصول',
            assignedToolInput: 'الأداة المعينة',
            selectTool: 'اختر الأداة',
            reportTitle: 'عنوان التقرير',
            visibility: 'مستوى الظهور',
            internal: 'داخلي',
            client: 'للعميل',
            scopeNotes: 'ملاحظات النطاق',
            scopePlaceholder: 'نطاق التدقيق أو ملاحظات البيئة أو سياق التسليم',
            createModalHelp: 'يستخدم هذا المشروع فقط مسار أداة تدقيق إمكانية الوصول الجديدة. تمت إزالة مسارات إنشاء التقارير العامة القديمة من هذه الشاشة.',
            cancel: 'إلغاء',
            createReport: 'إنشاء تقرير إمكانية الوصول',
            statusDraft: 'مسودة',
            statusPublished: 'منشور',
            statusArchived: 'مؤرشف',
          }
        : {
            fallbackProject: 'Project',
            loadError: 'Failed to load accessibility reports.',
            assignToolFirst: 'Assign the accessibility tool to this client first.',
            createSuccess: 'Accessibility report created.',
            createError: 'Failed to create accessibility report.',
            title: 'Accessibility Reports',
            subtitle: 'Create project-level accessibility reports, add structured findings, preview the final output, and export the audit PDF.',
            newReport: 'New Accessibility Report',
            toolTitle: 'Accessibility Audit Tool',
            toolDescription: 'This project uses one fixed accessibility tool. The assigned client tool controls audit creation, while the findings workspace handles evidence, AI summaries, preview, and PDF export.',
            assignedTool: 'assigned tool',
            reports: 'reports',
            assignedToolLabel: 'Assigned Tool',
            default: 'Default',
            version: 'Version',
            noAssignedTool: 'No accessibility tool is assigned to this client yet. Assign it from the admin Accessibility Tool screen first.',
            noScopeNotes: 'No scope notes added yet.',
            performedBy: 'Performed by',
            unknown: 'Unknown',
            findings: 'Findings',
            openReport: 'Open Report',
            noReports: 'No accessibility reports yet',
            noReportsHelp: 'Create the first accessibility report for this project, then document findings, evidence, AI summaries, and export-ready output in one workspace.',
            createModalTitle: 'Create Accessibility Report',
            assignedToolInput: 'Assigned tool',
            selectTool: 'Select tool',
            reportTitle: 'Report title',
            visibility: 'Visibility',
            internal: 'Internal',
            client: 'Client',
            scopeNotes: 'Scope notes',
            scopePlaceholder: 'Audit scope, environment notes, or delivery context',
            createModalHelp: 'This project only uses the new accessibility audit tool workflow. Older generic report creation paths are removed from this screen.',
            cancel: 'Cancel',
            createReport: 'Create Accessibility Report',
            statusDraft: 'DRAFT',
            statusPublished: 'PUBLISHED',
            statusArchived: 'ARCHIVED',
          },
    [isArabic],
  );

  const reportStatusLabel = React.useCallback(
    (status: string) => {
      if (!isArabic) return status;
      if (status === 'DRAFT') return copy.statusDraft;
      if (status === 'PUBLISHED') return copy.statusPublished;
      if (status === 'ARCHIVED') return copy.statusArchived;
      return status;
    },
    [copy.statusArchived, copy.statusDraft, copy.statusPublished, isArabic],
  );

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
    () => `${(projectName || copy.fallbackProject).trim()} - ${isArabic ? 'تقرير إمكانية الوصول' : 'Accessibility Report'} - ${format(new Date(), 'yyyy-MM-dd')}`,
    [copy.fallbackProject, isArabic, projectName],
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
    } catch (error) {
      console.error(error);
      toast.error(copy.loadError);
    }
  }, [buildDefaultReportTitle, copy.loadError, draft.assignmentId, onRefresh, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateReport = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (!projectId) return;

      const selectedAssignment = activeAssignments.find((assignment) => assignment.id === draft.assignmentId);
      if (!selectedAssignment) {
        toast.error(copy.assignToolFirst);
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
        toast.success(copy.createSuccess);
        setCreateOpen(false);
        await loadData();
        onRefresh?.();
        navigate(`/app/projects/${projectId}/report-builder/${report.id}`);
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || copy.createError);
      }
    },
    [activeAssignments, copy.assignToolFirst, copy.createError, copy.createSuccess, draft, loadData, navigate, onRefresh, projectId],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">{copy.title}</h3>
          <p className="mt-1 text-sm text-slate-400">
            {copy.subtitle}
          </p>
        </div>
        <PermissionGate permission={Permission.CREATE_PROJECT_REPORTS}>
          <Button variant="secondary" onClick={() => setCreateOpen(true)} disabled={!activeAssignments.length}>
            <Plus className="mr-2 h-4 w-4" /> {copy.newReport}
          </Button>
        </PermissionGate>
      </div>

      <GlassCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              <h4 className="text-lg font-bold text-white">{copy.toolTitle}</h4>
            </div>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              {copy.toolDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{activeAssignments.length} {copy.assignedTool}</Badge>
            <Badge variant="neutral">{reports.length} {copy.reports}</Badge>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{copy.assignedToolLabel}</p>
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
                    {assignment.isDefault && <Badge variant="success">{copy.default}</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{copy.version} {assignment.templateVersion.versionNumber}</p>
                </button>
              ))}
              {!activeAssignments.length && (
                <p className="text-sm text-slate-500">
                  {copy.noAssignedTool}
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
                      <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'info'}>{reportStatusLabel(report.status)}</Badge>
                      <Badge variant="neutral">{report.visibility === 'CLIENT' ? copy.client : copy.internal}</Badge>
                      <Badge variant="warning">v{report.templateVersion.versionNumber}</Badge>
                    </div>
                    <h4 className="mt-3 text-lg font-bold text-white">{report.title}</h4>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{report.description || copy.noScopeNotes}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-1 text-xs text-slate-500">
                  <p>{copy.performedBy}: {report.performedBy?.name || copy.unknown}</p>
                  <p>{copy.findings}: {report._count?.entries ?? 0}</p>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button size="sm" onClick={() => navigate(`/app/projects/${projectId}/report-builder/${report.id}`)}>
                    {copy.openReport} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </GlassCard>
            ))}

            {!reports.length && (
              <div className="md:col-span-2 rounded-xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
                <h4 className="font-semibold text-slate-200">{copy.noReports}</h4>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                  {copy.noReportsHelp}
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      <Modal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} title={copy.createModalTitle}>
        <form onSubmit={handleCreateReport} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">{copy.assignedToolInput}</label>
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
              <option value="">{copy.selectTool}</option>
              {activeAssignments.map((assignment) => (
                <option key={assignment.id} value={assignment.id}>
                  {assignment.template.name} / v{assignment.templateVersion.versionNumber}
                </option>
              ))}
            </select>
          </div>
          <Input label={copy.reportTitle} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} required />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">{copy.visibility}</label>
            <select value={draft.visibility} onChange={(event) => setDraft((current) => ({ ...current, visibility: event.target.value as ProjectReportVisibility }))} className="w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white">
              <option value="INTERNAL">{copy.internal}</option>
              <option value="CLIENT">{copy.client}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">{copy.scopeNotes}</label>
            <textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 text-white outline-none focus:border-cyan-500"
              placeholder={copy.scopePlaceholder}
            />
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-400">
            {copy.createModalHelp}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>{copy.cancel}</Button>
            <Button type="submit" disabled={!canCreateReports || !activeAssignments.length}>{copy.createReport}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
