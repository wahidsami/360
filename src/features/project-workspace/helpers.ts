import {
  ClientWorkspaceTemplateAssignment,
  ProjectWorkspaceConfig,
  ProjectWorkspaceConfigDraft,
  ProjectWorkspaceTemplate,
} from '@/types';
import { buildDefaultProjectWorkspaceConfigDraft, PROJECT_TABS_BY_ID } from './registry';

export interface WorkspaceTemplateOption {
  id: string;
  label: string;
  description: string;
  source: 'default' | 'assignment' | 'current' | 'standard';
  draft: ProjectWorkspaceConfigDraft;
  badges?: string[];
}

export interface WorkspaceTemplateDraftSummary {
  hiddenCount: number;
  readOnlyCount: number;
  interactiveCount: number;
  hiddenLabels: string[];
}

export function buildWorkspaceConfigDraftFromTemplate(
  template: Pick<ProjectWorkspaceTemplate, 'id' | 'audienceType' | 'definitionJson'>,
  assignedClientId?: string,
): ProjectWorkspaceConfigDraft {
  return {
    sourceTemplateId: template.id,
    assignedClientId,
    audienceType: template.audienceType,
    tabs: Array.isArray(template.definitionJson?.tabs) ? template.definitionJson.tabs : [],
    overviewSections: Array.isArray(template.definitionJson?.overviewSections)
      ? template.definitionJson.overviewSections
      : [],
  };
}

export function buildWorkspaceConfigDraftFromProjectConfig(
  config: ProjectWorkspaceConfig,
): ProjectWorkspaceConfigDraft {
  return {
    sourceTemplateId: config.sourceTemplateId || undefined,
    sourceTemplateVersion: config.sourceTemplateVersion || undefined,
    assignedClientId: config.assignedClientId || undefined,
    audienceType: config.audienceType,
    tabs: Array.isArray(config.tabsJson) ? config.tabsJson : [],
    overviewSections: Array.isArray(config.overviewSectionsJson) ? config.overviewSectionsJson : [],
  };
}

export function summarizeWorkspaceDraft(
  draft?: ProjectWorkspaceConfigDraft | null,
): WorkspaceTemplateDraftSummary {
  const tabs = draft?.tabs || [];

  return {
    hiddenCount: tabs.filter((tab) => tab.state === 'hidden').length,
    readOnlyCount: tabs.filter((tab) => tab.state === 'visible_read_only').length,
    interactiveCount: tabs.filter((tab) => tab.state === 'visible_interactive').length,
    hiddenLabels: tabs
      .filter((tab) => tab.state === 'hidden')
      .map((tab) => PROJECT_TABS_BY_ID[tab.tabId as keyof typeof PROJECT_TABS_BY_ID]?.label || tab.tabId),
  };
}

export function buildWorkspaceTemplateOptions(params: {
  clientId?: string;
  assignments?: ClientWorkspaceTemplateAssignment[];
  defaultDraft?: ProjectWorkspaceConfigDraft | null;
  currentConfig?: ProjectWorkspaceConfig | null;
}): WorkspaceTemplateOption[] {
  const { clientId, assignments = [], defaultDraft, currentConfig } = params;
  const options: WorkspaceTemplateOption[] = [];
  const activeAssignments = assignments.filter((assignment) => assignment.isActive);
  const defaultAssignment =
    activeAssignments.find((assignment) => assignment.isDefault) || activeAssignments[0] || null;

  if (currentConfig) {
    options.push({
      id: '__current__',
      label: 'Current project workspace',
      description: 'Keep the workspace currently saved on this project.',
      source: 'current',
      draft: buildWorkspaceConfigDraftFromProjectConfig(currentConfig),
      badges: ['Current'],
    });
  }

  if (defaultDraft) {
    options.push({
      id: '__default__',
      label: defaultAssignment?.template?.name || 'Client default workspace',
      description: defaultAssignment
        ? 'Use the client’s default assigned workspace template.'
        : 'Use the standard client workspace draft.',
      source: 'default',
      draft: {
        ...defaultDraft,
        assignedClientId: clientId || defaultDraft.assignedClientId,
      },
      badges: [defaultAssignment ? 'Client default' : 'Standard'],
    });
  }

  for (const assignment of activeAssignments) {
    if (defaultAssignment && assignment.id === defaultAssignment.id) continue;
    options.push({
      id: `assignment:${assignment.id}`,
      label: assignment.template.name,
      description: 'Assigned to this client and available at project level.',
      source: 'assignment',
      draft: buildWorkspaceConfigDraftFromTemplate(assignment.template as ProjectWorkspaceTemplate, clientId),
      badges: [assignment.isDefault ? 'Default' : 'Assigned'],
    });
  }

  if (options.length === 0) {
    options.push({
      id: '__standard__',
      label: 'Standard client workspace',
      description: 'Use the baseline workspace visibility defaults for a client project.',
      source: 'standard',
      draft: buildDefaultProjectWorkspaceConfigDraft(clientId),
      badges: ['Standard'],
    });
  }

  return options;
}
