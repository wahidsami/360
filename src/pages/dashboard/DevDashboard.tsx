import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Briefcase } from 'lucide-react';
import { GlassCard, KpiCard, Badge, Button } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Task } from '@/types';
import { useAuth } from '../../contexts/AuthContext';

type DashboardTask = Task & {
  projectName?: string;
};

const normalizeTaskStatus = (status?: string): Task['status'] => {
  const value = (status || 'todo').toLowerCase().replace(/-/g, '_');
  if (value === 'backlog' || value === 'todo' || value === 'in_progress' || value === 'review' || value === 'done' || value === 'blocked') {
    return value;
  }
  return 'todo';
};

const normalizeTaskPriority = (priority?: string): Task['priority'] => {
  const value = (priority || 'medium').toLowerCase().replace(/-/g, '_');
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'urgent') {
    return value;
  }
  return 'medium';
};

export const DevDashboard: React.FC<{ role: Role }> = ({ role }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [kpiStats, setKpiStats] = useState({
    open: 0,
    dueSoon: 0,
    review: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.dashboard
      .getDevStats()
      .then((data: any) => {
        if (!isMounted) return;

        setKpiStats({
          open: Number(data?.myOpenTasks || 0),
          dueSoon: Number(data?.dueSoon || 0),
          review: Number(data?.inReview || 0),
          overdue: Number(data?.overdue || 0),
        });

        const assignedTasks: DashboardTask[] = (Array.isArray(data?.assignedTasks) ? data.assignedTasks : [])
          .map((task: any) => ({
            id: task.id,
            title: task.title || '',
            description: task.description || '',
            status: normalizeTaskStatus(task.status),
            priority: normalizeTaskPriority(task.priority),
            assigneeId: task.assigneeId,
            assigneeName: task.assigneeName,
            milestoneId: task.milestoneId,
            sprintId: task.sprintId,
            storyPoints: task.storyPoints,
            startDate: task.startDate,
            dueDate: task.dueDate,
            labels: Array.isArray(task.labels) ? task.labels : [],
            createdAt: task.createdAt || new Date().toISOString(),
            updatedAt: task.updatedAt || new Date().toISOString(),
            projectId: task.projectId || '',
            projectName: task.projectName || t('unknown_project'),
          }))
          .filter((task: DashboardTask) => !!task.projectId);

        setTasks(assignedTasks);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const visibleTasks = tasks.filter(t => t.status !== 'done').slice(0, 5);
  const activityTasks = tasks.slice(0, 3);

  const handleTaskOpen = (task: DashboardTask) => {
    if (!task.projectId) return;
    navigate(`/app/projects/${task.projectId}?tab=tasks`);
  };

  if (loading) return <div className="text-center p-10 text-slate-500">{t('loading_workspace')}</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black font-display text-slate-900 dark:text-white uppercase tracking-tighter">{t('dashboard')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('welcome')}, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard label={t('my_open_tasks')} value={kpiStats.open} icon={<CheckCircle />} />
        <KpiCard label={t('due_soon')} value={kpiStats.dueSoon} icon={<Clock />} />
        <KpiCard label={t('in_review')} value={kpiStats.review} icon={<AlertCircle />} />
        <KpiCard label={t('overdue')} value={kpiStats.overdue} trend={kpiStats.overdue > 0 ? -10 : 0} />
      </div>

      <ToolsPanel role={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard title={t('assigned_to_me')}>
            <div className="space-y-3">
              {visibleTasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800/50 transition-all shadow-sm hover:shadow-md group cursor-pointer" onClick={() => handleTaskOpen(task)}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shadow-sm ${task.priority === 'urgent' ? 'bg-red-500 animate-pulse' : task.priority === 'high' ? 'bg-brand-warning' : 'bg-cyan-500'}`} />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{task.title}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-widest">
                        <Briefcase className="w-3 h-3" />
                        <span>{task.projectName || t('unknown_project')}</span>
                        {task.dueDate && (
                          <span className={new Date(task.dueDate) < new Date() ? 'text-rose-500' : ''}>{t('due_colon')} {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={task.status === 'review' ? 'warning' : 'neutral'} size="sm">{task.status.replace('_', ' ')}</Badge>
                </div>
              ))}
              {visibleTasks.length === 0 && <p className="text-slate-500 italic p-4 text-center">{t('no_tasks')}</p>}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-slate-500 hover:text-cyan-600 font-bold uppercase tracking-widest text-xs" onClick={() => navigate('/app/my-work')}>{t('view_all_work')}</Button>
          </GlassCard>
        </div>

        <div>
          <GlassCard title={t('activity_feed')}>
            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-700/50 space-y-8 py-2">
              {activityTasks.map(task => (
                <div key={task.id} className="relative">
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-cyan-900 border-2 border-cyan-500 shadow-sm"></div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight">{task.title}</p>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {task.projectName || t('unknown_project')}
                    {task.dueDate ? ` - ${t('due_colon')} ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                  </span>
                </div>
              ))}
              {activityTasks.length === 0 && <p className="text-slate-500 italic">{t('no_tasks')}</p>}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
