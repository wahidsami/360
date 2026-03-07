import React, { useState } from 'react';
import { ProjectUpdate, Permission } from '@/types';
import { Button, GlassCard, Badge, Modal, Input } from '../ui/UIComponents';
import { Plus, MessageSquare, Tag, Globe, Lock } from 'lucide-react';
import { PermissionGate } from '../PermissionGate';
import { formatDistanceToNow } from 'date-fns';

interface UpdatesTabProps {
    updates: ProjectUpdate[];
    onPost: (update: Partial<ProjectUpdate>) => Promise<void>;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({ updates, onPost }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = {
            title: formData.get('title') as string,
            content: formData.get('content') as string,
            type: formData.get('type') as any,
            visibility: formData.get('visibility') as any
        };
        await onPost(data);
        setIsModalOpen(false);
    };

    const sortedUpdates = [...updates].sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Project Timeline</h3>
                <PermissionGate permission={Permission.MANAGE_PROJECTS}>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Post Update
                    </Button>
                </PermissionGate>
            </div>

            <div className="relative border-l border-slate-700 ml-4 space-y-8">
                {sortedUpdates.map((update) => (
                    <div key={update.id} className="ml-6 relative">
                        {/* Dot */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 ${update.type === 'milestone' ? 'bg-emerald-500' :
                            update.type === 'technical' ? 'bg-cyan-500' : 'bg-slate-500'
                            }`}></div>

                        <GlassCard className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-white text-lg">{update.title}</h4>
                                        {update.visibility === 'client' ?
                                            <Badge size="sm" variant="success" className="opacity-70"><Globe className="w-3 h-3 mr-1" /> Client Visible</Badge> :
                                            <Badge size="sm" variant="neutral" className="opacity-70"><Lock className="w-3 h-3 mr-1" /> Internal</Badge>
                                        }
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {update.timestamp && !isNaN(new Date(update.timestamp).getTime()) ?
                                            formatDistanceToNow(new Date(update.timestamp), { addSuffix: true }) :
                                            'Just now'} by <span className="text-slate-300">{update.authorName || 'Unknown'}</span>
                                    </p>
                                </div>
                                <Badge variant="neutral">{update.type}</Badge>
                            </div>
                            <p className="text-slate-300 whitespace-pre-wrap">{update.content}</p>
                        </GlassCard>
                    </div>
                ))}
                {updates.length === 0 && (
                    <div className="ml-6 text-slate-500 italic">No updates posted yet.</div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Post Project Update">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="title" label="Update Title" required />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                        <select name="type" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="general">General</option>
                            <option value="technical">Technical</option>
                            <option value="milestone">Milestone Reached</option>
                            <option value="alert">Alert/Issue</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Visibility</label>
                        <select name="visibility" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="internal">Internal Team Only</option>
                            <option value="client">Visible to Client</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Content</label>
                        <textarea name="content" rows={5} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" required></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Post Update</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
