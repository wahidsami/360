import React, { useState, useEffect } from 'react';
import { Report, Permission, isInternalRole } from '@/types';
import { Button, GlassCard, Badge, Modal, Input } from '../ui/UIComponents';
import { FileText, Plus, Download, Calendar, FileDown, Send, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PermissionGate } from '../PermissionGate';
import { format } from 'date-fns';
import { useParams } from 'react-router-dom';
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
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>(initialReports);
    const [approvalByReportId, setApprovalByReportId] = useState<Record<string, ApprovalInfo | null>>({});
    const [reviewModal, setReviewModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
    const [reviewComment, setReviewComment] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [generateModalOpen, setGenerateModalOpen] = useState(false);
    const [generateFormat, setGenerateFormat] = useState<'pptx' | 'pdf'>('pptx');
    const [generateReportId, setGenerateReportId] = useState<string>('');
    const [generating, setGenerating] = useState(false);
    const [editingReport, setEditingReport] = useState<Partial<Report> | null>(null);

    const refreshReports = async () => {
        if (projectId) {
            try {
                const r = await api.projects.getReports(projectId);
                setReports(r);
                onRefresh?.();
            } catch (e) { console.error(e); }
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
        }).catch(() => {});
    }, [projectId, reports.map((r) => r.id).join(',')]);

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
        } catch (e) {
            toast.error('Generate failed');
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
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                        <Button variant="outline" onClick={() => setGenerateModalOpen(true)}>
                            <FileDown className="w-4 h-4 mr-2" /> Generate (PPT/PDF)
                        </Button>
                        <Button onClick={() => { setEditingReport(null); setIsModalOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> Create Report
                        </Button>
                    </PermissionGate>
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
                                ) : report.status === 'PUBLISHED' && (
                                    <Button variant="secondary" size="sm" disabled>
                                        <Download className="w-3 h-3 mr-1" /> —
                                    </Button>
                                )}
                            </div>
                        </div>
                    </GlassCard>
                ))}
                {reports.length === 0 && (
                    <div className="col-span-full py-16 text-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No reports subject created.</p>
                    </div>
                )}
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
