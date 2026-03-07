import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Filter, BarChart3, Activity } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell, Legend } from 'recharts';
import { GlassCard, Button, Badge, Input, Select, KpiCard } from "@/components/ui/UIComponents";
import { api } from '@/services/api';
import { Report } from '@/types';

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
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reports, setReports] = useState<Report[]>([]);

  React.useEffect(() => {
    const loadReports = async () => {
      const data = await api.reports.list();
      setReports(data || []);
    };
    loadReports();
  }, []);

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
          <p className="text-slate-400">Intelligence aggregation and data export.</p>
        </div>
        <Button className="shadow-[0_0_15px_rgba(6,182,212,0.4)]">
          <FileText className="w-4 h-4 mr-2" /> Generate Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard label="Total Reports" value="142" trend={12} icon={<FileText />} />
        <KpiCard label="Generated (Mo)" value="24" trend={8} icon={<Activity />} />
        <KpiCard label="Storage Used" value="1.2 GB" icon={<BarChart3 />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard title="Report Composition">
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

        <GlassCard title="Usage Trends">
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
          <h3 className="text-lg font-semibold text-white">Archives</h3>
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
              <option value="all">All Types</option>
              <option value="security">Security</option>
              <option value="financial">Financial</option>
              <option value="performance">Performance</option>
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
    </div>
  );
};

export default Reports;