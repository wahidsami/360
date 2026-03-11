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

   if (loading) return <div className="text-center p-10 text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Command Center...</div>;

   const visible = widgetOrder.length ? widgetOrder : [...DEFAULT_WIDGET_IDS];
   const has = (id: string) => visible.includes(id);

   return (
      <div className="space-y-10">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('welcome')}, {role.replace('_', ' ')}.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={openCustomize} className="text-slate-500 hover:text-cyan-600 font-bold uppercase tracking-widest text-[10px]"><Settings2 className="w-4 h-4 mr-2" /> Customize Workspace</Button>
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
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               {has('revenue-chart') && (
               <GlassCard title="Revenue Velocity">
                  <div className="h-72 w-full min-h-[250px] mt-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                           <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                 <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} opacity={0.4} />
                           <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                           <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} fontWeight="bold" />
                           <Tooltip
                              contentStyle={{ 
                                 backgroundColor: 'var(--app-surface)', 
                                 borderColor: 'var(--app-border)', 
                                 borderRadius: '16px',
                                 boxShadow: 'var(--shadow-xl)',
                                 border: 'none',
                                 padding: '12px'
                              }}
                              itemStyle={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}
                           />
                           <Area type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </GlassCard>
               )}
               {has('latest-updates') && (
               <GlassCard title={t('latest_updates')}>
                  <div className="space-y-5 mt-4">
                     {(stats.latestUpdates as ProjectUpdate[]).map(u => (
                        <div key={u.id} className="flex gap-5 items-start border-b border-slate-100 dark:border-slate-800/50 pb-5 last:border-0 last:pb-0 group hover:translate-x-1 transition-transform">
                           <div className="mt-1 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 shadow-sm transition-colors group-hover:bg-cyan-50 dark:group-hover:bg-cyan-900/20"><Activity className="w-5 h-5" /></div>
                           <div className="flex-1">
                              <p className="text-sm font-black text-slate-800 dark:text-slate-200 tracking-tight">{u.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">{u.content}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 font-black uppercase tracking-[0.2em]">{new Date(u.timestamp).toLocaleDateString()} • {u.authorName}</p>
                           </div>
                        </div>
                     ))}
                  </div>
               </GlassCard>
               )}
            </div>

            <div className="space-y-8">
               {has('projects-at-risk') && (
               <GlassCard title={t('projects_at_risk')}>
                  <div className="space-y-4 mt-4">
                     {(stats.projectsAtRisk as Project[]).map(p => (
                        <div key={p.id} className="p-5 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all shadow-sm hover:shadow-md group" onClick={() => navigate(`/app/projects/${p.id}`)}>
                           <div className="flex justify-between items-start">
                              <h4 className="font-black text-rose-900 dark:text-rose-200 text-sm tracking-tighter uppercase">{p.name}</h4>
                              <Badge variant="danger" size="sm" pulse>{p.health}</Badge>
                           </div>
                           <div className="mt-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                              <div className="bg-gradient-to-r from-rose-400 to-rose-600 h-full rounded-full transition-all duration-1000 group-hover:scale-x-105 origin-left" style={{ width: `${p.progress}%` }} />
                           </div>
                        </div>
                     ))}
                     {stats.projectsAtRisk.length === 0 && <p className="text-slate-500 text-sm font-medium text-center py-4 italic">System stable. No critical risks.</p>}
                  </div>
               </GlassCard>
               )}
               {has('pending-approvals') && (
               <GlassCard title={t('pending_approvals')}>
                  <div className="text-center py-10 mt-2">
                     <div className="text-6xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter drop-shadow-sm">{stats.pendingApprovals}</div>
                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Awaiting Verification</p>
                  </div>
               </GlassCard>
               )}
            </div>
         </div>
         )}

         <Modal isOpen={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Dashboard Preferences">
            <div className="space-y-6">
               <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Workspace Visibility Controls</p>
               <div className="grid gap-3">
                  {customizeWidgets.map((w, i) => (
                     <label key={w.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{WIDGET_LABELS[w.id] || w.id}</span>
                        <input
                           type="checkbox"
                           checked={w.enabled}
                           onChange={(e) => setCustomizeWidgets(prev => prev.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))}
                           className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-cyan-500 focus:ring-cyan-500"
                        />
                     </label>
                  ))}
               </div>
               <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={() => setCustomizeOpen(false)} className="font-bold uppercase tracking-widest text-xs">Discard Changes</Button>
                  <Button onClick={saveCustomize} className="font-black uppercase tracking-widest text-xs">Finalize Layout</Button>
               </div>
            </div>
         </Modal>
      </div>
   );
};
