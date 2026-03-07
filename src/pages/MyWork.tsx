import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Task, Project, ActivityLog } from '../types';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { GlassCard, Button, Badge, KpiCard, Input, Select } from '../components/ui/UIComponents';
import { CheckCircle, Clock, AlertCircle, Briefcase, Plus, Filter, ArrowRight } from 'lucide-react';

export const MyWork: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const [myTasks, allProjects] = await Promise.all([
        api.tasks.getMyTasks(user.id),
        api.projects.list()
    ]);
    setTasks(myTasks);
    setProjects(allProjects);
    setLoading(false);
  };

  const filteredTasks = tasks.filter(t => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') return t.status !== 'done';
      return t.status === statusFilter;
  });

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown Project';

  const kpiStats = {
      open: tasks.filter(t => t.status !== 'done').length,
      dueSoon: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)).length,
      review: tasks.filter(t => t.status === 'review').length,
      overdue: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display text-white">{t('my_work')}</h1>
        <p className="text-slate-400">Personal command center.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label={t('my_open_tasks')} value={kpiStats.open} icon={<CheckCircle />} />
        <KpiCard label={t('due_soon')} value={kpiStats.dueSoon} icon={<Clock />} />
        <KpiCard label={t('in_review')} value={kpiStats.review} icon={<AlertCircle />} />
        <KpiCard label={t('overdue')} value={kpiStats.overdue} trend={kpiStats.overdue > 0 ? -10 : 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
              <GlassCard title={t('assigned_to_me')}>
                  <div className="flex justify-between items-center mb-4">
                      <div className="flex gap-2">
                          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-32 py-1 text-xs">
                              <option value="all">All</option>
                              <option value="active">Active</option>
                              <option value="done">Done</option>
                          </Select>
                      </div>
                  </div>
                  
                  <div className="space-y-3">
                      {filteredTasks.length === 0 ? (
                          <div className="text-center py-8 text-slate-500 italic">{t('no_tasks')}</div>
                      ) : (
                          filteredTasks.map(task => (
                              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors group cursor-pointer" onClick={() => navigate(`/app/projects/${task.projectId}`)}>
                                  <div className="flex items-start gap-3">
                                      <div className={`mt-1 w-2 h-2 rounded-full ${task.priority === 'urgent' ? 'bg-red-500' : task.priority === 'high' ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                                      <div>
                                          <p className="font-medium text-slate-200">{task.title}</p>
                                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                              <Briefcase className="w-3 h-3" />
                                              <span>{getProjectName(task.projectId)}</span>
                                              {task.dueDate && (
                                                  <>
                                                      <span className="w-1 h-1 bg-slate-600 rounded-full" />
                                                      <span className={new Date(task.dueDate) < new Date() ? 'text-rose-400' : ''}>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                                  </>
                                              )}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <Badge variant={task.status === 'done' ? 'success' : task.status === 'review' ? 'warning' : 'neutral'}>{task.status.replace('_', ' ')}</Badge>
                                      <ArrowRight className="w-4 h-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-180" />
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </GlassCard>
          </div>

          <div className="space-y-6">
               <GlassCard title={t('recently_updated_projects')}>
                   <div className="space-y-4">
                       {projects.slice(0, 3).map(p => (
                           <div key={p.id} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:border-cyan-500/30 transition-all" onClick={() => navigate(`/app/projects/${p.id}`)}>
                               <h4 className="font-medium text-slate-200">{p.name}</h4>
                               <div className="flex justify-between items-center mt-2">
                                   <Badge variant={p.health === 'good' ? 'success' : 'warning'}>{p.health}</Badge>
                                   <span className="text-xs text-slate-500">{p.progress}%</span>
                               </div>
                           </div>
                       ))}
                   </div>
                   <Button variant="ghost" className="w-full mt-4" onClick={() => navigate('/app/projects')}>View All Projects</Button>
               </GlassCard>
          </div>
      </div>
    </div>
  );
};
