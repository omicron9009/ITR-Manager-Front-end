'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import {
  listDocTypes, createDocType, updateDocType, deleteDocType, getIncomeHeadsCatalog,
  listTextFieldTypes, createTextFieldType, updateTextFieldType, deleteTextFieldType,
} from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FileCheck, Pencil, Trash2, Loader2, Filter, X, Search, Type } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type SubCat = 'BASE' | 'INCREMENTAL';
type Mapping = { income_head: string; sub_category: SubCat };
type CatalogItem = { value: string; label: string };
type Tab = 'DOC' | 'TEXT';

const ALL = '__ALL__';

export default function DocumentTypesPage() {
  const [tab, setTab] = useState<Tab>('DOC');

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Checklist Master</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage the master list of documents and text fields requested from clients.</p>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('DOC')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'DOC' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="h-4 w-4" /> Documents
        </button>
        <button
          type="button"
          onClick={() => setTab('TEXT')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'TEXT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="h-4 w-4" /> Text Fields
        </button>
      </div>

      {tab === 'DOC' ? <DocumentTypesPanel /> : <TextFieldTypesPanel />}
    </div>
  );
}

// =============================================================================
// DOCUMENT TYPES PANEL
// =============================================================================
function DocumentTypesPanel() {
  const [types, setTypes] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [filterHead, setFilterHead] = useState<string>(ALL);
  const [filterSub, setFilterSub] = useState<'ALL' | SubCat>('ALL');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    display_order: number;
    is_active: boolean;
    mappings: Mapping[];
  }>({ name: '', description: '', display_order: 0, is_active: true, mappings: [] });

  const labelFor = useMemo(() => {
    const map: Record<string, string> = {};
    catalog.forEach((c) => { map[c.value] = c.label; });
    return map;
  }, [catalog]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listDocTypes({
        includeInactive: showAll,
        income_head: filterHead === ALL ? undefined : filterHead,
        sub_category: filterSub === 'ALL' ? undefined : filterSub,
      });
      setTypes(r?.items ?? r ?? []);
    } catch {
      setTypes([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showAll, filterHead, filterSub]);

  useEffect(() => {
    getIncomeHeadsCatalog()
      .then((r) => setCatalog(r?.items || []))
      .catch(() => setCatalog([]));
  }, []);

  const resetForm = () => setForm({ name: '', description: '', display_order: 0, is_active: true, mappings: [] });

  const openCreate = () => { setEditing(null); resetForm(); setAdding(true); };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      description: t.description || '',
      display_order: t.display_order ?? 0,
      is_active: t.is_active !== false,
      mappings: Array.isArray(t.income_head_mappings)
        ? t.income_head_mappings.map((m: any) => ({ income_head: m.income_head, sub_category: m.sub_category || 'INCREMENTAL' }))
        : [],
    });
    setAdding(true);
  };

  const toggleHead = (value: string) => {
    setForm((f) => {
      const exists = f.mappings.find((m) => m.income_head === value);
      if (exists) return { ...f, mappings: f.mappings.filter((m) => m.income_head !== value) };
      return { ...f, mappings: [...f.mappings, { income_head: value, sub_category: 'INCREMENTAL' }] };
    });
  };

  const setSubCategory = (value: string, sub: SubCat) => {
    setForm((f) => ({
      ...f,
      mappings: f.mappings.map((m) => (m.income_head === value ? { ...m, sub_category: sub } : m)),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        display_order: Number(form.display_order) || 0,
        income_head_mappings: form.mappings,
      };
      if (editing) {
        payload.is_active = form.is_active;
        await updateDocType(editing.id, payload);
        toast.success('Document type updated');
      } else {
        await createDocType(payload);
        toast.success('Document type created');
      }
      setAdding(false);
      setEditing(null);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (t: any) => {
    if (!confirm(`Delete "${t.name}"? This will hide it from new filings (existing documents are preserved).`)) return;
    try {
      await deleteDocType(t.id);
      toast.success('Document type deleted');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Switch checked={showAll} onCheckedChange={setShowAll} />
          Show inactive
        </label>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Add Document Type
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Income Head</Label>
          <Select value={filterHead} onValueChange={setFilterHead}>
            <SelectTrigger className="h-8 w-56 text-sm"><SelectValue placeholder="All heads" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All heads</SelectItem>
              {catalog.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {(['ALL', 'BASE', 'INCREMENTAL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSub(s)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterSub === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s === 'BASE' ? 'Base' : 'Incremental'}
            </button>
          ))}
        </div>
        {(filterHead !== ALL || filterSub !== 'ALL' || search) && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterHead(ALL); setFilterSub('ALL'); setSearch(''); }} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div>
      ) : (() => {
        const q = search.trim().toLowerCase();
        const visible = q
          ? types.filter((t: any) =>
              (t.name || '').toLowerCase().includes(q) ||
              (t.description || '').toLowerCase().includes(q)
            )
          : types;
        if (visible.length === 0) {
          return (
            <Card className="rounded-xl p-10 text-center">
              <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No document types match these filters.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> Add your first document type
              </Button>
            </Card>
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((t: any) => {
              const mappings: Mapping[] = Array.isArray(t.income_head_mappings) ? t.income_head_mappings : [];
              return (
                <Card key={t.id} className={`rounded-xl p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <FileCheck className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {t.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                          {mappings.length === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-500">Others</span>
                          )}
                          {mappings.map((m, i) => {
                            const isBase = m.sub_category === 'BASE';
                            return (
                              <span
                                key={`${m.income_head}-${i}`}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                  isBase
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-indigo-700 border-indigo-300'
                                }`}
                                title={`${labelFor[m.income_head] || m.income_head} · ${isBase ? 'Base' : 'Incremental'}`}
                              >
                                {labelFor[m.income_head] || m.income_head} · {isBase ? 'Base' : 'Incr.'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      <Dialog open={adding} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Document Type' : 'New Document Type'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Form 16, Bank Statement"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of what this document is…"
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
              {editing && (
                <div className="flex items-end gap-3 pb-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-semibold text-slate-900 text-sm">Income Head Categorisation</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Pick which income heads this document belongs to. Leave empty if it doesn&rsquo;t belong to a specific head — it will fall under <strong>Others</strong>.
              </p>

              {catalog.length === 0 ? (
                <div className="text-xs text-slate-400">Loading catalog…</div>
              ) : (
                <div className="space-y-2">
                  {catalog.filter((c) => c.value !== 'OTHERS').map((c) => {
                    const mapping = form.mappings.find((m) => m.income_head === c.value);
                    const selected = !!mapping;
                    return (
                      <div
                        key={c.value}
                        className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                          selected ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleHead(c.value)}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                            selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {selected ? '✓' : ''}
                          </span>
                          <span className="text-sm text-slate-700 truncate">{c.label}</span>
                        </button>
                        {selected && (
                          <div className="flex items-center gap-1 ml-2">
                            {(['BASE', 'INCREMENTAL'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSubCategory(c.value, s)}
                                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                                  mapping?.sub_category === s
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {s === 'BASE' ? 'Base' : 'Incremental'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                <strong>Base</strong> documents are auto-requested when a client selects the head.{' '}
                <strong>Incremental</strong> are added manually as needed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// TEXT FIELD TYPES PANEL
// =============================================================================
function TextFieldTypesPanel() {
  const [types, setTypes] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [filterHead, setFilterHead] = useState<string>(ALL);
  const [filterSub, setFilterSub] = useState<'ALL' | SubCat>('ALL');
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    description: string;
    max_length: number;
    display_order: number;
    is_active: boolean;
    mappings: Mapping[];
  }>({ name: '', description: '', max_length: 200, display_order: 0, is_active: true, mappings: [] });

  const labelFor = useMemo(() => {
    const map: Record<string, string> = {};
    catalog.forEach((c) => { map[c.value] = c.label; });
    return map;
  }, [catalog]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await listTextFieldTypes({
        includeInactive: showAll,
        income_head: filterHead === ALL ? undefined : filterHead,
        sub_category: filterSub === 'ALL' ? undefined : filterSub,
      });
      setTypes(r?.items ?? r ?? []);
    } catch {
      setTypes([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [showAll, filterHead, filterSub]);

  useEffect(() => {
    getIncomeHeadsCatalog()
      .then((r) => setCatalog(r?.items || []))
      .catch(() => setCatalog([]));
  }, []);

  const resetForm = () => setForm({ name: '', description: '', max_length: 200, display_order: 0, is_active: true, mappings: [] });

  const openCreate = () => { setEditing(null); resetForm(); setAdding(true); };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name || '',
      description: t.description || '',
      max_length: t.max_length ?? 200,
      display_order: t.display_order ?? 0,
      is_active: t.is_active !== false,
      mappings: Array.isArray(t.income_head_mappings)
        ? t.income_head_mappings.map((m: any) => ({ income_head: m.income_head, sub_category: m.sub_category || 'INCREMENTAL' }))
        : [],
    });
    setAdding(true);
  };

  const toggleHead = (value: string) => {
    setForm((f) => {
      const exists = f.mappings.find((m) => m.income_head === value);
      if (exists) return { ...f, mappings: f.mappings.filter((m) => m.income_head !== value) };
      return { ...f, mappings: [...f.mappings, { income_head: value, sub_category: 'INCREMENTAL' }] };
    });
  };

  const setSubCategory = (value: string, sub: SubCat) => {
    setForm((f) => ({
      ...f,
      mappings: f.mappings.map((m) => (m.income_head === value ? { ...m, sub_category: sub } : m)),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.max_length < 1 || form.max_length > 5000) { toast.error('Max length must be between 1 and 5000'); return; }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        max_length: Number(form.max_length),
        display_order: Number(form.display_order) || 0,
        income_head_mappings: form.mappings,
      };
      if (editing) {
        payload.is_active = form.is_active;
        await updateTextFieldType(editing.id, payload);
        toast.success('Text field updated');
      } else {
        await createTextFieldType(payload);
        toast.success('Text field created');
      }
      setAdding(false);
      setEditing(null);
      resetForm();
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (t: any) => {
    if (!confirm(`Delete "${t.name}"? This will hide it from new filings (existing values are preserved).`)) return;
    try {
      await deleteTextFieldType(t.id);
      toast.success('Text field deleted');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Switch checked={showAll} onCheckedChange={setShowAll} />
          Show inactive
        </label>
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Add Text Field
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="rounded-xl p-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search text fields…"
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Filter className="h-4 w-4 text-slate-400" />
        <div className="flex items-center gap-2">
          <Label className="text-xs text-slate-500">Income Head</Label>
          <Select value={filterHead} onValueChange={setFilterHead}>
            <SelectTrigger className="h-8 w-56 text-sm"><SelectValue placeholder="All heads" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All heads</SelectItem>
              {catalog.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {(['ALL', 'BASE', 'INCREMENTAL'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterSub(s)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                filterSub === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'ALL' ? 'All' : s === 'BASE' ? 'Base' : 'Incremental'}
            </button>
          ))}
        </div>
        {(filterHead !== ALL || filterSub !== 'ALL' || search) && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterHead(ALL); setFilterSub('ALL'); setSearch(''); }} className="h-7 text-xs">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-indigo-600" /></div>
      ) : (() => {
        const q = search.trim().toLowerCase();
        const visible = q
          ? types.filter((t: any) =>
              (t.name || '').toLowerCase().includes(q) ||
              (t.description || '').toLowerCase().includes(q)
            )
          : types;
        if (visible.length === 0) {
          return (
            <Card className="rounded-xl p-10 text-center">
              <Type className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No text fields match these filters.</p>
              <Button onClick={openCreate} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-1" /> Add your first text field
              </Button>
            </Card>
          );
        }
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visible.map((t: any) => {
              const mappings: Mapping[] = Array.isArray(t.income_head_mappings) ? t.income_head_mappings : [];
              return (
                <Card key={t.id} className={`rounded-xl p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <Type className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {t.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium border bg-amber-50 text-amber-700 border-amber-200">
                            Text · max {t.max_length ?? 200}
                          </span>
                          {mappings.length === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-slate-100 text-slate-500">Others</span>
                          )}
                          {mappings.map((m, i) => {
                            const isBase = m.sub_category === 'BASE';
                            return (
                              <span
                                key={`${m.income_head}-${i}`}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                  isBase
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-indigo-700 border-indigo-300'
                                }`}
                                title={`${labelFor[m.income_head] || m.income_head} · ${isBase ? 'Base' : 'Incremental'}`}
                              >
                                {labelFor[m.income_head] || m.income_head} · {isBase ? 'Base' : 'Incr.'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(t)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        );
      })()}

      <Dialog open={adding} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Text Field' : 'New Text Field'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. PAN Number, Bank Account No."
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What does the client need to fill in here?"
                rows={2}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max Length</Label>
                <Input
                  type="number"
                  value={form.max_length}
                  min={1}
                  max={5000}
                  onChange={(e) => setForm({ ...form, max_length: Number(e.target.value) || 1 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) || 0 })}
                  className="mt-1.5"
                />
              </div>
            </div>
            {editing && (
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Active</Label>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-semibold text-slate-900 text-sm">Income Head Categorisation</h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-3">
                Pick which income heads this text field belongs to. Leave empty if it doesn&rsquo;t belong to a specific head — it will fall under <strong>Others</strong>.
              </p>

              {catalog.length === 0 ? (
                <div className="text-xs text-slate-400">Loading catalog…</div>
              ) : (
                <div className="space-y-2">
                  {catalog.filter((c) => c.value !== 'OTHERS').map((c) => {
                    const mapping = form.mappings.find((m) => m.income_head === c.value);
                    const selected = !!mapping;
                    return (
                      <div
                        key={c.value}
                        className={`flex items-center justify-between rounded-lg border p-2.5 transition-colors ${
                          selected ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleHead(c.value)}
                          className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                          <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold ${
                            selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {selected ? '✓' : ''}
                          </span>
                          <span className="text-sm text-slate-700 truncate">{c.label}</span>
                        </button>
                        {selected && (
                          <div className="flex items-center gap-1 ml-2">
                            {(['BASE', 'INCREMENTAL'] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setSubCategory(c.value, s)}
                                className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors ${
                                  mapping?.sub_category === s
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {s === 'BASE' ? 'Base' : 'Incremental'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                <strong>Base</strong> text fields are auto-requested when a client selects the head.{' '}
                <strong>Incremental</strong> are added manually as needed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
