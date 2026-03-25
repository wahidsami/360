import React from 'react';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Eye, FileText, Plus, Sparkles, Users } from 'lucide-react';
import { Badge, Button, GlassCard, Input, Label, Modal, Select, TextArea } from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  ACCESSIBILITY_AUDIT_MAIN_CATEGORIES,
  AccessibilityAuditOutputLocale,
  AccessibilityAuditTaxonomySelection,
  buildAccessibilityTaxonomyPayload,
  buildAccessibilityTaxonomySelection,
  countEnabledAccessibilityCategories,
  createDefaultAccessibilityTaxonomySelection,
  getAccessibilityOutputLocale,
} from '@/features/accessibility/accessibilityAuditConfig';
import { Client, ClientReportTemplateAssignment, ReportBuilderTemplate, ReportBuilderTemplateVersion, Role } from '@/types';

const ACCESSIBILITY_ENTRY_FIELD_DEFINITIONS = [
  { key: 'serviceName', labelEn: 'Service Name / Module', labelAr: 'اسم الخدمة / الوحدة', type: 'text', required: true },
  { key: 'issueTitle', labelEn: 'Issue Title', labelAr: 'عنوان المشكلة', type: 'text', required: true },
  { key: 'issueDescription', labelEn: 'Issue Description', labelAr: 'وصف المشكلة', type: 'textarea', required: true },
  { key: 'severity', labelEn: 'Severity', labelAr: 'الأهمية', type: 'select', required: true },
  { key: 'category', labelEn: 'Main Category', labelAr: 'التصنيف الرئيسي', type: 'select', required: true },
  { key: 'subcategory', labelEn: 'Subcategory', labelAr: 'التصنيف الفرعي', type: 'dependent_select', required: true },
  { key: 'pageUrl', labelEn: 'Page URL', labelAr: 'رابط الصفحة', type: 'url', required: true },
  { key: 'evidence', labelEn: 'Evidence Media', labelAr: 'الأدلة', type: 'media_upload', required: false },
  { key: 'recommendation', labelEn: 'Remediation Steps', labelAr: 'خطوات المعالجة', type: 'textarea', required: true },
] as const;

const FIXED_ENTRY_FIELDS = ACCESSIBILITY_ENTRY_FIELD_DEFINITIONS.map((field) => field.labelEn);

