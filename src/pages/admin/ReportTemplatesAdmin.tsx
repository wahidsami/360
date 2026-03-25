import React from 'react';
import { NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bot,
  CheckCircle2,
  Eye,
  FileText,
  Languages,
  Plus,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  CopyButton,
  GlassCard,
  Input,
  Label,
  Modal,
  Select,
  TextArea,
} from '@/components/ui/UIComponents';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';
import {
  Client,
  ClientReportTemplateAssignment,
  ReportBuilderTemplate,
  ReportBuilderTemplateCategory,
  ReportBuilderTemplateVersion,
  Role,
} from '@/types';

type JsonDraftState = {
  schemaJson: string;
  pdfConfigJson: string;
  aiConfigJson: string;
  taxonomyJson: string;
};

const TEMPLATE_CATEGORIES: ReportBuilderTemplateCategory[] = [
  'ACCESSIBILITY',
  'SECURITY',
  'QA',
  'PERFORMANCE',
  'COMPLIANCE',
  'OTHER',
];

const buildAccessibilityVersionDraft = (): JsonDraftState => ({
  schemaJson: JSON.stringify(
    {
      locale: {
        primary: 'ar',
        secondary: 'en',
        direction: 'rtl',
      },
      entryFields: [
        { key: 'serviceName', label: 'اسم الخدمة', labelEn: 'Service Name', type: 'text', required: true },
        { key: 'issueTitle', label: 'عنوان المشكلة', labelEn: 'Issue Title', type: 'text', required: true },
        { key: 'issueDescription', label: 'وصف المشكلة', labelEn: 'Issue Description', type: 'textarea', required: true },
        {
          key: 'severity',
          label: 'أهمية المشكلة',
          labelEn: 'Severity',
          type: 'select',
          required: true,
          options: [
            { value: 'HIGH', label: 'عالية', labelEn: 'High' },
            { value: 'MEDIUM', label: 'متوسطة', labelEn: 'Medium' },
            { value: 'LOW', label: 'منخفضة', labelEn: 'Low' },
          ],
        },
        {
          key: 'category',
          label: 'التصنيف',
          labelEn: 'Category',
          type: 'select',
          required: true,
          source: 'accessibilityCategories',
        },
        {
          key: 'subcategory',
          label: 'التصنيف الفرعي',
          labelEn: 'Subcategory',
          type: 'dependent_select',
          required: true,
          dependsOn: 'category',
          source: 'accessibilitySubcategories',
        },
        { key: 'pageUrl', label: 'رابط الصفحة', labelEn: 'Page URL', type: 'url' },
        { key: 'evidence', label: 'صورة / فيديو توضيحي', labelEn: 'Evidence', type: 'media_upload', multiple: true },
        { key: 'recommendation', label: 'التوصيات', labelEn: 'Recommendation', type: 'textarea' },
      ],
      tableColumns: [
        'id',
        'serviceName',
        'issueTitle',
        'severity',
        'issueDescription',
        'category',
        'subcategory',
        'evidence',
        'recommendation',
      ],
    },
    null,
    2,
  ),
  pdfConfigJson: JSON.stringify(
    {
      locale: 'ar',
      direction: 'rtl',
      page: {
        size: 'A4',
        orientation: 'landscape',
      },
      cover: {
        showClientLogo: true,
        titleKey: 'accessibility_report',
        subtitleKey: 'project_accessibility_audit',
      },
      table: {
        repeatHeader: true,
        evidenceMode: 'thumbnail_or_link',
        urlLabelAr: 'اضغط هنا',
        urlLabelEn: 'Click here',
      },
    },
    null,
    2,
  ),
  aiConfigJson: JSON.stringify(
    {
      enabled: true,
      sections: {
        intro: true,
        executiveSummary: true,
        recommendationSummary: true,
      },
      prompts: {
        introStyle: 'formal_accessibility_audit_arabic',
        recommendationTone: 'practical_and_client_ready',
      },
    },
    null,
    2,
  ),
  taxonomyJson: JSON.stringify(
    {
      accessibilityCategories: [
        { value: 'visual', label: 'مرئي', labelEn: 'Visual' },
        { value: 'keyboard', label: 'لوحة المفاتيح', labelEn: 'Keyboard' },
        { value: 'screen_reader', label: 'قارئ الشاشة', labelEn: 'Screen Reader' },
        { value: 'forms', label: 'النماذج', labelEn: 'Forms' },
      ],
      accessibilitySubcategories: {
        visual: [
          { value: 'contrast', label: 'التباين', labelEn: 'Contrast' },
          { value: 'text_resize', label: 'تكبير النص', labelEn: 'Text Resize' },
        ],
        keyboard: [
          { value: 'focus_order', label: 'ترتيب التنقل', labelEn: 'Focus Order' },
          { value: 'keyboard_trap', label: 'مصيدة لوحة المفاتيح', labelEn: 'Keyboard Trap' },
        ],
        screen_reader: [
          { value: 'aria_labels', label: 'تسميات ARIA', labelEn: 'ARIA Labels' },
          { value: 'semantic_structure', label: 'البنية الدلالية', labelEn: 'Semantic Structure' },
        ],
        forms: [
          { value: 'field_labels', label: 'تسميات الحقول', labelEn: 'Field Labels' },
          { value: 'validation_messages', label: 'رسائل التحقق', labelEn: 'Validation Messages' },
        ],
      },
    },
    null,
    2,
  ),
});

