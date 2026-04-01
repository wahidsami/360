import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Plus, Pencil, Trash2, MessageSquare, Github, Send } from 'lucide-react';
import { GlassCard, Button, Input, Label, Modal } from '../components/ui/UIComponents';
import { api } from '../services/api';
import { useAppDialog } from '../contexts/DialogContext';
import toast from 'react-hot-toast';

type IntegrationItem = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
};

type WebhookItem = {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
};

const Integrations: React.FC = () => {
  const { t } = useTranslation();
  const { confirm } = useAppDialog();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [intModalOpen, setIntModalOpen] = useState(false);
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [editingInt, setEditingInt] = useState<IntegrationItem | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
  const [intForm, setIntForm] = useState({ type: 'SLACK' as 'SLACK' | 'GITHUB', name: '', enabled: true, webhookUrl: '', channel: '', token: '', repo: '' });
  const [webhookForm, setWebhookForm] = useState({ name: '', url: '', secret: '', events: [] as string[], enabled: true });
  const [saving, setSaving] = useState(false);
  const [githubIssueModal, setGithubIssueModal] = useState<{ integrationId: string } | null>(null);
  const [githubIssueForm, setGithubIssueForm] = useState({ title: '', body: '' });
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [intList, whList] = await Promise.all([
        api.integrations.list(),
        api.webhooks.list(),
      ]);
      setIntegrations((intList || []) as IntegrationItem[]);
      setWebhooks((whList || []) as WebhookItem[]);
    } catch (e) {
      console.error('Failed to load', e);
      toast.error('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openIntModal = (item?: IntegrationItem) => {
    if (item) {
      setEditingInt(item);
      const c = (item.config || {}) as Record<string, string>;
      setIntForm({
        type: item.type as 'SLACK' | 'GITHUB',
        name: item.name,
        enabled: item.enabled,
        webhookUrl: c.webhookUrl || '',
        channel: c.channel || '',
        token: '',
        repo: c.repo || '',
      });
    } else {
      setEditingInt(null);
      setIntForm({ type: 'SLACK', name: '', enabled: true, webhookUrl: '', channel: '', token: '', repo: '' });
    }
    setIntModalOpen(true);
  };

  const saveIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingInt) {
        const existingConfig = (editingInt.config || {}) as Record<string, unknown>;
        const updateConfig = intForm.type === 'SLACK'
          ? { webhookUrl: intForm.webhookUrl || existingConfig.webhookUrl, channel: intForm.channel || existingConfig.channel }
          : { ...existingConfig, repo: intForm.repo || existingConfig.repo, ...(intForm.token && intForm.token !== '••••••••' ? { token: intForm.token } : {}) };
        await api.integrations.update(editingInt.id, { name: intForm.name, enabled: intForm.enabled, config: updateConfig });
        toast.success('Integration updated');
      } else {
        const config = intForm.type === 'SLACK'
          ? { webhookUrl: intForm.webhookUrl || undefined, channel: intForm.channel || undefined }
          : { token: intForm.token || undefined, repo: intForm.repo || undefined };
        await api.integrations.create({
          type: intForm.type,
          name: intForm.name,
          enabled: intForm.enabled,
          config: config as Record<string, unknown>,
        });
        toast.success('Integration added');
      }
      setIntModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteIntegration = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Delete integration',
      message: 'Delete this integration?',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    try {
      await api.integrations.delete(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const testSlack = async (id: string) => {
    setSendingTest(id);
    try {
      await api.integrations.testSlack(id);
      toast.success('Test message sent to Slack');
    } catch (err: any) {
      toast.error(err?.message || 'Test failed');
    } finally {
      setSendingTest(null);
    }
  };

  const openWebhookModal = (item?: WebhookItem) => {
    if (item) {
      setEditingWebhook(item);
      setWebhookForm({ name: item.name, url: item.url, secret: '', events: item.events || [], enabled: item.enabled });
    } else {
      setEditingWebhook(null);
      setWebhookForm({ name: '', url: '', secret: '', events: [], enabled: true });
    }
    setWebhookModalOpen(true);
  };

  const saveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingWebhook) {
        await api.webhooks.update(editingWebhook.id, {
          name: webhookForm.name,
          url: webhookForm.url,
          ...(webhookForm.secret && { secret: webhookForm.secret }),
          events: webhookForm.events,
          enabled: webhookForm.enabled,
        });
        toast.success('Webhook updated');
      } else {
        await api.webhooks.create({
          name: webhookForm.name,
          url: webhookForm.url,
          ...(webhookForm.secret && { secret: webhookForm.secret }),
          events: webhookForm.events,
          enabled: webhookForm.enabled,
        });
        toast.success('Webhook added');
      }
      setWebhookModalOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    const shouldDelete = await confirm({
      title: 'Delete webhook',
      message: 'Delete this webhook?',
      confirmText: 'Delete',
      tone: 'danger',
    });
    if (!shouldDelete) return;
    try {
      await api.webhooks.delete(id);
      toast.success('Deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const submitGitHubIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubIssueModal) return;
    setSaving(true);
    try {
      const res = await api.integrations.createGitHubIssue(githubIssueModal.integrationId, githubIssueForm.title, githubIssueForm.body);
      toast.success(`Issue #${(res as any).number} created`);
      setGithubIssueModal(null);
      setGithubIssueForm({ title: '', body: '' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create issue');
    } finally {
      setSaving(false);
    }
  };

  const EVENT_OPTIONS = ['task.created', 'task.updated', 'finding.created', 'finding.updated', 'invoice.created', 'approval.requested'];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-display text-white">{t('integrations') || 'Integrations'}</h1>
        <p className="text-slate-400 mt-1">Connect Slack, GitHub, and outgoing webhooks.</p>
      </div>

      <GlassCard title="Slack & GitHub" className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 space-y-4">
          <p className="text-slate-400 text-sm">Notifications can be sent to Slack when created. Add a Slack Incoming Webhook and optionally test it.</p>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <>
              <div className="space-y-2">
                {integrations.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      {i.type === 'SLACK' ? <MessageSquare className="w-5 h-5 text-emerald-400" /> : <Github className="w-5 h-5 text-slate-200" />}
                      <div>
                        <span className="font-medium text-white">{i.name}</span>
                        <span className="ml-2 text-slate-500 text-sm">{i.type}</span>
                        {!i.enabled && <span className="ml-2 text-amber-400 text-xs">Disabled</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {i.type === 'SLACK' && (
                        <Button variant="ghost" size="sm" onClick={() => testSlack(i.id)} disabled={sendingTest === i.id}>
                          <Send className="w-4 h-4 mr-1" /> {sendingTest === i.id ? 'Sending…' : 'Test'}
                        </Button>
                      )}
                      {i.type === 'GITHUB' && (
                        <Button variant="ghost" size="sm" onClick={() => setGithubIssueModal({ integrationId: i.id })}>
                          New issue
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openIntModal(i)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => deleteIntegration(i.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
                {integrations.length === 0 && <p className="text-slate-500 text-sm">No integrations yet.</p>}
              </div>
              <Button variant="outline" onClick={() => openIntModal()}><Plus className="w-4 h-4 mr-2" /> Add integration</Button>
            </>
          )}
        </div>
      </GlassCard>

      <GlassCard title="Outgoing webhooks" className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 space-y-4">
          <p className="text-slate-400 text-sm">HTTP callbacks for events (e.g. task.created). Your endpoint will receive a POST with a JSON payload.</p>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <>
              <div className="space-y-2">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div>
                      <span className="font-medium text-white">{w.name}</span>
                      <span className="ml-2 text-slate-500 text-xs truncate max-w-xs inline-block">{w.url}</span>
                      {w.events?.length > 0 && <div className="text-slate-500 text-xs mt-1">Events: {w.events.join(', ')}</div>}
                      {!w.enabled && <span className="ml-2 text-amber-400 text-xs">Disabled</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openWebhookModal(w)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => deleteWebhook(w.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ))}
                {webhooks.length === 0 && <p className="text-slate-500 text-sm">No webhooks yet.</p>}
              </div>
              <Button variant="outline" onClick={() => openWebhookModal()}><Plus className="w-4 h-4 mr-2" /> Add webhook</Button>
            </>
          )}
        </div>
      </GlassCard>

      <Modal isOpen={intModalOpen} onClose={() => setIntModalOpen(false)} title={editingInt ? 'Edit integration' : 'Add integration'}>
        <form onSubmit={saveIntegration} className="space-y-4">
          <div>
            <Label>Type</Label>
            <select value={intForm.type} onChange={(e) => setIntForm((f) => ({ ...f, type: e.target.value as 'SLACK' | 'GITHUB' }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" disabled={!!editingInt}>
              <option value="SLACK">Slack</option>
              <option value="GITHUB">GitHub</option>
            </select>
          </div>
          <Input label="Name" value={intForm.name} onChange={(e) => setIntForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. #project-alerts" required />
          {intForm.type === 'SLACK' && (
            <>
              <Input label="Webhook URL" type="url" value={intForm.webhookUrl} onChange={(e) => setIntForm((f) => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://hooks.slack.com/..." />
              <Input label="Channel (optional)" value={intForm.channel} onChange={(e) => setIntForm((f) => ({ ...f, channel: e.target.value }))} placeholder="#channel" />
            </>
          )}
          {intForm.type === 'GITHUB' && (
            <>
              <Input label="Personal access token" type="password" value={intForm.token} onChange={(e) => setIntForm((f) => ({ ...f, token: e.target.value }))} placeholder={editingInt ? 'Leave blank to keep' : 'ghp_...'} />
              <Input label="Repo (owner/repo)" value={intForm.repo} onChange={(e) => setIntForm((f) => ({ ...f, repo: e.target.value }))} placeholder="acme/repo" required={!editingInt} />
            </>
          )}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="int-enabled" checked={intForm.enabled} onChange={(e) => setIntForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded border-slate-600" />
            <Label htmlFor="int-enabled">Enabled</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIntModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={webhookModalOpen} onClose={() => setWebhookModalOpen(false)} title={editingWebhook ? 'Edit webhook' : 'Add webhook'}>
        <form onSubmit={saveWebhook} className="space-y-4">
          <Input label="Name" value={webhookForm.name} onChange={(e) => setWebhookForm((f) => ({ ...f, name: e.target.value }))} placeholder="My endpoint" required />
          <Input label="URL" type="url" value={webhookForm.url} onChange={(e) => setWebhookForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." required />
          <Input label="Secret (optional)" type="password" value={webhookForm.secret} onChange={(e) => setWebhookForm((f) => ({ ...f, secret: e.target.value }))} placeholder="HMAC secret" />
          <div>
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {EVENT_OPTIONS.map((ev) => (
                <label key={ev} className="flex items-center gap-1 text-sm text-slate-300">
                  <input type="checkbox" checked={webhookForm.events.includes(ev)} onChange={(e) => setWebhookForm((f) => ({ ...f, events: e.target.checked ? [...f.events, ev] : f.events.filter((x) => x !== ev) }))} className="rounded border-slate-600" />
                  {ev}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="wh-enabled" checked={webhookForm.enabled} onChange={(e) => setWebhookForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded border-slate-600" />
            <Label htmlFor="wh-enabled">Enabled</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setWebhookModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {githubIssueModal && (
        <Modal isOpen={!!githubIssueModal} onClose={() => { setGithubIssueModal(null); setGithubIssueForm({ title: '', body: '' }); }} title="Create GitHub issue">
          <form onSubmit={submitGitHubIssue} className="space-y-4">
            <Input label="Title" value={githubIssueForm.title} onChange={(e) => setGithubIssueForm((f) => ({ ...f, title: e.target.value }))} required />
            <div>
              <Label>Body</Label>
              <textarea value={githubIssueForm.body} onChange={(e) => setGithubIssueForm((f) => ({ ...f, body: e.target.value }))} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setGithubIssueModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create issue'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Integrations;
