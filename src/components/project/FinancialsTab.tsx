import React, { useState, useEffect } from 'react';
import { Contract, Invoice, Permission, isInternalRole } from '@/types';
import { Button, GlassCard, Badge, Input, Modal, Select } from '../ui/UIComponents';
import { Plus, FileText, DollarSign, Calendar, Download, Trash2, Edit, Send, Check, X, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { api } from '@/services/api';
import { useParams } from 'react-router-dom';
import { SarSymbol, formatSAR } from '../../utils/currency';
import { format } from 'date-fns';
import { PermissionGate } from '../PermissionGate';
import toast from 'react-hot-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

function PaymentForm({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setLoading(true);
        setError(null);
        const { error: err } = await stripe.confirmPayment({
            elements,
            confirmParams: { return_url: window.location.href },
            redirect: 'if_required',
        });
        setLoading(false);
        if (err) {
            setError(err.message || 'Payment failed');
            return;
        }
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={!stripe || loading}>{loading ? 'Processing…' : 'Pay now'}</Button>
            </div>
        </form>
    );
}

interface ApprovalInfo {
  id: string;
  status: string;
  entityType: string;
  entityId: string;
  stepOrder?: number;
  approver?: { id: string; name: string };
  requestedBy?: { name: string };
  reviewedBy?: { name: string };
  reviewedAt?: string;
  comment?: string | null;
}

interface FinancialsTabProps {
    contract?: Contract;
    invoices: Invoice[];
    onRefresh?: () => void;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ contract: initialContract, invoices: initialInvoices, onRefresh }) => {
    const { t } = useTranslation();
    const { projectId } = useParams();
    const { user } = useAuth();
    const [activeView, setActiveView] = useState<'overview' | 'contracts' | 'invoices'>('overview');

    // Local state for lists (in case we want to manipulate them optimistically, but mostly relying on props or re-fetching)
    // For this implementation, we'll trigger parent refresh or local fetch
    const [contracts, setContracts] = useState<Contract[]>(initialContract ? [initialContract] : []); // The API currently returns a list but the prop was single. Let's assume list for future.
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

    // Approvals: key = "CONTRACT:id" or "INVOICE:id" -> list of steps (sorted by stepOrder)
    const [approvalMap, setApprovalMap] = useState<Record<string, ApprovalInfo[]>>({});
    const [reviewModal, setReviewModal] = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
    const [reviewComment, setReviewComment] = useState('');

    // Modals
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any | null>(null);

    // Pay with Card (Stripe)
    const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
    const [payClientSecret, setPayClientSecret] = useState<string | null>(null);
    const [payLoading, setPayLoading] = useState(false);

    // Stats
    const totalOutstanding = invoices.filter(i => i.status === 'issued' || i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0);
    const totalPaid = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount, 0);
    const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((acc, i) => acc + i.amount, 0);

    // Fetch data wrapper
    const refreshData = async () => {
        if (onRefresh) {
            onRefresh();
        } else if (projectId) {
            // Fallback fetch if onRefresh not provided
            try {
                const cons = await api.projects.getContracts(projectId);
                setContracts(cons);
                const invs = await api.projects.getInvoices(projectId);
                setInvoices(invs);
            } catch (e) {
                console.error(e);
            }
        }
        loadApprovals();
    };

    const loadApprovals = () => {
        if (!projectId) return;
        api.approvals.listByProject(projectId).then((list: any[]) => {
            const map: Record<string, ApprovalInfo[]> = {};
            (list || []).forEach((a: any) => {
                const key = `${a.entityType}:${a.entityId}`;
                if (!map[key]) map[key] = [];
                map[key].push({
                    id: a.id,
                    status: a.status,
                    entityType: a.entityType,
                    entityId: a.entityId,
                    stepOrder: a.stepOrder,
                    approver: a.approver,
                    requestedBy: a.requestedBy,
                    reviewedBy: a.reviewedBy,
                    reviewedAt: a.reviewedAt,
                    comment: a.comment,
                });
            });
            Object.keys(map).forEach(k => map[k].sort((a, b) => (a.stepOrder ?? 1) - (b.stepOrder ?? 1)));
            setApprovalMap(map);
        }).catch(() => {});
    };

    useEffect(() => {
        loadApprovals();
    }, [projectId]);

    useEffect(() => {
        setContracts(initialContract ? [initialContract] : []);
        setInvoices(initialInvoices || []);
    }, [initialContract, initialInvoices]);

    // --- Handlers ---

    const handleCreateContract = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            title: formData.get('title') as string,
            amount: parseFloat(formData.get('amount') as string),
            currency: 'SAR', // Default
            startDate: formData.get('startDate') as string,
            endDate: formData.get('endDate') as string || null,
            status: 'active'
        };

        if (editingItem) {
            await api.projects.updateContract(projectId, editingItem.id, data);
        } else {
            await api.projects.createContract(projectId, data);
        }
        setEditingItem(null);
        setIsContractModalOpen(false);
        refreshData();
    };

    const handleDeleteContract = async (id: string) => {
        if (!projectId || !confirm(t('confirm_delete'))) return;
        await api.projects.deleteContract(projectId, id);
        refreshData();
    };

    const handleCreateInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;
        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            invoiceNumber: formData.get('invoiceNumber') as string,
            amount: parseFloat(formData.get('amount') as string),
            dueDate: formData.get('dueDate') as string,
            currency: 'SAR',
            status: formData.get('status') as string || 'draft',
            contractId: formData.get('contractId') as string || undefined
        };

        if (editingItem) {
            await api.projects.updateInvoice(projectId, editingItem.id, data);
        } else {
            await api.projects.createInvoice(projectId, data);
        }
        setEditingItem(null);
        setIsInvoiceModalOpen(false);
        refreshData();
    };

    const handleDeleteInvoice = async (id: string) => {
        if (!projectId || !confirm(t('confirm_delete'))) return;
        await api.projects.deleteInvoice(projectId, id);
        refreshData();
    };

    const openEditContract = (c: Contract) => {
        setEditingItem(c);
        setIsContractModalOpen(true);
    }

    const openEditInvoice = (i: Invoice) => {
        setEditingItem(i);
        setIsInvoiceModalOpen(true);
    };

    const openPayModal = async (invoice: Invoice) => {
        if (!projectId) return;
        setPayInvoice(invoice);
        setPayClientSecret(null);
        setPayLoading(true);
        try {
            const { clientSecret } = await api.projects.createPaymentIntent(projectId, invoice.id);
            setPayClientSecret(clientSecret);
        } catch (e: any) {
            toast.error(e?.message || 'Could not start payment');
            setPayInvoice(null);
        } finally {
            setPayLoading(false);
        }
    };

    const handleRequestApproval = async (entityType: 'CONTRACT' | 'INVOICE', entityId: string) => {
        if (!projectId) return;
        try {
            await api.approvals.create({ entityType, entityId, projectId });
            toast.success('Approval requested');
            loadApprovals();
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
            loadApprovals();
        } catch (e) {
            toast.error((e as Error).message);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign className="w-16 h-16 text-emerald-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{t('total_paid')}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white"><SarSymbol /> {totalPaid.toLocaleString()}</span>
                        <span className="text-sm text-emerald-400">+12%</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText className="w-16 h-16 text-amber-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{t('outstanding')}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white"><SarSymbol /> {totalOutstanding.toLocaleString()}</span>
                    </div>
                </GlassCard>

                <GlassCard className="p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-16 h-16 text-rose-400" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{t('overdue')}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white"><SarSymbol /> {totalOverdue.toLocaleString()}</span>
                    </div>
                </GlassCard>
            </div>

            {/* Main Content Area */}
            <GlassCard className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex bg-slate-800/50 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveView('overview')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'overview' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Overview
                        </button>
                        <button
                            onClick={() => setActiveView('contracts')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'contracts' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Contracts
                        </button>
                        <button
                            onClick={() => setActiveView('invoices')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeView === 'invoices' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Invoices
                        </button>
                    </div>

                    <div className="flex gap-2">
                        {activeView === 'contracts' && (
                            <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                <Button onClick={() => { setEditingItem(null); setIsContractModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> New Contract
                                </Button>
                            </PermissionGate>
                        )}
                        {activeView === 'invoices' && (
                            <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                <Button onClick={() => { setEditingItem(null); setIsInvoiceModalOpen(true); }}>
                                    <Plus className="w-4 h-4 mr-2" /> New Invoice
                                </Button>
                            </PermissionGate>
                        )}
                    </div>
                </div>

                {/* Views */}
                {activeView === 'contracts' && (
                    <div className="space-y-4">
                        {contracts.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">No contracts found.</div>
                        ) : (
                            contracts.map(contract => (
                                <div key={contract.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{contract.title}</span>
                                            <span className="text-slate-400 text-sm">{format(new Date(contract.startDate), 'MMM dd, yyyy')} - {contract.endDate ? format(new Date(contract.endDate), 'MMM dd, yyyy') : 'No End Date'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-white font-mono font-medium">{formatSAR(contract.amount)}</div>
                                            <div className="flex items-center gap-2 justify-end flex-wrap">
                                                {((): React.ReactNode => {
                                                    const steps = approvalMap[`CONTRACT:${contract.id}`] ?? [];
                                                    const pendingStep = steps.find((s: ApprovalInfo) => s.status === 'PENDING');
                                                    const overallStatus = steps.some((s: ApprovalInfo) => s.status === 'REJECTED') ? 'REJECTED' : steps.length > 0 && steps.every((s: ApprovalInfo) => s.status === 'APPROVED') ? 'APPROVED' : pendingStep ? 'PENDING' : null;
                                                    return (
                                                      <>
                                                        {overallStatus === 'PENDING' && <Badge variant="warning">Pending approval{steps.length > 1 ? ` (${steps.findIndex((s: ApprovalInfo) => s.status === 'PENDING') + 1}/${steps.length})` : ''}</Badge>}
                                                        {overallStatus === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                                                        {overallStatus === 'REJECTED' && <Badge variant="danger">Rejected</Badge>}
                                                        <Badge variant={contract.status === 'active' ? 'success' : 'neutral'}>{contract.status}</Badge>
                                                      </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                            <div className="flex gap-2 items-center">
                                                {((): React.ReactNode => {
                                                    const steps = approvalMap[`CONTRACT:${contract.id}`] ?? [];
                                                    const pendingStep = steps.find((s: ApprovalInfo) => s.status === 'PENDING');
                                                    const hasPending = !!pendingStep;
                                                    return (
                                                      <>
                                                        {hasPending && isInternalRole(user?.role) && (
                                                            <>
                                                                <Button variant="ghost" size="sm" className="text-emerald-400" onClick={() => setReviewModal({ id: pendingStep!.id, action: 'approve' })}><Check className="w-4 h-4" /></Button>
                                                                <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => setReviewModal({ id: pendingStep!.id, action: 'reject' })}><X className="w-4 h-4" /></Button>
                                                            </>
                                                        )}
                                                        {!hasPending && (
                                                            <Button variant="ghost" size="sm" className="text-cyan-400" onClick={() => handleRequestApproval('CONTRACT', contract.id)}><Send className="w-4 h-4 mr-1" /> Request approval</Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => openEditContract(contract)}><Edit className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => handleDeleteContract(contract.id)}><Trash2 className="w-4 h-4" /></Button>
                                                      </>
                                                    );
                                                })()}
                                            </div>
                                        </PermissionGate>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeView === 'invoices' && (
                    <div className="space-y-4">
                        {invoices.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">No invoices found.</div>
                        ) : (
                            invoices.map(invoice => (
                                <div key={invoice.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{invoice.invoiceNumber}</span>
                                            <span className="text-slate-400 text-sm">Due {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-white font-mono font-medium">{formatSAR(invoice.amount)}</div>
                                            <div className="flex items-center gap-2 justify-end flex-wrap">
                                                {((): React.ReactNode => {
                                                    const steps = approvalMap[`INVOICE:${invoice.id}`] ?? [];
                                                    const pendingStep = steps.find((s: ApprovalInfo) => s.status === 'PENDING');
                                                    const overallStatus = steps.some((s: ApprovalInfo) => s.status === 'REJECTED') ? 'REJECTED' : steps.length > 0 && steps.every((s: ApprovalInfo) => s.status === 'APPROVED') ? 'APPROVED' : pendingStep ? 'PENDING' : null;
                                                    return (
                                                      <>
                                                        {overallStatus === 'PENDING' && <Badge variant="warning">Pending approval{steps.length > 1 ? ` (step ${steps.findIndex((s: ApprovalInfo) => s.status === 'PENDING') + 1}/${steps.length})` : ''}</Badge>}
                                                        {overallStatus === 'APPROVED' && <Badge variant="success">Approved</Badge>}
                                                        {overallStatus === 'REJECTED' && <Badge variant="danger">Rejected</Badge>}
                                                        <Badge variant={
                                                            invoice.status === 'paid' ? 'success' :
                                                                invoice.status === 'overdue' ? 'danger' :
                                                                    invoice.status === 'issued' || invoice.status === 'ISSUED' ? 'warning' : 'neutral'
                                                        }>{invoice.status}</Badge>
                                                      </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                            <div className="flex gap-2 items-center">
                                                {((): React.ReactNode => {
                                                    const steps = approvalMap[`INVOICE:${invoice.id}`] ?? [];
                                                    const pendingStep = steps.find((s: ApprovalInfo) => s.status === 'PENDING');
                                                    const hasPending = !!pendingStep;
                                                    return (
                                                      <>
                                                        {hasPending && isInternalRole(user?.role) && (
                                                            <>
                                                                <Button variant="ghost" size="sm" className="text-emerald-400" onClick={() => setReviewModal({ id: pendingStep!.id, action: 'approve' })}><Check className="w-4 h-4" /></Button>
                                                                <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => setReviewModal({ id: pendingStep!.id, action: 'reject' })}><X className="w-4 h-4" /></Button>
                                                            </>
                                                        )}
                                                        {!hasPending && (
                                                            <Button variant="ghost" size="sm" className="text-cyan-400" onClick={() => handleRequestApproval('INVOICE', invoice.id)}><Send className="w-4 h-4 mr-1" /> Request approval</Button>
                                                        )}
                                                        {(invoice.status === 'issued' || invoice.status === 'ISSUED') && (
                                                            <Button variant="ghost" size="sm" className="text-emerald-400" onClick={() => openPayModal(invoice)} disabled={payLoading}><CreditCard className="w-4 h-4 mr-1" /> Pay with Card</Button>
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => openEditInvoice(invoice)}><Edit className="w-4 h-4" /></Button>
                                                        <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => handleDeleteInvoice(invoice.id)}><Trash2 className="w-4 h-4" /></Button>
                                                      </>
                                                    );
                                                })()}
                                            </div>
                                        </PermissionGate>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeView === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Simplified Overview */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-white">Recent Invoices</h3>
                            {invoices.slice(0, 5).map(i => (
                                <div key={i.id} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                                    <div>
                                        <p className="text-sm text-slate-300">{i.invoiceNumber}</p>
                                        <p className="text-xs text-slate-500">{format(new Date(i.dueDate), 'MMM dd')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-white">{formatSAR(i.amount)}</p>
                                        <span className={`text-xs ${i.status === 'paid' ? 'text-emerald-400' : i.status === 'overdue' ? 'text-rose-400' : 'text-amber-400'}`}>{i.status}</span>
                                    </div>
                                </div>
                            ))}
                            {invoices.length === 0 && <p className="text-slate-500 text-sm">No recent invoices.</p>}
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-white">Contracts</h3>
                            {contracts.slice(0, 3).map(c => (
                                <div key={c.id} className="p-4 bg-slate-800/40 rounded border border-slate-700">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-slate-300 font-medium">{c.title}</span>
                                        <Badge size="sm" variant="info">{c.status}</Badge>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div className="text-xs text-slate-500">
                                            {format(new Date(c.startDate), 'MMM dd')} - {c.endDate ? format(new Date(c.endDate), 'MMM dd, yyyy') : 'Perpetual'}
                                        </div>
                                        <div className="text-lg font-bold text-white"><SarSymbol /> {c.amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                            {contracts.length === 0 && <p className="text-slate-500 text-sm">No active contracts.</p>}
                        </div>
                    </div>
                )}
            </GlassCard>

            {/* Contract Modal */}
            <Modal isOpen={isContractModalOpen} onClose={() => setIsContractModalOpen(false)} title={editingItem ? "Edit Contract" : "New Contract"}>
                <form onSubmit={handleCreateContract} className="space-y-4">
                    <Input name="title" label="Contract Title" defaultValue={editingItem?.title} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="amount" type="number" label="Amount (SAR)" defaultValue={editingItem?.amount} required />
                        <Input name="status" label="Status" defaultValue={editingItem?.status || 'active'} /> {/* Should be select */}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="startDate" type="date" label="Start Date" defaultValue={editingItem?.startDate ? new Date(editingItem.startDate).toISOString().split('T')[0] : ''} required />
                        <Input name="endDate" type="date" label="End Date" defaultValue={editingItem?.endDate ? new Date(editingItem.endDate).toISOString().split('T')[0] : ''} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsContractModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Contract</Button>
                    </div>
                </form>
            </Modal>

            {/* Invoice Modal */}
            <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} title={editingItem ? "Edit Invoice" : "New Invoice"}>
                <form onSubmit={handleCreateInvoice} className="space-y-4">
                    <Input name="invoiceNumber" label="Invoice Number" placeholder="e.g. INV-2026-001" defaultValue={editingItem?.invoiceNumber} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input name="amount" type="number" step="0.01" label="Amount (SAR)" defaultValue={editingItem?.amount} required />
                        <Input name="dueDate" type="date" label="Due Date" defaultValue={editingItem?.dueDate ? new Date(editingItem.dueDate).toISOString().split('T')[0] : ''} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                        <select name="status" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" defaultValue={editingItem?.status || 'draft'}>
                            <option value="draft">Draft</option>
                            <option value="issued">Issued</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                    {/* Optional Contract Link */}
                    {contracts.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Link to Contract (Optional)</label>
                            <select name="contractId" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" defaultValue={editingItem?.contractId || ''}>
                                <option value="">None</option>
                                {contracts.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsInvoiceModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Invoice</Button>
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

            {payInvoice && (
                <Modal
                    isOpen={!!payInvoice}
                    onClose={() => { setPayInvoice(null); setPayClientSecret(null); }}
                    title={`Pay invoice ${payInvoice.invoiceNumber} — ${formatSAR(payInvoice.amount)}`}
                >
                    {!stripePk ? (
                        <p className="text-slate-400 text-sm">Configure VITE_STRIPE_PUBLISHABLE_KEY in the environment to enable Pay with Card.</p>
                    ) : payLoading || !payClientSecret ? (
                        <p className="text-slate-400">Preparing payment…</p>
                    ) : (
                        <Elements stripe={loadStripe(stripePk)} options={{ clientSecret: payClientSecret }}>
                            <PaymentForm
                                onSuccess={() => {
                                    toast.success('Payment successful');
                                    setPayInvoice(null);
                                    setPayClientSecret(null);
                                    refreshData();
                                }}
                                onClose={() => { setPayInvoice(null); setPayClientSecret(null); }}
                            />
                        </Elements>
                    )}
                </Modal>
            )}
        </div>
    );
};
