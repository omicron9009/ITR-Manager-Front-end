'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { listExecutives, createExecutive, deactivateExec, reactivateExec, listExecutivesWithTags, listTags, assignTag } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, UserPlus, Loader2 } from 'lucide-react';

export default function ExecutivesPage() {
  const [execs, setExecs] = useState<any[]>([]);
  const [execsWithTags, setExecsWithTags] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => { setLoading(true); try { const [r, t, tags] = await Promise.all([listExecutives(), listExecutivesWithTags(), listTags()]); setExecs(r?.items || r?.executives || r || []); setExecsWithTags(t?.items || t || []); setAllTags(tags?.items || tags || []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const managerTags = allTags.filter((t: any) => t.tag_type === 'MANAGER' && t.is_active !== false);
  const locationTags = allTags.filter((t: any) => t.tag_type === 'LOCATION' && t.is_active !== false);

  const submit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newExec = await createExecutive(form);
      const execId = newExec?.id || newExec?.executive_id;
      if (execId) {
        const assignments = [];
        if (selectedManager) assignments.push(assignTag(execId, selectedManager));
        if (selectedLocation) assignments.push(assignTag(execId, selectedLocation));
        if (assignments.length > 0) await Promise.allSettled(assignments);
      }
      toast.success('Executive created');
      setForm({ full_name: '', email: '', password: '' });
      setSelectedManager('');
      setSelectedLocation('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const toggle = async (ex: any) => {
    try { if (ex.is_active) { await deactivateExec(ex.id); toast.success('Deactivated'); } else { await reactivateExec(ex.id); toast.success('Reactivated'); } load(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Executives</h1>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {execs.map((e) => {
          const execTagData = execsWithTags.find((et: any) => (et.executive_id || et.id) === e.id);
          const mgrTags = execTagData?.manager_tags || [];
          const locTags = execTagData?.location_tags || [];
          return (
          <Card key={e.id} className="rounded-xl p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold">{(e.full_name || e.name || 'E')[0]}</div>
                <div>
                  <div className="font-semibold text-slate-900">{e.full_name || e.name}</div>
                  <div className="text-xs text-slate-500">{e.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right"><div className="text-xs text-slate-500">Clients</div><div className="font-bold text-slate-900">{e.assigned_client_count ?? 0}</div></div>
                <StatusBadge status={e.account_status || (e.is_active ? 'ACTIVE' : 'DEACTIVATED')} />
                <Button size="sm" variant="outline" onClick={() => toggle(e)}>{e.is_active ? 'Deactivate' : 'Reactivate'}</Button>
              </div>
            </div>
            {(mgrTags.length > 0 || locTags.length > 0) && (
              <div className="mt-3 text-xs text-slate-700">
                {mgrTags.length > 0 && <span>Manager: {mgrTags.map((t: any) => t.name || t.tag_name).join(', ')}</span>}
                {mgrTags.length > 0 && locTags.length > 0 && <span className="mx-2">·</span>}
                {locTags.length > 0 && <span>Location: {locTags.map((t: any) => t.name || t.tag_name).join(', ')}</span>}
              </div>
            )}
          </Card>
          );
        })}
        {!loading && execs.length === 0 && <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No executives yet.</Card>}
      </div>
      <Card className="rounded-xl p-6 h-fit">
        <div className="flex items-center gap-2 mb-4"><Shield className="h-4 w-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Create Executive</h2></div>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="mt-1.5" /></div>
          {managerTags.length > 0 && (
            <div>
              <Label>Assign Manager</Label>
              <select value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Select Manager</option>
                {managerTags.map((tag: any) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </div>
          )}
          {locationTags.length > 0 && (
            <div>
              <Label>Assign Location</Label>
              <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Select Location</option>
                {locationTags.map((tag: any) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
              </select>
            </div>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />} Create & Assign</Button>
        </form>
      </Card>
    </div>
  );
}
