import type { NavigateFunction, To } from 'react-router-dom';

type HistoryStateWithIndex = {
  idx?: number;
};

const hasHistoryEntry = (minIndexToGoBack: number): boolean => {
  if (typeof window === 'undefined') return false;

  const state = window.history.state as HistoryStateWithIndex | null;
  if (typeof state?.idx === 'number') {
    return state.idx >= minIndexToGoBack;
  }

  return window.history.length > 1;
};

export const navigateBack = (
  navigate: NavigateFunction,
  fallback: To,
  options?: {
    replaceFallback?: boolean;
    minIndexToGoBack?: number;
  },
): void => {
  const replaceFallback = options?.replaceFallback ?? true;
  const minIndexToGoBack = options?.minIndexToGoBack ?? 1;

  if (hasHistoryEntry(minIndexToGoBack)) {
    navigate(-1);
    return;
  }

  navigate(fallback, { replace: replaceFallback });
};

