import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Users, AlertCircle, DollarSign } from 'lucide-react';
import { GlassCard } from '../components/ui/UIComponents';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#ef4444', '#10b981'];

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

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.analytics.get();
        setData(res as AnalyticsData);
      } catch (e) {
        toast.error('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="p-10 text-slate-500 text-center">Loading analytics...</div>;
  if (!data) return <div className="p-10 text-slate-500 text-center">No data.</div>;

  const arAgingData = [
    { name: '0-30 days', value: data.financial.arAging['0-30'], color: COLORS[0] },
    { name: '31-60 days', value: data.financial.arAging['31-60'], color: COLORS[1] },
    { name: '61-90 days', value: data.financial.arAging['61-90'], color: COLORS[2] },
    { name: '90+ days', value: data.financial.arAging['90+'], color: COLORS[3] },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-cyan-500" />
          Advanced Analytics
        </h1>
        <p className="text-slate-400 mt-1">Portfolio, team, financial, and findings insights.</p>
      </div>

      {/* Portfolio */}
      <GlassCard title="Portfolio analytics" className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 grid md:grid-cols-2 gap-6">
          <div className="min-h-[200px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">Projects by health</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.portfolio.byHealth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="health" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="min-h-[200px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">Projects by status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.portfolio.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="status" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          Total projects: {data.portfolio.projectCount} · Budget total: {data.portfolio.totalBudget.toLocaleString()} SAR
        </p>
      </GlassCard>

      {/* Team */}
      <GlassCard title="Team analytics" className="flex items-center gap-2">
        <Users className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap gap-4 items-baseline">
            <p className="text-slate-400 text-sm">
              Tasks completed (last 30 days): <span className="text-white font-medium">{data.team.tasksDoneLast30Days}</span>
            </p>
            {data.team.completionRate != null && (
              <p className="text-slate-400 text-sm">
                Completion rate: <span className="text-white font-medium">{data.team.completionRate}%</span>
                {data.team.totalTasks != null && (
                  <span className="text-slate-500 ml-1">({data.team.doneTasks ?? 0} / {data.team.totalTasks} tasks)</span>
                )}
              </p>
            )}
          </div>
          {data.team.velocityByWeek && data.team.velocityByWeek.length > 0 && (
            <div className="min-h-[200px]">
              <h3 className="text-slate-300 text-sm font-medium mb-2">Velocity (tasks completed per week)</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.team.velocityByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="weekLabel" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                  <Bar dataKey="completed" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <h3 className="text-slate-300 text-sm font-medium mb-2">Open tasks by assignee</h3>
          <div className="min-h-[240px]">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.team.byAssignee} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" stroke="#64748b" fontSize={12} />
              <YAxis type="category" dataKey="assigneeName" stroke="#64748b" fontSize={12} width={70} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
              <Bar dataKey="openTasks" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
      </GlassCard>

      {/* Financial */}
      <GlassCard title="Financial analytics" className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 grid md:grid-cols-2 gap-6">
          <div className="min-h-[220px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">Revenue by month (SAR)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.financial.revenueByMonth}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="amount" stroke="#06b6d4" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="min-h-[200px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">AR aging (SAR)</h3>
            <p className="text-slate-500 text-sm mb-2">Total outstanding: {data.financial.totalOutstanding.toLocaleString()} SAR</p>
            {arAgingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={arAgingData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                  >
                    {arAgingData.map((_, i) => (
                      <Cell key={i} fill={arAgingData[i].color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} formatter={(v: number) => v.toLocaleString()} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500 text-sm">No outstanding AR.</p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Findings */}
      <GlassCard title="Findings analytics" className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 grid md:grid-cols-2 gap-6">
          <div className="min-h-[200px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">By severity</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.findings.bySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="severity" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="min-h-[200px]">
            <h3 className="text-slate-300 text-sm font-medium mb-2">By status</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.findings.byStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="status" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-2">
          Closed: {data.findings.totalClosed}
          {data.findings.mttrDays != null && ` · MTTR: ${data.findings.mttrDays} days`}
        </p>
      </GlassCard>
    </div>
  );
};

export default Analytics;
