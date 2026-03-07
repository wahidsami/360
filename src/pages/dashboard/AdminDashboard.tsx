import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Briefcase, DollarSign, Activity, AlertTriangle, Clock, Settings2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { GlassCard, KpiCard, Badge, Button, Modal } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Project, ProjectUpdate } from '@/types';
import { useNavigate } from 'react-router-dom';
import { formatSAR } from '../../utils/currency';
import toast from 'react-hot-toast';

const DEFAULT_WIDGET_IDS = ['kpi-cards', 'tools-panel', 'revenue-chart', 'latest-updates', 'projects-at-risk', 'pending-approvals'] as const;
const WIDGET_LABELS: Record<string, string> = {
  'kpi-cards': 'KPI cards',
  'tools-panel': 'Quick actions',
  'revenue-chart': 'Revenue chart',
  'latest-updates': 'Latest updates',
  'projects-at-risk': 'Projects at risk',
  'pending-approvals': 'Pending approvals',
};

const data = [
   { name: 'Jan', value: 4000 },
   { name: 'Feb', value: 3000 },
   { name: 'Mar', value: 2000 },
   { name: 'Apr', value: 2780 },
   { name: 'May', value: 1890 },
   { name: 'Jun', value: 2390 },
   { name: 'Jul', value: 3490 },
];

export const AdminDashboard: React.FC<{ role: Role }> = ({ role }) => {
   const { t } = useTranslation();
   const navigate = useNavigate();
   const [stats, setStats] = useState<any>(null);
   const [loading, setLoading] = useState(true);
   const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
   const [customizeOpen, setCustomizeOpen] = useState(false);
   const [customizeWidgets, setCustomizeWidgets] = useState<{ id: string; enabled: boolean }[]>([]);

   useEffect(() => {
      const load = async () => {
         const [data, prefs] = await Promise.all([
            api.dashboard.getAdminStats(),
            api.me.getDashboardPreferences().catch(() => ({ widgets: [] })),
         ]);
         setStats(data);
         if (prefs.widgets?.length) {
            setWidgetOrder(prefs.widgets.map((w: any) => w.id));
         } else {
            setWidgetOrder([...DEFAULT_WIDGET_IDS]);
         }
         setLoading(false);
      };
      load();
   }, []);

   const openCustomize = () => {
      setCustomizeWidgets(
         DEFAULT_WIDGET_IDS.map(id => ({ id, enabled: widgetOrder.includes(id) }))
      );
      setCustomizeOpen(true);
   };

   const saveCustomize = async () => {
      const enabled = customizeWidgets.filter(w => w.enabled).map(w => w.id);
      const widgets = enabled.map((id, i) => ({ id, order: i, config: {} }));
      await api.me.updateDashboardPreferences({ widgets });
      setWidgetOrder(enabled);
      setCustomizeOpen(false);
      toast.success('Dashboard updated');
   };

   if (loading) return <div className="text-center p-10 text-slate-500">Loading Command Center...</div>;

   const visible = widgetOrder.length ? widgetOrder : [...DEFAULT_WIDGET_IDS];
   const has = (id: string) => visible.includes(id);

   return (
      <div className="space-y-8">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-3xl font-bold font-display text-white">{t('dashboard')}</h1>
               <p className="text-slate-400 mt-1">{t('welcome')}, {role.replace('_', ' ')}.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={openCustomize}><Settings2 className="w-4 h-4 mr-1" /> Customize dashboard</Button>
         </div>

         {has('kpi-cards') && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('total_clients')} value={stats.totalClients} trend={12} icon={<Users />} />
            <KpiCard label={t('active_projects')} value={stats.activeProjects} trend={-5} icon={<Briefcase />} />
            <KpiCard label={t('revenue')} value={formatSAR(stats.revenue)} trend={24} icon={<DollarSign />} />
            <KpiCard label={t('overdue_tasks')} value={stats.overdueTasks} trend={-10} icon={<AlertTriangle />} />
         </div>
         )}

         {has('tools-panel') && <ToolsPanel role={role} />}

         {(has('revenue-chart') || has('latest-updates') || has('projects-at-risk') || has('pending-approvals')) && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               {has('revenue-chart') && (
               <GlassCard title="Revenue Velocity">
                  <div className="h-64 w-full min-h-[200px]">
                     <ResponsiveContainer width="100%" height="100%" minHeight={100}>
                        <AreaChart data={data}>
                           <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                 <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                           <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                           <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                           <Tooltip
                              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                              itemStyle={{ color: '#cbd5e1' }}
                           />
                           <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </GlassCard>
               )}
               {has('latest-updates') && (
               <GlassCard title={t('latest_updates')}>
                  <div className="space-y-4">
                     {(stats.latestUpdates as ProjectUpdate[]).map(u => (
                        <div key={u.id} className="flex gap-4 items-start border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                           <div className="mt-1 p-2 rounded-full bg-slate-800 text-cyan-400"><Activity className="w-4 h-4" /></div>
                           <div>
                              <p className="text-sm font-medium text-slate-200">{u.title}</p>
                              <p className="text-xs text-slate-400 mt-1 line-clamp-1">{u.content}</p>
                              <p className="text-[10px] text-slate-600 mt-1">{new Date(u.timestamp).toLocaleDateString()} • {u.authorName}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </GlassCard>
               )}
            </div>

            <div className="space-y-6">
               {has('projects-at-risk') && (
               <GlassCard title={t('projects_at_risk')}>
                  <div className="space-y-3">
                     {(stats.projectsAtRisk as Project[]).map(p => (
                        <div key={p.id} className="p-3 bg-rose-900/10 border border-rose-500/20 rounded-lg cursor-pointer hover:bg-rose-900/20 transition-colors" onClick={() => navigate(`/app/projects/${p.id}`)}>
                           <div className="flex justify-between items-start">
                              <h4 className="font-medium text-rose-200 text-sm">{p.name}</h4>
                              <Badge variant="danger">{p.health}</Badge>
                           </div>
                           <div className="mt-2 w-full bg-slate-800 rounded-full h-1">
                              <div className="bg-rose-500 h-1 rounded-full" style={{ width: `${p.progress}%` }} />
                           </div>
                        </div>
                     ))}
                     {stats.projectsAtRisk.length === 0 && <p className="text-slate-500 text-sm">No critical projects.</p>}
                  </div>
               </GlassCard>
               )}
               {has('pending-approvals') && (
               <GlassCard title={t('pending_approvals')}>
                  <div className="text-center py-6">
                     <div className="text-4xl font-bold text-white mb-2">{stats.pendingApprovals}</div>
                     <p className="text-sm text-slate-400">Items awaiting review</p>
                  </div>
               </GlassCard>
               )}
            </div>
         </div>
         )}

         <Modal isOpen={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Customize dashboard">
            <div className="space-y-4">
               <p className="text-slate-400 text-sm">Show or hide widgets. Order is saved as listed.</p>
               {customizeWidgets.map((w, i) => (
                  <label key={w.id} className="flex items-center gap-2">
                     <input
                        type="checkbox"
                        checked={w.enabled}
                        onChange={(e) => setCustomizeWidgets(prev => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                        className="rounded border-slate-600"
                     />
                     <span className="text-slate-200">{WIDGET_LABELS[w.id] || w.id}</span>
                  </label>
               ))}
               <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setCustomizeOpen(false)}>Cancel</Button>
                  <Button onClick={saveCustomize}>Save</Button>
               </div>
            </div>
         </Modal>
      </div>
   );
};
