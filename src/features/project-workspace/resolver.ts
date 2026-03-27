import {
  collectHiddenOverviewSections,
  ProjectTabDefinition,
  ProjectTabId,
  PROJECT_TAB_DEFINITIONS,
  PROJECT_TABS_BY_ID,
  resolveDependentTabs,
  validateWorkspaceDependencies,
  WorkspaceDependencyWarning,
  WorkspaceTabState,
} from './registry';

export interface WorkspaceTabConfigEntry {
  tabId: ProjectTabId;
  state: WorkspaceTabState;
  orderIndex?: number;
}

export interface ProjectWorkspaceRuntimeConfig {
  tabs?: WorkspaceTabConfigEntry[];
}

export interface ResolvedProjectWorkspace {
  visibleTabs: ProjectTabDefinition[];
  tabStates: Partial<Record<ProjectTabId, WorkspaceTabState>>;
  hiddenTabs: ProjectTabId[];
  autoHiddenTabs: ProjectTabId[];
  hiddenOverviewSections: ReturnType<typeof collectHiddenOverviewSections>;
  dependencyWarnings: WorkspaceDependencyWarning[];
}

interface ResolveProjectWorkspaceOptions {
  visibleTabIds: ProjectTabId[];
  readOnlyTabIds?: ProjectTabId[];
  workspaceConfig?: ProjectWorkspaceRuntimeConfig | null;
}

export function resolveProjectWorkspace({
  visibleTabIds,
  readOnlyTabIds = [],
  workspaceConfig,
}: ResolveProjectWorkspaceOptions): ResolvedProjectWorkspace {
  const visibleSet = new Set(visibleTabIds);
  const readOnlySet = new Set(readOnlyTabIds);
  const configTabs = workspaceConfig?.tabs || [];
  const configuredStates = new Map(configTabs.map((entry) => [entry.tabId, entry]));

  const tabStates: Partial<Record<ProjectTabId, WorkspaceTabState>> = {};

  for (const definition of PROJECT_TAB_DEFINITIONS) {
    if (!visibleSet.has(definition.id)) {
      tabStates[definition.id] = 'hidden';
      continue;
    }

    const configuredState = configuredStates.get(definition.id)?.state;
    let nextState: WorkspaceTabState = configuredState || (readOnlySet.has(definition.id) ? 'visible_read_only' : 'visible_interactive');

    if (readOnlySet.has(definition.id) && nextState === 'visible_interactive') {
      nextState = 'visible_read_only';
    }

    tabStates[definition.id] = nextState;
  }

  const hiddenTabs = Object.entries(tabStates)
    .filter(([, state]) => state === 'hidden')
    .map(([tabId]) => tabId as ProjectTabId);

  const autoHiddenTabs = resolveDependentTabs(hiddenTabs);
  for (const tabId of autoHiddenTabs) {
    tabStates[tabId] = 'hidden';
  }

  const finalHiddenTabs = Object.entries(tabStates)
    .filter(([, state]) => state === 'hidden')
    .map(([tabId]) => tabId as ProjectTabId);

  const hiddenTabSet = new Set(finalHiddenTabs);
  const dependencyWarnings = validateWorkspaceDependencies(
    Object.entries(tabStates)
      .filter(([, state]) => state !== 'hidden')
      .map(([tabId]) => tabId as ProjectTabId),
  );

  const visibleTabs = PROJECT_TAB_DEFINITIONS
    .filter((definition) => !hiddenTabSet.has(definition.id))
    .sort((a, b) => {
      const configuredOrderA = configuredStates.get(a.id)?.orderIndex;
      const configuredOrderB = configuredStates.get(b.id)?.orderIndex;
      if (configuredOrderA !== undefined || configuredOrderB !== undefined) {
        return (configuredOrderA ?? a.order) - (configuredOrderB ?? b.order);
      }
      return a.order - b.order;
    });

  return {
    visibleTabs,
    tabStates,
    hiddenTabs: finalHiddenTabs,
    autoHiddenTabs,
    hiddenOverviewSections: collectHiddenOverviewSections(finalHiddenTabs),
    dependencyWarnings,
  };
}

export function getWorkspaceTabState(
  resolvedWorkspace: ResolvedProjectWorkspace,
  tabId: ProjectTabId,
): WorkspaceTabState {
  return resolvedWorkspace.tabStates[tabId] || PROJECT_TABS_BY_ID[tabId]?.defaultClientState || 'hidden';
}
