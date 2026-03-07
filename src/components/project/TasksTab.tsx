import React, { useState } from 'react';
import { Task, Milestone, ProjectMember, Permission } from '@/types';
import { PermissionGate } from '../PermissionGate';
import { Button, Input, Select, Badge, TextArea, Modal } from '../ui/UIComponents';
import { Plus, List, LayoutGrid, CheckCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CustomFieldsSection } from '../CustomFieldsSection';

interface TasksTabProps {
    projectId: string;
    tasks: Task[];
    milestones: Milestone[];
    members: ProjectMember[];
    onUpsert: (task: Partial<Task>) => void;
    onDelete: (id: string) => void;
    onMove: (id: string, status: any) => void;
    onJoin: () => void;
    currentUserId: string;
}

export const TasksTab: React.FC<TasksTabProps> = ({ projectId, tasks, milestones, members, onUpsert, onDelete, onMove, onJoin, currentUserId }) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Partial<Task>>({});

    const handleCreate = () => {
        setSelectedTask({
            title: '',
            status: 'backlog',
            priority: 'medium',
            labels: [],
            dueDate: new Date().toISOString().split('T')[0]
        });
        setModalOpen(true);
    };

    const toDateInput = (d: any) => {
        if (!d) return '';
        const s = typeof d === 'string' ? d : new Date(d).toISOString();
        return s.slice(0, 10); // "YYYY-MM-DD"
    };

    const openEdit = (task: Task) => {
        setSelectedTask({
            ...task,
            startDate: toDateInput((task as any).startDate),
            dueDate: toDateInput(task.dueDate),
        });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (selectedTask.title) {
            onUpsert(selectedTask);
            setModalOpen(false);
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'success';
            case 'in_progress': return 'info';
            case 'review': return 'warning';
            default: return 'neutral';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex bg-slate-800/50 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2">
                    {members.every(m => m.userId !== currentUserId) && (
                        <Button variant="secondary" size="sm" onClick={onJoin}>
                            Join Team
                        </Button>
                    )}
                    <PermissionGate permission={Permission.MANAGE_TASKS}>
                        <Button size="sm" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" /> {t('create_task')}
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {viewMode === 'list' ? (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="p-4">Title</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Assignee</th>
                                <th className="p-4">Due Date</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-medium text-white">{task.title}</td>
                                    <td className="p-4">
                                        <Badge variant={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {members.find(m => m.userId === task.assigneeId)?.name || 'Unassigned'}
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => { openEdit(task); }} className="text-cyan-400 hover:text-cyan-300 mr-3">Edit</button>
                                    </td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No tasks found. Create one to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-4 h-[600px]">
                    {['backlog', 'in_progress', 'review', 'done'].map(status => (
                        <div key={status} className="bg-slate-900/30 rounded-xl border border-slate-800 p-4 flex flex-col">
                            <h3 className="font-bold text-slate-400 uppercase text-xs mb-4 flex items-center justify-between">
                                {status.replace('_', ' ')}
                                <span className="bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">{tasks.filter(t => t.status === status).length}</span>
                            </h3>
                            <div className="space-y-3 overflow-y-auto flex-1 scrollbar-thin">
                                {tasks.filter(t => t.status === status).map(task => (
                                    <div key={task.id} onClick={() => { openEdit(task); }} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-pointer shadow-sm group">
                                        <p className="font-medium text-white mb-2 group-hover:text-cyan-400 transition-colors">{task.title}</p>
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>{members.find(m => m.userId === task.assigneeId)?.name || 'Unassigned'}</span>
                                            {task.dueDate && <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTask.id ? "Edit Task" : "Create New Task"}>
                <div className="space-y-4">
                    <Input name="title" label="Title" value={selectedTask.title || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTask({ ...selectedTask, title: e.target.value })} required />
                    <TextArea name="description" label="Description" value={selectedTask.description || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedTask({ ...selectedTask, description: e.target.value })} />

                    <div className="grid grid-cols-2 gap-4">
                        <Select name="status" label="Status" value={selectedTask.status || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTask({ ...selectedTask, status: e.target.value as any })}>
                            <option value="backlog">Backlog</option>
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                        </Select>
                        <Select name="priority" label="Priority" value={selectedTask.priority || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTask({ ...selectedTask, priority: e.target.value as any })}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                            <Select name="assigneeId" label="Assignee" value={selectedTask.assigneeId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value })}>
                                <option value="">Unassigned</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.userId}>{m.name}</option>
                                ))}
                            </Select>
                            {members.length === 0 && (
                                <p className="text-[10px] text-amber-400 mt-1">
                                    No team members found. Add members in the "Team" tab to assign tasks.
                                </p>
                            )}
                        </div>
                        <Input name="dueDate" type="date" label="Due Date" value={selectedTask.dueDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })} />
                    </div>

                    {selectedTask.id && (
                        <div className="pt-4 border-t border-slate-700">
                            <CustomFieldsSection entityType="TASK" entityId={selectedTask.id} onValuesSaved={() => { }} />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>{selectedTask.id ? 'Update Task' : 'Create Task'}</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
