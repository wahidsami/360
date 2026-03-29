import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, CheckCircle2, Activity, ShieldAlert, Settings2, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { GlassCard, KpiCard, Badge, Button, Modal } from '@/components/ui/UIComponents';
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Project, ProjectUpdate } from '@/types';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/currency';
import toast from 'react-hot-toast';

const DEFAULT_WIDGET_IDS = ['kpi-cards', 'client-compliance', 'revenue-chart', 'latest-updates', 'projects-at-risk', 'pending-approvals', 'tools-panel'] as const;
const WIDGET_LABELS: Record<string, string> = {
  'kpi-cards': 'widget_kpi_cards',
  'tools-panel': 'widget_quick_actions',
  'revenue-chart': 'widget_revenue_chart',
  'client-compliance': 'widget_client_compliance_chart',
  'latest-updates': 'widget_latest_updates',
  'projects-at-risk': 'widget_projects_at_risk',
  'pending-approvals': 'widget_pending_approvals',
};

type AnalyticsData = {
  portfolio: {
    byHealth: { health: string; count: number }[];
    byStatus: { status: string; count: number }[];
    totalBudget: number;
    projectCount: number;
  };
  team: {
    byAssignee: { assigneeId: string | null; assigneeName: string; openTasks: number }[];
    tasksDoneLast30Days: number;
    velocityByWeek?: { weekLabel: string; completed: number }[];
    completionRate?: number;
    totalTasks?: number;
    doneTasks?: number;
  };
  financial: {
    revenueByMonth: { month: string; amount: number }[];
    arAging: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
    totalOutstanding: number;
  };
  findings: {
    bySeverity: { severity: string; count: number }[];
    byStatus: { status: string; count: number }[];
    mttrDays: number | null;
    totalClosed: number;
  };
};

