'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { listExecutives, createExecutive, deactivateExec, reactivateExec } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, UserPlus, Loader2 } from 'lucide-react';

export default function ExecutivesPage() {
  const [execs, setExecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => { setLoading(true); try { const r = await listExecutives(); setExecs(r?.items || r?.executives || r || []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const submit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    try { await createExecutive(form); toast.success('Executive created'); setForm({ full_name: '', email: '', password: '' }); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setSubmitting(false); }
  };

  const toggle = async (ex: any) => {
    try { if (ex.is_active) { await deactivateExec(ex.id); toast.success('Deactivated'); } else { await reactivateExec(ex.id); toast.success('Reactivated'); } load(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Executives</h1>
        {loading && <p className="text-sm text-slate-500">Loading…</p>}
        {execs.map((e) => (
          <Card key={e.id} className="rounded-xl p-5 flex items-center justify-between gap-4">
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
          </Card>
        ))}
        {!loading && execs.length === 0 && <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No executives yet.</Card>}
      </div>
      <Card className="rounded-xl p-6 h-fit">
        <div className="flex items-center gap-2 mb-4"><Shield className="h-4 w-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Create Executive</h2></div>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1.5" /></div>
          <div><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="mt-1.5" /></div>
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />} Create Executive</Button>
        </form>
      </Card>
    </div>
  );
}
