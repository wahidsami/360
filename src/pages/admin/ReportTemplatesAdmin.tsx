import React from 'react';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Eye, FileText, Plus, Sparkles, Users } from 'lucide-react';
import { Badge, Button, GlassCard, Input, Label, Modal, Select, TextArea } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import { ACCESSIBILITY_AUDIT_CATEGORIES, ACCESSIBILITY_AUDIT_MAIN_CATEGORIES } from '@/features/accessibility/accessibilityAuditConfig';
import { Client, ClientReportTemplateAssignment, ReportBuilderTemplate, ReportBuilderTemplateVersion, Role } from '@/types';

const FIXED_ENTRY_FIELDS = [
  'Service Name / Module',
  'Issue Title',
  'Issue Description',
  'Severity',
  'Main Category',
  'Subcategory',
  'Page URL',
  'Evidence Media',
  'Remediation Steps',
];

const buildAccessibilityVersionPayload = () => ({
  schemaJson: {
    locale: { primary: 'en', secondary: 'ar', direction: 'ltr' },
    entryFields: [
      { key: 'serviceName', label: 'Service Name / Module', type: 'text', required: true },
      { key: 'issueTitle', label: 'Issue Title', type: 'text', required: true },
      { key: 'issueDescription', label: 'Issue Description', type: 'textarea', required: true },
      {
        key: 'severity',
        label: 'Severity',
        type: 'select',
        required: true,
        options: [
          { value: 'HIGH', label: 'High' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'LOW', label: 'Low' },
        ],
      },
      { key: 'category', label: 'Main Category', type: 'select', required: true, source: 'accessibilityCategories' },
      { key: 'subcategory', label: 'Subcategory', type: 'dependent_select', required: true, dependsOn: 'category', source: 'accessibilitySubcategories' },
      { key: 'pageUrl', label: 'Page URL', type: 'url', required: true },
      { key: 'evidence', label: 'Evidence Media', type: 'media_upload', multiple: true },
      { key: 'recommendation', label: 'Remediation Steps', type: 'textarea', required: true },
    ],
    tableColumns: ['serviceName', 'issueTitle', 'severity', 'category', 'subcategory', 'pageUrl', 'evidence'],
  },
  pdfConfigJson: {
    locale: 'en',
    alternateLocale: 'ar',
    direction: 'ltr',
    page: { size: 'A4', orientation: 'landscape' },
    cover: { showClientLogo: true, showAuditorName: true, showReportDate: true },
    table: { repeatHeader: true, urlLabelEn: 'Click Here', mediaLabelImageEn: 'View Image', mediaLabelVideoEn: 'View Video' },
  },
  aiConfigJson: {
    enabled: true,
    sections: { intro: true, statistics: true, recommendationSummary: true },
    prompts: { introStyle: 'formal_accessibility_audit', recommendationTone: 'practical_and_client_ready' },
  },
  taxonomyJson: {
    accessibilityCategories: ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.map((category) => ({ value: category, label: category })),
    accessibilitySubcategories: ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.reduce<Record<string, { value: string; label: string }[]>>((acc, category) => {
      acc[category] = ACCESSIBILITY_AUDIT_CATEGORIES[category].map((subcategory) => ({ value: subcategory, label: subcategory }));
      return acc;
    }, {}),
  },
});