const prettyDate = (value?: string | null) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleString();
};

const parseJsonInput = (label: string, value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
};

const sortVersions = (versions: ReportBuilderTemplateVersion[]) =>
  [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

const getTemplateStatusBadge = (status: string) => {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ARCHIVED') return 'warning';
  return 'neutral';
};

const getAssignmentBadge = (isActive: boolean) => (isActive ? 'success' : 'warning');

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
  const [templateForm, setTemplateForm] = React.useState({
    name: '',
    code: 'accessibility-audit',
    description: 'Arabic-first accessibility report template for project-based audits.',
    category: 'ACCESSIBILITY' as ReportBuilderTemplateCategory,
  });
  const [versionDraft, setVersionDraft] = React.useState<JsonDraftState>(buildAccessibilityVersionDraft());
  const [assignmentForm, setAssignmentForm] = React.useState({
    templateVersionId: '',
    isDefault: true,
    isActive: true,
  });

  const selectedTemplate = React.useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const sortedVersions = React.useMemo(
    () => (selectedTemplate ? sortVersions(selectedTemplate.versions) : []),
    [selectedTemplate],
  );

  const previewVersion = React.useMemo(
    () => sortedVersions.find((version) => version.id === previewVersionId) ?? sortedVersions[0] ?? null,
    [previewVersionId, sortedVersions],
  );

  const filteredAssignments = React.useMemo(
    () =>
      clientAssignments.filter((assignment) =>
        selectedTemplate ? assignment.templateId === selectedTemplate.id : true,
      ),
    [clientAssignments, selectedTemplate],
  );

  const previewFields = Array.isArray((previewVersion?.schemaJson as any)?.entryFields)
    ? ((previewVersion?.schemaJson as any)?.entryFields as Array<Record<string, any>>)
    : [];

  const previewColumns = Array.isArray((previewVersion?.schemaJson as any)?.tableColumns)
    ? ((previewVersion?.schemaJson as any)?.tableColumns as string[])
    : [];

  const loadTemplates = React.useCallback(async (preferredTemplateId?: string) => {
    const data = await api.reportBuilderAdmin.listTemplates();
    setTemplates(data);

    const nextTemplateId =
      preferredTemplateId && data.some((template) => template.id === preferredTemplateId)
        ? preferredTemplateId
        : data[0]?.id ?? '';
    setSelectedTemplateId(nextTemplateId);

    const nextTemplate = data.find((template) => template.id === nextTemplateId);
    const nextVersionId = sortVersions(nextTemplate?.versions ?? [])[0]?.id ?? '';
    setPreviewVersionId(nextVersionId);
    setAssignmentForm((current) => ({
      ...current,
      templateVersionId: current.templateVersionId || nextVersionId,
    }));
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
        const [templateData, clientData] = await Promise.all([
          api.reportBuilderAdmin.listTemplates(),
          api.clients.list(),
        ]);

        setTemplates(templateData);
        setClients(clientData);

        const firstTemplateId = templateData[0]?.id ?? '';
        const firstVersionId = sortVersions(templateData[0]?.versions ?? [])[0]?.id ?? '';
        const firstClientId = clientData[0]?.id ?? '';

        setSelectedTemplateId(firstTemplateId);
        setPreviewVersionId(firstVersionId);
        setSelectedClientId(firstClientId);
        setAssignmentForm((current) => ({
          ...current,
          templateVersionId: firstVersionId,
        }));

        if (firstClientId) {
          const assignments = await api.reportBuilderAdmin.listClientAssignments(firstClientId);
          setClientAssignments(assignments);
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load report template administration.');
      } finally {
        setIsLoading(false);
      }
    };

    bootstrap();
  }, []);

  React.useEffect(() => {
    if (!selectedTemplate) return;
    const latestVersionId = sortedVersions[0]?.id ?? '';
    setPreviewVersionId((current) =>
      current && sortedVersions.some((version) => version.id === current) ? current : latestVersionId,
    );
    setAssignmentForm((current) => ({
      ...current,
      templateVersionId:
        current.templateVersionId && sortedVersions.some((version) => version.id === current.templateVersionId)
          ? current.templateVersionId
          : latestVersionId,
    }));
  }, [selectedTemplate, sortedVersions]);

  React.useEffect(() => {
    loadAssignments(selectedClientId).catch((error) => {
      console.error(error);
      toast.error('Failed to load client assignments.');
    });
  }, [loadAssignments, selectedClientId]);

  if (user?.role !== Role.SUPER_ADMIN) {
    return (
      <GlassCard className="max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Report Template Administration</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          This area is restricted to `SUPER_ADMIN`. Template publishing and client assignment stay centralized here so
          report structures remain controlled across clients.
        </p>
      </GlassCard>
    );
  }

  const handleCreateTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await api.reportBuilderAdmin.createTemplate(templateForm);
      await loadTemplates(created.id);
      setTemplateModalOpen(false);
      toast.success('Report template created.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create report template.');
    }
  };

  const handleCreateVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedTemplate) return;

    try {
      await api.reportBuilderAdmin.createTemplateVersion(selectedTemplate.id, {
        schemaJson: parseJsonInput('Schema JSON', versionDraft.schemaJson),
        pdfConfigJson: parseJsonInput('PDF config JSON', versionDraft.pdfConfigJson),
        aiConfigJson: parseJsonInput('AI config JSON', versionDraft.aiConfigJson),
        taxonomyJson: parseJsonInput('Taxonomy JSON', versionDraft.taxonomyJson),
      });
      await loadTemplates(selectedTemplate.id);
      setVersionModalOpen(false);
      toast.success('Template version drafted.');
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Failed to create template version.');
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

  const handleToggleAssignment = async (
    assignment: ClientReportTemplateAssignment,
    payload: { isDefault?: boolean; isActive?: boolean },
  ) => {
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
          <h1 className="text-3xl font-bold font-display text-slate-900 dark:text-white">
            Admin / Report Templates
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage Arabic-first accessibility templates, publish immutable versions, and assign them to clients.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <NavLink to="/app/admin/users">
            <Button variant="outline" size="sm">Users</Button>
          </NavLink>
          <NavLink to="/app/admin/roles">
            <Button variant="outline" size="sm">Roles</Button>
          </NavLink>
          <Button size="sm" onClick={() => setTemplateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <GlassCard>
          <p className="text-sm text-slate-600 dark:text-slate-400">Loading report builder administration...</p>
        </GlassCard>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6">
            <GlassCard className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Templates</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Master definitions and recent versions.</p>
                </div>
              </div>

              <div className="space-y-3">
                {templates.map((template) => {
                  const isSelected = template.id === selectedTemplateId;
                  const latestVersion = sortVersions(template.versions)[0];

                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(template.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? 'border-cyan-400/60 bg-cyan-50 dark:bg-cyan-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-cyan-300/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{template.name}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.code}</p>
                        </div>
                        <Badge variant={getTemplateStatusBadge(template.status) as any}>{template.status}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <Badge variant="info">{template.category}</Badge>
                        <Badge variant="neutral">v{latestVersion?.versionNumber ?? 0}</Badge>
                        <Badge variant="neutral">{template._count?.assignments ?? 0} assignments</Badge>
                      </div>
                    </button>
                  );
                })}

                {templates.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No templates yet. Create the first accessibility template to start the new flow.
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
          <div className="space-y-6">
            {selectedTemplate ? (
              <>
                <GlassCard>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTemplate.name}</h2>
                        <Badge variant={getTemplateStatusBadge(selectedTemplate.status) as any}>
                          {selectedTemplate.status}
                        </Badge>
                        <Badge variant="info">{selectedTemplate.category}</Badge>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {selectedTemplate.description || 'No description yet.'}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono">Template ID: {selectedTemplate.id}</span>
                        <CopyButton value={selectedTemplate.id} />
                        <span>Updated {prettyDate(selectedTemplate.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setVersionModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Draft Version
                      </Button>
                    </div>
                  </div>
                </GlassCard>

                <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_420px]">
                  <div className="space-y-6">
                    <GlassCard>
                      <div className="mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-cyan-500" />
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Versions</h3>
                      </div>
                      <div className="space-y-3">
                        {sortedVersions.map((version) => (
                          <div
                            key={version.id}
                            className={`rounded-2xl border p-4 ${
                              previewVersion?.id === version.id
                                ? 'border-cyan-400/60 bg-cyan-50 dark:bg-cyan-500/10'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewVersionId(version.id)}
                                    className="font-semibold text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400"
                                  >
                                    Version {version.versionNumber}
                                  </button>
                                  {version.isPublished ? (
                                    <Badge variant="success">Published</Badge>
                                  ) : (
                                    <Badge variant="neutral">Draft</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span>Created {prettyDate(version.createdAt)}</span>
                                  <span>Published {prettyDate(version.publishedAt)}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setPreviewVersionId(version.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Preview
                                </Button>
                                {!version.isPublished && (
                                  <Button size="sm" onClick={() => handlePublishVersion(version.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Publish
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {sortedVersions.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No versions yet. Draft the first accessibility schema to continue.
                          </p>
                        )}
                      </div>
                    </GlassCard>

                    {previewVersion && (
                      <>
                        <GlassCard>
                          <div className="mb-4 flex items-center gap-2">
                            <Eye className="h-5 w-5 text-cyan-500" />
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Schema Preview</h3>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <Languages className="h-4 w-4 text-cyan-500" />
                                Language Direction
                              </div>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                {String((previewVersion.schemaJson as any)?.locale?.primary || 'ar').toUpperCase()} /{' '}
                                {String((previewVersion.schemaJson as any)?.locale?.direction || 'rtl').toUpperCase()}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <Settings2 className="h-4 w-4 text-cyan-500" />
                                Entry Fields
                              </div>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{previewFields.length} fields configured</p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                                <Sparkles className="h-4 w-4 text-cyan-500" />
                                Table Columns
                              </div>
                              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{previewColumns.length} columns rendered</p>
                            </div>
                          </div>

                          <div className="mt-6 grid gap-4 xl:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Entry Field Definitions</h4>
                              <div className="mt-3 space-y-3">
                                {previewFields.map((field) => (
                                  <div key={String(field.key)} className="rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium text-slate-900 dark:text-white">{field.label || field.key}</p>
                                      <Badge variant="neutral">{field.type || 'text'}</Badge>
                                      {field.required ? <Badge variant="warning">Required</Badge> : null}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      Key: {field.key}
                                      {field.labelEn ? ` • EN: ${field.labelEn}` : ''}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Table Column Order</h4>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {previewColumns.map((column) => (
                                  <Badge key={column} variant="info">
                                    {column}
                                  </Badge>
                                ))}
                              </div>
                              <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 text-xs text-slate-600 dark:text-slate-400">
                                This preview is reading the exact stored schema version, so published reports remain stable even when newer versions are drafted later.
                              </div>
                            </div>
                          </div>
                        </GlassCard>

                        <div className="grid gap-6 xl:grid-cols-2">
                          <GlassCard>
                            <div className="mb-4 flex items-center gap-2">
                              <Settings2 className="h-5 w-5 text-cyan-500" />
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">PDF Config Preview</h3>
                            </div>
                            <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                              {JSON.stringify(previewVersion.pdfConfigJson ?? {}, null, 2)}
                            </pre>
                          </GlassCard>

                          <GlassCard>
                            <div className="mb-4 flex items-center gap-2">
                              <Bot className="h-5 w-5 text-cyan-500" />
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">AI Config Preview</h3>
                            </div>
                            <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                              {JSON.stringify(previewVersion.aiConfigJson ?? {}, null, 2)}
                            </pre>
                          </GlassCard>
                        </div>
                      </>
                    )}
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
                          <Select
                            value={selectedClientId}
                            onChange={(event) => setSelectedClientId(event.target.value)}
                          >
                            <option value="">Select client</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <Label>Published Version</Label>
                          <Select
                            value={assignmentForm.templateVersionId}
                            onChange={(event) =>
                              setAssignmentForm((current) => ({
                                ...current,
                                templateVersionId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select version</option>
                            {sortedVersions.map((version) => (
                              <option key={version.id} value={version.id} disabled={!version.isPublished}>
                                v{version.versionNumber} {version.isPublished ? '(Published)' : '(Draft)'}
                              </option>
                            ))}
                          </Select>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={assignmentForm.isDefault}
                              onChange={(event) =>
                                setAssignmentForm((current) => ({
                                  ...current,
                                  isDefault: event.target.checked,
                                }))
                              }
                            />
                            Make default for this client
                          </label>
                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={assignmentForm.isActive}
                              onChange={(event) =>
                                setAssignmentForm((current) => ({
                                  ...current,
                                  isActive: event.target.checked,
                                }))
                              }
                            />
                            Keep assignment active
                          </label>
                        </div>

                        <Button type="submit" className="w-full" disabled={!selectedClientId || !assignmentForm.templateVersionId}>
                          Assign Template
                        </Button>
                      </form>
                    </GlassCard>

                    <GlassCard>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Assignments for Client</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {clients.find((client) => client.id === selectedClientId)?.name || 'Select a client to inspect assignments.'}
                          </p>
                        </div>
                        <Badge variant="neutral">{filteredAssignments.length} linked</Badge>
                      </div>

                      <div className="space-y-3">
                        {filteredAssignments.map((assignment) => (
                          <div key={assignment.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-white">
                                {assignment.template.name} / v{assignment.templateVersion.versionNumber}
                              </p>
                              <Badge variant={getAssignmentBadge(assignment.isActive) as any}>
                                {assignment.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {assignment.isDefault ? <Badge variant="info">Default</Badge> : null}
                            </div>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Assigned {prettyDate(assignment.assignedAt)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleToggleAssignment(assignment, { isActive: !assignment.isActive })
                                }
                              >
                                {assignment.isActive ? 'Disable' : 'Enable'}
                              </Button>
                              {!assignment.isDefault && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleAssignment(assignment, { isDefault: true })}
                                >
                                  Mark Default
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {selectedClientId && filteredAssignments.length === 0 && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            No assignments for this template on the selected client yet.
                          </p>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                </div>
              </>
            ) : (
              <GlassCard>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Create a template to start the report builder administration flow.
                </p>
              </GlassCard>
            )}
          </div>
        </div>
      )}

      <Modal isOpen={templateModalOpen} onClose={() => setTemplateModalOpen(false)} title="Create Report Template" maxWidth="max-w-2xl">
        <form className="space-y-4" onSubmit={handleCreateTemplate}>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Template name"
              value={templateForm.name}
              onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Accessibility Audit"
              required
            />
            <Input
              label="Template code"
              value={templateForm.code}
              onChange={(event) => setTemplateForm((current) => ({ ...current, code: event.target.value }))}
              placeholder="accessibility-audit"
              required
            />
          </div>
          <TextArea
            label="Description"
            value={templateForm.description}
            onChange={(event) => setTemplateForm((current) => ({ ...current, description: event.target.value }))}
          />
          <Select
            label="Category"
            value={templateForm.category}
            onChange={(event) =>
              setTemplateForm((current) => ({
                ...current,
                category: event.target.value as ReportBuilderTemplateCategory,
              }))
            }
          >
            {TEMPLATE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 text-sm text-slate-600 dark:text-slate-400">
            This creates the master template only. Schema, PDF configuration, AI behavior, and taxonomy live in immutable template versions.
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTemplateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Template</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        title="Draft Template Version"
        maxWidth="max-w-5xl"
      >
        <form className="space-y-4" onSubmit={handleCreateVersion}>
          <div className="rounded-2xl border border-cyan-200/60 dark:border-cyan-500/20 bg-cyan-50 dark:bg-cyan-500/5 p-4 text-sm text-slate-700 dark:text-slate-300">
            This draft is preloaded for the Arabic accessibility use case: RTL layout, bilingual labels, category/subcategory taxonomy, and AI summary toggles.
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <TextArea
              label="Schema JSON"
              value={versionDraft.schemaJson}
              onChange={(event) =>
                setVersionDraft((current) => ({ ...current, schemaJson: event.target.value }))
              }
              className="min-h-[360px] font-mono text-xs"
            />
            <TextArea
              label="Taxonomy JSON"
              value={versionDraft.taxonomyJson}
              onChange={(event) =>
                setVersionDraft((current) => ({ ...current, taxonomyJson: event.target.value }))
              }
              className="min-h-[360px] font-mono text-xs"
            />
            <TextArea
              label="PDF Config JSON"
              value={versionDraft.pdfConfigJson}
              onChange={(event) =>
                setVersionDraft((current) => ({ ...current, pdfConfigJson: event.target.value }))
              }
              className="min-h-[280px] font-mono text-xs"
            />
            <TextArea
              label="AI Config JSON"
              value={versionDraft.aiConfigJson}
              onChange={(event) =>
                setVersionDraft((current) => ({ ...current, aiConfigJson: event.target.value }))
              }
              className="min-h-[280px] font-mono text-xs"
            />
          </div>

          <div className="flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVersionDraft(buildAccessibilityVersionDraft())}
            >
              Reset Accessibility Draft
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setVersionModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Version</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ReportTemplatesAdmin;
