import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ListTodo, Users, AlertCircle, X } from 'lucide-react';
import { api, SearchResultItem } from '../services/api';

const iconMap = {
  project: Briefcase,
  task: ListTodo,
  client: Users,
  finding: AlertCircle,
};

export const SearchResults: React.FC<{ open: boolean; onClose: () => void; initialQuery?: string }> = ({
  open,
  onClose,
  initialQuery = '',
}) => {
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const runSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.search(term, 20);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(q), 250);
    return () => clearTimeout(t);
  }, [q, runSearch]);

  useEffect(() => {
    if (open) setQ(initialQuery);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    if (item.type === 'project') navigate(`/app/projects/${item.id}`);
    else if (item.type === 'task' && item.projectId) navigate(`/app/projects/${item.projectId}?tab=tasks`);
    else if (item.type === 'client') navigate(`/app/clients/${item.id}`);
    else if (item.type === 'finding') navigate(`/app/findings/${item.id}`);
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[2147483646] flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative z-[2147483647] w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-500/25 bg-slate-900 shadow-[0_30px_90px_rgba(2,6,23,0.7)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-700 p-3">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, tasks, clients, findings..."
            className="flex-1 rounded-lg border border-cyan-500/40 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-cyan-400 focus:outline-none"
            autoFocus
          />
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-4 text-sm text-slate-500">Searching...</div>}
          {!loading && results.length === 0 && q.length >= 2 && <div className="p-4 text-sm text-slate-500">No results.</div>}
          {!loading && results.length === 0 && q.length < 2 && <div className="p-4 text-sm text-slate-500">Type at least 2 characters.</div>}
          {!loading &&
            results.map((item) => {
              const Icon = iconMap[item.type];
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800/80"
                  onClick={() => handleSelect(item)}
                >
                  <Icon className="h-5 w-5 shrink-0 text-cyan-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-100">{item.title}</p>
                    {item.subtitle && <p className="truncate text-xs text-slate-500">{item.subtitle}</p>}
                  </div>
                  <span className="text-xs capitalize text-slate-500">{item.type}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>,
    document.body,
  );
};
