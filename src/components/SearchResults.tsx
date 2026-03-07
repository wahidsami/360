import React, { useState, useEffect, useCallback } from 'react';
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

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    if (item.type === 'project') navigate(`/app/projects/${item.id}`);
    else if (item.type === 'task' && item.projectId) navigate(`/app/projects/${item.projectId}?tab=tasks`);
    else if (item.type === 'client') navigate(`/app/clients/${item.id}`);
    else if (item.type === 'finding') navigate(`/app/findings/${item.id}`);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 p-3 border-b border-slate-700">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects, tasks, clients, findings..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
            autoFocus
          />
          <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && <div className="p-4 text-slate-500 text-sm">Searching...</div>}
          {!loading && results.length === 0 && q.length >= 2 && <div className="p-4 text-slate-500 text-sm">No results.</div>}
          {!loading && results.length === 0 && q.length < 2 && <div className="p-4 text-slate-500 text-sm">Type at least 2 characters.</div>}
          {!loading &&
            results.map((item) => {
              const Icon = iconMap[item.type];
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/80 text-left"
                  onClick={() => handleSelect(item)}
                >
                  <Icon className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.title}</p>
                    {item.subtitle && <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>}
                  </div>
                  <span className="text-xs text-slate-500 capitalize">{item.type}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
