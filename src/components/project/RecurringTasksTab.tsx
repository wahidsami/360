import React, { useEffect, useState } from 'react';
import { GlassCard, Button } from '../ui/UIComponents';
import { api } from '../../services/api';
import { Repeat, Plus, Pencil, Trash2, Calendar } from 'lucide-react';

export type RecurringTaskTemplate = {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  priority: string;
  recurrenceRule: { frequency: string; interval?: number; weekday?: number };
  nextRunAt: string;
  lastRunAt?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

interface RecurringTasksTabProps {
  projectId: string;
  onRefreshTasks?: () => void;
}

const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

function formatRecurrence(rule: { frequency: string; interval?: number; weekday?: number }): string {
  const freq = (rule.frequency || 'DAILY').toUpperCase();
  const interval = rule.interval ?? 1;
  const label = FREQUENCY_LABELS[freq] || freq;
  if (interval > 1) return `Every ${interval} ${label.toLowerCase()}s`;
  if (freq === 'WEEKLY' && rule.weekday != null) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `Weekly on ${days[rule.weekday === 7 ? 0 : rule.weekday]}`;
  }
  return label;
}

export const RecurringTasksTab: React.FC<RecurringTasksTabProps> = ({ projectId, onRefreshTasks }) => {
  const [templates, setTemplates] = useState<RecurringTaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    frequency: 'WEEKLY',
    interval: 1,
    weekday: 1,
    nextRunAt: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.projects.getRecurringTasks(projectId);
      setTemplates(list || []);
    } catch (e) {
      console.error('Failed to load recurring tasks', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      await api.projects.createRecurringTask(projectId, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        recurrenceRule: {
          frequency: form.frequency,
          interval: form.interval,
          weekday: form.frequency === 'WEEKLY' ? form.weekday : undefined,
        },
        nextRunAt: form.nextRunAt || new Date().toISOString().slice(0, 16),
      });
      setForm({ title: '', description: '', priority: 'MEDIUM', frequency: 'WEEKLY', interval: 1, weekday: 1, nextRunAt: '' });
      setShowForm(false);
      load();
      onRefreshTasks?.();
    } catch (e) {
      console.error('Create recurring task failed', e);
    }
  };

  const handleUpdate = async (templateId: string, patch: { isActive?: boolean; title?: string; nextRunAt?: string }) => {
    try {
      await api.projects.updateRecurringTask(projectId, templateId, patch);
      setEditingId(null);
      load();
      onRefreshTasks?.();
    } catch (e) {
      console.error('Update recurring task failed', e);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!window.confirm('Delete this recurring task template?')) return;
    try {
      await api.projects.deleteRecurringTask(projectId, templateId);
      load();
      onRefreshTasks?.();
    } catch (e) {
      console.error('Delete recurring task failed', e);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-8 text-center text-slate-400">
        Loading recurring tasks…
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
          <Repeat className="w-5 h-5" /> Recurring tasks
        </h3>
        {!showForm && (
          <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add template
          </Button>
        )}
      </div>

      {showForm && (
        <GlassCard className="p-4 space-y-3">
          <input
            type="text"
            placeholder="Task title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full rounded border border-slate-600 bg-slate-800/50 px-3 py-2 text-slate-200 placeholder-slate-500"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full rounded border border-slate-600 bg-slate-800/50 px-3 py-2 text-slate-200 placeholder-slate-500"
            rows={2}
          />
          <div className="flex flex-wrap gap-4 items-center">
            <label className="text-slate-400 text-sm">Priority</label>
            <select
              value={form.priority}
              onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="rounded border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-200"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
            <label className="text-slate-400 text-sm">Recurrence</label>
            <select
              value={form.frequency}
              onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
              className="rounded border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-200"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            {form.frequency === 'WEEKLY' && (
              <select
                value={form.weekday}
                onChange={e => setForm(f => ({ ...f, weekday: Number(e.target.value) }))}
                className="rounded border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-200"
              >
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                  <option key={d} value={i === 0 ? 7 : i}>{d}</option>
                ))}
              </select>
            )}
            <label className="text-slate-400 text-sm">Next run</label>
            <input
              type="datetime-local"
              value={form.nextRunAt}
              onChange={e => setForm(f => ({ ...f, nextRunAt: e.target.value }))}
              className="rounded border border-slate-600 bg-slate-800/50 px-2 py-1 text-slate-200"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleCreate}>Create</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </GlassCard>
      )}

      {templates.length === 0 && !showForm && (
        <GlassCard className="p-8 text-center text-slate-500">
          No recurring task templates. Add one to automatically create tasks on a schedule.
        </GlassCard>
      )}

      <ul className="space-y-2">
        {templates.map(t => (
          <li key={t.id}>
            <GlassCard className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-slate-200">{t.title}</span>
                  <span className="text-xs text-slate-500 uppercase">{t.priority}</span>
                  {!t.isActive && <span className="text-xs text-amber-500">Paused</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {formatRecurrence(t.recurrenceRule)}
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Next: {new Date(t.nextRunAt).toLocaleString()}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUpdate(t.id, { isActive: !t.isActive })}
                  title={t.isActive ? 'Pause' : 'Resume'}
                >
                  {t.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)} title="Delete">
                  <Trash2 className="w-4 h-4 text-red-400" />
                </Button>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>
    </div>
  );
};
