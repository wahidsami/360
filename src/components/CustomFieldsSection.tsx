import React, { useState, useEffect } from 'react';
import { Label } from './ui/UIComponents';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

export type CustomFieldItem = {
  fieldDefId: string;
  key: string;
  label: string;
  fieldType: string;
  options: unknown;
  required: boolean;
  value: string | null;
};

interface CustomFieldsSectionProps {
  entityType: 'PROJECT' | 'TASK' | 'CLIENT';
  entityId: string;
  readOnly?: boolean;
  onValuesSaved?: () => void;
}

export const CustomFieldsSection: React.FC<CustomFieldsSectionProps> = ({
  entityType,
  entityId,
  readOnly = false,
  onValuesSaved,
}) => {
  const [fields, setFields] = useState<CustomFieldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Record<string, string | number | boolean | null>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.customFields.getValues(entityType, entityId);
      setFields((list || []) as CustomFieldItem[]);
      setDirty({});
    } catch (e) {
      console.error('Failed to load custom fields', e);
      setFields([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [entityType, entityId]);

  const handleChange = (fieldDefId: string, value: string | number | boolean | null) => {
    setDirty((prev) => ({ ...prev, [fieldDefId]: value }));
  };

  const handleSave = async () => {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    try {
      await api.customFields.setValues(entityType, entityId, dirty);
      toast.success('Custom fields saved');
      setDirty({});
      onValuesSaved?.();
      load();
    } catch (e) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500 text-sm">Loading custom fields...</p>;
  if (fields.length === 0) return null;

  const options = (opts: unknown): { value: string; label: string }[] => {
    if (!opts) return [];
    if (Array.isArray(opts)) {
      return opts.map((o) => (typeof o === 'string' ? { value: o, label: o } : { value: (o as any).value, label: (o as any).label || (o as any).value }));
    }
    return [];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-300">Custom fields</h4>
        {!readOnly && Object.keys(dirty).length > 0 && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="text-sm text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => {
          const value = f.fieldDefId in dirty ? dirty[f.fieldDefId] : (f.value ?? '');
          const opts = options(f.options);
          return (
            <div key={f.fieldDefId} className="space-y-1">
              <Label>{f.label}{f.required && ' *'}</Label>
              {readOnly ? (
                <div className="text-slate-200 text-sm py-1.5">
                  {f.fieldType === 'CHECKBOX' ? (value === 'true' || value === true ? 'Yes' : 'No') : (value ?? '—')}
                </div>
              ) : (
                <>
                  {f.fieldType === 'TEXT' && (
                    <input
                      type="text"
                      value={value as string}
                      onChange={(e) => handleChange(f.fieldDefId, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  )}
                  {f.fieldType === 'NUMBER' && (
                    <input
                      type="number"
                      value={value as string | number}
                      onChange={(e) => handleChange(f.fieldDefId, e.target.value === '' ? null : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  )}
                  {f.fieldType === 'DATE' && (
                    <input
                      type="date"
                      value={typeof value === 'string' && value ? value.slice(0, 10) : ''}
                      onChange={(e) => handleChange(f.fieldDefId, e.target.value || null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    />
                  )}
                  {f.fieldType === 'SELECT' && (
                    <select
                      value={value as string}
                      onChange={(e) => handleChange(f.fieldDefId, e.target.value || null)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                      <option value="">—</option>
                      {opts.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  )}
                  {f.fieldType === 'CHECKBOX' && (
                    <input
                      type="checkbox"
                      checked={value === 'true' || value === true}
                      onChange={(e) => handleChange(f.fieldDefId, e.target.checked)}
                      className="rounded border-slate-600 text-cyan-500"
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
