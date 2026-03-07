import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Plus, Pencil, Trash2, ListTodo, Calendar } from 'lucide-react';
import { GlassCard, Button, Input, Label, Modal } from '../ui/UIComponents';
import { api } from '../../services/api';
import { Task as TaskType, Sprint, Permission } from '../../types';
import { PermissionGate } from '../PermissionGate';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SprintsTabProps {
  projectId: string;
  tasks: TaskType[];
  onRefreshTasks: () => void;
  onUpsertTask: (task: Partial<TaskType>) => void;
}

export const SprintsTab: React.FC<SprintsTabProps> = ({ projectId, tasks, onRefreshTasks, onUpsertTask }) => {
  const { t } = useTranslation();
  const [sprints, setSprints] = useState<(Sprint & { _count?: { tasks: number } })[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'backlog' | null>(null);
  const [sprintTasks, setSprintTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSprint, setEditingSprint] = useState<(Sprint & { _count?: { tasks: number } }) | null>(null);
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '', status: 'PLANNING' as string });

  const loadSprints = async () => {
    try {
      const list = await api.projects.getSprints(projectId);
      setSprints(list as any);
      if (list.length > 0 && !selectedSprintId) setSelectedSprintId((list[0] as any).id);
    } catch (e) {
      console.error('Failed to load sprints', e);
    } finally {
      setLoading(false);
    }
  };

  const loadSprintTasks = async () => {
    if (!projectId) return;
    try {
      if (selectedSprintId === 'backlog' || selectedSprintId === null) {
        const list = await api.projects.getBacklogTasks(projectId);
        setSprintTasks((list as any).map((t: any) => ({ ...t, status: (t.status || '').toLowerCase().replace('_', '-') })));
      } else {
        const list = await api.projects.getSprintTasks(projectId, selectedSprintId);
        setSprintTasks((list as any).map((t: any) => ({ ...t, status: (t.status || '').toLowerCase().replace('_', '-') })));
      }
    } catch (e) {
      console.error('Failed to load sprint tasks', e);
      setSprintTasks([]);
    }
  };

  useEffect(() => {
    loadSprints();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadSprintTasks();
  }, [projectId, selectedSprintId]);

  const openCreate = () => {
    setEditingSprint(null);
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 13);
    setForm({
      name: `Sprint ${sprints.length + 1}`,
      goal: '',
      startDate: format(today, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
      status: 'PLANNING',
    });
    setModalOpen(true);
  };

  const openEdit = (sprint: Sprint & { _count?: { tasks: number } }) => {
    setEditingSprint(sprint);
    setForm({
      name: sprint.name,
      goal: sprint.goal ?? '',
      startDate: sprint.startDate.toString().slice(0, 10),
      endDate: sprint.endDate.toString().slice(0, 10),
      status: sprint.status,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Sprint name is required');
      return;
    }
    try {
      if (editingSprint) {
        await api.projects.updateSprint(projectId, editingSprint.id, form);
        toast.success('Sprint updated');
      } else {
        await api.projects.createSprint(projectId, form);
        toast.success('Sprint created');
      }
      setModalOpen(false);
      loadSprints();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save');
    }
  };

  const handleDelete = async (sprintId: string) => {
    if (!confirm('Delete this sprint? Tasks will move to backlog.')) return;
    try {
      await api.projects.deleteSprint(projectId, sprintId);
      if (selectedSprintId === sprintId) setSelectedSprintId('backlog');
      loadSprints();
      onRefreshTasks();
      toast.success('Sprint deleted');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleMoveTaskToSprint = async (taskId: string, targetSprintId: string | null) => {
    try {
      await api.projects.updateTask(projectId, taskId, { sprintId: targetSprintId || undefined });
      onRefreshTasks();
      loadSprintTasks();
      loadSprints();
      toast.success('Task moved');
    } catch (e) {
      toast.error('Failed to move task');
    }
  };

  const totalPoints = sprintTasks.reduce((s, t) => s + (t.storyPoints ?? 0), 0);
  const completedPoints = sprintTasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.storyPoints ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedSprintId('backlog')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === 'backlog' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'}`}
          >
            <ListTodo className="w-4 h-4 inline mr-2" /> Backlog
          </button>
          {sprints.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSprintId(s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedSprintId === s.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700'}`}
            >
              {s.name}
              {s._count != null && <span className="ml-2 text-slate-500">({s._count.tasks})</span>}
            </button>
          ))}
        </div>
        <PermissionGate permission={Permission.MANAGE_TASKS}>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> {t('new_sprint') || 'New sprint'}
          </Button>
        </PermissionGate>
      </div>

      {selectedSprintId && selectedSprintId !== 'backlog' && (
        (() => {
          const s = sprints.find((x) => x.id === selectedSprintId);
          return s ? (
            <GlassCard className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Target className="w-5 h-5 text-cyan-500" />
                <div>
                  <h3 className="font-semibold text-white">{s.name}</h3>
                  {s.goal && <p className="text-sm text-slate-400 mt-0.5">{s.goal}</p>}
                  <p className="text-xs text-slate-500 mt-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    {format(new Date(s.startDate), 'MMM d, yyyy')} – {format(new Date(s.endDate), 'MMM d, yyyy')} · {s.status}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-4">
                  <span className="text-slate-400 text-sm">
                    Points: <strong className="text-cyan-400">{completedPoints}</strong> / {totalPoints}
                  </span>
                  <PermissionGate permission={Permission.MANAGE_TASKS}>
                    <button type="button" onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-cyan-400">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-rose-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </GlassCard>
          ) : null;
        })()
      )}

      <GlassCard>
        <h3 className="text-lg font-semibold text-white mb-3">
          {selectedSprintId === 'backlog' ? (t('backlog') || 'Backlog') : (t('sprint_tasks') || 'Sprint tasks')}
        </h3>
        {loading ? (
          <p className="text-slate-500">{t('loading')}...</p>
        ) : sprintTasks.length === 0 ? (
          <p className="text-slate-500 py-4">
            {selectedSprintId === 'backlog' ? (t('no_backlog_tasks') || 'No tasks in backlog.') : (t('no_sprint_tasks') || 'No tasks in this sprint.')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Points</th>
                  <th className="pb-2 pr-4">Assignee</th>
                  <th className="pb-2 pr-4">{selectedSprintId === 'backlog' ? (t('add_to_sprint') || 'Add to sprint') : 'Move to'}</th>
                </tr>
              </thead>
              <tbody>
                {sprintTasks.map((task) => (
                  <tr key={task.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 pr-4 text-slate-200">{task.title}</td>
                    <td className="py-2 pr-4 capitalize">{task.status?.replace('_', ' ')}</td>
                    <td className="py-2 pr-4">{task.storyPoints ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-400">{task.assigneeName ?? '—'}</td>
                    <td className="py-2">
                      <select
                        value={task.sprintId ?? 'backlog'}
                        onChange={(e) => handleMoveTaskToSprint(task.id, e.target.value === 'backlog' ? null : e.target.value)}
                        className="rounded bg-slate-800 border border-slate-600 text-slate-200 text-xs px-2 py-1"
                      >
                        <option value="backlog">Backlog</option>
                        {sprints.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSprint ? (t('edit_sprint') || 'Edit sprint') : (t('new_sprint') || 'New sprint')}>
        <div className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1" placeholder="Sprint 1" />
          </div>
          <div>
            <Label>Goal (optional)</Label>
            <Input value={form.goal} onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))} className="mt-1" placeholder="Sprint goal" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>End date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1" />
            </div>
          </div>
          {editingSprint && (
            <div>
              <Label>Status</Label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit}>{editingSprint ? t('save') : (t('create') || 'Create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
