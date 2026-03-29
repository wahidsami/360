import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Briefcase, DollarSign, Activity, AlertTriangle, Clock, Settings2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { GlassCard, KpiCard, Badge, Button, Modal } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Project, ProjectUpdate } from '@/types';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatSAR } from '../../utils/currency';
import toast from 'react-hot-toast';

const DEFAULT_WIDGET_IDS = ['kpi-cards', 'tools-panel', 'revenue-chart', 'client-compliance', 'latest-updates', 'projects-at-risk', 'pending-approvals'] as const;
const WIDGET_LABELS: Record<string, string> = {
  'kpi-cards': 'widget_kpi_cards',
  'tools-panel': 'widget_quick_actions',
  'revenue-chart': 'widget_revenue_chart',
  'client-compliance': 'widget_client_compliance_chart',
  'latest-updates': 'widget_latest_updates',
  'projects-at-risk': 'widget_projects_at_risk',
  'pending-approvals': 'widget_pending_approvals',
};

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
            const saved = prefs.widgets.map((w: any) => w.id);
            const merged = [...saved, ...DEFAULT_WIDGET_IDS.filter(id => !saved.includes(id))];
            setWidgetOrder(merged);
         } else {
            setWidgetOrder([...DEFAULT_WIDGET_IDS]);
         }
         setLoading(false);
      };
      load();
   }, []);

   const revenueSeries = useMemo(
      () =>
         (stats?.revenueByMonth || []).map((point: { monthKey: string; amount: number }) => ({
            ...point,
            label: new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(`${point.monthKey}-01T00:00:00`)),
         })),
      [stats?.revenueByMonth],
   );

   const complianceSeries = useMemo(
      () =>
         (stats?.clientComplianceComparison || [])
            .slice(0, 8)
            .map((item: { clientName: string; compliancePercentage: number; scoredChecks: number }) => ({
               ...item,
               shortName: item.clientName.length > 18 ? `${item.clientName.slice(0, 18)}…` : item.clientName,
            })),
      [stats?.clientComplianceComparison],
   );

   const complianceTooltipLabel = t('client_compliance_score');
   const averageComplianceLabel = t('average_compliance');
   const auditedClientsLabel = t('audited_clients');
   const formatRevenueTick = (value: number) =>
      new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value);

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
      toast.success(t('dashboard_updated'));
   };

   if (loading) return <div className="text-center p-10 text-slate-500 font-bold uppercase tracking-widest animate-pulse">{t('initializing')}</div>;

   const visible = widgetOrder.length ? widgetOrder : [...DEFAULT_WIDGET_IDS];
   const has = (id: string) => visible.includes(id);

   return (
      <div className="space-y-10">
         <div className="flex items-center justify-between">
            <div>
               <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
               <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('welcome')}, {role.replace('_', ' ')}.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={openCustomize} className="text-slate-500 hover:text-cyan-600 font-bold uppercase tracking-widest text-[10px]"><Settings2 className="w-4 h-4 mr-2" /> {t('customize_workspace')}</Button>
         </div>

         {has('kpi-cards') && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KpiCard label={t('total_clients')} value={stats.totalClients} icon={<Users />} />
            <KpiCard label={t('active_projects')} value={stats.activeProjects} icon={<Briefcase />} />
            <KpiCard label={t('revenue')} value={formatSAR(stats.revenue)} icon={<DollarSign />} />
            <KpiCard label={t('overdue_tasks')} value={stats.overdueTasks} icon={<AlertTriangle />} />
         </div>
         )}

         {has('tools-panel') && <ToolsPanel role={role} />}

         {(has('revenue-chart') || has('client-compliance') || has('latest-updates') || has('projects-at-risk') || has('pending-approvals')) && (
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
               {has('revenue-chart') && (
               <GlassCard title={t('revenue_velocity')}>
                  <div className="h-72 w-full min-h-[250px] mt-4">
                     {stats && (
                     <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                        <AreaChart data={revenueSeries}>
                           <defs>
                              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                 <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" vertical={false} opacity={0.4} />
                           <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                           <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => formatRevenueTick(Number(value))} fontWeight="bold" width={60} />
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
                              formatter={(value: number) => [formatCurrency(value, 'SAR'), t('revenue')]}
                           />
                           <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                        </AreaChart>
                     </ResponsiveContainer>
                     )}
                  </div>
               </GlassCard>
               )}
               {has('client-compliance') && (
               <GlassCard title={t('client_compliance_comparison')}>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                     <Badge variant="info" size="sm">{averageComplianceLabel}: {stats.averageCompliance ?? 0}%</Badge>
                     <Badge variant="neutral" size="sm">{auditedClientsLabel}: {stats.auditedClients ?? 0}</Badge>
                  </div>
                  {complianceSeries.length > 0 ? (
                  <div className="h-80 w-full min-h-[280px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={complianceSeries} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" horizontal={false} opacity={0.25} />
                           <XAxis
                              type="number"
                              domain={[0, 100]}
                              stroke="var(--text-muted)"
                              fontSize={10}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `${value}%`}
                           />
                           <YAxis
                              type="category"
                              dataKey="shortName"
                              stroke="var(--text-muted)"
                              fontSize={11}
                              tickLine={false}
                              axisLine={false}
                              width={130}
                           />
                           <Tooltip
                              cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }}
                              contentStyle={{
                                 backgroundColor: 'var(--app-surface)',
                                 borderColor: 'var(--app-border)',
                                 borderRadius: '16px',
                                 boxShadow: 'var(--shadow-xl)',
                                 border: 'none',
                                 padding: '12px'
                              }}
                              formatter={(value: number, _name, payload: any) => [`${value}%`, complianceTooltipLabel]}
                              labelFormatter={(_label, payload: any) => payload?.[0]?.payload?.clientName || ''}
                           />
                           <Bar dataKey="compliancePercentage" radius={[0, 12, 12, 0]} maxBarSize={28}>
                              {complianceSeries.map((entry: { clientId: string; compliancePercentage: number }) => (
                                 <Cell
                                    key={entry.clientId}
                                    fill={entry.compliancePercentage >= 85 ? '#22c55e' : entry.compliancePercentage >= 60 ? '#f59e0b' : '#f43f5e'}
                                 />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  ) : (
                  <p className="py-12 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">
                     {t('no_client_compliance_data')}
                  </p>
                  )}
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
                     {stats.projectsAtRisk.length === 0 && <p className="text-slate-500 text-sm font-medium text-center py-4 italic">{t('system_stable')}</p>}
                  </div>
               </GlassCard>
               )}
               {has('pending-approvals') && (
               <GlassCard title={t('pending_approvals')}>
                  <div className="text-center py-10 mt-2">
                     <div className="text-6xl font-black text-slate-900 dark:text-white mb-2 tracking-tighter drop-shadow-sm">{stats.pendingApprovals}</div>
                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">{t('awaiting_verification')}</p>
                  </div>
               </GlassCard>
               )}
            </div>
         </div>
         )}

         <Modal isOpen={customizeOpen} onClose={() => setCustomizeOpen(false)} title={t('dashboard_preferences')}>
            <div className="space-y-6">
               <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{t('workspace_visibility_controls')}</p>
               <div className="grid gap-3">
                  {customizeWidgets.map((w, i) => (
                     <label key={w.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{t(WIDGET_LABELS[w.id] || w.id)}</span>
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
                  <Button variant="ghost" onClick={() => setCustomizeOpen(false)} className="font-bold uppercase tracking-widest text-xs">{t('discard_changes')}</Button>
                  <Button onClick={saveCustomize} className="font-black uppercase tracking-widest text-xs">{t('finalize_layout')}</Button>
               </div>
            </div>
         </Modal>
      </div>
   );
};
