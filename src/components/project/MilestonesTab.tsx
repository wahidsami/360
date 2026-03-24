import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Milestone, Permission } from '@/types';
import { Button, GlassCard, Badge, Input, Select, Modal, ProgressBar } from '../ui/UIComponents';
import { Plus, Flag, Calendar, Trash2, Edit, CheckCircle } from 'lucide-react';
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
                        <h3 className="text-xl font-bold text-white">{t('project_milestones')}</h3>
                        <p className="text-slate-400">{completedCount} {t('of')} {milestones.length} {t('completed_lowercase')}</p>
                    </div>
                    <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                        <Button onClick={() => { setEditingMilestone({}); setIsModalOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> {t('add_milestone')}
                        </Button>
                    </PermissionGate>
                </div>
                <ProgressBar progress={progress} className="h-3" />
            </GlassCard>

            <div className="space-y-4">
                {sortedMilestones.map((milestone) => (
                    <div key={milestone.id} className={`p-5 rounded-lg border transition-all ${milestone.status === 'completed' ? 'bg-slate-900/50 border-slate-800 opacity-75' : 'bg-slate-800/50 border-slate-700 hover:border-cyan-500/50'}`}>
                        <div className="flex justify-between">
                            <div className="flex gap-4">
                                <div className={`mt-1 p-2 rounded-full h-fit ${milestone.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                    {milestone.status === 'completed' ? <CheckCircle className="w-5 h-5" /> : <Flag className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h4 className={`text-lg font-medium ${milestone.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>{milestone.title}</h4>
                                    <p className="text-slate-400 text-sm mt-1">{milestone.description}</p>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {format(new Date(milestone.dueDate), 'MMM dd, yyyy')}
                                        </div>
                                        <Badge size="sm" variant={milestone.status === 'completed' ? 'success' : milestone.status === 'in_progress' ? 'info' : 'neutral'}>
                                            {milestone.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                            <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                                <div className="flex flex-col gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(milestone)}><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300" onClick={() => handleDelete(milestone.id)}><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </PermissionGate>
                        </div>
                    </div>
                ))}
                {milestones.length === 0 && (
                    <div className="text-center py-20 bg-slate-800/20 border border-dashed border-slate-700 rounded-xl">
                        <Flag className="w-12 h-12 mx-auto mb-4 text-slate-600 opacity-20" />
                        <h4 className="text-slate-300 font-medium italic">{t('no_milestones')}</h4>
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('progress_percent')}</label>
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
