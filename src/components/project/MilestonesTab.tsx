import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Milestone, Permission } from '@/types';
import { Button, GlassCard, Badge, Input, Select, Modal, ProgressBar } from '../ui/UIComponents';
import { Plus, Flag, Calendar, Trash2, Edit, CheckCircle, AlertCircle, ChevronDown, ChevronRight, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { PermissionGate } from '../PermissionGate';
import { format } from 'date-fns';

interface MilestonesTabProps {
    milestones: Milestone[];
    onUpsert: (milestone: Partial<Milestone>) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const MilestonesTab: React.FC<MilestonesTabProps> = ({ milestones, onUpsert, onDelete }) => {
    const { t } = useTranslation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMilestone, setEditingMilestone] = useState<Partial<Milestone> | null>(null);
    const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});

    const toggleMilestone = (id: string) => {
        setExpandedMilestones(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const completedCount = milestones.filter(m => m.status === 'completed').length;
    const progress = milestones.length > 0 ? (completedCount / milestones.length) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data: Partial<Milestone> = {
            ...editingMilestone,
            title: formData.get('title') as string,
            description: formData.get('description') as string,
            dueDate: formData.get('dueDate') as string,
            status: formData.get('status') as any,
            percentComplete: parseInt(formData.get('percentComplete') as string) || 0,
        };

        await onUpsert(data);
        setIsModalOpen(false);
        setEditingMilestone(null);
    };

    const handleEdit = (m: Milestone) => {
        setEditingMilestone(m);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('confirm_delete_milestone'))) {
            await onDelete(id);
        }
    };

    // Sort: Pending first (sorted by date), then Completed
    const sortedMilestones = [...milestones].sort((a, b) => {
        if (a.status === b.status) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return a.status === 'completed' ? 1 : -1;
    });

    return (
        <div className="space-y-6">
            {/* Summary */}
            <GlassCard className="p-6">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t('project_milestones')}</h3>
                        <p className="text-slate-600 dark:text-slate-400 text-sm">{completedCount} {t('of')} {milestones.length} {t('milestones_completed')}</p>
                    </div>
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                        <Button onClick={() => { setEditingMilestone({}); setIsModalOpen(true); }} size="sm" className="bg-cyan-500 hover:bg-cyan-600 text-slate-900 border-none shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                            <Plus className="w-4 h-4 mr-2" /> {t('add_milestone')}
                        </Button>
                    </PermissionGate>
                </div>
                <ProgressBar progress={progress} className="h-2 bg-slate-100 dark:bg-slate-800" />
            </GlassCard>

            <div className="space-y-4">
                {sortedMilestones.map((milestone: any) => {
                    const stats = milestone.stats || {
                        total: 0,
                        completed: 0,
                        overdue: 0,
                        progress: milestone.percentComplete || 0,
                        statusText: 'On Track'
                    };

                    const getStatusBadgeVariant = (statusText: string) => {
                        switch (statusText) {
                            case 'Overdue': return 'danger';
                            case 'At Risk': return 'warning';
                            default: return 'success';
                        }
                    };

                    const isMissed = new Date(milestone.dueDate) < new Date() && milestone.status !== 'completed';

                    return (
                        <div key={milestone.id} className={`p-5 rounded-2xl border transition-all duration-300 ${milestone.status === 'completed' ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/50 opacity-80' : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 hover:border-cyan-500/30'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-grow space-y-4">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h4 className={`text-lg font-bold tracking-tight ${milestone.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>
                                            {milestone.title}
                                        </h4>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getStatusBadgeVariant(stats.statusText)} size="sm" className="uppercase tracking-widest text-[10px] font-black">
                                                {stats.statusText}
                                            </Badge>
                                            {stats.overdue > 0 && (
                                                <Badge variant="danger" size="sm" className="bg-rose-500/10 text-rose-400 border-none lowercase">
                                                    {stats.overdue} {t('overdue_tasks')}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">{milestone.description}</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-end text-[11px] font-bold uppercase tracking-widest">
                                                <span className="text-slate-500">{stats.completed}/{stats.total} {t('tasks_done')}</span>
                                                <span className="text-cyan-400">{stats.progress}%</span>
                                            </div>
                                            <ProgressBar progress={stats.progress} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                                                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                                                <span>{t('due')}: {format(new Date(milestone.dueDate), 'MMM dd')}</span>
                                            </div>
                                            {isMissed && (
                                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                    <span>{t('missed_deadline')}</span>
                                                </div>
                                            )}
                                            {stats.total > 0 && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => toggleMilestone(milestone.id)}
                                                    className="ml-auto flex items-center gap-1.5 text-cyan-500 hover:text-cyan-400 hover:bg-cyan-500/5 normal-case tracking-normal py-1 h-7"
                                                >
                                                    {expandedMilestones[milestone.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    {expandedMilestones[milestone.id] ? t('hide_tasks') : t('view_tasks')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Task List */}
                                    {expandedMilestones[milestone.id] && stats.total > 0 && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                                            {milestone.tasks.map((task: any) => {
                                                const isTaskOverdue = task.status !== 'DONE' && task.dueDate && new Date(task.dueDate) < new Date();
                                                return (
                                                    <div key={task.id} className="group/task flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className={task.status === 'DONE' ? 'text-emerald-500' : task.status === 'IN_PROGRESS' ? 'text-cyan-500' : 'text-slate-500'}>
                                                                {task.status === 'DONE' ? <CheckCircle2 className="w-4 h-4" /> : task.status === 'IN_PROGRESS' ? <PlayCircle className="w-4 h-4 animate-pulse" /> : <Clock className="w-4 h-4" />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-semibold tracking-tight ${task.status === 'DONE' ? 'text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${task.status === 'DONE' ? 'text-slate-600' : task.status === 'IN_PROGRESS' ? 'text-cyan-600' : 'text-slate-500'}`}>
                                                                        {t(task.status.toLowerCase())}
                                                                    </span>
                                                                    {task.dueDate && (
                                                                        <span className={`text-[9px] font-bold ${isTaskOverdue ? 'text-rose-400' : 'text-slate-600'}`}>
                                                                            • {t('due')} {format(new Date(task.dueDate), 'MMM dd')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <Badge variant={task.status === 'DONE' ? 'success' : 'neutral'} size="sm" className="opacity-0 group-hover/task:opacity-100 transition-opacity uppercase text-[9px]">
                                                            {task.status}
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                    <div className="flex gap-1 ml-4 shrink-0">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(milestone)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700/50">
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(milestone.id)} className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </PermissionGate>
                            </div>
                        </div>
                    );
                })}
                {milestones.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                        <Flag className="w-12 h-12 mx-auto mb-4 text-slate-400 dark:text-slate-600 opacity-50 dark:opacity-20" />
                        <h4 className="text-slate-600 dark:text-slate-300 font-medium italic">{t('no_milestones')}</h4>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">{t('milestones_help')}</p>
                        <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                            <Button variant="secondary" size="sm" className="mt-6" onClick={() => { setEditingMilestone({}); setIsModalOpen(true); }}>
                                <Plus className="w-4 h-4 mr-2" /> {t('add_first_milestone')}
                            </Button>
                        </PermissionGate>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMilestone?.id ? t('edit_milestone') : t('new_milestone')}>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <Input name="title" label={t('label_title')} defaultValue={editingMilestone?.title} required />
                    <div className="grid grid-cols-2 gap-4 text-left">
                        <Input name="dueDate" type="date" label={t('due_date')} defaultValue={editingMilestone?.dueDate ? new Date(editingMilestone.dueDate).toISOString().split('T')[0] : ''} required />
                        <Select name="status" label={t('status')} defaultValue={editingMilestone?.status || 'pending'}>
                            <option value="pending">{t('pending')}</option>
                            <option value="in_progress">{t('in_progress')}</option>
                            <option value="completed">{t('completed')}</option>
                            <option value="cancelled">{t('cancelled')}</option>
                        </Select>
                    </div>
                    <Input name="description" label={t('description')} defaultValue={editingMilestone?.description} />
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('progress_percent')}</label>
                        <input name="percentComplete" type="range" min="0" max="100" className="w-full" defaultValue={editingMilestone?.percentComplete || 0} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" variant="primary">{t('save_milestone')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