const buildAccessibilityVersionPayload = (
  locale: AccessibilityAuditOutputLocale,
  taxonomySelection: AccessibilityAuditTaxonomySelection,
) => ({
  schemaJson: {
    locale: {
      primary: locale,
      secondary: locale === 'en' ? 'ar' : 'en',
      direction: locale === 'ar' ? 'rtl' : 'ltr',
    },
    entryFields: [
      { key: 'serviceName', label: 'Service Name / Module', labelEn: 'Service Name / Module', labelAr: 'اسم الخدمة / الوحدة', type: 'text', required: true },
      { key: 'issueTitle', label: 'Issue Title', labelEn: 'Issue Title', labelAr: 'عنوان المشكلة', type: 'text', required: true },
      { key: 'issueDescription', label: 'Issue Description', labelEn: 'Issue Description', labelAr: 'وصف المشكلة', type: 'textarea', required: true },
      {
        key: 'severity',
        label: 'Severity',
        labelEn: 'Severity',
        labelAr: 'الأهمية',
        type: 'select',
        required: true,
        options: [
          { value: 'HIGH', label: 'High' },
          { value: 'MEDIUM', label: 'Medium' },
          { value: 'LOW', label: 'Low' },
        ],
      },
      { key: 'category', label: 'Main Category', labelEn: 'Main Category', labelAr: 'التصنيف الرئيسي', type: 'select', required: true, source: 'accessibilityCategories' },
      { key: 'subcategory', label: 'Subcategory', labelEn: 'Subcategory', labelAr: 'التصنيف الفرعي', type: 'dependent_select', required: true, dependsOn: 'category', source: 'accessibilitySubcategories' },
      { key: 'pageUrl', label: 'Page URL', labelEn: 'Page URL', labelAr: 'رابط الصفحة', type: 'url', required: true },
      { key: 'evidence', label: 'Evidence Media', labelEn: 'Evidence Media', labelAr: 'الأدلة', type: 'media_upload', multiple: true },
      { key: 'recommendation', label: 'Remediation Steps', labelEn: 'Remediation Steps', labelAr: 'خطوات المعالجة', type: 'textarea', required: true },
    ],
    tableColumns: ['serviceName', 'issueTitle', 'severity', 'category', 'subcategory', 'pageUrl', 'evidence'],
  },
  pdfConfigJson: {
    locale,
    alternateLocale: locale === 'en' ? 'ar' : 'en',
    direction: locale === 'ar' ? 'rtl' : 'ltr',
    page: { size: 'A4', orientation: 'landscape' },
    cover: { showClientLogo: true, showAuditorName: true, showReportDate: true },
    table: { repeatHeader: true, urlLabelEn: 'Click Here', mediaLabelImageEn: 'View Image', mediaLabelVideoEn: 'View Video' },
  },
  aiConfigJson: {
    enabled: true,
    sections: { intro: true, statistics: true, recommendationSummary: true },
    prompts: { introStyle: 'formal_accessibility_audit', recommendationTone: 'practical_and_client_ready' },
  },
  taxonomyJson: buildAccessibilityTaxonomyPayload(taxonomySelection),
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
  const [samplePreviewLocale, setSamplePreviewLocale] = React.useState<AccessibilityAuditOutputLocale>('en');
  const [templateForm, setTemplateForm] = React.useState({
    name: 'Accessibility Audit',
    code: 'accessibility-audit',
    description: 'Fixed accessibility audit tool for project-level reports.',
  });
  const [toolDetailsForm, setToolDetailsForm] = React.useState({
    name: 'Accessibility Audit',
    description: 'Fixed accessibility audit tool for project-level reports.',
  });
  const [versionLocale, setVersionLocale] = React.useState<AccessibilityAuditOutputLocale>('en');
  const [versionTaxonomySelection, setVersionTaxonomySelection] = React.useState<AccessibilityAuditTaxonomySelection>(
    () => createDefaultAccessibilityTaxonomySelection(),
  );
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
  const activeVersionTaxonomySelection = React.useMemo(
    () => buildAccessibilityTaxonomySelection(previewVersion?.taxonomyJson),
    [previewVersion?.taxonomyJson],
  );

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
        toast.error('Failed to load accessibility tool administration.');
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
    if (!selectedTemplate) return;
    setToolDetailsForm({
      name: selectedTemplate.name,
      description: selectedTemplate.description || '',
    });
  }, [selectedTemplate]);

  React.useEffect(() => {
    const sourceVersion = sortedVersions[0] ?? null;
    setVersionLocale(getAccessibilityOutputLocale(sourceVersion));
    setVersionTaxonomySelection(buildAccessibilityTaxonomySelection(sourceVersion?.taxonomyJson));
    setSamplePreviewLocale(getAccessibilityOutputLocale(previewVersion ?? sourceVersion));
  }, [previewVersion, sortedVersions]);

  React.useEffect(() => {
    loadAssignments(selectedClientId).catch((error) => {
      console.error(error);
      toast.error('Failed to load client assignments.');
    });
  }, [loadAssignments, selectedClientId]);

  if (user?.role !== Role.SUPER_ADMIN) {
    return (
      <GlassCard className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accessibility Tool</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          This area is restricted to <code>SUPER_ADMIN</code>. Tool version publishing and client assignment stay centralized here.
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
      toast.success('Accessibility tool created.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create accessibility tool.');
    }
  };

  const handleCreateVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;
    const taxonomyPayload = buildAccessibilityTaxonomyPayload(versionTaxonomySelection);
    if (taxonomyPayload.accessibilityCategories.length === 0) {
      toast.error('Enable at least one main category before creating a tool version.');
      return;
    }

    const hasEmptyCategory = taxonomyPayload.accessibilityCategories.some(
      (category) => (taxonomyPayload.accessibilitySubcategories[category.value] || []).length === 0,
    );

    if (hasEmptyCategory) {
      toast.error('Each enabled main category needs at least one enabled subcategory.');
      return;
    }

    try {
      await api.reportBuilderAdmin.createTemplateVersion(
        selectedTemplate.id,
        buildAccessibilityVersionPayload(versionLocale, versionTaxonomySelection),
      );
      await loadTemplates(selectedTemplate.id);
      setVersionModalOpen(false);
      toast.success('Tool version drafted.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create tool version.');
    }
  };

  const handlePublishVersion = async (versionId: string) => {
    if (!selectedTemplate) return;
    try {
      await api.reportBuilderAdmin.publishTemplateVersion(selectedTemplate.id, versionId);
      await loadTemplates(selectedTemplate.id);
      toast.success('Tool version published.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to publish tool version.');
    }
  };

  const handleOpenSamplePreview = async (versionId: string, locale: AccessibilityAuditOutputLocale = samplePreviewLocale) => {
    if (!selectedTemplate) return;
    setSamplePreviewLoadingId(versionId);
    try {
      const html = await api.reportBuilderAdmin.getTemplateVersionSamplePreview(
        selectedTemplate.id,
        versionId,
        locale,
      );
      setSamplePreviewLocale(locale);
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

  const handleUpdateToolDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    try {
      await api.reportBuilderAdmin.updateTemplate(selectedTemplate.id, {
        name: toolDetailsForm.name.trim(),
        description: toolDetailsForm.description.trim(),
      });
      await loadTemplates(selectedTemplate.id);
      toast.success('Accessibility tool details updated.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update accessibility tool details.');
    }
  };

  const toggleCategorySelection = (category: string, enabled: boolean) => {
    setVersionTaxonomySelection((current) => {
      const next = { ...current };
      next[category] = Object.fromEntries(
        Object.keys(current[category] || {}).map((subcategory) => [subcategory, enabled]),
      );
      return next;
    });
  };

  const toggleSubcategorySelection = (category: string, subcategory: string, enabled: boolean) => {
    setVersionTaxonomySelection((current) => ({
      ...current,
      [category]: {
        ...(current[category] || {}),
        [subcategory]: enabled,
      },
    }));
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
      toast.success('Accessibility tool assigned to client.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign accessibility tool.');
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
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Admin / Accessibility Tool</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage the fixed accessibility tool, publish immutable versions, preview the exported layout, and assign it to clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink to="/app/admin/users"><Button variant="outline" size="sm">Users</Button></NavLink>
          <NavLink to="/app/admin/roles"><Button variant="outline" size="sm">Roles</Button></NavLink>
          {templates.length === 0 && (
            <Button size="sm" onClick={() => setTemplateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Accessibility Tool
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <GlassCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading accessibility tool administration...</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <GlassCard className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Accessibility Tool</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">One fixed accessibility tool and its versions.</p>
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
                  No accessibility tool yet. Create it to start the audit flow.
                </div>
              )}
            </div>
          </GlassCard>

          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <GlassCard>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <form className="flex-1 space-y-4" onSubmit={handleUpdateToolDetails}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Tool Details</h2>
                        <Badge variant={selectedTemplate.status === 'ACTIVE' ? 'success' : selectedTemplate.status === 'ARCHIVED' ? 'warning' : 'neutral'}>{selectedTemplate.status}</Badge>
                        <Badge variant="info">Accessibility</Badge>
                      </div>
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                        <Input
                          label="Tool Name"
                          value={toolDetailsForm.name}
                          onChange={(event) => setToolDetailsForm((current) => ({ ...current, name: event.target.value }))}
                          required
                        />
                        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Internal Code</p>
                          <p className="mt-2 font-semibold text-slate-900 dark:text-white">{selectedTemplate.code}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Fixed internal key for the accessibility tool flow.</p>
                        </div>
                      </div>
                      <TextArea
                        label="Tool Description"
                        value={toolDetailsForm.description}
                        onChange={(event) => setToolDetailsForm((current) => ({ ...current, description: event.target.value }))}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" variant="outline">Save Tool Details</Button>
                      </div>
                    </form>
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
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Enabled Categories</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{countEnabledAccessibilityCategories(activeVersionTaxonomySelection)}</p>
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
                    <Button variant="outline" size="sm" onClick={() => handleOpenSamplePreview(version.id, samplePreviewLocale)} disabled={samplePreviewLoadingId === version.id}>
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
                        <Button type="submit" className="w-full" disabled={!selectedClientId || !assignmentForm.templateVersionId}>Assign Tool</Button>
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
                        {selectedClientId && filteredAssignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No assignments for this tool on the selected client yet.</p>}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </>
            ) : (
              <GlassCard>
                <p className="text-sm text-slate-600 dark:text-slate-400">Create the accessibility tool to begin the simplified audit flow.</p>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={samplePreviewOpen} onClose={() => setSamplePreviewOpen(false)} title="Accessibility Tool Preview" maxWidth="max-w-6xl">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This mock preview uses sample data from the selected tool version so admin users can review the final export layout before client assignment.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={samplePreviewLocale === 'en' ? 'primary' : 'outline'}
                onClick={() => {
                  setSamplePreviewLocale('en');
                  if (previewVersion) {
                    handleOpenSamplePreview(previewVersion.id, 'en');
                  }
                }}
              >
                English
              </Button>
              <Button
                type="button"
                size="sm"
                variant={samplePreviewLocale === 'ar' ? 'primary' : 'outline'}
                onClick={() => {
                  setSamplePreviewLocale('ar');
                  if (previewVersion) {
                    handleOpenSamplePreview(previewVersion.id, 'ar');
                  }
                }}
              >
                العربية
              </Button>
            </div>
          </div>
          <iframe title="Accessibility Tool Preview" className="min-h-[70vh] w-full rounded-xl border border-slate-200 bg-white dark:border-slate-800" srcDoc={samplePreviewHtml} />
        </div>
      </Modal>

      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create Accessibility Tool" maxWidth="max-w-2xl">
        <form className="space-y-4" onSubmit={handleCreateTemplate}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Tool name" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Accessibility Audit" required />
            <Input label="Tool code" value={templateForm.code} onChange={(event) => setTemplateForm((current) => ({ ...current, code: event.target.value }))} placeholder="accessibility-audit" required disabled />
          </div>
          <TextArea label="Description" value={templateForm.description} onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))} />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            This creates the master accessibility tool only. The fixed finding structure, export settings, AI behavior, and category taxonomy live in the tool versions.
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTemplateModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Tool</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={versionModalOpen} onClose={() => setVersionModalOpen(false)} title="Create Accessibility Tool Version" maxWidth="max-w-3xl">
        <form className="space-y-4" onSubmit={handleCreateVersion}>
          <div className="rounded-2xl border border-cyan-200/60 bg-cyan-50 p-4 text-sm text-slate-700 dark:border-cyan-500/20 dark:bg-cyan-500/5 dark:text-slate-300">
            This creates the fixed Accessibility Audit version defined by the product spec. You can set the default output language and decide which categories and subcategories stay available inside this tool version.
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Included Finding Fields</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {FIXED_ENTRY_FIELDS.map((field) => <Badge key={field} variant="info">{field}</Badge>)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <Label>Default Preview / Export Language</Label>
              <Select value={versionLocale} onChange={(event) => setVersionLocale(event.target.value as AccessibilityAuditOutputLocale)}>
                <option value="en">English / LTR</option>
                <option value="ar">Arabic / RTL</option>
              </Select>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Auditors can still switch preview language later, but this controls the default output for the tool version.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              Export includes cover page, AI introduction, AI statistics, findings table, recommendations summary, and closing page.
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
              Findings support image/video evidence, exact page URL, and fixed HIGH / MEDIUM / LOW severity.
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Category Availability</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Disable categories or subcategories to keep them out of this tool version without deleting them from the master library.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setVersionTaxonomySelection(createDefaultAccessibilityTaxonomySelection())}>
                  Include All
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {ACCESSIBILITY_AUDIT_MAIN_CATEGORIES.map((category) => {
                const categorySelection = versionTaxonomySelection[category] || {};
                const enabledCount = Object.values(categorySelection).filter(Boolean).length;
                const categoryEnabled = enabledCount > 0;

                return (
                  <div key={category} className={`rounded-2xl border p-4 ${categoryEnabled ? 'border-cyan-400/30 bg-cyan-500/5' : 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40'}`}>
                    <label className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{category}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{enabledCount} subcategories enabled</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={categoryEnabled}
                        onChange={(event) => toggleCategorySelection(category, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                    </label>

                    <div className="mt-3 grid gap-2">
                      {Object.keys(categorySelection).map((subcategory) => (
                        <label key={subcategory} className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${categorySelection[subcategory] ? 'border-cyan-400/30 bg-cyan-500/5 text-slate-800 dark:text-slate-100' : 'border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400'}`}>
                          <input
                            type="checkbox"
                            checked={categorySelection[subcategory]}
                            onChange={(event) => toggleSubcategorySelection(category, subcategory, event.target.checked)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>{subcategory}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
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
