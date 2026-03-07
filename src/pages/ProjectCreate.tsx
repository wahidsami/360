import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { api } from '../services/api';
import { GlassCard, Button, Input, Label, Select, TextArea } from '../components/ui/UIComponents';
import { Client, ProjectStatus, ProjectHealth } from '../types';

export const ProjectCreate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedClientId = searchParams.get('clientId');

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    clientId: preSelectedClientId || '',
    status: 'planning' as ProjectStatus,
    health: 'good' as ProjectHealth,
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    deadline: '',
    budget: 0,
    description: '',
  });

  useEffect(() => {
    api.clients.list().then(setClients);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) return;

    setLoading(true);
    setError(null);
    try {
      // Ensure dates are properly formatted for backend (though simple strings often work, specific ISO format is safer)
      const payload = {
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined
      };

      const newProject = await api.projects.create(payload);
      navigate(`/app/projects/${newProject.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create project. Please check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate('..')}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-3xl font-bold font-display text-white">{t('create_project')}</h1>
          <p className="text-slate-400">Initialize a new mission protocol.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-start gap-3">
            <div className="text-rose-400 mt-0.5"><Save className="w-5 h-5" /></div> {/* Reusing icon for now or could import AlertCircle */}
            <div>
              <h3 className="text-rose-200 font-semibold text-sm">Creation Failed</h3>
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
                disabled={!!preSelectedClientId}
                className={preSelectedClientId ? 'opacity-70 cursor-not-allowed' : ''}
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
              </Select>
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
              <Input type="number" min="0" value={formData.budget} onChange={e => setFormData({ ...formData, budget: parseInt(e.target.value) })} />
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
            {loading ? 'Initializing...' : t('create_project')}
          </Button>
        </div>
      </form>
    </div>
  );
};
