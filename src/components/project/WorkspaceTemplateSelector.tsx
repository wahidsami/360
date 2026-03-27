import React from 'react';
import { Layers3 } from 'lucide-react';
import { Badge, GlassCard, Label, Select } from '@/components/ui/UIComponents';
import { WorkspaceTemplateOption, summarizeWorkspaceDraft } from '@/features/project-workspace/helpers';

interface WorkspaceTemplateSelectorProps {
  title: string;
  description: string;
  options: WorkspaceTemplateOption[];
  selectedOptionId: string;
  onChange: (value: string) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

export const WorkspaceTemplateSelector: React.FC<WorkspaceTemplateSelectorProps> = ({
  title,
  description,
  options,
  selectedOptionId,
  onChange,
  loading = false,
  error = null,
  disabled = false,
}) => {
  const selectedOption = options.find((option) => option.id === selectedOptionId) || null;
  const summary = summarizeWorkspaceDraft(selectedOption?.draft);

  return (
    <GlassCard className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-1 rounded-2xl bg-cyan-50 p-3 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
          <Layers3 className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          Loading workspace templates…
        </div>
      ) : options.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          No workspace templates are available for this client yet.
        </div>
      ) : (
        <>
          <div>
            <Label>Workspace Template</Label>
            <Select value={selectedOptionId} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {selectedOption && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedOption.label}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedOption.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedOption.badges?.map((badge) => (
                    <Badge key={badge} variant="neutral">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Interactive</p>
                  <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">{summary.interactiveCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Read only</p>
                  <p className="mt-1 text-2xl font-black text-amber-600 dark:text-amber-400">{summary.readOnlyCount}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Hidden</p>
                  <p className="mt-1 text-2xl font-black text-slate-700 dark:text-slate-200">{summary.hiddenCount}</p>
                </div>
              </div>

              {summary.hiddenLabels.length > 0 && (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Hidden Tabs</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.hiddenLabels.slice(0, 8).map((label) => (
                      <Badge key={label} variant="neutral" className="bg-slate-200/70 dark:bg-slate-800/80">
                        {label}
                      </Badge>
                    ))}
                    {summary.hiddenLabels.length > 8 && <Badge variant="neutral">+{summary.hiddenLabels.length - 8} more</Badge>}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          {error}
        </div>
      )}
    </GlassCard>
  );
};
