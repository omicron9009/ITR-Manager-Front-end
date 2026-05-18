'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { listDocTypes, createDocType, updateDocType } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FileCheck, Pencil, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function DocumentTypesPage() {
  const [types, setTypes] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', is_mandatory: false });

  const load = async () => {
    try {
      const r = await listDocTypes(showAll);
      setTypes(r?.items ?? r ?? []);
    } catch {}
  };

  useEffect(() => { load(); }, [showAll]);

  const handleSave = async () => {
    try {
      if (editing) {
        await updateDocType(editing.id, { name: form.name, description: form.description, is_mandatory: form.is_mandatory });
        toast.success('Document type updated');
      } else {
        await createDocType({ name: form.name, description: form.description, is_mandatory: form.is_mandatory });
        toast.success('Document type created');
      }
      setAdding(false);
      setEditing(null);
      setForm({ name: '', description: '', is_mandatory: false });
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({ name: t.name, description: t.description || '', is_mandatory: t.is_mandatory ?? false });
    setAdding(true);
  };

  const toggleActive = async (t: any) => {
    try {
      await updateDocType(t.id, { is_active: !t.is_active });
      toast.success(t.is_active ? 'Deactivated' : 'Activated');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Checklist</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage document types that can be assigned to client filings</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Switch checked={showAll} onCheckedChange={setShowAll} />
            Show inactive
          </label>
          <Button onClick={() => { setEditing(null); setForm({ name: '', description: '', is_mandatory: false }); setAdding(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-1" /> Add Document Type
          </Button>
        </div>
      </div>

      {types.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <FileCheck className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No document types yet. Create one to start building your checklist.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {types.map((t: any) => (
            <Card key={t.id} className={`rounded-xl p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <FileCheck className="h-5 w-5 text-indigo-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{t.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      {t.is_mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold uppercase">Mandatory</span>}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${t.is_active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {t.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(t)} className={t.is_active !== false ? 'text-rose-600' : 'text-emerald-600'}>
                    {t.is_active !== false ? <X className="h-3.5 w-3.5" /> : <FileCheck className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={adding} onOpenChange={(o) => { if (!o) { setAdding(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Document Type' : 'New Document Type'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Form 16, Bank Statement" className="mt-1.5" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of what this document is…" rows={2} className="mt-1.5" /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_mandatory} onCheckedChange={(v) => setForm({ ...form, is_mandatory: v })} />
              <Label>Mandatory for all filings</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()} className="bg-indigo-600 hover:bg-indigo-700">{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
