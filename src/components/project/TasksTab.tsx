import React, { useState } from 'react';
import { Task, Milestone, ProjectMember, Permission } from '@/types';
import { PermissionGate } from '../PermissionGate';
import { Button, Input, Select, Badge, TextArea, Modal } from '../ui/UIComponents';
import { Plus, List, LayoutGrid, Clock, Trash2, GripVertical } from 'lucide-react';
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

const KANBAN_COLUMNS = [
    { id: 'backlog', label: 'Backlog', color: 'text-slate-400', border: 'border-slate-700' },
    { id: 'blocked', label: 'Blocked', color: 'text-rose-400', border: 'border-rose-800' },
    { id: 'todo', label: 'To Do', color: 'text-blue-400', border: 'border-blue-800' },
    { id: 'in_progress', label: 'In Progress', color: 'text-cyan-400', border: 'border-cyan-800' },
    { id: 'review', label: 'Review', color: 'text-amber-400', border: 'border-amber-800' },
    { id: 'done', label: 'Done', color: 'text-emerald-400', border: 'border-emerald-800' },
];

export const TasksTab: React.FC<TasksTabProps> = ({ projectId, tasks, milestones, members, onUpsert, onDelete, onMove, onJoin, currentUserId }) => {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Partial<Task>>({});
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const toDateInput = (d: any) => {
        if (!d) return '';
        const s = typeof d === 'string' ? d : new Date(d).toISOString();
        return s.slice(0, 10);
    };

    const handleCreate = () => {
        setSelectedTask({ title: '', status: 'backlog', priority: 'medium', labels: [], dueDate: new Date().toISOString().split('T')[0] });
        setModalOpen(true);
    };

    const openEdit = (task: Task) => {
        setSelectedTask({ ...task, startDate: toDateInput((task as any).startDate), dueDate: toDateInput(task.dueDate) });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (selectedTask.title) { onUpsert(selectedTask); setModalOpen(false); }
    };

    const handleDeleteConfirm = (id: string) => {
        if (window.confirm('Delete this task?')) onDelete(id);
    };

    // ---------- Drag & Drop ----------
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colId);
    };

    const handleDrop = (e: React.DragEvent, colId: string) => {
        e.preventDefault();
        if (draggedTaskId) onMove(draggedTaskId, colId);
        setDraggedTaskId(null);
        setDragOverCol(null);
    };

    const handleDragEnd = () => { setDraggedTaskId(null); setDragOverCol(null); };

    // ---------- Helpers ----------
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'done': return 'success';
            case 'in_progress': return 'info';
            case 'review': return 'warning';
            case 'blocked': return 'danger';
            case 'todo': return 'neutral';
            default: return 'neutral';
        }
    };

    const priorityDot = (p: string) => {
        const c = p === 'urgent' ? 'bg-rose-500' : p === 'high' ? 'bg-amber-500' : p === 'medium' ? 'bg-blue-500' : 'bg-slate-500';
        return <span className={`inline-block w-2 h-2 rounded-full ${c} mr-1`} />;
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex justify-between items-center">
                <div className="flex bg-slate-800/50 p-1 rounded-lg">
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('kanban')} className={`p-2 rounded ${viewMode === 'kanban' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex gap-2">
                    {members.every(m => m.userId !== currentUserId) && (
                        <Button variant="secondary" size="sm" onClick={onJoin}>Join Team</Button>
                    )}
                    <PermissionGate permission={Permission.MANAGE_TASKS}>
                        <Button size="sm" onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" /> {t('create_task')}
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* LIST VIEW */}
            {viewMode === 'list' ? (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-medium">
                            <tr>
                                <th className="p-4">Title</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Priority</th>
                                <th className="p-4">Assignee</th>
                                <th className="p-4">Due Date</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-medium text-white">{task.title}</td>
                                    <td className="p-4"><Badge variant={getStatusColor(task.status)}>{task.status.replace('_', ' ')}</Badge></td>
                                    <td className="p-4 text-slate-400 capitalize">{priorityDot(task.priority || '')}{task.priority || '-'}</td>
                                    <td className="p-4 text-slate-400">{members.find(m => m.userId === task.assigneeId)?.name || 'Unassigned'}</td>
                                    <td className="p-4 text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => openEdit(task)} className="text-cyan-400 hover:text-cyan-300 text-sm">Edit</button>
                                            <button onClick={() => handleDeleteConfirm(task.id)} className="text-rose-400 hover:text-rose-300"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No tasks found. Create one to get started.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* KANBAN VIEW */
                <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 500 }}>
                    {KANBAN_COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        const isOver = dragOverCol === col.id;
                        return (
                            <div
                                key={col.id}
                                className={`flex-shrink-0 w-64 rounded-xl border ${col.border} ${isOver ? 'bg-slate-800/60 ring-2 ring-cyan-500/40' : 'bg-slate-900/30'} flex flex-col transition-all`}
                                onDragOver={e => handleDragOver(e, col.id)}
                                onDrop={e => handleDrop(e, col.id)}
                                onDragLeave={() => setDragOverCol(null)}
                            >
                                {/* Column Header */}
                                <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                                    <h3 className={`font-bold uppercase text-xs tracking-wide ${col.color}`}>{col.label}</h3>
                                    <span className="bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 text-xs">{colTasks.length}</span>
                                </div>

                                {/* Cards */}
                                <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                                    {colTasks.map(task => (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={e => handleDragStart(e, task.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => openEdit(task)}
                                            className={`bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-cyan-500/50 cursor-grab active:cursor-grabbing shadow-sm group transition-all ${draggedTaskId === task.id ? 'opacity-40 scale-95' : 'opacity-100'}`}
                                        >
                                            <div className="flex items-start justify-between gap-1 mb-2">
                                                <p className="font-medium text-white text-sm group-hover:text-cyan-400 transition-colors flex-1 min-w-0 truncate">{task.title}</p>
                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <GripVertical className="w-3 h-3 text-slate-500" />
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDeleteConfirm(task.id); }}
                                                        className="text-slate-500 hover:text-rose-400 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    {priorityDot(task.priority || '')}
                                                    <span className="capitalize">{task.priority || 'none'}</span>
                                                </span>
                                                {task.dueDate && (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                            {task.assigneeId && (
                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <div className="w-5 h-5 rounded-full bg-cyan-800 flex items-center justify-center text-[9px] text-cyan-200 font-bold">
                                                        {members.find(m => m.userId === task.assigneeId)?.name?.[0]?.toUpperCase() || '?'}
                                                    </div>
                                                    <span className="text-xs text-slate-400 truncate">{members.find(m => m.userId === task.assigneeId)?.name || 'Unassigned'}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div className={`h-16 rounded-lg border-2 border-dashed ${isOver ? 'border-cyan-500/60 bg-cyan-500/5' : 'border-slate-700/50'} flex items-center justify-center transition-all`}>
                                            <p className="text-xs text-slate-600">Drop here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Edit / Create Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTask.id ? 'Edit Task' : 'Create New Task'}>
                <div className="space-y-4">
                    <Input name="title" label="Title" value={selectedTask.title || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTask({ ...selectedTask, title: e.target.value })} required />
                    <TextArea name="description" label="Description" value={selectedTask.description || ''} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSelectedTask({ ...selectedTask, description: e.target.value })} />

                    <div className="grid grid-cols-2 gap-4">
                        <Select name="status" label="Status" value={selectedTask.status || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTask({ ...selectedTask, status: e.target.value as any })}>
                            <option value="backlog">Backlog</option>
                            <option value="blocked">Blocked</option>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Select name="assigneeId" label="Assignee" value={selectedTask.assigneeId || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value })}>
                                <option value="">Unassigned</option>
                                {members.map(m => <option key={m.id} value={m.userId}>{m.name}</option>)}
                            </Select>
                        </div>
                        <Input name="dueDate" type="date" label="Due Date" value={selectedTask.dueDate || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })} />
                    </div>

                    {selectedTask.id && (
                        <div className="pt-4 border-t border-slate-700">
                            <CustomFieldsSection entityType="TASK" entityId={selectedTask.id} onValuesSaved={() => { }} />
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-6">
                        {selectedTask.id && (
                            <button onClick={() => { handleDeleteConfirm(selectedTask.id!); setModalOpen(false); }} className="flex items-center gap-1 text-rose-400 hover:text-rose-300 text-sm transition-colors">
                                <Trash2 className="w-4 h-4" /> Delete
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave}>{selectedTask.id ? 'Update Task' : 'Create Task'}</Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
