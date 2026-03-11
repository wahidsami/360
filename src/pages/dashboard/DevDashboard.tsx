import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, AlertCircle, Briefcase, ArrowRight } from 'lucide-react';
import { GlassCard, KpiCard, Badge, Button } from "@/components/ui/UIComponents";
import { ToolsPanel } from '@/components/ToolsPanel';
import { api } from '@/services/api';
import { Role, Task } from '@/types';
import { useAuth } from '../../contexts/AuthContext';

export const DevDashboard: React.FC<{ role: Role }> = ({ role }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      api.tasks.getMyTasks(user.id).then(data => {
        setTasks(data);
        setLoading(false);
      });
    }
  }, [user]);

  const kpiStats = {
    open: tasks.filter(t => t.status !== 'done').length,
    dueSoon: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length,
    review: tasks.filter(t => t.status === 'review').length,
    overdue: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length
  };

  if (loading) return <div className="text-center p-10 text-slate-500">Loading Workspace...</div>;

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
              {tasks.filter(t => t.status !== 'done').slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/30 hover:bg-white dark:hover:bg-slate-800/50 transition-all shadow-sm hover:shadow-md group cursor-pointer" onClick={() => navigate(`/app/projects/${task.projectId}`)}>
                  <div className="flex items-start gap-4">
                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full shadow-sm ${task.priority === 'urgent' ? 'bg-red-500 animate-pulse' : task.priority === 'high' ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200 tracking-tight">{task.title}</p>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 mt-1 uppercase tracking-widest">
                        <Briefcase className="w-3 h-3" />
                        {task.dueDate && (
                          <span className={new Date(task.dueDate) < new Date() ? 'text-rose-500' : ''}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant={task.status === 'review' ? 'warning' : 'neutral'} size="sm">{task.status.replace('_', ' ')}</Badge>
                </div>
              ))}
              {tasks.filter(t => t.status !== 'done').length === 0 && <p className="text-slate-500 italic p-4 text-center">{t('no_tasks')}</p>}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-slate-500 hover:text-cyan-600 font-bold uppercase tracking-widest text-xs" onClick={() => navigate('/app/my-work')}>View All Work</Button>
          </GlassCard>
        </div>

        <div>
          <GlassCard title="Activity Feed">
            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-slate-700/50 space-y-8 py-2">
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-cyan-900 border-2 border-cyan-500 shadow-sm transition-transform group-hover:scale-125"></div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight"> commented on <span className="text-cyan-600 dark:text-cyan-400">API Gateway</span></p>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">2 hours ago</span>
              </div>
              <div className="relative">
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 shadow-sm"></div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight"> moved <span className="text-slate-900 dark:text-white">Auth Logic</span> to Review</p>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">5 hours ago</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