const severityColors: Record<string, string> = {
  CRITICAL: '#f43f5e',
  HIGH: '#fb7185',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

const healthColors: Record<string, string> = {
  HEALTHY: '#22c55e',
  AT_RISK: '#f59e0b',
  CRITICAL: '#f43f5e',
  ON_HOLD: '#64748b',
};

const statusColors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#22c55e', '#f59e0b', '#f43f5e'];

const prettifyLabel = (value: string) =>
  value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const AdminDashboard: React.FC<{ role: Role }> = ({ role }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState<string[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeWidgets, setCustomizeWidgets] = useState<{ id: string; enabled: boolean }[]>([]);

  const mergeWidgetOrder = React.useCallback((saved: string[]) => {
    const filteredSaved = saved.filter((id) => DEFAULT_WIDGET_IDS.includes(id as (typeof DEFAULT_WIDGET_IDS)[number]));
    const merged = [...filteredSaved];
    for (const id of DEFAULT_WIDGET_IDS) {
      if (!merged.includes(id)) {
        merged.push(id);
      }
    }
    return merged;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardData, analyticsData, prefs] = await Promise.all([
          api.dashboard.getAdminStats(),
          api.analytics.get().catch(() => null),
          api.me.getDashboardPreferences().catch(() => ({ widgets: [] })),
        ]);

        setStats(dashboardData);
        setAnalytics((analyticsData as AnalyticsData | null) || null);

        if (prefs.widgets?.length) {
          setWidgetOrder(mergeWidgetOrder(prefs.widgets.map((w: any) => w.id)));
        } else {
          setWidgetOrder([...DEFAULT_WIDGET_IDS]);
        }
      } catch (error) {
        toast.error(t('failed_load_analytics'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [mergeWidgetOrder, t]);

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
        .map((item: { clientName: string; compliancePercentage: number }) => ({
          ...item,
          shortName: item.clientName.length > 18 ? `${item.clientName.slice(0, 18)}...` : item.clientName,
        })),
    [stats?.clientComplianceComparison],
  );

  const findingsSeverityData = useMemo(
    () =>
      (analytics?.findings.bySeverity || [])
        .filter((item) => item.count > 0)
        .map((item) => ({
          ...item,
          name: prettifyLabel(item.severity),
          fill: severityColors[item.severity] || '#06b6d4',
        })),
    [analytics?.findings.bySeverity],
  );

  const findingsStatusData = useMemo(
    () =>
      (analytics?.findings.byStatus || [])
        .filter((item) => item.count > 0)
        .map((item, index) => ({
          ...item,
          name: prettifyLabel(item.status),
          fill: statusColors[index % statusColors.length],
        })),
    [analytics?.findings.byStatus],
  );

  const portfolioHealthData = useMemo(
    () =>
      (analytics?.portfolio.byHealth || [])
        .filter((item) => item.count > 0)
        .map((item) => ({
          ...item,
          name: prettifyLabel(item.health),
          fill: healthColors[item.health] || '#06b6d4',
        })),
    [analytics?.portfolio.byHealth],
  );

  const coveragePercentage = useMemo(() => {
    const total = stats?.totalClients ?? 0;
    const audited = stats?.auditedClients ?? 0;
    return total > 0 ? Math.round((audited / total) * 100) : 0;
  }, [stats?.totalClients, stats?.auditedClients]);

  const coverageData = useMemo(() => {
    const total = stats?.totalClients ?? 0;
    const audited = stats?.auditedClients ?? 0;
    const remaining = Math.max(total - audited, 0);
    return [
      { name: t('audited_clients'), value: audited, fill: '#06b6d4' },
      { name: t('remaining_clients'), value: remaining, fill: '#1e293b' },
    ].filter((item) => item.value > 0);
  }, [stats?.auditedClients, stats?.totalClients, t]);

  const chartAxisColor = 'var(--app-text-muted)';
  const chartGridColor = 'var(--app-border)';
  const tooltipStyle = {
    backgroundColor: 'var(--app-surface)',
    borderColor: 'var(--app-border)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-xl)',
    border: 'none',
    padding: '12px',
  } as const;

  const openCustomize = () => {
    setCustomizeWidgets(DEFAULT_WIDGET_IDS.map((id) => ({ id, enabled: widgetOrder.includes(id) })));
    setCustomizeOpen(true);
  };

  const saveCustomize = async () => {
    const enabled = customizeWidgets.filter((widget) => widget.enabled).map((widget) => widget.id);
    const widgets = enabled.map((id, index) => ({ id, order: index, config: {} }));
    await api.me.updateDashboardPreferences({ widgets });
    setWidgetOrder(enabled);
    setCustomizeOpen(false);
    toast.success(t('dashboard_updated'));
  };

  if (loading) {
    return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest animate-pulse">{t('initializing')}</div>;
  }

  if (!stats) {
    return <div className="p-10 text-center text-slate-500">{t('no_data')}</div>;
  }

  const visible = widgetOrder.length ? widgetOrder : [...DEFAULT_WIDGET_IDS];
  const has = (id: string) => visible.includes(id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
          <p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400 font-medium">
            {t('welcome')}, {role.replace('_', ' ')}. {stats.auditedClients ?? 0} / {stats.totalClients ?? 0} {t('clients_audited_short')}.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={openCustomize} className="text-slate-500 hover:text-cyan-600 font-bold uppercase tracking-widest text-[10px] self-start">
          <Settings2 className="w-4 h-4 mr-2" /> {t('customize_workspace')}
        </Button>
      </div>

      {has('kpi-cards') && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <KpiCard
            compact
            label={t('audit_coverage')}
            value={`${coveragePercentage}%`}
            helperText={`${stats.auditedClients ?? 0} / ${stats.totalClients ?? 0} ${t('clients_audited_short')}`}
            icon={<Users />}
          />
          <KpiCard
            compact
            label={t('average_compliance')}
            value={`${stats.averageCompliance ?? 0}%`}
            helperText={t('across_audited_clients')}
            icon={<Activity />}
          />
          <KpiCard
            compact
            label={t('reviewed_checks')}
            value={stats.scoredChecks ?? 0}
            helperText={t('pass_fail_partial_checks')}
            icon={<CheckCircle2 />}
          />
          <KpiCard
            compact
            label={t('checks_needing_attention')}
            value={stats.needsAttentionChecks ?? 0}
            helperText={t('failed_and_partial_checks')}
            icon={<ShieldAlert />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {has('client-compliance') && (
          <GlassCard className="xl:col-span-8 overflow-hidden" title={t('client_compliance_comparison')}>
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Badge variant="info" size="sm">{t('average_compliance')}: {stats.averageCompliance ?? 0}%</Badge>
              <Badge variant="neutral" size="sm">{t('audited_clients')}: {stats.auditedClients ?? 0}</Badge>
              <Badge variant="neutral" size="sm">{t('reviewed_checks')}: {stats.scoredChecks ?? 0}</Badge>
            </div>
            {complianceSeries.length > 0 ? (
              <div className="h-[360px] w-full min-h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceSeries} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} opacity={0.2} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      stroke={chartAxisColor}
                      tick={{ fill: chartAxisColor }}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="shortName"
                      stroke={chartAxisColor}
                      tick={{ fill: chartAxisColor }}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={150}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }}
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [`${value}%`, t('client_compliance_score')]}
                      labelFormatter={(_label, payload: any) => payload?.[0]?.payload?.clientName || ''}
                    />
                    <Bar dataKey="compliancePercentage" radius={[0, 14, 14, 0]} maxBarSize={28}>
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
              <p className="py-16 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('no_client_compliance_data')}</p>
            )}
          </GlassCard>
        )}

        <div className="xl:col-span-4 grid gap-6">
          <GlassCard className="overflow-hidden" title={t('audit_coverage')}>
            <div className="grid grid-cols-[140px,1fr] items-center gap-4">
              <div className="relative h-36 w-36 mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={coverageData} dataKey="value" innerRadius={46} outerRadius={64} stroke="none" paddingAngle={3}>
                      {coverageData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{coveragePercentage}%</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{t('audit_coverage')}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('audited_clients')}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{stats.auditedClients ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/60 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('remaining_clients')}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{Math.max((stats.totalClients ?? 0) - (stats.auditedClients ?? 0), 0)}</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden" title={t('findings_severity_mix')}>
            {findingsSeverityData.length > 0 ? (
              <div className="grid grid-cols-[150px,1fr] items-center gap-4">
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={findingsSeverityData} dataKey="count" nameKey="name" innerRadius={42} outerRadius={68} stroke="none" paddingAngle={3}>
                        {findingsSeverityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {findingsSeverityData.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-2xl border border-slate-200/60 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-950/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{entry.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-12 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('no_data')}</p>
            )}
          </GlassCard>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <GlassCard className="xl:col-span-4 overflow-hidden" title={t('findings_status_overview')}>
          {findingsStatusData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={findingsStatusData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, t('findings')]} />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {findingsStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('no_data')}</p>
          )}
        </GlassCard>

        <GlassCard className="xl:col-span-4 overflow-hidden" title={t('portfolio_health_snapshot')}>
          {portfolioHealthData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={portfolioHealthData} layout="vertical" margin={{ top: 8, right: 16, left: 12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} horizontal={false} opacity={0.2} />
                  <XAxis type="number" stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} width={96} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [value, t('projects')]} />
                  <Bar dataKey="count" radius={[0, 10, 10, 0]} maxBarSize={26}>
                    {portfolioHealthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('no_data')}</p>
          )}
        </GlassCard>

        {has('revenue-chart') && (
          <GlassCard className="xl:col-span-4 overflow-hidden" title={t('revenue_velocity')}>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeries}>
                  <defs>
                    <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} opacity={0.2} />
                  <XAxis dataKey="label" stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={chartAxisColor} tick={{ fill: chartAxisColor }} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value))} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatCurrency(value, 'SAR'), t('revenue')]} />
                  <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#dashboardRevenueGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        )}
      </div>

      {has('tools-panel') && <ToolsPanel role={role} />}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {has('latest-updates') && (
          <GlassCard className="xl:col-span-5" title={t('latest_updates')}>
            <div className="space-y-5">
              {(stats.latestUpdates as ProjectUpdate[]).length > 0 ? (
                (stats.latestUpdates as ProjectUpdate[]).map((update) => (
                  <div key={update.id} className="flex gap-4 items-start border-b border-slate-100 dark:border-slate-800/50 pb-4 last:border-0 last:pb-0">
                    <div className="mt-1 rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-2.5 text-cyan-600 dark:text-cyan-400">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{update.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{update.content}</p>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                        {new Date(update.timestamp).toLocaleDateString()} | {update.authorName}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('no_data')}</p>
              )}
            </div>
          </GlassCard>
        )}

        {has('projects-at-risk') && (
          <GlassCard className="xl:col-span-4" title={t('projects_at_risk')}>
            <div className="space-y-4">
              {(stats.projectsAtRisk as Project[]).length > 0 ? (
                (stats.projectsAtRisk as Project[]).map((project) => (
                  <div
                    key={project.id}
                    className="cursor-pointer rounded-2xl border border-rose-100 bg-rose-50/50 p-5 transition-all hover:bg-rose-50 dark:border-rose-500/20 dark:bg-rose-900/10 dark:hover:bg-rose-900/20"
                    onClick={() => navigate(`/app/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight text-rose-900 dark:text-rose-200">{project.name}</p>
                        {'clientName' in project && project.clientName ? (
                          <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">{String(project.clientName)}</p>
                        ) : null}
                      </div>
                      <Badge variant="danger" size="sm" pulse>{project.health}</Badge>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center">
                  <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
                  <p className="text-sm font-medium italic text-slate-500 dark:text-slate-400">{t('system_stable')}</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {has('pending-approvals') && (
          <GlassCard className="xl:col-span-3" title={t('pending_approvals')}>
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <div className="text-6xl font-black tracking-tighter text-slate-900 dark:text-white">{stats.pendingApprovals}</div>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">{t('awaiting_verification')}</p>
            </div>
          </GlassCard>
        )}
      </div>

      <Modal isOpen={customizeOpen} onClose={() => setCustomizeOpen(false)} title={t('dashboard_preferences')}>
        <div className="space-y-6">
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">{t('workspace_visibility_controls')}</p>
          <div className="grid gap-3">
            {customizeWidgets.map((widget, index) => (
              <label key={widget.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{t(WIDGET_LABELS[widget.id] || widget.id)}</span>
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={(event) => setCustomizeWidgets((previous) => previous.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item))}
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