const sortVersions = (versions: ReportBuilderTemplateVersion[]) => [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
const prettyDate = (value?: string | null) => (value ? new Date(value).toLocaleString() : 'Not set');

export const ReportTemplatesAdmin: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState<ReportBuilderTemplate[]>([]);
  const [clients, setClients] = React.useState<Client[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('');
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [previewVersionId, setPreviewVersionId] = React.useState('');
  const [clientAssignments, setClientAssignments] = React.useState<ClientReportTemplateAssignment[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = React.useState(false);
  const [versionModalOpen, setVersionModalOpen] = React.useState(false);
  const [samplePreviewOpen, setSamplePreviewOpen] = React.useState(false);
  const [samplePreviewHtml, setSamplePreviewHtml] = React.useState('');
  const [samplePreviewLoadingId, setSamplePreviewLoadingId] = React.useState('');
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    code: 'accessibility-audit',
    description: 'Fixed accessibility audit template for project-level reports.',
  });
  const [assignmentForm, setAssignmentForm] = React.useState({
    templateVersionId: '',
    isDefault: true,
    isActive: true,
  });

  const selectedTemplate = React.useMemo(() => templates.find((template) => template.id === selectedTemplateId) ?? null, [templates, selectedTemplateId]);
  const sortedVersions = React.useMemo(() => (selectedTemplate ? sortVersions(selectedTemplate.versions) : []), [selectedTemplate]);
  const publishedVersions = React.useMemo(() => sortedVersions.filter((version) => version.isPublished), [sortedVersions]);
  const previewVersion = React.useMemo(() => sortedVersions.find((version) => version.id === previewVersionId) ?? sortedVersions[0] ?? null, [previewVersionId, sortedVersions]);
  const filteredAssignments = React.useMemo(() => clientAssignments.filter((assignment) => (selectedTemplate ? assignment.templateId === selectedTemplate.id : true)), [clientAssignments, selectedTemplate]);

  const loadTemplates = React.useCallback(async (preferredTemplateId?: string) => {
    const data = await api.reportBuilderAdmin.listTemplates();
    setTemplates(data);
    const nextTemplateId = preferredTemplateId && data.some((template) => template.id === preferredTemplateId) ? preferredTemplateId : data[0]?.id ?? '';
    setSelectedTemplateId(nextTemplateId);
    const nextTemplate = data.find((template) => template.id === nextTemplateId);
    const nextVersionId = sortVersions(nextTemplate?.versions ?? [])[0]?.id ?? '';
    const nextPublishedVersionId = sortVersions(nextTemplate?.versions ?? []).find((version) => version.isPublished)?.id ?? '';
    setPreviewVersionId(nextVersionId);
    setAssignmentForm((current) => ({ ...current, templateVersionId: nextPublishedVersionId || current.templateVersionId }));
  }, []);

  const loadAssignments = React.useCallback(async (clientId: string) => {
    if (!clientId) {
      setClientAssignments([]);
      return;
    }
    const assignments = await api.reportBuilderAdmin.listClientAssignments(clientId);
    setClientAssignments(assignments);
  }, []);

  React.useEffect(() => {
    const bootstrap = async () => {
      try {
        const [templateData, clientData] = await Promise.all([api.reportBuilderAdmin.listTemplates(), api.clients.list()]);
        setTemplates(templateData);
        setClients(clientData);
        const firstTemplateId = templateData[0]?.id ?? '';
        const firstVersionId = sortVersions(templateData[0]?.versions ?? [])[0]?.id ?? '';
        const firstPublishedVersionId = sortVersions(templateData[0]?.versions ?? []).find((version) => version.isPublished)?.id ?? '';
        const firstClientId = clientData[0]?.id ?? '';
        setSelectedTemplateId(firstTemplateId);
        setPreviewVersionId(firstVersionId);
        setSelectedClientId(firstClientId);
        setAssignmentForm((current) => ({ ...current, templateVersionId: firstPublishedVersionId }));
        if (firstClientId) {
          const assignments = await api.reportBuilderAdmin.listClientAssignments(firstClientId);
          setClientAssignments(assignments);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load accessibility template administration.');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  React.useEffect(() => {
    if (!selectedTemplate) return;
    const latestVersionId = sortedVersions[0]?.id ?? '';
    const latestPublishedVersionId = sortedVersions.find((version) => version.isPublished)?.id ?? '';
    setPreviewVersionId((current) => (current && sortedVersions.some((version) => version.id === current) ? current : latestVersionId));
    setAssignmentForm((current) => ({
      ...current,
      templateVersionId: current.templateVersionId && publishedVersions.some((version) => version.id === current.templateVersionId) ? current.templateVersionId : latestPublishedVersionId,
    }));
  }, [publishedVersions, selectedTemplate, sortedVersions]);

  React.useEffect(() => {
    loadAssignments(selectedClientId).catch((error) => {
      console.error(error);
      toast.error('Failed to load client assignments.');
    });
  }, [loadAssignments, selectedClientId]);

  if (user?.role !== Role.SUPER_ADMIN) {
    return (
      <GlassCard className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accessibility Templates</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          This area is restricted to <code>SUPER_ADMIN</code>. Template publishing and client assignment stay centralized here.
        </p>
      </GlassCard>
    );
  }

  const handleCreateTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await api.reportBuilderAdmin.createTemplate({
        ...templateForm,
        category: 'ACCESSIBILITY',
      });
      await loadTemplates(created.id);
      setTemplateModalOpen(false);
      toast.success('Accessibility template created.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create accessibility template.');
    }
  };

  const handleCreateVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;
    try {
      await api.reportBuilderAdmin.createTemplateVersion(selectedTemplate.id, buildAccessibilityVersionPayload());
      await loadTemplates(selectedTemplate.id);
      setVersionModalOpen(false);
      toast.success('Template version drafted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create template version.');
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!selectedTemplate) return;
    try {
      await api.reportBuilderAdmin.publishTemplateVersion(selectedTemplate.id, versionId);
      await loadTemplates(selectedTemplate.id);
      toast.success('Template version published.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to publish template version.');
    }
  };

  const handleOpenSamplePreview = async (versionId: string) => {
    if (!selectedTemplate) return;
    setSamplePreviewLoadingId(versionId);
    try {
      const html = await api.reportBuilderAdmin.getTemplateVersionSamplePreview(selectedTemplate.id, versionId);
      setPreviewVersionId(versionId);
      setSamplePreviewHtml(html);
      setSamplePreviewOpen(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load rendered sample preview.');
    } finally {
      setSamplePreviewLoadingId('');
    }
  };

  const handleAssignTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate || !selectedClientId || !assignmentForm.templateVersionId) return;
    try {
      await api.reportBuilderAdmin.createClientAssignment(selectedClientId, {
        templateId: selectedTemplate.id,
        templateVersionId: assignmentForm.templateVersionId,
        isDefault: assignmentForm.isDefault,
        isActive: assignmentForm.isActive,
      });
      await loadAssignments(selectedClientId);
      toast.success('Template assigned to client.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign template.');
    }
  };

  const handleToggleAssignment = async (assignment: ClientReportTemplateAssignment, payload: { isDefault?: boolean; isActive?: boolean }) => {
    try {
      await api.reportBuilderAdmin.updateClientAssignment(assignment.id, payload);
      await loadAssignments(selectedClientId);
      toast.success('Assignment updated.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update assignment.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Admin / Accessibility Templates</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Create fixed accessibility templates, publish immutable versions, preview the exported layout, and assign them to clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink to="/app/admin/users"><Button variant="outline" size="sm">Users</Button></NavLink>
          <NavLink to="/app/admin/roles"><Button variant="outline" size="sm">Roles</Button></NavLink>
          <Button size="sm" onClick={() => setTemplateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Accessibility Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <GlassCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading accessibility template administration...</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <GlassCard className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Fixed accessibility templates and their latest versions.</p>
            </div>
            <div className="space-y-3">
              {templates.map((template) => {
                const isSelected = template.id === selectedTemplateId;
                const latestVersion = sortVersions(template.versions)[0];
                return (
                  <button key={template.id} type="button" onClick={() => setSelectedTemplateId(template.id)} className={`w-full rounded-2xl border p-4 text-left transition-all ${isSelected ? 'border-cyan-400/60 bg-cyan-50 dark:bg-cyan-500/10' : 'border-slate-200 bg-white hover:border-cyan-300/50 dark:border-slate-800 dark:bg-slate-900/70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{template.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.code}</p>
                      </div>
                      <Badge variant={template.status === 'ACTIVE' ? 'success' : template.status === 'ARCHIVED' ? 'warning' : 'neutral'}>{template.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <Badge variant="info">ACCESSIBILITY</Badge>
                      <Badge variant="neutral">v{latestVersion?.versionNumber ?? 0}</Badge>
                      <Badge variant="neutral">{template._count?.assignments ?? 0} assignments</Badge>
                    </div>
                  </button>
                );
              })}
              {templates.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  No templates yet. Create the first accessibility template to start the flow.
                </div>
              )}
            </div>
          </GlassCard>

          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <GlassCard>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                        <Badge variant={selectedTemplate.status === 'ACTIVE' ? 'success' : selectedTemplate.status === 'ARCHIVED' ? 'warning' : 'neutral'}>{selectedTemplate.status}</Badge>
                        <Badge variant="info">Accessibility</Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{selectedTemplate.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setVersionModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Version
                      </Button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Finding Fields</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{FIXED_ENTRY_FIELDS.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Main Categories</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Published Versions</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{publishedVersions.length}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Client Assignments</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{selectedTemplate._count?.assignments ?? 0}</p>
                    </div>
                  </div>
                </GlassCard>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
                  <div className="space-y-6">
                    <GlassCard>
                      <div className="mb-4 flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Version Library</h3>
                      </div>
                      <div className="space-y-4">
                        {sortedVersions.map((version) => (
                          <div key={version.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Version {version.versionNumber}</h4>
                                  <Badge variant={version.isPublished ? 'success' : 'neutral'}>{version.isPublished ? 'Published' : 'Draft'}</Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Created {prettyDate(version.createdAt)} / Published {prettyDate(version.publishedAt)}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenSamplePreview(version.id)} disabled={samplePreviewLoadingId === version.id}>
                                  <Eye className="mr-2 h-4 w-4" /> {samplePreviewLoadingId === version.id ? 'Loading...' : 'Preview'}
                                </Button>
                                {!version.isPublished && (
                                  <Button size="sm" onClick={() => handlePublishVersion(version.id)}>
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    <GlassCard>
                      <div className="mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Fixed Accessibility Definition</h3>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Included Finding Fields</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {FIXED_ENTRY_FIELDS.map((field) => <Badge key={field} variant="info">{field}</Badge>)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                            <Sparkles className="h-4 w-4 text-cyan-500" /> Export and AI Behavior
                          </div>
                          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li>Landscape PDF export</li>
                            <li>Cover page, AI introduction, statistics, findings table, recommendations summary, and closing page</li>
                            <li>AI used only for summaries, not for finding logic</li>
                            <li>Static categories and subcategories from product definition</li>
                          </ul>
                        </div>
                      </div>
                    </GlassCard>
                  </div>

                  <div className="space-y-6">
                    <GlassCard>
                      <div className="mb-4 flex items-center gap-2">
                        <Users className="h-5 w-5 text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Client Assignment</h3>
                      </div>
                      <form className="space-y-4" onSubmit={handleAssignTemplate}>
                        <div>
                          <Label>Client</Label>
                          <Select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)}>
                            <option value="">Select client</option>
                            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                          </Select>
                        </div>
                        <div>
                          <Label>Published Version</Label>
                          <Select value={assignmentForm.templateVersionId} disabled={publishedVersions.length === 0} onChange={(event) => setAssignmentForm((current) => ({ ...current, templateVersionId: event.target.value }))}>
                            <option value="">{publishedVersions.length === 0 ? 'No published version yet' : 'Select version'}</option>
                            {publishedVersions.map((version) => <option key={version.id} value={version.id}>v{version.versionNumber} (Published)</option>)}
                          </Select>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            <input type="checkbox" checked={assignmentForm.isDefault} onChange={(event) => setAssignmentForm((current) => ({ ...current, isDefault: event.target.checked }))} />
                            Make default
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
                            <input type="checkbox" checked={assignmentForm.isActive} onChange={(event) => setAssignmentForm((current) => ({ ...current, isActive: event.target.checked }))} />
                            Keep active
                          </label>
                        </div>
                        <Button type="submit" className="w-full" disabled={!selectedClientId || !assignmentForm.templateVersionId}>Assign Template</Button>
                      </form>
                    </GlassCard>

                    <GlassCard>
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assignments for Client</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{clients.find((client) => client.id === selectedClientId)?.name || 'Select a client to inspect assignments.'}</p>
                      </div>
                      <div className="space-y-3">
                        {filteredAssignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-white">{assignment.template.name} / v{assignment.templateVersion.versionNumber}</p>
                              <Badge variant={assignment.isActive ? 'success' : 'warning'}>{assignment.isActive ? 'Active' : 'Inactive'}</Badge>
                              {assignment.isDefault && <Badge variant="info">Default</Badge>}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Assigned {prettyDate(assignment.assignedAt)}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleToggleAssignment(assignment, { isActive: !assignment.isActive })}>{assignment.isActive ? 'Disable' : 'Enable'}</Button>
                              {!assignment.isDefault && <Button type="button" variant="outline" size="sm" onClick={() => handleToggleAssignment(assignment, { isDefault: true })}>Mark Default</Button>}
                            </div>
                          </div>
                        ))}
                        {selectedClientId && filteredAssignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No assignments for this template on the selected client yet.</p>}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </>
            ) : (
              <GlassCard>
                <p className="text-sm text-slate-600 dark:text-slate-400">Create an accessibility template to begin the simplified report flow.</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={samplePreviewOpen} onClose={() => setSamplePreviewOpen(false)} title="Template Export Preview" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-sm text-slate-600 dark:text-slate-300">
            This mock preview uses sample data from the selected template version so admin users can review the final export layout before assignment.
          </div>
          <iframe title="Template Export Preview" className="min-h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" srcDoc={samplePreviewHtml} />
        </div>
      </Modal>

      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create Accessibility Template" maxWidth="max-w-2xl">
        <form className="space-y-4" onSubmit={handleCreateTemplate}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Template name" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Accessibility Audit" required />
            <Input label="Template code" value={templateForm.code} onChange={(event) => setTemplateForm((current) => ({ ...current, code: event.target.value }))} placeholder="accessibility-audit" required />
          </div>
          <TextArea label="Description" value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            This creates the master accessibility template only. The fixed finding structure, export settings, AI behavior, and category taxonomy live in the template versions.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={versionModalOpen} onClose={() => setVersionModalOpen(false)} title="Create Accessibility Template Version" maxWidth="max-w-3xl">
        <form className="space-y-4" onSubmit={handleCreateVersion}>
          <div className="rounded-2xl border border-cyan-200/60 bg-cyan-50 p-4 text-sm text-slate-700 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:text-slate-300">
            This creates the fixed Accessibility Audit version defined by the product spec. Categories and subcategories stay static, and admins do not edit raw schema JSON here.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Included Finding Fields</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {FIXED_ENTRY_FIELDS.map((field) => <Badge key={field} variant="info">{field}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Main Categories</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.map((category) => <Badge key={category} variant="neutral">{category}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              Export includes cover page, AI introduction, AI statistics, findings table, recommendations summary, and closing page.
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              Findings support image/video evidence, exact page URL, and fixed HIGH / MEDIUM / LOW severity.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setVersionModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Version</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportTemplatesAdmin;
