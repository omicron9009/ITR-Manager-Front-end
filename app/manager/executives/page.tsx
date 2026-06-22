// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getMyTeam, listExecutives, createExecutive, assignExecutive, deactivateExec, reactivateExec, execClients, getMyClients, listClients, managerAssignClient, assignTag, getManagerTags } from '@/lib/api';
import { getUser, getIsElevated } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, UserPlus, Loader2, Users, ArrowRight, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManagerExecutivesPage() {
  const router = useRouter();
  const isElevated = getIsElevated();
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showAssignClient, setShowAssignClient] = useState(false);
  const [selectedExec, setSelectedExec] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      if (isElevated) {
        const r = await listExecutives();
        const execs = r?.items || r?.executives || r || [];
        // Shape firm-wide executives to match team response format
        setTeam({ executives: execs.map((e: any) => ({ ...e, executive_id: e.id || e.executive_id, executive_name: e.full_name || e.executive_name })) });
      } else {
        const r = await getMyTeam();
        setTeam(r);
        const managerId = r?.manager_id;
        if (managerId) {
          try {
            const tags = await getManagerTags(managerId);
            setLocationTags(tags || []);
          } catch {
            setLocationTags([]);
          }
        }
      }
    } catch {
      toast.error('Failed to load team');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) return;
    setSubmitting(true);
    try {
      const newExec = await createExecutive(form);
      const execId = newExec?.id || newExec?.executive_id;
      if (execId && selectedLocation) {
        try { await assignTag(execId, selectedLocation); } catch {}
      }
      toast.success('Executive created and added to your team');
      setForm({ full_name: '', email: '', password: '' });
      setSelectedLocation('');
      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create executive');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClient || !selectedExec) return;
    setAssigning(true);
    try {
      if (isElevated) {
        // Elevated managers use direct assignment (no manager_id needed)
        await assignExecutive(selectedClient, selectedExec.executive_id || selectedExec.id);
      } else {
        const managerId = team?.manager_id;
        await managerAssignClient(managerId, { client_id: selectedClient, executive_id: selectedExec.executive_id || selectedExec.id });
      }
      toast.success('Client assigned successfully');
      setShowAssignClient(false);
      setSelectedClient('');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign client');
    } finally {
      setAssigning(false);
    }
  };

  const openAssignClient = async (exec: any) => {
    setSelectedExec(exec);
    try {
      const r = isElevated
        ? await listClients({ page_size: 100 })
        : await getMyClients({ page_size: 100 });
      setClients(r?.items || []);
    } catch {}
    setShowAssignClient(true);
  };

  const teamExecs = team?.executives || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isElevated ? 'All Executives' : 'My Executives'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {teamExecs.length} executive{teamExecs.length !== 1 ? 's' : ''} {isElevated ? 'firm-wide' : 'in your team'}
            {isElevated && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">Firm-wide</span>}
          </p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowCreate(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Create Executive
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : teamExecs.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <Shield className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900">No executives in your team</h3>
          <p className="text-sm text-slate-500 mt-1">Create an executive to get started.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamExecs.map((exec: any) => (
            <Card key={exec.executive_id || exec.id} className="rounded-xl p-5 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{exec.executive_name || exec.full_name}</h3>
                    <p className="text-xs text-slate-500">{exec.email || ''}</p>
                  </div>
                </div>
                <StatusBadge status={exec.is_active === false ? 'DEACTIVATED' : 'ACTIVE'} size="sm" />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>{exec.client_count ?? exec.active_filings ?? 0} clients / filings</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => openAssignClient(exec)}>
                  <Users className="h-3 w-3 mr-1" /> Assign Client
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => router.push(`/manager/clients?executive_id=${exec.executive_id || exec.id}`)}>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Executive Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Executive</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Enter full name" className="mt-1" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Enter email" className="mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" className="mt-1" />
            </div>
            {locationTags.length > 0 && (
              <div>
                <Label>Location Tag</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {locationTags.map((tag: any) => {
                    const selected = selectedLocation === tag.id;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedLocation(selected ? '' : tag.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          selected ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <MapPin className="h-3 w-3" /> {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Client Dialog */}
      <Dialog open={showAssignClient} onOpenChange={setShowAssignClient}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Client to {selectedExec?.executive_name || selectedExec?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => (
                    <SelectItem key={c.id || c.client_id} value={c.id || c.client_id}>{c.full_name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignClient(false)}>Cancel</Button>
            <Button onClick={handleAssignClient} disabled={assigning || !selectedClient} className="bg-indigo-600 hover:bg-indigo-700">
              {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
