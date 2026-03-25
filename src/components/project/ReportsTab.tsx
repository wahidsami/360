import React, { useState, useEffect } from 'react';
import { ClientReportTemplateAssignment, ProjectReport, Report, Permission, ProjectReportVisibility, isInternalRole } from '@/types';
import { Button, GlassCard, Badge, Modal, Input } from '../ui/UIComponents';
import { ArrowRight, FileText, Plus, Download, Calendar, FileDown, Send, Check, X, Trash2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '../PermissionGate';
import { format } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

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
    const [builderReports, setBuilderReports] = useState<ProjectReport[]>([]);
    const [assignedTemplates, setAssignedTemplates] = useState<ClientReportTemplateAssignment[]>([]);
    const [approvalByReportId, setApprovalByReportId] = useState<Record<string, ApprovalInfo | null>>({});
    const [reviewModal, setReviewModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBuilderModalOpen, setBuilderModalOpen] = useState(false);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [generateFormat, setGenerateFormat] = useState<'pptx' | 'pdf'>('pptx');
    const [generateReportId, setGenerateReportId] = useState<string>('');
    const [generating, setGenerating] = useState(false);
    const [editingReport, setEditingReport] = useState<Partial<Report> | null>(null);
    const [builderDraft, setBuilderDraft] = useState({
        assignmentId: '',
        title: '',
        description: '',
        visibility: 'INTERNAL' as ProjectReportVisibility,
    });
    const hasAccessibilityFlow = assignedTemplates.some((assignment) => assignment.template.category === 'ACCESSIBILITY');

    const refreshReports = async () => {
        if (projectId) {
            try {
                const r = await api.projects.getReports(projectId);
                setReports(r);
                onRefresh?.();
            } catch (e) { console.error(e); }
        }
    };

    const refreshBuilderData = async () => {
        if (!projectId) return;
        try {
            const [templates, projectReports] = await Promise.all([
                api.reportBuilderProjects.listAvailableTemplates(projectId),
                api.reportBuilderProjects.listProjectReports(projectId),
            ]);
            setAssignedTemplates(templates);
            setBuilderReports(projectReports);
            if (!builderDraft.assignmentId && templates.length > 0) {
                const defaultAssignment = templates.find((assignment) => assignment.isDefault) || templates[0];
                setBuilderDraft((current) => ({
                    ...current,
                    assignmentId: defaultAssignment.id,
                    title: current.title || `${defaultAssignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}`,
                }));
            }
        } catch (e) {
            console.error('Failed to load report builder data', e);
        }
    };

    const handleDeleteReport = async (report: Report) => {
        if (!projectId || !confirm(`Are you sure you want to delete "${report.title}"?`)) return;
        try {
            await api.projects.deleteReport(projectId, report.id);
            toast.success('Report deleted');
            await refreshReports();
        } catch (e) {
            toast.error('Failed to delete report');
        }
    };

    const handleUploadFile = async (reportId: string, file: File) => {
        if (!projectId) return;
        const tid = toast.loading('Uploading report...');
        try {
            const res = await api.projects.uploadReportFile(projectId, reportId, file);
            if (res) {
                toast.success('Report uploaded', { id: tid });
                await refreshReports();
            } else {
                throw new Error('Upload failed');
            }
        } catch (e) {
            toast.error('Failed to upload report', { id: tid });
        }
    };

    useEffect(() => {
        if (!projectId) return;
        api.approvals.listByProject(projectId).then((list: any[]) => {
            const byReport: Record<string, ApprovalInfo | null> = {};
            reports.forEach((rep) => { byReport[rep.id] = null; });
            (list || []).filter((a: any) => a.entityType === 'REPORT').forEach((a: any) => {
                if (!byReport[a.entityId] || new Date(a.createdAt) > new Date((byReport[a.entityId] as any)?.createdAt || 0)) {
                    byReport[a.entityId] = {
                        id: a.id,
                        status: a.status,
                        requestedBy: a.requestedBy,
                        reviewedBy: a.reviewedBy,
                        reviewedAt: a.reviewedAt,
                        comment: a.comment,
                    };
                }
            });
            setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
        }).catch(() => { });
    }, [projectId, reports.map((r) => r.id).join(',')]);

    useEffect(() => {
        refreshBuilderData();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;

        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            type: formData.get('type') as any,
            status: 'DRAFT', // Default new reports to draft
            visibility: formData.get('visibility') as any
        };

        if (editingReport?.id) {
            await api.projects.updateReport(projectId, editingReport.id, data);
        } else {
            await api.projects.createReport(projectId, data);
        }
        await refreshReports();
        setIsModalOpen(false);
        setEditingReport(null);
    };

    const handleCreateBuilderReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;

        const selectedAssignment = assignedTemplates.find((assignment) => assignment.id === builderDraft.assignmentId);
        if (!selectedAssignment) {
            toast.error('Select an assigned template first');
            return;
        }

        try {
            const report = await api.reportBuilderProjects.createProjectReport(projectId, {
                templateId: selectedAssignment.templateId,
                templateVersionId: selectedAssignment.templateVersionId,
                title: builderDraft.title.trim(),
                description: builderDraft.description.trim() || undefined,
                visibility: builderDraft.visibility,
            });
            toast.success('Report workspace created');
            setBuilderModalOpen(false);
            await refreshBuilderData();
            navigate(`/app/projects/${projectId}/report-builder/${report.id}`);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Failed to create report workspace');
        }
    };

    const handlePublish = async (report: Report) => {
        if (!projectId || !confirm('Publish this report?')) return;
        await api.projects.updateReport(projectId, report.id, { status: 'PUBLISHED' });
        await refreshReports();
    };

    const handleGenerate = async () => {
        if (!projectId) return;
        setGenerating(true);
        try {
            const res = await api.projects.generateReport(projectId, {
                reportId: generateReportId || undefined,
                format: generateFormat,
            });
            toast.success(`Report generated (${generateFormat.toUpperCase()})`);
            setGenerateModalOpen(false);
            setGenerateReportId('');
            await refreshReports();
            if (res?.reportId && res?.generatedFileKey) {
                const ext = generateFormat === 'pdf' ? 'pdf' : 'pptx';
                await api.projects.downloadReport(projectId, res.reportId, `report.${ext}`);
            }
        } catch (e: any) {
            console.error('Report generation failed:', e);
            toast.error(e?.message || 'Report generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownload = async (report: Report) => {
        if (!projectId || !report.generatedFileKey) return;
        const ext = report.generatedFileKey.endsWith('.pdf') ? 'pdf' : 'pptx';
        await api.projects.downloadReport(projectId, report.id, `${report.title || 'report'}.${ext}`);
        toast.success('Download started');
    };

    const handleRequestApproval = async (report: Report) => {
        if (!projectId) return;
        try {
            await api.approvals.create({ entityType: 'REPORT', entityId: report.id, projectId });
            toast.success('Approval requested');
            const list = await api.approvals.listByProject(projectId);
            const byReport: Record<string, ApprovalInfo | null> = {};
            (list || []).filter((a: any) => a.entityType === 'REPORT').forEach((a: any) => {
                if (!byReport[a.entityId] || new Date(a.createdAt) > new Date((byReport[a.entityId] as any)?.createdAt || 0)) {
                    byReport[a.entityId] = { id: a.id, status: a.status, requestedBy: a.requestedBy, reviewedBy: a.reviewedBy, reviewedAt: a.reviewedAt, comment: a.comment };
                }
            });
            setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    const handleApproveReject = async () => {
        if (!reviewModal) return;
        try {
            if (reviewModal.action === 'approve') await api.approvals.approve(reviewModal.id, reviewComment);
            else await api.approvals.reject(reviewModal.id, reviewComment);
            toast.success(reviewModal.action === 'approve' ? 'Approved' : 'Rejected');
            setReviewModal(null);
            setReviewComment('');
            if (projectId) {
                const list = await api.approvals.listByProject(projectId);
                const byReport: Record<string, ApprovalInfo | null> = {};
                (list || []).filter((a: any) => a.entityType === 'REPORT').forEach((a: any) => {
                    if (!byReport[a.entityId] || new Date(a.createdAt) > new Date((byReport[a.entityId] as any)?.createdAt || 0)) {
                        byReport[a.entityId] = { id: a.id, status: a.status, requestedBy: a.requestedBy, reviewedBy: a.reviewedBy, reviewedAt: a.reviewedAt, comment: a.comment };
                    }
                });
                setApprovalByReportId((prev) => ({ ...prev, ...byReport }));
            }
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
                <h3 className="text-xl font-bold text-white">Reports & Documentation</h3>
                <div className="flex gap-2">
                    <PermissionGate permission={Permission.CREATE_PROJECT_REPORTS}>
                        <Button variant="secondary" onClick={() => setBuilderModalOpen(true)} disabled={assignedTemplates.length === 0}>
                            <Plus className="w-4 h-4 mr-2" /> New Report Workspace
                        </Button>
                    </PermissionGate>
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                        <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
                            <FileDown className="w-4 h-4 mr-2" /> Generate (PPT/PDF)
                        </Button>
                        <Button onClick={() => { setEditingReport(null); setIsModalOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> {hasAccessibilityFlow ? 'Legacy Report' : 'Create Report'}
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            <GlassCard className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-cyan-400" />
                            <h4 className="text-lg font-bold text-white">Custom Report Builder</h4>
                        </div>
                        <p className="mt-2 text-sm text-slate-400 max-w-3xl">
                            New accessibility reporting lives here. Create a project report from an assigned client template, then open the workspace to add structured findings and prepare the Arabic-first export flow.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="info">{assignedTemplates.length} assigned templates</Badge>
                        <Badge variant="neutral">{builderReports.length} report workspaces</Badge>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assigned Templates</p>
                        <div className="mt-3 space-y-3">
                            {assignedTemplates.map((assignment) => (
                                <button
                                    key={assignment.id}
                                    type="button"
                                    onClick={() =>
                                        setBuilderDraft((current) => ({
                                            ...current,
                                            assignmentId: assignment.id,
                                            title: current.title || `${assignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}`,
                                        }))
                                    }
                                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                                        builderDraft.assignmentId === assignment.id
                                            ? 'border-cyan-500/50 bg-cyan-500/10'
                                            : 'border-slate-800 bg-slate-950/40 hover:border-cyan-500/30'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-slate-200">{assignment.template.name}</p>
                                        {assignment.isDefault && <Badge variant="success">Default</Badge>}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        v{assignment.templateVersion.versionNumber} • {assignment.template.category}
                                    </p>
                                </button>
                            ))}
                            {assignedTemplates.length === 0 && (
                                <p className="text-sm text-slate-500">
                                    No client template assignment yet. Assign one from the admin template dashboard first.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {builderReports.map((report) => (
                            <GlassCard key={report.id} className="p-5 border-cyan-500/20 bg-gradient-to-br from-slate-900/90 to-slate-950">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'info'}>{report.status}</Badge>
                                            <Badge variant="neutral">{report.visibility}</Badge>
                                            <Badge variant="warning">v{report.templateVersion.versionNumber}</Badge>
                                        </div>
                                        <h4 className="mt-3 text-lg font-bold text-white">{report.title}</h4>
                                        <p className="mt-1 text-sm text-slate-400 line-clamp-2">{report.description || 'No description yet.'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-xs text-slate-500 space-y-1">
                                    <p>Template: {report.template.name}</p>
                                    <p>Performed by: {report.performedBy?.name || 'Unknown'}</p>
                                    <p>Entries: {report._count?.entries ?? 0}</p>
                                </div>
                                <div className="mt-5 flex justify-end">
                                    <Button size="sm" onClick={() => navigate(`/app/projects/${projectId}/report-builder/${report.id}`)}>
                                        Open Workspace <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </div>
                            </GlassCard>
                        ))}

                        {builderReports.length === 0 && (
                            <div className="md:col-span-2 rounded-xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-8 text-center">
                                <h4 className="text-slate-200 font-semibold">No report workspaces yet</h4>
                                <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
                                    Start with a client-assigned accessibility template, create the report workspace here, and continue the actual findings entry in the new flow.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </GlassCard>

            {hasAccessibilityFlow && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-100">
                    Accessibility reporting now defaults to the new template-based workspace above. The cards below remain available only for the older generic report flow.
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="text-lg font-semibold text-white">{hasAccessibilityFlow ? 'Legacy Report Archive' : 'Existing Reports'}</h4>
                        <p className="text-sm text-slate-500">
                            {hasAccessibilityFlow ? 'Older generic reports and manual exports remain here during the migration.' : 'Generic reports and manual exports.'}
                        </p>
                    </div>
                </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                    <GlassCard key={report.id} className="p-5 flex flex-col justify-between group hover:border-cyan-500/50 transition-all">
                        <div>
                            <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                                <Badge variant={report.type === 'TECHNICAL' ? 'info' : report.type === 'EXECUTIVE' ? 'warning' : 'neutral'}>
                                    {report.type}
                                </Badge>
                                <div className="flex items-center gap-1">
                                    {approvalByReportId[report.id]?.status === 'PENDING' && (
                                        <Badge variant="warning">Pending approval</Badge>
                                    )}
                                    {approvalByReportId[report.id]?.status === 'APPROVED' && (
                                        <Badge variant="success">Approved</Badge>
                                    )}
                                    {approvalByReportId[report.id]?.status === 'REJECTED' && (
                                        <Badge variant="danger">Rejected</Badge>
                                    )}
                                    <Badge variant={report.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                                        {report.status}
                                    </Badge>
                                </div>
                            </div>
                            <h4 className="text-lg font-bold text-white mb-2">{report.title}</h4>
                            <p className="text-slate-400 text-sm line-clamp-2">{report.description}</p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500 flex items-center">
                                <Calendar className="w-3 h-3 mr-1" />
                                {report.publishedAt ? `Published ${format(new Date(report.publishedAt), 'MMM dd, yyyy')}` : `Created ${format(new Date(report.createdAt), 'MMM dd')}`}
                            </span>

                            <div className="flex gap-2">
                                {approvalByReportId[report.id]?.status === 'PENDING' && isInternalRole(user?.role) && (
                                    <>
                                        <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10" onClick={() => setReviewModal({ id: approvalByReportId[report.id]!.id, action: 'approve' })}>
                                            <Check className="w-3 h-3 mr-1" /> Approve
                                        </Button>
                                        <Button variant="ghost" size="sm" className="text-rose-400 hover:bg-rose-500/10" onClick={() => setReviewModal({ id: approvalByReportId[report.id]!.id, action: 'reject' })}>
                                            <X className="w-3 h-3 mr-1" /> Reject
                                        </Button>
                                    </>
                                )}
                                {!approvalByReportId[report.id] || approvalByReportId[report.id]?.status !== 'PENDING' ? (
                                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                        <Button variant="ghost" size="sm" className="text-cyan-400 hover:bg-cyan-500/10" onClick={() => handleRequestApproval(report)}>
                                            <Send className="w-3 h-3 mr-1" /> Request approval
                                        </Button>
                                    </PermissionGate>
                                ) : null}
                                {report.status === 'DRAFT' && (
                                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                        <Button variant="ghost" size="sm" className="text-emerald-400 hover:bg-emerald-500/10" onClick={() => handlePublish(report)}>
                                            Publish
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setEditingReport(report); setIsModalOpen(true); }}>
                                            Edit
                                        </Button>
                                    </PermissionGate>
                                )}
                                {(report as any).generatedFileKey ? (
                                    <Button variant="secondary" size="sm" onClick={() => handleDownload(report as any)}>
                                        <Download className="w-3 h-3 mr-1" /> Download
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" className="text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10 h-8" onClick={() => { setGenerateReportId(report.id); setGenerateModalOpen(true); }}>
                                            <FileDown className="w-3 h-3 mr-1" /> Generate
                                        </Button>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                id={`upload-${report.id}`}
                                                className="hidden"
                                                onChange={(e) => e.target.files?.[0] && handleUploadFile(report.id, e.target.files[0])}
                                                accept=".pdf,.pptx"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-slate-400 border-slate-700 hover:bg-slate-800 h-8"
                                                onClick={() => document.getElementById(`upload-${report.id}`)?.click()}
                                            >
                                                <Upload className="w-3 h-3 mr-1" /> Upload
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-slate-500 hover:text-rose-400 h-8 w-8 p-0"
                                        onClick={() => handleDeleteReport(report)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </PermissionGate>
                            </div>
                        </div>
                    </GlassCard>
                ))}
                {reports.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-slate-800/20 border border-dashed border-slate-700 rounded-xl">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-20" />
                        <h4 className="text-slate-300 font-medium italic">No reports found for this project.</h4>
                        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">Reports provide structured summaries of project health, security, and performance for stakeholders.</p>
                        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                            <div className="flex gap-3 justify-center mt-8">
                                <Button variant="outline" size="sm" onClick={() => setGenerateModalOpen(true)}>
                                    <FileDown className="w-4 h-4 mr-2" /> Generate Now
                                </Button>
                                <Button size="sm" onClick={() => { setEditingReport(null); setIsModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> Create Subject
                                </Button>
                            </div>
                        </PermissionGate>
                    </div>
                )}
            </div>
            </div>

            <Modal isOpen={generateModalOpen} onClose={() => setGenerateModalOpen(false)} title="Generate Report">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Format</label>
                        <select value={generateFormat} onChange={(e) => setGenerateFormat(e.target.value as 'pptx' | 'pdf')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="pptx">PowerPoint (.pptx)</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Attach to report (optional)</label>
                        <select value={generateReportId} onChange={(e) => setGenerateReportId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="">New report</option>
                            {reports.map((r) => (
                                <option key={r.id} value={r.id}>{r.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button type="button" variant="ghost" onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={handleGenerate} disabled={generating}>{generating ? 'Generating…' : 'Generate & Download'}</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isBuilderModalOpen} onClose={() => setBuilderModalOpen(false)} title="Create Report Workspace">
                <form onSubmit={handleCreateBuilderReport} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Assigned template</label>
                        <select
                            value={builderDraft.assignmentId}
                            onChange={(e) => {
                                const nextAssignmentId = e.target.value;
                                const nextAssignment = assignedTemplates.find((assignment) => assignment.id === nextAssignmentId);
                                setBuilderDraft((current) => ({
                                    ...current,
                                    assignmentId: nextAssignmentId,
                                    title: nextAssignment ? `${nextAssignment.template.name} - ${format(new Date(), 'yyyy-MM-dd')}` : current.title,
                                }));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                            required
                        >
                            <option value="">Select template</option>
                            {assignedTemplates.map((assignment) => (
                                <option key={assignment.id} value={assignment.id}>
                                    {assignment.template.name} / v{assignment.templateVersion.versionNumber}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Workspace title"
                        value={builderDraft.title}
                        onChange={(e) => setBuilderDraft((current) => ({ ...current, title: e.target.value }))}
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Visibility</label>
                        <select
                            value={builderDraft.visibility}
                            onChange={(e) => setBuilderDraft((current) => ({ ...current, visibility: e.target.value as ProjectReportVisibility }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white"
                        >
                            <option value="INTERNAL">Internal</option>
                            <option value="CLIENT">Client</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                        <textarea
                            rows={4}
                            value={builderDraft.description}
                            onChange={(e) => setBuilderDraft((current) => ({ ...current, description: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none"
                            placeholder="Accessibility audit scope, language notes, or client-specific context"
                        />
                    </div>
                    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-400">
                        The workspace uses the assigned template version as an immutable snapshot, so later admin template edits will not break this report.
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setBuilderModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={assignedTemplates.length === 0}>Create Workspace</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingReport ? "Edit Report" : "Create New Report"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="title" label="Report Title" defaultValue={editingReport?.title} required />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                        <select name="type" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" defaultValue={editingReport?.type || 'TECHNICAL'}>
                            <option value="TECHNICAL">Technical Report</option>
                            <option value="EXECUTIVE">Executive Summary</option>
                            <option value="COMPLIANCE">Compliance Audit</option>
                            <option value="OTHER">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Visibility</label>
                        <select name="visibility" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" defaultValue={editingReport?.visibility || 'INTERNAL'}>
                            <option value="INTERNAL">Internal Team Only</option>
                            <option value="CLIENT">Visible to Client</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                        <textarea name="description" rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" defaultValue={editingReport?.description}></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Report</Button>
                    </div>
                </form>
            </Modal>

            {reviewModal && (
                <Modal isOpen={!!reviewModal} onClose={() => { setReviewModal(null); setReviewComment(''); }} title={reviewModal.action === 'approve' ? 'Approve request' : 'Reject request'}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Comment (optional)</label>
                            <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" placeholder="Add a comment..." />
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
