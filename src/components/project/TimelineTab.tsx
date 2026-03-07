import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Link2, Trash2, Sparkles } from 'lucide-react';
import { Task, ViewMode } from 'react-frappe-gantt';
import 'frappe-gantt/dist/frappe-gantt.css';

// Lazy load the Gantt component to play nice with React 19 Suspense
const FrappeGantt = lazy(() => import('react-frappe-gantt').then(mod => ({ default: mod.FrappeGantt })));
import { GlassCard, Button, Modal } from '../ui/UIComponents';
import { api } from '../../services/api';
import { Task as TaskType } from '../../types';
import { PermissionGate } from '../PermissionGate';
import { Permission } from '../../types';
import toast from 'react-hot-toast';

interface TimelineTabProps {
  projectId: string;
  tasks: TaskType[];
  onRefreshTasks: () => void;
}

export interface TaskDependencyRow {
  id: string;
  predecessorTaskId: string;
  successorTaskId: string;
  predecessor?: { id: string; title: string };
  successor?: { id: string; title: string };
}

const statusToProgress: Record<string, number> = {
  done: 100,
  DONE: 100,
  review: 75,
  REVIEW: 75,
  in_progress: 50,
  IN_PROGRESS: 50,
  todo: 25,
  TODO: 25,
  backlog: 0,
  BACKLOG: 0,
};

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const TimelineTab: React.FC<TimelineTabProps> = ({ projectId, tasks, onRefreshTasks }) => {
  const { t } = useTranslation();
  const [dependencies, setDependencies] = useState<TaskDependencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDepModal, setAddDepModal] = useState(false);
  const [addPredecessor, setAddPredecessor] = useState('');
  const [addSuccessor, setAddSuccessor] = useState('');

  const loadDeps = async () => {
    try {
      const list = await api.projects.getTaskDependencies(projectId);
      setDependencies(list as TaskDependencyRow[]);
    } catch (e) {
      console.error('Failed to load dependencies', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeps();
  }, [projectId]);

  const depMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    dependencies.forEach((d) => {
      if (!m[d.successorTaskId]) m[d.successorTaskId] = [];
      m[d.successorTaskId].push(d.predecessorTaskId);
    });
    return m;
  }, [dependencies]);

  const ganttTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        try {
          const start = t.startDate ? new Date(t.startDate) : t.createdAt ? new Date(t.createdAt) : new Date();
          const end = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);
          return !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start;
        } catch {
          return false;
        }
      })
      .map((t) => {
        try {
          const start = t.startDate ? new Date(t.startDate) : t.createdAt ? new Date(t.createdAt) : new Date();
          let end = t.dueDate ? new Date(t.dueDate) : new Date(start.getTime() + 24 * 60 * 60 * 1000);

          // Ensure end is at least 1 day after start for Frappe Gantt stability
          if (end <= start) {
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
          }

          const deps = depMap[t.id];
          return new Task({
            id: t.id,
            name: t.title || 'Untitled Task',
            start: toYMD(start),
            end: toYMD(end),
            progress: statusToProgress[t.status] ?? 0,
            dependencies: deps && deps.length ? deps.join(', ') : '',
          });
        } catch (e) {
          console.error("Error creating Gantt task", e);
          return null;
        }
      })
      .filter((t): t is Task => t !== null);
  }, [tasks, depMap]);

  const handleDateChange = async (task: any, start: any, end: any) => {
    const taskId = task.id;
    const startStr = start && start.format ? start.format('YYYY-MM-DD') : (start && start.toString?.() ? start.toString().slice(0, 10) : '');
    const endStr = end && end.format ? end.format('YYYY-MM-DD') : (end && end.toString?.() ? end.toString().slice(0, 10) : '');
    try {
      await api.projects.updateTask(projectId, taskId, { startDate: startStr || undefined, dueDate: endStr || undefined });
      onRefreshTasks();
    } catch (e) {
      toast.error('Failed to update dates');
    }
  };

  const handleAddDependency = async () => {
    if (!addPredecessor || !addSuccessor || addPredecessor === addSuccessor) {
      toast.error('Select two different tasks');
      return;
    }
    try {
      await api.projects.addTaskDependency(projectId, addPredecessor, addSuccessor);
      setAddDepModal(false);
      setAddPredecessor('');
      setAddSuccessor('');
      loadDeps();
      onRefreshTasks();
      toast.success('Dependency added');
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add dependency');
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      await api.projects.removeTaskDependency(projectId, dependencyId);
      loadDeps();
      onRefreshTasks();
      toast.success('Dependency removed');
    } catch (e) {
      toast.error('Failed to remove');
    }
  };

  if (tasks.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-slate-500 mb-4" />
        <p className="text-slate-500">{t('add_tasks_first') || 'Add tasks to the project to see the timeline.'}</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">
          {t('timeline_hint') || 'Drag bars to change start/due dates. Add dependencies below.'}
        </p>
        <PermissionGate permission={Permission.MANAGE_TASKS}>
          <Button size="sm" onClick={() => setAddDepModal(true)}>
            <Link2 className="w-4 h-4 mr-2" /> {t('add_dependency') || 'Add dependency'}
          </Button>
        </PermissionGate>
      </div>

      <GlassCard className="overflow-x-auto min-h-[320px]">
        {ganttTasks.length === 0 ? (
          <p className="text-slate-500 py-8 text-center">
            {t('no_tasks_with_dates') || 'No tasks with valid start/due dates to display.'}
          </p>
        ) : (
          <div className="gantt-container" style={{ minWidth: 600 }}>
            <Suspense fallback={<div className="py-20 flex flex-col items-center gap-2 text-slate-500">
              <Sparkles className="w-6 h-6 animate-spin text-cyan-500" />
              Preparing Gantt chart...
            </div>}>
              <FrappeGantt
                tasks={ganttTasks}
                viewMode={ViewMode.Month}
                onDateChange={handleDateChange}
                onClick={(task) => { }}
              />
            </Suspense>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Link2 className="w-5 h-5 text-cyan-500" /> {t('dependencies') || 'Dependencies'}
        </h3>
        {loading ? (
          <p className="text-slate-500">{t('loading')}...</p>
        ) : dependencies.length === 0 ? (
          <p className="text-slate-500">{t('no_dependencies') || 'No task dependencies. Add one to enforce order.'}</p>
        ) : (
          <ul className="space-y-2">
            {dependencies.map((d) => (
              <li key={d.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <span className="text-slate-300">
                  <strong>{(d.predecessor as any)?.title ?? d.predecessorTaskId}</strong>
                  <span className="text-slate-500 mx-2">→</span>
                  <strong>{(d.successor as any)?.title ?? d.successorTaskId}</strong>
                </span>
                <PermissionGate permission={Permission.MANAGE_TASKS}>
                  <button
                    type="button"
                    onClick={() => handleRemoveDependency(d.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </PermissionGate>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <Modal isOpen={addDepModal} onClose={() => setAddDepModal(false)} title={t('add_dependency') || 'Add dependency'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Predecessor (must complete first)</label>
            <select
              value={addPredecessor}
              onChange={(e) => setAddPredecessor(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2"
            >
              <option value="">Select task</option>
              {tasks.map((tk) => (
                <option key={tk.id} value={tk.id}>{tk.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Successor (starts after)</label>
            <select
              value={addSuccessor}
              onChange={(e) => setAddSuccessor(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2"
            >
              <option value="">Select task</option>
              {tasks.map((tk) => (
                <option key={tk.id} value={tk.id}>{tk.title}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddDepModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddDependency} disabled={!addPredecessor || !addSuccessor || addPredecessor === addSuccessor}>
              {t('add_dependency') || 'Add'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
