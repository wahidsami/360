import React, { useEffect, useState } from 'react';
import { GlassCard, Button, Modal } from '../ui/UIComponents';
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

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      priority: 'MEDIUM',
      frequency: 'WEEKLY',
      interval: 1,
      weekday: 1,
      nextRunAt: new Date().toISOString().slice(0, 16),
    });
    setShowForm(true);
  };

  const openEdit = (t: RecurringTaskTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      description: t.description || '',
      priority: t.priority,
      frequency: t.recurrenceRule.frequency,
      interval: t.recurrenceRule.interval || 1,
      weekday: t.recurrenceRule.weekday || 1,
      nextRunAt: t.nextRunAt.slice(0, 16),
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        recurrenceRule: {
          frequency: form.frequency,
          interval: form.interval,
          weekday: form.frequency === 'WEEKLY' ? form.weekday : undefined,
        },
        nextRunAt: form.nextRunAt || new Date().toISOString().slice(0, 16),
      };

      if (editingId) {
        await api.projects.updateRecurringTask(projectId, editingId, payload);
      } else {
        await api.projects.createRecurringTask(projectId, payload);
      }
      
      setShowForm(false);
      load();
      onRefreshTasks?.();
    } catch (e) {
      console.error('Save recurring task failed', e);
    }
  };

  const handleToggleActive = async (templateId: string, currentStatus: boolean) => {
    try {
      await api.projects.updateRecurringTask(projectId, templateId, { isActive: !currentStatus });
      load();
    } catch (e) {
      console.error('Toggle status failed', e);
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
        <Button variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add template
        </Button>
      </div>

      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={editingId ? 'Edit task template' : 'Add recurring task template'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Task title</label>
            <input
              type="text"
              placeholder="e.g. Weekly Security Audit"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Description (optional)</label>
            <textarea
              placeholder="Details about this recurring task..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {form.frequency === 'WEEKLY' ? (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Day of Week</label>
                <select
                  value={form.weekday}
                  onChange={e => setForm(f => ({ ...f, weekday: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                    <option key={d} value={i === 0 ? 7 : i}>{d}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Interval</label>
                <input
                  type="number"
                  min="1"
                  value={form.interval}
                  onChange={e => setForm(f => ({ ...f, interval: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Next Run Time</label>
              <input
                type="datetime-local"
                value={form.nextRunAt}
                onChange={e => setForm(f => ({ ...f, nextRunAt: e.target.value }))}
                className="w-full rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="primary" className="flex-1" onClick={handleSubmit}>
              {editingId ? 'Save changes' : 'Create template'}
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

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
                  onClick={() => handleToggleActive(t.id, t.isActive)}
                  title={t.isActive ? 'Pause' : 'Resume'}
                  className="text-xs h-8 px-3"
                >
                  {t.isActive ? 'Pause' : 'Resume'}
                </Button>
                <div className="w-px h-6 bg-slate-800 mx-1" />
                <button 
                  onClick={() => openEdit(t)}
                  className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Edit Template"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(t.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          </li>
        ))}
      </ul>
    </div>
  );
};
