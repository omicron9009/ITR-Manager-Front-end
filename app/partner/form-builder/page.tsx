// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { listFields, createField, deleteField, updateField } from '@/lib/api';
import { toast } from 'sonner';
import { GripVertical, Plus, Trash2, Layout } from 'lucide-react';

export default function FormBuilderPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState({ field_label: '', field_key: '', field_type: 'TEXT', options: '', is_required: false });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const load = async () => { try { const r = await listFields(); const items = r?.items || []; items.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)); setFields(items); } catch {} };
  useEffect(() => { load(); }, []);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const fromIndex = dragIndex;
    setDragIndex(null);
    setDragOverIndex(null);
    if (fromIndex === null || fromIndex === dropIndex) return;

    const updated = [...fields];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(dropIndex, 0, moved);
    const reordered = updated.map((f, i) => ({ ...f, display_order: i }));
    setFields(reordered);

    try {
      const updates = reordered
        .filter((f, i) => f.display_order !== fields.find((orig) => orig.id === f.id)?.display_order)
        .map((f) => updateField(f.id, { display_order: f.display_order }));
      await Promise.all(updates);
    } catch { toast.error('Failed to save order'); load(); }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const isPanField = (f: any) => Array.isArray(f.field_options) && f.field_options.includes('__pan_validation');

  const save = async () => {
    try {
      const actualType = newField.field_type === 'PAN' ? 'TEXT' : newField.field_type;
      const body: any = { field_label: newField.field_label, field_key: newField.field_key || newField.field_label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), field_type: actualType, is_required: newField.is_required, display_order: fields.length };
      if (newField.field_type === 'DROPDOWN') body.field_options = newField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (newField.field_type === 'PAN') body.field_options = ['__pan_validation'];
      await createField(body);
      toast.success('Field added');
      setNewField({ field_label: '', field_key: '', field_type: 'TEXT', options: '', is_required: false });
      setAdding(false);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const del = async (id: string) => { if (!confirm('Delete this field?')) return; try { await deleteField(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); } };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Onboarding Form Builder</h1>
          <Button onClick={() => setAdding(true)} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Add Field</Button>
        </div>
        {adding && (
          <Card className="rounded-xl p-5 border-indigo-200 bg-indigo-50/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Label</Label><Input value={newField.field_label} onChange={(e) => setNewField({ ...newField, field_label: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Type</Label>
                <Select value={newField.field_type} onValueChange={(v) => setNewField({ ...newField, field_type: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{['TEXT','PAN','NUMBER','DATE','DROPDOWN','FILE'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {newField.field_type === 'DROPDOWN' && (
              <div className="mt-3"><Label>Options (one per line)</Label><Textarea value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} rows={3} className="mt-1.5" /></div>
            )}
            <div className="flex items-center gap-2 mt-3">
              <Switch id="is_required" checked={newField.is_required} onCheckedChange={(v) => setNewField({ ...newField, is_required: v })} />
              <Label htmlFor="is_required" className="cursor-pointer">Required field</Label>
            </div>
            <div className="flex justify-end gap-2 mt-4"><Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={save} className="bg-indigo-600 hover:bg-indigo-700">Save Field</Button></div>
          </Card>
        )}
        {fields.length === 0 ? <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No fields yet. Add your first onboarding field.</Card> : fields.map((f, idx) => (
          <Card
            key={f.id}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            className={`rounded-xl p-4 flex items-center justify-between gap-3 transition-all ${dragIndex === idx ? 'opacity-50 scale-[0.98]' : ''} ${dragOverIndex === idx && dragIndex !== idx ? 'border-indigo-400 shadow-md' : ''}`}
          >
            <div className="flex items-center gap-3">
              <GripVertical className="h-4 w-4 text-slate-300 cursor-grab active:cursor-grabbing" />
              <div><div className="font-semibold text-slate-900">{f.field_label}</div><div className="text-xs text-slate-500">{isPanField(f) ? 'PAN' : f.field_type}{f.is_required ? ' · required' : ''}</div></div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => del(f.id)} className="text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
      <Card className="rounded-xl p-6 h-fit sticky top-20">
        <div className="flex items-center gap-2 mb-4"><Layout className="h-4 w-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Live Preview</h2></div>
        <div className="space-y-3">
          {fields.length === 0 && <p className="text-xs text-slate-400">Fields will preview here.</p>}
          {fields.map((f) => (
            <div key={f.id}>
              <Label>{f.field_label}</Label>
              {f.field_type === 'TEXT' && !isPanField(f) && <Input placeholder="Enter…" className="mt-1.5" disabled />}
              {f.field_type === 'TEXT' && isPanField(f) && <Input placeholder="ABCDE1234F" maxLength={10} className="mt-1.5 uppercase" disabled />}
              {f.field_type === 'NUMBER' && <Input type="number" placeholder="0" className="mt-1.5" disabled />}
              {f.field_type === 'DATE' && <Input type="date" className="mt-1.5" disabled />}
              {f.field_type === 'FILE' && <div className="mt-1.5 border border-dashed border-slate-300 rounded-lg p-3 text-xs text-slate-400 text-center">Upload file</div>}
              {f.field_type === 'DROPDOWN' && <Select disabled><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select…" /></SelectTrigger></Select>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
