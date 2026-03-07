import React, { createContext, useContext, useState, useCallback } from 'react';
import { AIPanel } from '../components/AIPanel';

interface AIContextType {
  openAI: (context?: { projectId?: string; findingId?: string }) => void;
  closeAI: () => void;
  setContext: (context: { projectId?: string; findingId?: string }) => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [context, setContextState] = useState<{ projectId?: string; findingId?: string }>({});
  const openAI = useCallback((ctx?: { projectId?: string; findingId?: string }) => {
    if (ctx) setContextState(ctx);
    setOpen(true);
  }, []);
  const closeAI = useCallback(() => setOpen(false), []);
  const setContext = useCallback((ctx: { projectId?: string; findingId?: string }) => setContextState(ctx), []);

  return (
    <AIContext.Provider value={{ openAI, closeAI, setContext }}>
      {children}
      <AIPanel open={open} onClose={closeAI} context={context} />
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const ctx = useContext(AIContext);
  if (ctx === undefined) throw new Error('useAI must be used within AIProvider');
  return ctx;
};
