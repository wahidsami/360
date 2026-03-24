import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FileText, Download, Filter, BarChart3, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { GlassCard, Button, Badge, Input, Select, KpiCard, Modal } from "@/components/ui/UIComponents";
import { api } from '@/services/api';
import { Report, Project, Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const ANALYTICS_DATA = [
  { name: 'Security', value: 35, color: '#f43f5e' },
  { name: 'Financial', value: 25, color: '#10b981' },
  { name: 'Performance', value: 20, color: '#06b6d4' },
  { name: 'Status', value: 20, color: '#6366f1' },
];

const TREND_DATA = [
  { name: 'Week 1', generated: 4, downloads: 12 },
  { name: 'Week 2', generated: 7, downloads: 18 },
  { name: 'Week 3', generated: 5, downloads: 24 },
  { name: 'Week 4', generated: 9, downloads: 35 },
];

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user && ![Role.SUPER_ADMIN, Role.OPS, Role.PM, Role.FINANCE].includes(user.role)) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Generate modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateProjectId, setGenerateProjectId] = useState('');
  const [generateFormat, setGenerateFormat] = useState<'pptx' | 'pdf'>('pptx');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const loadReports = async () => {
      const data = await api.reports.list();
      setReports(data || []);
    };
    loadReports();

    const loadProjects = async () => {
      const data = await api.projects.list();
      setProjects(data || []);
      if (data && data.length > 0) setGenerateProjectId(data[0].id);
    };
    loadProjects();
  }, []);

  const handleGenerate = async () => {
    if (!generateProjectId) { toast.error('Please select a project'); return; }
    setGenerating(true);
    try {
      const res = await api.projects.generateReport(generateProjectId, { format: generateFormat });
      toast.success(`Report generated (${generateFormat.toUpperCase()})`);
      setGenerateModalOpen(false);
      const data = await api.reports.list();
      setReports(data || []);
      if (res?.reportId && res?.generatedFileKey) {
        const ext = generateFormat === 'pdf' ? 'pdf' : 'pptx';
        await api.projects.downloadReport(generateProjectId, res.reportId, `report.${ext}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || r.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('reports')}</h1>
          <p className="text-slate-400">{t('reports_subtitle')}</p>
        </div>
        <Button className="shadow-[0_0_15px_rgba(6,182,212,0.4)]" onClick={() => setGenerateModalOpen(true)}>
          <FileText className="w-4 h-4 mr-2" /> {t('generate_report')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard label={t('total_reports')} value="142" trend={12} icon={<FileText />} />
        <KpiCard label={t('generated_mo')} value="24" trend={8} icon={<Activity />} />
        <KpiCard label={t('storage_used')} value="1.2 GB" icon={<BarChart3 />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title={t('report_composition')}>
          <div className="h-64 w-full min-h-[200px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minHeight={100}>
              <RePieChart>
                <Pie
                  data={ANALYTICS_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {ANALYTICS_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0)" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard title={t('usage_trends')}>
          <div className="h-64 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minHeight={100}>
              <BarChart data={TREND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                  cursor={{ fill: '#1e293b' }}
                />
                <Bar dataKey="generated" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Generated" />
                <Bar dataKey="downloads" fill="#6366f1" radius={[4, 4, 0, 0]} name="Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <h3 className="text-lg font-semibold text-white">{t('archives')}</h3>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Filter className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-40">
              <option value="all">{t('all_types')}</option>
              <option value="security">{t('security')}</option>
              <option value="financial">{t('financial')}</option>
              <option value="performance">{t('performance')}</option>
            </Select>
          </div>
        </div>

        <GlassCard className="p-0 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/50 text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="p-4 font-medium">{t('title')}</th>
                <th className="p-4 font-medium">{t('type')}</th>
                <th className="p-4 font-medium">{t('generated_at')}</th>
                <th className="p-4 font-medium">{t('generated_by')}</th>
                <th className="p-4 font-medium">{t('status')}</th>
                <th className="p-4 font-medium text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredReports.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${r.type === 'security' ? 'bg-rose-900/20 text-rose-400' :
                        r.type === 'financial' ? 'bg-emerald-900/20 text-emerald-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{r.title}</p>
                        <p className="text-xs text-slate-500">{r.size}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><Badge variant="neutral">{r.type}</Badge></td>
                  <td className="p-4 text-slate-400">{r.date}</td>
                  <td className="p-4 text-slate-300">{r.author}</td>
                  <td className="p-4">
                    <Badge variant={r.status === 'ready' ? 'success' : 'neutral'}>{r.status}</Badge>
                  </td>
                  <td className="p-4 text-right">
                    <Button variant="ghost" size="sm" className="hover:text-cyan-400">
                      <Download className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">{t('no_reports')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </div>
      {/* Generate Report Modal */}
      <Modal isOpen={generateModalOpen} onClose={() => setGenerateModalOpen(false)} title="Generate Report">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Project</label>
            <Select value={generateProjectId} onChange={(e) => setGenerateProjectId(e.target.value)} className="w-full">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {projects.length === 0 && <option value="">No projects available</option>}
            </Select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Format</label>
            <Select value={generateFormat} onChange={(e) => setGenerateFormat(e.target.value as 'pptx' | 'pdf')} className="w-full">
              <option value="pptx">PowerPoint (.pptx)</option>
              <option value="pdf">PDF (.pdf)</option>
            </Select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setGenerateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={generating || !generateProjectId}>
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Reports;