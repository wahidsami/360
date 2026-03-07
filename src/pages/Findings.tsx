import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ShieldAlert, AlertTriangle, Plus, Filter, ArrowRight } from 'lucide-react';
import { GlassCard, Button, Badge, Input, Select, Label, TextArea } from '../components/ui/UIComponents';
import { api } from '@/services/api';
import { Finding } from '@/types';
import { Modal } from '../components/ui/Modal';

export const Findings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setModalOpen] = useState(false);
  const [newFinding, setNewFinding] = useState({ title: '', severity: 'medium', description: '' });
  const [findings, setFindings] = useState<Finding[]>([]);

  React.useEffect(() => {
    const loadFindings = async () => {
      const data = await api.findings.list();
      setFindings(data);
    };
    loadFindings();
  }, []);

  const filteredFindings = findings.filter(f => {
    const matchSev = filterSeverity === 'all' || f.severity === filterSeverity;
    const matchStatus = filterStatus === 'all' || f.status === filterStatus;
    return matchSev && matchStatus;
  });

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'critical': return <ShieldAlert className="w-5 h-5 text-rose-500" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <CheckCircle2 className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setModalOpen(false);
    alert("Finding created (Mock)");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('findings')}</h1>
          <p className="text-slate-400">Security vulnerabilities and quality assurance tracker.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.4)]">
          <Plus className="w-4 h-4 mr-2" /> {t('create_finding')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="p-4 border-rose-500/30 bg-rose-900/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-rose-400 uppercase">Critical</p>
              <p className="text-2xl font-bold text-white mt-1">{findings.filter(f => f.severity === 'critical').length}</p>
            </div>
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-amber-500/30 bg-amber-900/10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase">High Priority</p>
              <p className="text-2xl font-bold text-white mt-1">{findings.filter(f => f.severity === 'high').length}</p>
            </div>
            <AlertCircle className="w-5 h-5 text-amber-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Open Issues</p>
              <p className="text-2xl font-bold text-white mt-1">{findings.filter(f => f.status === 'open').length}</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-slate-500" />
          </div>
        </GlassCard>
        <GlassCard className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase">Remediated</p>
              <p className="text-2xl font-bold text-white mt-1">{findings.filter(f => f.status === 'closed').length}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <div className="w-40">
            <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="text-xs">
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </div>
          <div className="w-40">
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="text-xs">
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="closed">Remediated</option>
            </Select>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {filteredFindings.map(f => (
          <div key={f.id}>
            <GlassCard
              className={`
                group hover:bg-slate-800/50 transition-all border-l-4 
                ${f.severity.toLowerCase() === 'critical' ? 'border-l-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.1)]' :
                  f.severity.toLowerCase() === 'high' ? 'border-l-amber-500' : 'border-l-slate-600'}
              `}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 p-2 rounded-lg bg-slate-900 ${f.severity.toLowerCase() === 'critical' ? 'animate-pulse' : ''}`}>
                    {getSeverityIcon(f.severity.toLowerCase())}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-200 group-hover:text-white transition-colors">{f.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1 text-cyan-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                        {f.project?.name || 'Project'}
                      </span>
                      <span>•</span>
                      <span className="text-xs">
                        {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : 'Date'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px]">
                          {(f.assignedTo?.name || 'U').charAt(0)}
                        </span>
                        {f.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pl-12 md:pl-0">
                  <Badge variant={f.status === 'open' ? 'danger' : f.status === 'closed' ? 'success' : 'warning'}>
                    {f.status.toUpperCase()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover:translate-x-1 transition-transform"
                    onClick={() => navigate(`/app/findings/${f.id}`)}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>
          </div>
        ))}
        {filteredFindings.length === 0 && (
          <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            No findings match your criteria.
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)} title={t('create_finding')}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('title')}</Label>
            <Input
              value={newFinding.title}
              onChange={(e) => setNewFinding({ ...newFinding, title: e.target.value })}
              required
              placeholder="e.g. SQL Injection Vulnerability"
            />
          </div>
          <div>
            <Label>{t('severity')}</Label>
            <Select
              value={newFinding.severity}
              onChange={(e) => setNewFinding({ ...newFinding, severity: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
          <div>
            <Label>{t('description')}</Label>
            <TextArea
              rows={4}
              value={newFinding.description}
              onChange={(e) => setNewFinding({ ...newFinding, description: e.target.value })}
              placeholder="Describe the issue..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button type="submit" className="bg-rose-600 hover:bg-rose-500 border-rose-400">{t('confirm')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Findings;