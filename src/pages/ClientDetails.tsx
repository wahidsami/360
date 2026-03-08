import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Folder, Mail, Phone, Globe, MapPin, UserPlus, Upload, FileText, CheckCircle, Clock, Eye, Download } from 'lucide-react';
import { Client, Project, ClientMember, FileAsset, ActivityLog, Role, Permission } from '../types';
import { api } from '../services/api';
import { GlassCard, Button, Badge, KpiCard, Input, Label, Select } from '../components/ui/UIComponents';
import { PermissionGate } from '../components/PermissionGate';
import { Modal } from '../components/ui/Modal';
import { DocumentViewer } from '../components/DocumentViewer';
import { CustomFieldsSection } from '../components/CustomFieldsSection';

export const ClientDetails: React.FC = () => {
    const { t } = useTranslation();
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [client, setClient] = useState<Client | undefined>();
    const [projects, setProjects] = useState<Project[]>([]);
    const [members, setMembers] = useState<ClientMember[]>([]);
    const [files, setFiles] = useState<FileAsset[]>([]);
    const [activity, setActivity] = useState<ActivityLog[]>([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Modal States
    const [isMemberModalOpen, setMemberModalOpen] = useState(false);
    const [isFileModalOpen, setFileModalOpen] = useState(false);
    const [viewModal, setViewModal] = useState<{ isOpen: boolean; url: string; filename: string; mimeType: string; fileId: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form States
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedRole, setSelectedRole] = useState(Role.CLIENT_MEMBER);
    const [fileData, setFileData] = useState({ name: '', category: 'other' as any });

    useEffect(() => {
        if (clientId) {
            loadData();
        }
    }, [clientId]);

    const loadData = async () => {
        if (!clientId) return;
        const c = await api.clients.get(clientId);
        setClient(c);

        // Parallel fetch for sub-resources
        const [p, m, f, a] = await Promise.all([
            api.projects.getByClient(clientId),
            api.clients.getMembers(clientId),
            api.clients.getFiles(clientId),
            api.clients.getActivity(clientId)
        ]);

        setProjects(p);
        setMembers(m);
        setFiles(f);
        setActivity(a);
    };

    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    useEffect(() => {
        if (isMemberModalOpen) {
            api.users.list().then(setAvailableUsers).catch(console.error);
        }
    }, [isMemberModalOpen]);

    const handleFileAction = async (fileId: string, download: boolean = true) => {
        if (!clientId) return;
        try {
            const file = files.find(f => f.id === fileId);
            const url = await api.clients.downloadFile(clientId, fileId, download);
            if (url) {
                if (download) {
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '';
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                } else if (file) {
                    setViewModal({
                        isOpen: true,
                        url,
                        filename: file.name,
                        mimeType: file.mimeType || 'application/octet-stream',
                        fileId: file.id
                    });
                }
            }
        } catch (err) {
            console.error('File action failed', err);
        }
    };

    const handleInviteMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId || !selectedUserId) return;
        setIsSubmitting(true);
        try {
            await api.clients.addMember(clientId, selectedUserId, selectedRole);
            setMemberModalOpen(false);
            loadData(); // Refresh data
        } catch (e) {
            console.error("Failed to add member", e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!clientId) return;
        if (!confirm(t('confirm_remove_member'))) return;
        try {
            await api.clients.removeMember(clientId, userId);
            loadData();
        } catch (e) {
            console.error("Failed to remove member", e);
        }
    };

    const handleUploadFile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId || !fileData.name) return;
        setIsSubmitting(true);
        try {
            const formData = e.target as any;
            const fileInput = formData.querySelector('input[type="file"]');
            const file = fileInput?.files?.[0];

            if (file) {
                await api.clients.uploadFile(clientId, file, fileData.category);
            }
            setFileModalOpen(false);
            loadData(); // Refresh data
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!client) return <div className="p-10 text-center text-slate-500">Loading client data...</div>;

    const tabs = [
        { id: 'overview', label: t('overview') },
        { id: 'projects', label: t('projects') },
        { id: 'members', label: t('members') },
        { id: 'financials', label: t('financials') },
        { id: 'files', label: t('files') },
        { id: 'activity', label: t('activity') },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('..')}><ArrowLeft className="w-5 h-5" /></Button>
                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-xl">
                        {client.logoUrl ? (
                            <img
                                src={client.logoUrl}
                                alt={client.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-500">${client.name.charAt(0)}</div>`;
                                }}
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-slate-500">
                                {client.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-display text-white">{client.name}</h1>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {client.address || 'No Address'}</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full" />
                            <span>{client.industry}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant={client.status === 'active' ? 'success' : 'neutral'}>{client.status.toUpperCase()}</Badge>
                    <PermissionGate permission={Permission.MANAGE_CLIENTS}>
                        <Button variant="secondary" size="sm" onClick={() => navigate('edit')}>Edit Profile</Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700/50 overflow-x-auto scrollbar-none gap-8">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 px-2 font-medium text-sm transition-all border-b-2 whitespace-nowrap ${activeTab === tab.id ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="min-h-[400px]">

                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-6">
                            <GlassCard title="At a Glance" className="h-fit">
                                <dl className="space-y-4 text-sm">
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Mail className="w-4 h-4 text-cyan-500" /> {client.email}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Phone className="w-4 h-4 text-cyan-500" /> {client.phone || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Globe className="w-4 h-4 text-cyan-500" /> {client.website || 'N/A'}
                                    </div>
                                </dl>
                                <div className="mt-6 pt-6 border-t border-slate-700/50">
                                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Financial Health</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-400">Revenue YTD</span>
                                                <span className="text-emerald-400">
                                                    {client.billing?.currency || 'SAR'} {client.revenueYTD.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '70%' }}></div></div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-slate-400">Outstanding</span>
                                                <span className="text-rose-400">
                                                    {client.billing?.currency || 'SAR'} {client.outstandingBalance.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-rose-500 h-1.5 rounded-full" style={{ width: '30%' }}></div></div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>

                            <GlassCard className="h-fit">
                                <CustomFieldsSection entityType="CLIENT" entityId={client.id} />
                            </GlassCard>
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <KpiCard label="Active Projects" value={projects.filter(p => p.status === 'in-progress').length} trend={0} />
                                <KpiCard label="Total Spent" value={`${client.billing?.currency || 'SAR'} ${(client.revenueYTD / 1000).toFixed(1)}k`} trend={12} />
                            </div>

                            <GlassCard title="Recent Activity">
                                <div className="space-y-4">
                                    {activity.slice(0, 3).map(act => (
                                        <div key={act.id} className="flex gap-4 items-start">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs border border-slate-700">
                                                {act.userName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-200">{act.description}</p>
                                                <p className="text-xs text-slate-500">{new Date(act.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {activity.length === 0 && <p className="text-slate-500 text-sm italic">{t('no_activity')}</p>}
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                )}

                {/* PROJECTS */}
                {activeTab === 'projects' && (
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <h3 className="text-lg font-semibold text-white">Active Engagements</h3>
                            <Button size="sm" onClick={() => navigate(`/app/projects/new?clientId=${client.id}`)}>
                                <Folder className="w-4 h-4 mr-2" /> {t('new_project')}
                            </Button>
                        </div>
                        <div className="grid gap-4">
                            {projects.map(p => (
                                <GlassCard key={p.id} className="hover:border-cyan-500/30 cursor-pointer transition-all" onClick={() => navigate(`/app/projects/${p.id}`)}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-cyan-900/20 rounded-lg text-cyan-400">
                                                <Folder />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-slate-100">{p.name || 'Unnamed Project'}</h4>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                    <span>Deadline: {p.deadline || 'TBD'}</span>
                                                    <span>Budget: {p.budget?.toLocaleString() ? `${client?.billing?.currency || 'SAR'} ${p.budget.toLocaleString()}` : 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={p.health === 'good' ? 'success' : p.health === 'at-risk' ? 'warning' : p.health === 'critical' ? 'danger' : 'neutral'}>
                                                {(p.health || 'unknown').toUpperCase()}
                                            </Badge>
                                            <p className="text-xs text-slate-500 mt-2">{p.progress || 0}% Complete</p>
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                            {projects.length === 0 && <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl">No projects found.</div>}
                        </div>
                    </div>
                )}

                {/* MEMBERS */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <h3 className="text-lg font-semibold text-white">Team Access</h3>
                            <PermissionGate permission={Permission.MANAGE_CLIENTS}>
                                <Button size="sm" onClick={() => setMemberModalOpen(true)}>
                                    <UserPlus className="w-4 h-4 mr-2" /> {t('add_member')}
                                </Button>
                            </PermissionGate>
                        </div>
                        <GlassCard>
                            <table className="w-full text-left">
                                <thead className="text-slate-500 text-sm border-b border-slate-700/50">
                                    <tr>
                                        <th className="pb-3 pl-2">Name</th>
                                        <th className="pb-3">Role</th>
                                        <th className="pb-3">Joined</th>
                                        <th className="pb-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {members.map(m => (
                                        <tr key={m.id}>
                                            <td className="py-4 pl-2 font-medium text-slate-200">{m.name}</td>
                                            <td className="py-4"><Badge variant="neutral">{m.role}</Badge></td>
                                            <td className="py-4 text-slate-400 text-sm">{new Date(m.joinedAt).toLocaleDateString()}</td>
                                            <td className="py-4 text-right">
                                                <PermissionGate permission={Permission.MANAGE_CLIENTS}>
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.userId)}>Remove</Button>
                                                </PermissionGate>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </GlassCard>
                    </div>
                )}

                {/* FILES */}
                {activeTab === 'files' && (
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <h3 className="text-lg font-semibold text-white">Assets & Contracts</h3>
                            <Button size="sm" onClick={() => setFileModalOpen(true)}>
                                <Upload className="w-4 h-4 mr-2" /> {t('upload_file')}
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {files.map(f => (
                                <GlassCard key={f.id} className="group hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-2 bg-slate-800 rounded text-cyan-400">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-500 hover:text-white" onClick={() => handleFileAction(f.id, false)}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="p-1 h-7 w-7 text-slate-500 hover:text-white" onClick={() => handleFileAction(f.id, true)}>
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <h4 className="font-medium text-slate-200 truncate" title={f.name}>{f.name}</h4>
                                    <div className="flex justify-between items-center mt-4 text-xs text-slate-500">
                                        <span className="capitalize bg-slate-800 px-2 py-0.5 rounded">{f.category}</span>
                                        <span>{new Date(f.uploadedAt).toLocaleDateString()}</span>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                        {files.length === 0 && <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">{t('no_files')}</div>}
                    </div>
                )}

                {/* ACTIVITY */}
                {activeTab === 'activity' && (
                    <GlassCard>
                        <div className="space-y-8 pl-4 border-l border-slate-700/50 relative">
                            {activity.map(act => (
                                <div key={act.id} className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-cyan-900 border border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                        <span className="text-sm font-medium text-slate-200">{act.description}</span>
                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {new Date(act.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">by <span className="text-cyan-400">{act.userName}</span></p>
                                </div>
                            ))}
                            {activity.length === 0 && <p className="text-slate-500 text-sm italic">{t('no_activity')}</p>}
                        </div>
                    </GlassCard>
                )}

                {/* FINANCIALS (Placeholder logic as mocked) */}
                {activeTab === 'financials' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlassCard title="Invoices">
                            <div className="text-center py-8">
                                <h4 className="text-3xl font-bold text-white mb-2">3</h4>
                                <p className="text-slate-500 text-sm">Open Invoices</p>
                            </div>
                            <div className="border-t border-slate-700/50 pt-4 text-center">
                                <span className="text-rose-400 text-sm font-medium">Overdue: $12,500</span>
                            </div>
                        </GlassCard>
                        <GlassCard title="Contracts">
                            <div className="text-center py-8">
                                <h4 className="text-3xl font-bold text-white mb-2">1</h4>
                                <p className="text-slate-500 text-sm">Active Contract</p>
                            </div>
                            <div className="border-t border-slate-700/50 pt-4 text-center">
                                <span className="text-emerald-400 text-sm font-medium">Exp: Dec 2024</span>
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* Document Viewer Modal */}
            {viewModal && (
                <Modal
                    isOpen={viewModal.isOpen}
                    onClose={() => setViewModal(null)}
                    title={viewModal.filename}
                    maxWidth="max-w-4xl"
                >
                    <DocumentViewer
                        url={viewModal.url}
                        filename={viewModal.filename}
                        mimeType={viewModal.mimeType}
                        onDownload={() => handleFileAction(viewModal.fileId, true)}
                    />
                </Modal>
            )}

            {/* Add Member Modal */}
            <Modal isOpen={isMemberModalOpen} onClose={() => setMemberModalOpen(false)} title={t('add_member')}>
                <form onSubmit={handleInviteMember} className="space-y-4">
                    <div>
                        <Label>{t('select_user')}</Label>
                        <Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} required>
                            <option value="">-- Select User --</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <Label>{t('select_role')}</Label>
                        <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value as Role)}>
                            {Object.values(Role).map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setMemberModalOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" disabled={isSubmitting}>{t('invite')}</Button>
                    </div>
                </form>
            </Modal>

            {/* Upload File Modal */}
            <Modal isOpen={isFileModalOpen} onClose={() => setFileModalOpen(false)} title={t('upload_file')}>
                <form onSubmit={handleUploadFile} className="space-y-4">
                    <div>
                        <Label>{t('file_name')}</Label>
                        <Input value={fileData.name} onChange={(e) => setFileData({ ...fileData, name: e.target.value })} placeholder="e.g. Q1_Report.pdf" required />
                    </div>
                    <div>
                        <Label>File</Label>
                        <Input type="file" required />
                    </div>
                    <div>
                        <Label>{t('file_category')}</Label>
                        <Select value={fileData.category} onChange={(e) => setFileData({ ...fileData, category: e.target.value as any })}>
                            <option value="contract">{t('contract')}</option>
                            <option value="invoice">{t('invoice')}</option>
                            <option value="brief">{t('brief')}</option>
                            <option value="other">{t('other')}</option>
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setFileModalOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" disabled={isSubmitting}>{t('upload')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
