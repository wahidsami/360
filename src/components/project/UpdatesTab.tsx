import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectUpdate, Permission } from '@/types';
import { Button, GlassCard, Badge, Modal, Input } from '../ui/UIComponents';
import { Plus, MessageSquare, Tag, Globe, Lock } from 'lucide-react';
import { PermissionGate } from '../PermissionGate';
import { formatDistanceToNow } from 'date-fns';

interface UpdatesTabProps {
    updates: ProjectUpdate[];
    onPost: (update: Partial<ProjectUpdate>) => Promise<void>;
    canPost?: boolean;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({ updates, onPost, canPost = false }) => {
    const { t } = useTranslation();
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
                <h3 className="text-xl font-bold text-white">{t('project_timeline')}</h3>
                {canPost ? (
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> {t('post_update')}
                    </Button>
                ) : null}
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
                                            <Badge size="sm" variant="success" className="opacity-70"><Globe className="w-3 h-3 mr-1" /> {t('client_visible')}</Badge> :
                                            <Badge size="sm" variant="neutral" className="opacity-70"><Lock className="w-3 h-3 mr-1" /> {t('internal')}</Badge>
                                        }
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {update.timestamp && !isNaN(new Date(update.timestamp).getTime()) ?
                                            formatDistanceToNow(new Date(update.timestamp), { addSuffix: true }) :
                                            t('just_now')} {t('by_author')} <span className="text-slate-300">{update.authorName || t('unknown')}</span>
                                    </p>
                                </div>
                                <Badge variant="neutral">{update.type}</Badge>
                            </div>
                            <p className="text-slate-300 whitespace-pre-wrap">{update.content}</p>
                        </GlassCard>
                    </div>
                ))}
                {updates.length === 0 && (
                    <div className="ml-6 py-16 text-center bg-slate-800/10 border border-dashed border-slate-800 rounded-xl px-4">
                        <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-700" />
                        <p className="text-slate-500 italic text-sm">{t('no_project_updates')}</p>
                        {canPost ? (
                            <Button variant="ghost" size="sm" className="mt-4 text-cyan-500" onClick={() => setIsModalOpen(true)}>
                                <Plus className="w-3 h-3 mr-2" /> {t('post_an_update')}
                            </Button>
                        ) : null}
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={t('post_project_update')}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input name="title" label={t('update_title')} required />
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('type')}</label>
                        <select name="type" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="general">{t('general')}</option>
                            <option value="technical">{t('technical')}</option>
                            <option value="milestone">{t('milestone_reached')}</option>
                            <option value="alert">{t('alert_issue')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('visibility_label')}</label>
                        <select name="visibility" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                            <option value="internal">{t('internal_team_only')}</option>
                            <option value="client">{t('visible_to_client')}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{t('content')}</label>
                        <textarea name="content" rows={5} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-cyan-500 outline-none" required></textarea>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>{t('cancel')}</Button>
                        <Button type="submit" variant="primary">{t('post_update')}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
