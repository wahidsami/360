import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Pencil, Trash2 } from 'lucide-react';
import { GlassCard, Button, Input, Label, Modal } from '../ui/UIComponents';
import { api } from '../../services/api';
import { TimeEntry as TimeEntryType, Task } from '../../types';
import { useAppDialog } from '../../contexts/DialogContext';

interface TimeTabProps {
  projectId: string;
  tasks: Task[];
  currentUserId?: string;
}

export const TimeTab: React.FC<TimeTabProps> = ({ projectId, tasks, currentUserId }) => {
  const { t } = useTranslation();
  const { confirm } = useAppDialog();
  const [entries, setEntries] = useState<(TimeEntryType & { task?: { id: string; title: string }; user?: { id: string; name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ taskId: '', minutes: 60, date: new Date().toISOString().split('T')[0], billable: true, note: '' });

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.timeEntries.listByProject(projectId);
      setEntries(list as any);
    } catch (e) {
      console.error('Failed to load time entries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) load();
  }, [projectId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      taskId: tasks[0]?.id ?? '',
      minutes: 60,
      date: new Date().toISOString().split('T')[0],
      billable: true,
      note: '',
    });
    setModalOpen(true);
  };

  const openEdit = (e: typeof entries[0]) => {
    setEditingId(e.id);
    setForm({
      taskId: e.taskId,
      minutes: e.minutes,
      date: e.date.split('T')[0],
      billable: e.billable,
      note: e.note ?? '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.taskId || form.minutes <= 0) return;
    try {
      if (editingId) {
        await api.timeEntries.update(projectId, editingId, {
          minutes: form.minutes,
          date: form.date,
          billable: form.billable,
          note: form.note || undefined,
        });
      } else {
        await api.timeEntries.create(projectId, {
          taskId: form.taskId,
          minutes: form.minutes,
          date: form.date,
          billable: form.billable,
          note: form.note || undefined,
        });
      }
      setModalOpen(false);
      load();
    } catch (e) {
      console.error('Save time entry failed', e);
    }
  };

  const handleDelete = async (entryId: string) => {
    const shouldDelete = await confirm({
      title: t('delete_time_entry') || 'Delete Time Entry',
      message: t('confirm_delete') || 'Delete this entry?',
      confirmText: t('delete') || 'Delete',
      cancelText: t('cancel') || 'Cancel',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    try {
      await api.timeEntries.delete(projectId, entryId);
      load();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const totalMinutes = entries.reduce((s, e) => s + e.minutes, 0);
  const totalBillable = entries.filter(e => e.billable).reduce((s, e) => s + e.minutes, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400">
          <Clock className="w-5 h-5" />
          <span className="text-sm">
            {t('total')}: {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            {totalBillable !== totalMinutes && ` (${t('billable')}: ${Math.floor(totalBillable / 60)}h ${totalBillable % 60}m)`}
          </span>
        </div>
        <Button size="sm" onClick={openCreate} disabled={tasks.length === 0}>
          <Plus className="w-4 h-4 mr-2" /> {t('log_time') || 'Log time'}
        </Button>
      </div>

      {loading ? (
        <p className="text-slate-500 py-4">{t('loading')}...</p>
      ) : entries.length === 0 ? (
        <GlassCard className="p-8 text-center text-slate-500">
          {tasks.length === 0 ? t('add_tasks_first') || 'Add tasks to the project first.' : t('no_time_entries') || 'No time entries yet.'}
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="pb-2 pr-4">{t('task')}</th>
                  <th className="pb-2 pr-4">{t('user')}</th>
                  <th className="pb-2 pr-4">{t('date')}</th>
                  <th className="pb-2 pr-4">{t('duration')}</th>
                  <th className="pb-2 pr-4">{t('billable')}</th>
                  <th className="pb-2 pr-4">{t('note')}</th>
                  <th className="pb-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="py-2 pr-4 text-slate-200">{(e.task as any)?.title ?? e.taskId}</td>
                    <td className="py-2 pr-4 text-slate-400">{(e.user as any)?.name ?? e.userId}</td>
                    <td className="py-2 pr-4 text-slate-400">{e.date.split('T')[0]}</td>
                    <td className="py-2 pr-4">{e.minutes}m</td>
                    <td className="py-2 pr-4">{e.billable ? '✓' : '—'}</td>
                    <td className="py-2 pr-4 text-slate-500 max-w-[120px] truncate">{e.note ?? '—'}</td>
                    <td className="py-2 flex gap-1">
                      {currentUserId && e.userId === currentUserId && (
                        <>
                          <button type="button" onClick={() => openEdit(e)} className="p-1 text-slate-400 hover:text-cyan-400">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(e.id)} className="p-1 text-slate-400 hover:text-rose-400">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? (t('edit_time') || 'Edit time') : (t('log_time') || 'Log time')}>
        <div className="space-y-4">
          {!editingId && (
            <div>
              <Label>{t('task')}</Label>
              <select
                value={form.taskId}
                onChange={(e) => setForm(f => ({ ...f, taskId: e.target.value }))}
                className="mt-1 w-full rounded-lg bg-slate-800 border border-slate-600 text-slate-200 px-3 py-2"
              >
                {tasks.map(tk => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <Label>{t('date')}</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
          </div>
          <div>
            <Label>{t('duration')} (minutes)</Label>
            <Input type="number" min={1} value={form.minutes} onChange={(e) => setForm(f => ({ ...f, minutes: parseInt(e.target.value, 10) || 0 }))} className="mt-1" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="billable" checked={form.billable} onChange={(e) => setForm(f => ({ ...f, billable: e.target.checked }))} className="rounded border-slate-600" />
            <Label htmlFor="billable">{t('billable')}</Label>
          </div>
          <div>
            <Label>{t('note')}</Label>
            <Input value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder={t('optional') || 'Optional'} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!form.taskId || form.minutes <= 0}>{editingId ? t('save') : (t('log_time') || 'Log time')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
