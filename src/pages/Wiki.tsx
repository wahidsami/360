import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, Plus, Pencil, Trash2, Save, X, History } from 'lucide-react';
import { GlassCard, Button, Input, Label, Modal } from '../components/ui/UIComponents';
import { api } from '../services/api';
import toast from 'react-hot-toast';

type WikiPageItem = { id: string; slug: string; title: string; updatedAt: string };

const Wiki: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const slugParam = searchParams.get('slug') || '';
  const [pages, setPages] = useState<WikiPageItem[]>([]);
  const [current, setCurrent] = useState<{ id: string; slug: string; title: string; body: string; updatedAt: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ slug: '', title: '', body: '' });
  const [saving, setSaving] = useState(false);
  const [versions, setVersions] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [versionsModalOpen, setVersionsModalOpen] = useState(false);

  const loadPages = async () => {
    try {
      const list = await api.wiki.listPages();
      setPages((list as WikiPageItem[]) || []);
    } catch (e) {
      toast.error('Failed to load wiki pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  useEffect(() => {
    if (!slugParam) {
      setCurrent(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const page = await api.wiki.getBySlug(slugParam);
        if (!cancelled) setCurrent(page as any);
      } catch {
        if (!cancelled) setCurrent(null);
      }
    })();
    return () => { cancelled = true; };
  }, [slugParam]);

  const openCreate = () => {
    setEditForm({ slug: '', title: '', body: '' });
    setCurrent(null);
    setEditModalOpen(true);
  };

  const openEdit = (page: { id: string; slug: string; title: string; body: string }) => {
    setEditForm({ slug: page.slug, title: page.title, body: page.body });
    setCurrent(page as any);
    setEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let page: any;
      if (current?.id) {
        page = await api.wiki.update(current.id, { slug: editForm.slug, title: editForm.title, body: editForm.body });
        toast.success('Page updated');
      } else {
        page = await api.wiki.create({ slug: editForm.slug, title: editForm.title, body: editForm.body });
        toast.success('Page created');
      }
      setEditModalOpen(false);
      await loadPages();
      const slug = (page && page.slug) || editForm.slug || editForm.title.toLowerCase().replace(/\s+/g, '-');
      setSearchParams(slug ? { slug } : {});
      setCurrent(page || null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this wiki page?')) return;
    try {
      await api.wiki.delete(id);
      toast.success('Page deleted');
      setCurrent(null);
      setSearchParams({});
      loadPages();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const openVersions = async (pageId: string) => {
    try {
      const list = await api.wiki.getVersions(pageId);
      setVersions((list as any[]) || []);
      setVersionsModalOpen(true);
    } catch (e) {
      toast.error('Failed to load versions');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-8 h-8 text-cyan-500" />
          Wiki
        </h1>
        <Button variant="outline" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> New page
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <GlassCard title="Pages" className="md:col-span-1">
          {loading ? (
            <p className="text-slate-500 text-sm">Loading...</p>
          ) : (
            <ul className="space-y-1">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setSearchParams({ slug: p.slug })}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${slugParam === p.slug ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-800/50'}`}
                  >
                    {p.title}
                  </button>
                </li>
              ))}
              {pages.length === 0 && <p className="text-slate-500 text-sm">No pages yet. Create one to get started.</p>}
            </ul>
          )}
        </GlassCard>

        <GlassCard title={current?.title || 'Select a page'} className="md:col-span-2">
          {current ? (
            <>
              <div className="flex gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => openEdit(current)}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => openVersions(current.id)}>
                  <History className="w-4 h-4 mr-1" /> History
                </Button>
                <Button variant="ghost" size="sm" className="text-rose-400" onClick={() => handleDelete(current.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
              </div>
              <div className="prose prose-invert max-w-none">
                <div className="text-slate-400 text-sm mb-2">Updated {new Date(current.updatedAt).toLocaleString()}</div>
                <div className="whitespace-pre-wrap text-slate-200">{current.body}</div>
              </div>
            </>
          ) : (
            <p className="text-slate-500">Select a page from the list or create a new one.</p>
          )}
        </GlassCard>
      </div>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title={current?.id ? 'Edit page' : 'New page'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Slug (URL path)</Label>
            <Input value={editForm.slug} onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))} placeholder="getting-started" className="mt-1" />
          </div>
          <div>
            <Label>Title</Label>
            <Input value={editForm.title} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} placeholder="Getting Started" required className="mt-1" />
          </div>
          <div>
            <Label>Body</Label>
            <textarea value={editForm.body} onChange={(e) => setEditForm((f) => ({ ...f, body: e.target.value }))} rows={12} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white mt-1" placeholder="Page content..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditModalOpen(false)}><X className="w-4 h-4 mr-1" /> Cancel</Button>
            <Button type="submit" disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={versionsModalOpen} onClose={() => setVersionsModalOpen(false)} title="Version history">
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {versions.map((v) => (
            <li key={v.id} className="text-slate-300 text-sm flex justify-between">
              <span>{v.title}</span>
              <span className="text-slate-500">{new Date(v.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {versions.length === 0 && <p className="text-slate-500 text-sm">No versions.</p>}
        </ul>
      </Modal>
    </div>
  );
};

export default Wiki;
