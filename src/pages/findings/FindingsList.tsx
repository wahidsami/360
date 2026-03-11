import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Filter, Search, Plus, Eye, ArrowRight, Trash2,
  AlertTriangle, CheckCircle, AlertCircle, Calendar, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { GlassCard, Button, Badge, Input, Select, KpiCard, Modal, TextArea } from "@/components/ui/UIComponents";
import { api } from '@/services/api';
import { Finding, Project, Client, Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface FindingsListProps {
  initialFindings?: Finding[];
  projectId?: string;
  onRefresh?: () => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({ initialFindings, projectId, onRefresh }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [findings, setFindings] = useState<Finding[]>(initialFindings || []);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(!initialFindings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');

  // Filters State
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      if (!initialFindings) {
        setLoading(true);
        const fData = projectId ? await api.projects.getFindings(projectId) : await api.findings.list();
        setFindings(fData);
      }

      const [pData, cData] = await Promise.all([
        api.projects.list(),
        api.clients.list()
      ]);
      setProjects(pData);
      setClients(cData);
      // Pre-select first project when on global page
      if (!projectId && pData.length > 0) setSelectedProjectId(pData[0].id);
      setLoading(false);
    };
    loadData();
  }, [initialFindings, projectId]);

  useEffect(() => {
    if (initialFindings) {
      setFindings(initialFindings);
    }
  }, [initialFindings]);

  useEffect(() => {
    if (user?.role === Role.FINANCE) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleCreateFinding = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use the prop projectId if available, otherwise fall back to the modal's selected project
    const targetProjectId = projectId || selectedProjectId;
    if (!targetProjectId) {
      toast.error('Please select a project');
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const payload = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      severity: (formData.get('severity') as string).toUpperCase() as any,
      status: (formData.get('status') as string).toUpperCase() as any,
      visibility: (formData.get('visibility') as string).toUpperCase() as any
    };

    const newFinding = await api.projects.createFinding(targetProjectId, payload);
    if (newFinding) {
      setIsModalOpen(false);
      toast.success('Finding created');
      if (onRefresh) onRefresh();
      else {
        const updated = projectId
          ? await api.projects.getFindings(targetProjectId)
          : await api.findings.list();
        setFindings(updated);
      }
    }
  };

  const handleDeleteFinding = async (f: Finding) => {
    if (!window.confirm(`Are you sure you want to delete "${f.title}"?`)) return;
    try {
      await api.projects.deleteFinding(f.projectId, f.id);
      toast.success('Finding deleted');
      if (onRefresh) onRefresh();
      else {
        const updated = projectId
          ? await api.projects.getFindings(projectId)
          : await api.findings.list();
        setFindings(updated);
      }
    } catch (e) {
      toast.error('Failed to delete finding');
    }
  };

  // Helper to resolve IDs
  const getProjectName = (pid: string) => projects.find(p => p.id === pid)?.name || 'Unknown Project';
  const getClientName = (pid: string) => {
    const proj = projects.find(p => p.id === pid);
    if (!proj) return 'Unknown Client';
    return clients.find(c => c.id === proj.clientId)?.name || 'Unknown Client';
  };

  const filteredData = findings.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase());
    const matchSev = severityFilter === 'all' || f.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;

    // Client filter needs resolving from project ID
    const clientName = f.projectId ? getClientName(f.projectId) : 'Unknown';
    const matchClient = clientFilter === 'all' || clientName === clientFilter;

    return matchSearch && matchSev && matchStatus && matchClient;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return <Badge variant="danger">CRITICAL</Badge>;
      case 'high': return <Badge variant="warning">HIGH</Badge>;
      case 'medium': return <Badge variant="info">MEDIUM</Badge>;
      case 'low': return <Badge variant="neutral">LOW</Badge>;
      default: return <Badge variant="neutral">{severity.toUpperCase()}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed': return <Badge variant="neutral">CLOSED</Badge>;
      case 'open': return <Badge variant="danger">OPEN</Badge>;
      case 'in_review': return <Badge variant="warning">IN REVIEW</Badge>;
      case 'in_progress': return <Badge variant="info">IN PROGRESS</Badge>;
      case 'blocked': return <Badge variant="danger">BLOCKED</Badge>;
      default: return <Badge variant="neutral">{status.toUpperCase()}</Badge>;
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500">Loading assessments...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('findings')}</h1>
          <p className="text-slate-400">Vulnerability assessment and quality assurance registry.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await api.export.findingsCsv();
                toast.success('Findings exported');
              } catch {
                toast.error('Export failed');
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Plus className="w-4 h-4 mr-2" /> {t('create_finding')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Critical Issues" value={findings.filter(f => f.severity.toLowerCase() === 'critical').length} icon={<ShieldAlert className="text-rose-500" />} />
        <KpiCard label="Open Findings" value={findings.filter(f => f.status.toLowerCase() === 'open').length} icon={<AlertCircle className="text-amber-500" />} />
        <KpiCard label="Resolution Rate" value={findings.length ? `${Math.round((findings.filter(f => f.status.toLowerCase() === 'closed').length / findings.length) * 100)}%` : '0%'} icon={<CheckCircle className="text-emerald-500" />} trend={12} />
        <KpiCard label="Avg. Resolution Time" value="4.2 days" icon={<Calendar className="text-cyan-500" />} />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search findings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="md:col-span-2">
            <Select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="all">Severity: All</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Status: All</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="closed">Closed</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="all">Client: All</option>
              {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </Select>
          </div>
          <div className="md:col-span-2 flex items-center justify-end">
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <Filter className="w-4 h-4 mr-2" /> Advanced
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Data Table */}
      <GlassCard className="p-0 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
            <tr>
              <th className="p-4 font-medium">{t('title')}</th>
              <th className="p-4 font-medium">{t('project')}</th>
              <th className="p-4 font-medium">{t('severity')}</th>
              <th className="p-4 font-medium">{t('status')}</th>
              <th className="p-4 font-medium">{t('owner')}</th>
              <th className="p-4 font-medium">{t('last_updated')}</th>
              <th className="p-4 font-medium text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredData.map(f => (
              <tr
                key={f.id}
                className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                onClick={() => navigate(`/app/findings/${f.id}`)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors uppercase tracking-tight">{f.title}</div>
                    {(user?.role === Role.PM || user?.role === Role.QA || user?.role === Role.SUPER_ADMIN) && (
                      <Badge variant="info" className="text-[10px] py-0.5 px-1 bg-cyan-500/10 text-cyan-400 border-cyan-500/20">MANAGE</Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 md:hidden">{getClientName(f.projectId)}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-300">{getProjectName(f.projectId)}</div>
                  <div className="text-xs text-slate-500">{getClientName(f.projectId)}</div>
                </td>
                <td className="p-4">{getSeverityBadge(f.severity)}</td>
                <td className="p-4">{getStatusBadge(f.status)}</td>
                <td className="p-4 text-slate-300">{f.assignedTo?.name || 'Unassigned'}</td>
                <td className="p-4 text-slate-400 text-xs">{f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '-'}</td>
                <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-cyan-400"
                      onClick={() => navigate(`/app/findings/${f.id}`)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-rose-400"
                      onClick={() => handleDeleteFinding(f)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                      onClick={() => navigate(`/app/findings/${f.id}`)}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan={7} className="p-20 text-center">
                  <div className="flex flex-col items-center justify-center bg-slate-800/20 border border-dashed border-slate-700 rounded-xl py-12">
                    <ShieldAlert className="w-12 h-12 mb-4 text-slate-600 opacity-20" />
                    <h4 className="text-slate-300 font-medium italic">No findings to display.</h4>
                    <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">This project currently has no recorded vulnerabilities or quality issues.</p>
                    <Button variant="secondary" size="sm" className="mt-6" onClick={() => setIsModalOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Report First Finding
                    </Button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>

      {/* Create Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Finding">
        <form onSubmit={handleCreateFinding} className="space-y-4">
          {/* Project selector — only shown on global page where no projectId prop */}
          {!projectId && (
            <Select
              label="Project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
            >
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          )}
          <Input name="title" label="Finding Title" placeholder="e.g., SQL Injection vulnerability" required />
          <TextArea name="description" label="Description" placeholder="Provide details about the discovery..." required />
          <div className="grid grid-cols-2 gap-4">
            <Select name="severity" label="Severity" defaultValue="medium">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
            <Select name="status" label="Status" defaultValue="open">
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="blocked">Blocked</option>
              <option value="closed">Closed</option>
              <option value="dismissed">Dismissed</option>
            </Select>
          </div>
          <Select name="visibility" label="Visibility" defaultValue="INTERNAL">
            <option value="INTERNAL">Internal Only</option>
            <option value="CLIENT">Visible to Client</option>
          </Select>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Finding</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};