import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Bell, User, Building2, BarChart3, Key, Plus, Pencil, Trash2, List, Clock, Smartphone } from 'lucide-react';
import { GlassCard, Button, Input, Label, Modal, CopyButton } from '../components/ui/UIComponents';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Role } from '../types';
import toast from 'react-hot-toast';

type SsoConfigItem = {
  id: string;
  provider: string;
  name: string;
  enabled: boolean;
  clientId: string | null;
  clientSecret: string | null;
  issuer?: string | null;
  entryPoint?: string | null;
  cert?: string | null;
  createdAt: string;
  updatedAt: string;
};

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [org, setOrg] = useState<{ id: string; name: string; slug?: string | null; plan: string; logo?: string | null; primaryColor?: string | null; accentColor?: string | null; maxUsers: number; maxProjects: number; maxStorageMB: number } | null>(null);
  const [usage, setUsage] = useState<{ users: number; projects: number; storageUsedMB: number } | null>(null);
  const [orgName, setOrgName] = useState('');
  const [orgLogo, setOrgLogo] = useState('');
  const [orgPrimaryColor, setOrgPrimaryColor] = useState('#06b6d4');
  const [orgAccentColor, setOrgAccentColor] = useState('#6366f1');
  const [savingOrg, setSavingOrg] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('arena360_theme') as 'dark' | 'light') || 'dark');
  const [notifPrefs, setNotifPrefs] = useState<{ emailTasks: boolean; emailFindings: boolean; emailInvoices: boolean; inApp: boolean } | null>(null);
  const [savingNotif, setSavingNotif] = useState(false);
  const [ssoConfigs, setSsoConfigs] = useState<SsoConfigItem[]>([]);
  const [ssoModalOpen, setSsoModalOpen] = useState(false);
  const [ssoEditing, setSsoEditing] = useState<SsoConfigItem | null>(null);
  const [ssoForm, setSsoForm] = useState({
    provider: 'GOOGLE' as 'GOOGLE' | 'SAML',
    name: '',
    clientId: '',
    clientSecret: '',
    enabled: true,
    entryPoint: '',
    issuer: '',
    cert: '',
  });
  const [savingSso, setSavingSso] = useState(false);

  type CustomFieldDefItem = { id: string; entityType: string; key: string; label: string; fieldType: string; required: boolean; sortOrder: number };
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDefItem[]>([]);
  const [cfEntityFilter, setCfEntityFilter] = useState<'PROJECT' | 'TASK' | 'CLIENT'>('PROJECT');
  const [cfModalOpen, setCfModalOpen] = useState(false);
  const [cfEditing, setCfEditing] = useState<CustomFieldDefItem | null>(null);
  const [cfForm, setCfForm] = useState({ entityType: 'PROJECT' as 'PROJECT' | 'TASK' | 'CLIENT', key: '', label: '', fieldType: 'TEXT' as string, optionsStr: '', required: false });
  const [savingCf, setSavingCf] = useState(false);

  type SlaPolicyItem = { id: string; name: string; entityType: string; targetHours: number; clientId: string | null; enabled: boolean };
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicyItem[]>([]);
  const [slaEntityFilter, setSlaEntityFilter] = useState<'TASK' | 'FINDING' | 'INVOICE'>('TASK');
  const [slaModalOpen, setSlaModalOpen] = useState(false);
  const [slaEditing, setSlaEditing] = useState<SlaPolicyItem | null>(null);
  const [slaForm, setSlaForm] = useState({ name: '', entityType: 'TASK' as 'TASK' | 'FINDING' | 'INVOICE', targetHours: 24, clientId: '', enabled: true });
  const [savingSla, setSavingSla] = useState(false);
  const [checkingBreaches, setCheckingBreaches] = useState(false);

  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRecoveryCodes, setTwoFactorRecoveryCodes] = useState<string[] | null>(null);
  const [twoFactorDisablePw, setTwoFactorDisablePw] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [user2faEnabled, setUser2faEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [orgData, usageData, prefs, ssoList, cfList, slaList] = await Promise.all([
          api.org.get(),
          api.org.getUsage(),
          api.notifications.getPreferences().catch(() => null),
          user?.role === Role.SUPER_ADMIN ? api.org.getSsoConfigs().catch(() => []) : Promise.resolve([]),
          user?.role === Role.SUPER_ADMIN ? api.customFields.listDefs().catch(() => []) : Promise.resolve([]),
          user?.role === Role.SUPER_ADMIN ? api.sla.listPolicies().catch(() => []) : Promise.resolve([]),
        ]);
        setOrg(orgData as any);
        setOrgName(orgData.name || '');
        setOrgLogo(orgData.logo || '');
        setOrgPrimaryColor(orgData.primaryColor || '#06b6d4');
        setOrgAccentColor(orgData.accentColor || '#6366f1');
        setUsage(usageData as any);
        if (prefs) setNotifPrefs(prefs as any);
        if (Array.isArray(ssoList)) setSsoConfigs(ssoList as SsoConfigItem[]);
        if (Array.isArray(cfList)) setCustomFieldDefs(cfList as CustomFieldDefItem[]);
        if (Array.isArray(slaList)) setSlaPolicies(slaList as SlaPolicyItem[]);
        if (user) setUser2faEnabled((user as any).twoFactorEnabled ?? false);
      } catch (e) {
        console.error('Failed to load org/usage', e);
      }
    };
    load();
  }, [user?.role, user?.id]);

  const handleSaveOrg = async () => {
    if (!org) return;
    setSavingOrg(true);
    try {
      await api.org.update({ name: orgName, logo: orgLogo || undefined, primaryColor: orgPrimaryColor, accentColor: orgAccentColor });
      setOrg({ ...org, name: orgName, logo: orgLogo || null, primaryColor: orgPrimaryColor, accentColor: orgAccentColor });
      toast.success('Organization updated');
    } catch (e) {
      toast.error('Failed to update');
    } finally {
      setSavingOrg(false);
    }
  };

  const handleThemeChange = (next: 'dark' | 'light') => {
    setTheme(next);
    localStorage.setItem('arena360_theme', next);
    document.documentElement.classList.toggle('theme-light', next === 'light');
    toast.success(next === 'light' ? 'Light theme applied' : 'Dark theme applied');
  };

  const handle2faStart = async () => {
    setTwoFactorLoading(true);
    try {
      const res = await api.auth.setup2fa();
      setTwoFactorSetup({ secret: (res as any).secret, otpauthUrl: (res as any).otpauthUrl });
      setTwoFactorCode('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start 2FA setup');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handle2faVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode.trim() || twoFactorCode.length !== 6) return;
    setTwoFactorLoading(true);
    try {
      const res = await api.auth.verify2faSetup(twoFactorCode.trim());
      setTwoFactorRecoveryCodes((res as any).recoveryCodes || []);
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      setUser2faEnabled(true);
      toast.success('2FA enabled');
    } catch (e: any) {
      toast.error(e?.message || 'Invalid code');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handle2faDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorDisablePw) return;
    setTwoFactorLoading(true);
    try {
      await api.auth.disable2fa(twoFactorDisablePw);
      setUser2faEnabled(false);
      setTwoFactorDisablePw('');
      toast.success('2FA disabled');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to disable');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const openSsoModal = (item?: SsoConfigItem) => {
    if (item) {
      setSsoEditing(item);
      setSsoForm({
        provider: (item.provider === 'SAML' ? 'SAML' : 'GOOGLE') as 'GOOGLE' | 'SAML',
        name: item.name,
        clientId: item.clientId || '',
        clientSecret: '',
        enabled: item.enabled,
        entryPoint: item.entryPoint || '',
        issuer: item.issuer || '',
        cert: item.cert || '',
      });
    } else {
      setSsoEditing(null);
      setSsoForm({ provider: 'GOOGLE', name: '', clientId: '', clientSecret: '', enabled: true, entryPoint: '', issuer: '', cert: '' });
    }
    setSsoModalOpen(true);
  };

  const handleSaveSso = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSso(true);
    try {
      if (ssoEditing) {
        await api.org.updateSsoConfig(ssoEditing.id, {
          name: ssoForm.name,
          clientId: ssoForm.provider === 'GOOGLE' ? (ssoForm.clientId || undefined) : undefined,
          clientSecret: ssoForm.provider === 'GOOGLE' ? (ssoForm.clientSecret || undefined) : undefined,
          enabled: ssoForm.enabled,
          entryPoint: ssoForm.provider === 'SAML' ? (ssoForm.entryPoint || undefined) : undefined,
          issuer: ssoForm.provider === 'SAML' ? (ssoForm.issuer || undefined) : undefined,
          cert: ssoForm.provider === 'SAML' ? (ssoForm.cert || undefined) : undefined,
        });
        toast.success('SSO config updated');
      } else {
        await api.org.createSsoConfig({
          provider: ssoForm.provider,
          name: ssoForm.name,
          clientId: ssoForm.provider === 'GOOGLE' ? (ssoForm.clientId || undefined) : undefined,
          clientSecret: ssoForm.provider === 'GOOGLE' ? (ssoForm.clientSecret || undefined) : undefined,
          enabled: ssoForm.enabled,
          entryPoint: ssoForm.provider === 'SAML' ? (ssoForm.entryPoint || undefined) : undefined,
          issuer: ssoForm.provider === 'SAML' ? (ssoForm.issuer || undefined) : undefined,
          cert: ssoForm.provider === 'SAML' ? (ssoForm.cert || undefined) : undefined,
        });
        toast.success('SSO config added');
      }
      setSsoModalOpen(false);
      const list = await api.org.getSsoConfigs();
      setSsoConfigs(list as SsoConfigItem[]);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSavingSso(false);
    }
  };

  const handleDeleteSso = async (id: string) => {
    if (!confirm('Delete this SSO configuration?')) return;
    try {
      await api.org.deleteSsoConfig(id);
      toast.success('Deleted');
      setSsoConfigs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const openCfModal = (item?: CustomFieldDefItem) => {
    if (item) {
      setCfEditing(item);
      const opts = (item as any).options;
      setCfForm({
        entityType: item.entityType as 'PROJECT' | 'TASK' | 'CLIENT',
        key: item.key,
        label: item.label,
        fieldType: item.fieldType,
        optionsStr: Array.isArray(opts) ? opts.join('\n') : '',
        required: item.required,
      });
    } else {
      setCfEditing(null);
      setCfForm({ entityType: cfEntityFilter, key: '', label: '', fieldType: 'TEXT', optionsStr: '', required: false });
    }
    setCfModalOpen(true);
  };

  const handleSaveCf = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCf(true);
    try {
      const options = cfForm.fieldType === 'SELECT' && cfForm.optionsStr
        ? cfForm.optionsStr.split(/\n/).map((s) => s.trim()).filter(Boolean)
        : undefined;
      if (cfEditing) {
        await api.customFields.updateDef(cfEditing.id, {
          label: cfForm.label,
          fieldType: cfForm.fieldType,
          options,
          required: cfForm.required,
        });
        toast.success('Custom field updated');
      } else {
        await api.customFields.createDef({
          entityType: cfForm.entityType,
          key: cfForm.key,
          label: cfForm.label,
          fieldType: cfForm.fieldType,
          options,
          required: cfForm.required,
        });
        toast.success('Custom field added');
      }
      setCfModalOpen(false);
      const list = await api.customFields.listDefs();
      setCustomFieldDefs(list as CustomFieldDefItem[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSavingCf(false);
    }
  };

  const handleDeleteCf = async (id: string) => {
    if (!confirm('Delete this custom field? Values will be removed.')) return;
    try {
      await api.customFields.deleteDef(id);
      toast.success('Deleted');
      setCustomFieldDefs((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const openSlaModal = (item?: SlaPolicyItem) => {
    if (item) {
      setSlaEditing(item);
      setSlaForm({ name: item.name, entityType: item.entityType as any, targetHours: item.targetHours, clientId: item.clientId || '', enabled: item.enabled });
    } else {
      setSlaEditing(null);
      setSlaForm({ name: '', entityType: slaEntityFilter, targetHours: 24, clientId: '', enabled: true });
    }
    setSlaModalOpen(true);
  };

  const handleSaveSla = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSla(true);
    try {
      if (slaEditing) {
        await api.sla.updatePolicy(slaEditing.id, {
          name: slaForm.name,
          targetHours: slaForm.targetHours,
          clientId: slaForm.clientId || undefined,
          enabled: slaForm.enabled,
        });
        toast.success('SLA policy updated');
      } else {
        await api.sla.createPolicy({
          name: slaForm.name,
          entityType: slaForm.entityType,
          targetHours: slaForm.targetHours,
          clientId: slaForm.clientId || undefined,
          enabled: slaForm.enabled,
        });
        toast.success('SLA policy added');
      }
      setSlaModalOpen(false);
      const list = await api.sla.listPolicies();
      setSlaPolicies(list as SlaPolicyItem[]);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSavingSla(false);
    }
  };

  const handleDeleteSla = async (id: string) => {
    if (!confirm('Delete this SLA policy? Trackers will be removed.')) return;
    try {
      await api.sla.deletePolicy(id);
      toast.success('Deleted');
      setSlaPolicies((prev) => prev.filter((p) => p.id !== id));
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleCheckBreaches = async () => {
    setCheckingBreaches(true);
    try {
      const res = await api.sla.checkBreaches();
      toast.success(res?.checked ? `Checked ${res.checked} breached SLAs` : 'No breaches found');
    } catch (e) {
      toast.error('Failed to check breaches');
    } finally {
      setCheckingBreaches(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold font-display text-white">{t('settings')}</h1>
        <p className="text-slate-400">System configuration and preferences.</p>
      </div>

      {org && user?.role === Role.SUPER_ADMIN && (
        <GlassCard title="Organization" className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-500" />
          <div className="flex-1 space-y-4">
            <div>
              <Label>Organization name</Label>
              <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} className="mt-1 max-w-md" placeholder="Company name" />
            </div>
            <div>
              <Label>Logo URL (optional)</Label>
              <Input value={orgLogo} onChange={(e) => setOrgLogo(e.target.value)} className="mt-1 max-w-md" placeholder="https://..." />
            </div>
            <div className="flex gap-4 flex-wrap">
              <div>
                <Label>Primary color</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={orgPrimaryColor} onChange={(e) => setOrgPrimaryColor(e.target.value)} className="w-10 h-10 rounded border border-slate-600 cursor-pointer" />
                  <Input value={orgPrimaryColor} onChange={(e) => setOrgPrimaryColor(e.target.value)} className="max-w-[120px]" />
                </div>
              </div>
              <div>
                <Label>Accent color</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={orgAccentColor} onChange={(e) => setOrgAccentColor(e.target.value)} className="w-10 h-10 rounded border border-slate-600 cursor-pointer" />
                  <Input value={orgAccentColor} onChange={(e) => setOrgAccentColor(e.target.value)} className="max-w-[120px]" />
                </div>
              </div>
            </div>
            {usage && (
              <div className="flex flex-wrap gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <span className="text-slate-400 text-sm"><BarChart3 className="w-4 h-4 inline mr-1" /> Users: <strong className="text-slate-200">{usage.users}</strong> / {org.maxUsers}</span>
                <span className="text-slate-400 text-sm">Projects: <strong className="text-slate-200">{usage.projects}</strong> / {org.maxProjects}</span>
                <span className="text-slate-400 text-sm">Storage: <strong className="text-slate-200">{usage.storageUsedMB} MB</strong> / {org.maxStorageMB} MB</span>
                <span className="text-slate-500 text-sm">Plan: <strong>{org.plan}</strong></span>
              </div>
            )}
            <Button onClick={handleSaveOrg} disabled={savingOrg}>Save</Button>
          </div>
        </GlassCard>
      )}

      {user?.role === Role.SUPER_ADMIN && (
        <GlassCard title="SSO / Single Sign-On" className="flex items-center gap-2">
          <Key className="w-5 h-5 text-cyan-500" />
          <div className="flex-1 space-y-4">
            <p className="text-slate-400 text-sm">Configure Google OAuth or SAML SSO. Use organization slug on the login page (?org=slug) to show SSO options.</p>
            {org?.slug && (
              <p className="text-slate-500 text-xs">Login URL: <code className="bg-slate-800 px-1 rounded">?org={org.slug}</code> then &quot;Sign in with Google&quot; or &quot;Sign in with SSO&quot;</p>
            )}
            <div className="space-y-2">
              {ssoConfigs.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <div>
                    <span className="font-medium text-white">{c.name}</span>
                    <span className="ml-2 text-slate-500 text-sm">{c.provider}</span>
                    {c.provider === 'GOOGLE' && c.clientId && <span className="ml-2 text-slate-600 text-xs">Client ID: {c.clientId.slice(0, 12)}…</span>}
                    {c.provider === 'SAML' && c.entryPoint && <span className="ml-2 text-slate-600 text-xs">Entry: {c.entryPoint.slice(0, 30)}…</span>}
                    {!c.enabled && <span className="ml-2 text-amber-400 text-xs">Disabled</span>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openSsoModal(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => handleDeleteSso(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {ssoConfigs.length === 0 && <p className="text-slate-500 text-sm">No SSO configurations.</p>}
            </div>
            <Button variant="outline" onClick={() => openSsoModal()}>
              <Plus className="w-4 h-4 mr-2" /> Add SSO (Google / SAML)
            </Button>
            <Modal isOpen={ssoModalOpen} onClose={() => setSsoModalOpen(false)} title={ssoEditing ? 'Edit SSO config' : 'Add SSO (Google or SAML)'}>
              <form onSubmit={handleSaveSso} className="space-y-4">
                <div>
                  <Label>Provider</Label>
                  <select
                    value={ssoForm.provider}
                    onChange={(e) => setSsoForm((f) => ({ ...f, provider: e.target.value as 'GOOGLE' | 'SAML' }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    disabled={!!ssoEditing}
                  >
                    <option value="GOOGLE">Google OAuth</option>
                    <option value="SAML">SAML (Okta, Entra ID, etc.)</option>
                  </select>
                </div>
                <div>
                  <Label>Display name</Label>
                  <Input value={ssoForm.name} onChange={(e) => setSsoForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Google Workspace / Acme SAML" required />
                </div>
                {ssoForm.provider === 'GOOGLE' && (
                  <>
                    <div>
                      <Label>Client ID</Label>
                      <Input value={ssoForm.clientId} onChange={(e) => setSsoForm((f) => ({ ...f, clientId: e.target.value }))} placeholder="Google OAuth Client ID" />
                    </div>
                    <div>
                      <Label>Client Secret {ssoEditing && <span className="text-slate-500 text-xs">(leave blank to keep current)</span>}</Label>
                      <Input type="password" value={ssoForm.clientSecret} onChange={(e) => setSsoForm((f) => ({ ...f, clientSecret: e.target.value }))} placeholder="Google OAuth Client Secret" />
                    </div>
                  </>
                )}
                {ssoForm.provider === 'SAML' && (
                  <>
                    <div>
                      <Label>IdP Entry point URL</Label>
                      <Input value={ssoForm.entryPoint} onChange={(e) => setSsoForm((f) => ({ ...f, entryPoint: e.target.value }))} placeholder="https://idp.example.com/sso" />
                    </div>
                    <div>
                      <Label>Issuer / Entity ID</Label>
                      <Input value={ssoForm.issuer} onChange={(e) => setSsoForm((f) => ({ ...f, issuer: e.target.value }))} placeholder="Arena360 or your SP entity ID" />
                    </div>
                    <div>
                      <Label>IdP certificate (PEM)</Label>
                      <textarea
                        value={ssoForm.cert}
                        onChange={(e) => setSsoForm((f) => ({ ...f, cert: e.target.value }))}
                        placeholder="-----BEGIN CERTIFICATE-----..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono min-h-[100px]"
                        rows={4}
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="sso-enabled" checked={ssoForm.enabled} onChange={(e) => setSsoForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded border-slate-600" />
                  <Label htmlFor="sso-enabled">Enabled</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setSsoModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingSso}>{savingSso ? 'Saving…' : 'Save'}</Button>
                </div>
              </form>
            </Modal>
          </div>
        </GlassCard>
      )}

      {user?.role === Role.SUPER_ADMIN && (
        <GlassCard title="Custom field definitions" className="flex items-center gap-2">
          <List className="w-5 h-5 text-cyan-500" />
          <div className="flex-1 space-y-4">
            <p className="text-slate-400 text-sm">Define custom fields for Projects, Tasks, and Clients. They appear in detail views.</p>
            <div className="flex gap-2 items-center">
              <span className="text-slate-500 text-sm">Entity:</span>
              <select value={cfEntityFilter} onChange={(e) => setCfEntityFilter(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
                <option value="PROJECT">Project</option>
                <option value="TASK">Task</option>
                <option value="CLIENT">Client</option>
              </select>
            </div>
            <div className="space-y-2">
              {customFieldDefs.filter((d) => d.entityType === cfEntityFilter).map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <span className="font-medium text-white">{d.label}</span>
                  <span className="text-slate-500 text-sm">{d.key} · {d.fieldType}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openCfModal(d)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => handleDeleteCf(d.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {customFieldDefs.filter((d) => d.entityType === cfEntityFilter).length === 0 && <p className="text-slate-500 text-sm">No custom fields for this entity.</p>}
            </div>
            <Button variant="outline" onClick={() => openCfModal()}>
              <Plus className="w-4 h-4 mr-2" /> Add custom field
            </Button>
            <Modal isOpen={cfModalOpen} onClose={() => setCfModalOpen(false)} title={cfEditing ? 'Edit custom field' : 'Add custom field'}>
              <form onSubmit={handleSaveCf} className="space-y-4">
                <div>
                  <Label>Entity type</Label>
                  <select value={cfForm.entityType} onChange={(e) => setCfForm((f) => ({ ...f, entityType: e.target.value as any }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" disabled={!!cfEditing}>
                    <option value="PROJECT">Project</option>
                    <option value="TASK">Task</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
                <div>
                  <Label>Key (e.g. region)</Label>
                  <Input value={cfForm.key} onChange={(e) => setCfForm((f) => ({ ...f, key: e.target.value }))} placeholder="region" required disabled={!!cfEditing} className="mt-1" />
                </div>
                <div>
                  <Label>Label</Label>
                  <Input value={cfForm.label} onChange={(e) => setCfForm((f) => ({ ...f, label: e.target.value }))} placeholder="Region" required className="mt-1" />
                </div>
                <div>
                  <Label>Field type</Label>
                  <select value={cfForm.fieldType} onChange={(e) => setCfForm((f) => ({ ...f, fieldType: e.target.value }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white">
                    <option value="TEXT">Text</option>
                    <option value="NUMBER">Number</option>
                    <option value="DATE">Date</option>
                    <option value="SELECT">Select</option>
                    <option value="CHECKBOX">Checkbox</option>
                  </select>
                </div>
                {cfForm.fieldType === 'SELECT' && (
                  <div>
                    <Label>Options (one per line)</Label>
                    <textarea value={cfForm.optionsStr} onChange={(e) => setCfForm((f) => ({ ...f, optionsStr: e.target.value }))} rows={4} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white" placeholder="Option A\nOption B" />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="cf-required" checked={cfForm.required} onChange={(e) => setCfForm((f) => ({ ...f, required: e.target.checked }))} className="rounded border-slate-600" />
                  <Label htmlFor="cf-required">Required</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCfModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingCf}>{savingCf ? 'Saving…' : 'Save'}</Button>
                </div>
              </form>
            </Modal>
          </div>
        </GlassCard>
      )}

      {user?.role === Role.SUPER_ADMIN && (
        <GlassCard title="SLA policies" className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-500" />
          <div className="flex-1 space-y-4">
            <p className="text-slate-400 text-sm">Define response/resolution SLAs for tasks, findings, and invoices. Breach check notifies OPS/Admins.</p>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-slate-500 text-sm">Entity:</span>
              <select value={slaEntityFilter} onChange={(e) => setSlaEntityFilter(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white">
                <option value="TASK">Task</option>
                <option value="FINDING">Finding</option>
                <option value="INVOICE">Invoice</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleCheckBreaches} disabled={checkingBreaches}>{checkingBreaches ? 'Checking…' : 'Check breaches'}</Button>
            </div>
            <div className="space-y-2">
              {slaPolicies.filter((p) => p.entityType === slaEntityFilter).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                  <span className="font-medium text-white">{p.name}</span>
                  <span className="text-slate-500 text-sm">{p.targetHours}h {!p.enabled && <span className="text-amber-400">Disabled</span>}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openSlaModal(p)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => handleDeleteSla(p.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
              {slaPolicies.filter((p) => p.entityType === slaEntityFilter).length === 0 && <p className="text-slate-500 text-sm">No SLA policies for this entity.</p>}
            </div>
            <Button variant="outline" onClick={() => openSlaModal()}>
              <Plus className="w-4 h-4 mr-2" /> Add SLA policy
            </Button>
            <Modal isOpen={slaModalOpen} onClose={() => setSlaModalOpen(false)} title={slaEditing ? 'Edit SLA policy' : 'Add SLA policy'}>
              <form onSubmit={handleSaveSla} className="space-y-4">
                <div>
                  <Label>Name</Label>
                  <Input value={slaForm.name} onChange={(e) => setSlaForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Task response 24h" required className="mt-1" />
                </div>
                <div>
                  <Label>Entity type</Label>
                  <select value={slaForm.entityType} onChange={(e) => setSlaForm((f) => ({ ...f, entityType: e.target.value as any }))} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white" disabled={!!slaEditing}>
                    <option value="TASK">Task</option>
                    <option value="FINDING">Finding</option>
                    <option value="INVOICE">Invoice</option>
                  </select>
                </div>
                <div>
                  <Label>Target (hours)</Label>
                  <Input type="number" min={1} value={slaForm.targetHours} onChange={(e) => setSlaForm((f) => ({ ...f, targetHours: parseInt(e.target.value, 10) || 24 }))} className="mt-1" />
                </div>
                <div>
                  <Label>Client ID (optional — leave blank for all)</Label>
                  <Input value={slaForm.clientId} onChange={(e) => setSlaForm((f) => ({ ...f, clientId: e.target.value }))} placeholder="cuid" className="mt-1" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="sla-enabled" checked={slaForm.enabled} onChange={(e) => setSlaForm((f) => ({ ...f, enabled: e.target.checked }))} className="rounded border-slate-600" />
                  <Label htmlFor="sla-enabled">Enabled</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setSlaModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={savingSla}>{savingSla ? 'Saving…' : 'Save'}</Button>
                </div>
              </form>
            </Modal>
          </div>
        </GlassCard>
      )}

      <GlassCard title="Appearance">
        <div className="space-y-2">
          <Label>Theme</Label>
          <div className="flex gap-2">
            <button type="button" onClick={() => handleThemeChange('dark')} className={`px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-slate-700 border-cyan-500 text-white' : 'border-slate-600 text-slate-400 hover:border-slate-500'}`}>Dark</button>
            <button type="button" onClick={() => handleThemeChange('light')} className={`px-4 py-2 rounded-lg border ${theme === 'light' ? 'bg-slate-200 border-cyan-500 text-slate-900' : 'border-slate-400 text-slate-500 hover:border-slate-500'}`}>Light</button>
          </div>
        </div>
      </GlassCard>

      <GlassCard title="Two-factor authentication" className="flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-cyan-500" />
        <div className="flex-1 space-y-4">
          {user2faEnabled ? (
            <>
              <p className="text-slate-400 text-sm">2FA is enabled. Use your authenticator app or a recovery code when signing in.</p>
              <form onSubmit={handle2faDisable} className="flex gap-2 items-end">
                <div className="flex-1 max-w-xs">
                  <Label>Password to disable 2FA</Label>
                  <Input type="password" value={twoFactorDisablePw} onChange={(e) => setTwoFactorDisablePw(e.target.value)} placeholder="Your password" className="mt-1" />
                </div>
                <Button type="submit" variant="outline" disabled={twoFactorLoading || !twoFactorDisablePw}>Disable 2FA</Button>
              </form>
            </>
          ) : twoFactorSetup ? (
            <form onSubmit={handle2faVerifySetup} className="space-y-4">
              <p className="text-slate-400 text-sm">Add this account to your authenticator app (Google Authenticator, Authy, etc.) using the secret below or scan a QR code from the link.</p>
              <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 font-mono text-sm break-all text-slate-300">{twoFactorSetup.secret}</div>
              <p className="text-slate-500 text-xs">
                <a href={twoFactorSetup.otpauthUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Open otpauth URL</a> (some apps can generate QR from this)
              </p>
              <div>
                <Label>Enter 6-digit code from app</Label>
                <Input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="mt-1 max-w-[120px]" maxLength={6} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={twoFactorLoading || twoFactorCode.length !== 6}>Verify and enable</Button>
                <Button type="button" variant="ghost" onClick={() => setTwoFactorSetup(null)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <>
              <p className="text-slate-400 text-sm">Add an extra layer of security by requiring a code from your phone when signing in.</p>
              <Button onClick={handle2faStart} disabled={twoFactorLoading}>Enable 2FA</Button>
            </>
          )}
          <Modal isOpen={twoFactorRecoveryCodes != null} onClose={() => setTwoFactorRecoveryCodes(null)} title="Recovery codes">
            {twoFactorRecoveryCodes && (
              <>
                <p className="text-slate-400 text-sm mb-2">Save these codes in a safe place. Each can be used once if you lose access to your authenticator.</p>
                <div className="font-mono text-sm bg-slate-800/50 p-3 rounded-lg space-y-1">
                  {twoFactorRecoveryCodes.map((c, i) => <div key={i}>{c}</div>)}
                </div>
                <Button className="mt-4" onClick={() => setTwoFactorRecoveryCodes(null)}>Done</Button>
              </>
            )}
          </Modal>
        </div>
      </GlassCard>

      <GlassCard title="Profile">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-2xl text-slate-400">
            <User />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">{user?.name}</h3>
            <div className="flex items-center gap-2">
              <p className="text-slate-400">{user?.email}</p>
              <div className="flex items-center gap-1.5 bg-slate-800/50 px-2 py-0.5 rounded border border-slate-700/50">
                <code className="text-[10px] text-slate-500 font-mono">{user?.id}</code>
                <CopyButton value={user?.id || ''} className="scale-75 origin-left" />
              </div>
            </div>
            <p className="text-cyan-500 text-sm mt-1">{user?.role}</p>
          </div>
        </div>
      </GlassCard>


      <div className="grid md:grid-cols-2 gap-6">
        <GlassCard title="Notifications">
          <div className="space-y-4">
            {notifPrefs && (
              <>
                {[
                  { key: 'emailTasks' as const, label: 'Email: Task assignments' },
                  { key: 'emailFindings' as const, label: 'Email: Finding assignments' },
                  { key: 'emailInvoices' as const, label: 'Email: Invoice / overdue' },
                  { key: 'inApp' as const, label: 'In-app notifications' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between p-2 rounded hover:bg-slate-800/30">
                    <span className="text-slate-300">{label}</span>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs(prev => prev ? { ...prev, [key]: !prev[key] } : prev)}
                      className={`w-10 h-5 rounded-full border relative transition-colors ${notifPrefs[key] ? 'bg-cyan-600 border-cyan-500' : 'bg-slate-700 border-slate-600'}`}
                    >
                      <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all ${notifPrefs[key] ? 'right-1 bg-white' : 'left-1 bg-slate-400'}`} />
                    </button>
                  </div>
                ))}
                <Button
                  onClick={async () => {
                    if (!notifPrefs) return;
                    setSavingNotif(true);
                    try {
                      await api.notifications.updatePreferences(notifPrefs);
                      toast.success('Preferences saved');
                    } catch (e) {
                      toast.error('Failed to save');
                    } finally {
                      setSavingNotif(false);
                    }
                  }}
                  disabled={savingNotif}
                >
                  Save preferences
                </Button>
              </>
            )}
            {!notifPrefs && <p className="text-slate-500 text-sm">Loading...</p>}
          </div>
        </GlassCard>

        <GlassCard title="Security">
          <div className="space-y-4">
            <Button variant="secondary" className="w-full justify-between">
              Change Password <Shield className="w-4 h-4 text-slate-400" />
            </Button>
            <Button variant="secondary" className="w-full justify-between">
              Two-Factor Auth <span className="text-emerald-400 text-xs">Enabled</span>
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default Settings;
