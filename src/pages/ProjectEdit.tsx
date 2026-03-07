import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../services/api';
import { GlassCard, Button, Input, Label, Select, TextArea } from '../components/ui/UIComponents';
import { Client, ProjectStatus, ProjectHealth } from '../types';

export const ProjectEdit: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { projectId } = useParams();

    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        clientId: '',
        status: 'planning' as ProjectStatus,
        health: 'good' as ProjectHealth,
        progress: 0,
        startDate: '',
        deadline: '',
        budget: 0,
        description: '',
    });

    useEffect(() => {
        const load = async () => {
            setFetching(true);
            try {
                const [p, cList] = await Promise.all([
                    api.projects.get(projectId!),
                    api.clients.list()
                ]);

                if (p) {
                    setFormData({
                        name: p.name,
                        clientId: p.clientId,
                        status: p.status as ProjectStatus,
                        health: p.health as ProjectHealth,
                        progress: p.progress || 0,
                        startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
                        deadline: (p.deadline || (p as any).endDate) ? new Date(p.deadline || (p as any).endDate).toISOString().split('T')[0] : '',
                        budget: p.budget || 0,
                        description: p.description || '',
                    });
                }
                setClients(cList);
            } catch (err) {
                console.error("Failed to load project data", err);
                setError("Failed to load project data.");
            } finally {
                setFetching(false);
            }
        };

        if (projectId) load();
    }, [projectId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId || !formData.clientId) return;

        setLoading(true);
        setError(null);
        try {
            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
            };

            await api.projects.update(projectId, payload);
            navigate(`/app/projects/${projectId}`);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to update project. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return <div className="p-10 text-center text-slate-500">Retrieving mission configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" onClick={() => navigate('..')}><ArrowLeft className="w-5 h-5" /></Button>
                <div>
                    <h1 className="text-3xl font-bold font-display text-white">{t('edit_project')}</h1>
                    <p className="text-slate-400">Update mission parameters and protocols.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-start gap-3">
                        <div className="text-rose-400 mt-0.5"><Save className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-rose-200 font-semibold text-sm">Update Failed</h3>
                            <p className="text-rose-300/80 text-xs">{error}</p>
                        </div>
                    </div>
                )}

                <GlassCard title="Mission Parameters">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <Label>{t('project_name')}</Label>
                            <Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <Label>{t('client_name')}</Label>
                            <Select
                                required
                                value={formData.clientId}
                                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </Select>
                        </div>
                        <div>
                            <Label>{t('status')}</Label>
                            <Select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                <option value="planning">Planning</option>
                                <option value="in_progress">In Progress</option>
                                <option value="testing">Testing</option>
                                <option value="deployed">Deployed</option>
                                <option value="on_hold">On Hold</option>
                                <option value="completed">Completed</option>
                            </Select>
                        </div>
                        <div>
                            <Label>{t('health')}</Label>
                            <Select value={formData.health} onChange={e => setFormData({ ...formData, health: e.target.value as any })}>
                                <option value="good">Good</option>
                                <option value="at-risk">At Risk</option>
                                <option value="critical">Critical</option>
                            </Select>
                        </div>
                        <div>
                            <Label>{t('progress')} (%)</Label>
                            <Input type="number" min="0" max="100" value={formData.progress} onChange={e => setFormData({ ...formData, progress: parseInt(e.target.value) })} />
                        </div>
                        <div>
                            <Label>{t('start_date')}</Label>
                            <Input type="date" required value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                        </div>
                        <div>
                            <Label>{t('deadline')}</Label>
                            <Input type="date" required value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                        </div>
                        <div>
                            <Label>{t('budget')}</Label>
                            <Input type="number" min="0" value={formData.budget} onChange={e => setFormData({ ...formData, budget: parseFloat(e.target.value) })} />
                        </div>
                        <div className="md:col-span-2">
                            <Label>{t('description')}</Label>
                            <TextArea rows={4} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                    </div>
                </GlassCard>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" onClick={() => navigate('..')}>{t('cancel')}</Button>
                    <Button type="submit" disabled={loading} className="w-40">
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Updating...' : t('update_project')}
                    </Button>
                </div>
            </form>
        </div>
    );
};
