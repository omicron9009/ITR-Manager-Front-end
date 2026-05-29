'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { listExecutives, createExecutive, deactivateExec, reactivateExec, listExecutivesWithTags, listTags, assignTag, listManagers, assignExecutiveToManager, getManagerTeam } from '@/lib/api';
import { toast } from 'sonner';
import { Shield, UserPlus, Loader2, Users, Search } from 'lucide-react';

export default function ExecutivesPage() {
  const [execs, setExecs] = useState<any[]>([]);
  const [execsWithTags, setExecsWithTags] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [createManagerId, setCreateManagerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Executive → Manager map
  const [execManagerMap, setExecManagerMap] = useState<Map<string, { id: string; name: string }>>(new Map());

  // Assign manager dialog
  const [showAssignMgr, setShowAssignMgr] = useState(false);
  const [assignExec, setAssignExec] = useState<any>(null);
  const [assignMgrId, setAssignMgrId] = useState('');
  const [assignMgrSearch, setAssignMgrSearch] = useState('');
  const [assigningMgr, setAssigningMgr] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, t, tags, mgrs] = await Promise.all([listExecutives(), listExecutivesWithTags(), listTags(), listManagers()]);
      setExecs(r?.items || r?.executives || r || []);
      setExecsWithTags(t?.items || t || []);
      setAllTags(tags?.items || tags || []);
      const mgrList = mgrs?.items || mgrs?.managers || mgrs || [];
      setManagers(mgrList);
      // Build executive → manager map
      const map = new Map<string, { id: string; name: string }>();
      await Promise.all(mgrList.map(async (m: any) => {
        try {
          const team = await getManagerTeam(m.id || m.manager_id);
          const executives = team?.executives || team?.items || [];
          for (const ex of executives) {
            map.set(ex.id || ex.executive_id, { id: m.id || m.manager_id, name: m.full_name || m.name });
          }
        } catch {}
      }));
      setExecManagerMap(map);
    } finally { setLoading(false); }
  };
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
        if (createManagerId) {
          try { await assignExecutiveToManager(createManagerId, execId); } catch {}
        }
      }
      toast.success('Executive(Article) created');
      setForm({ full_name: '', email: '', password: '' });
      setSelectedManager('');
      setSelectedLocation('');
      setCreateManagerId('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleAssignManager = async () => {
    if (!assignMgrId || !assignExec) return;
    setAssigningMgr(true);
    try {
      await assignExecutiveToManager(assignMgrId, assignExec.id || assignExec.executive_id);
      toast.success('Manager assigned successfully');
      setShowAssignMgr(false);
      setAssignMgrId('');
      setAssignMgrSearch('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to assign manager');
    } finally {
      setAssigningMgr(false);
    }
  };

  const filteredAssignManagers = managers.filter((m: any) => {
    if (!assignMgrSearch) return true;
    const q = assignMgrSearch.toLowerCase();
    return (m.full_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q);
  });

  const toggle = async (ex: any) => {
    try { if (ex.is_active) { await deactivateExec(ex.id); toast.success('Deactivated'); } else { await reactivateExec(ex.id); toast.success('Reactivated'); } load(); } catch { toast.error('Failed'); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">Executives(Articles)</h1>
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
                <Button size="sm" variant="outline" onClick={() => { setAssignExec(e); setAssignMgrId(''); setAssignMgrSearch(''); setShowAssignMgr(true); }}>
                  <Users className="h-3 w-3 mr-1" /> {execManagerMap.get(e.id)?.name || 'Assign Manager'}
                </Button>
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
        {!loading && execs.length === 0 && <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No executives(articles) yet.</Card>}
      </div>
      <Card className="rounded-xl p-6 h-fit">
        <div className="flex items-center gap-2 mb-4"><Shield className="h-4 w-4 text-indigo-600" /><h2 className="font-bold text-slate-900">Create Executive(Article)</h2></div>
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
          {managers.length > 0 && (
            <div>
              <Label>Assign to Manager</Label>
              <select value={createManagerId} onChange={(e) => setCreateManagerId(e.target.value)} className="mt-1.5 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                <option value="">Select Manager</option>
                {managers.map((m: any) => <option key={m.id || m.manager_id} value={m.id || m.manager_id}>{m.full_name} ({m.email})</option>)}
              </select>
            </div>
          )}
          <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700">{submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />} Create & Assign</Button>
        </form>
      </Card>

      {/* Assign Manager Dialog */}
      <Dialog open={showAssignMgr} onOpenChange={setShowAssignMgr}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Manager to {assignExec?.full_name || assignExec?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search managers..." value={assignMgrSearch} onChange={(e) => setAssignMgrSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
              {filteredAssignManagers.map((m: any) => {
                const mid = m.id || m.manager_id;
                const selected = assignMgrId === mid;
                return (
                  <div key={mid} className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 ${selected ? 'bg-indigo-50' : ''}`} onClick={() => setAssignMgrId(mid)}>
                    <div>
                      <div className="text-sm font-medium text-slate-900">{m.full_name}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </div>
                    {selected && <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center"><svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                  </div>
                );
              })}
              {filteredAssignManagers.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">No managers found</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignMgr(false)}>Cancel</Button>
            <Button disabled={!assignMgrId || assigningMgr} className="bg-indigo-600 hover:bg-indigo-700" onClick={handleAssignManager}>
              {assigningMgr && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
