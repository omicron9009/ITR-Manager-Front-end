// @ts-nocheck
'use client';
import { useEffect, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { listManagers, createManager, getManagerTeam, assignExecutiveToManager, removeExecutiveFromManager, listExecutives, assignClientToManager, removeClientFromManager, getManagerClients, listClients, listTags, assignTagToManager, removeTagFromManager, getManagerTags } from '@/lib/api';
import { toast } from 'sonner';
import { Users, UserPlus, Loader2, Shield, ChevronDown, ChevronUp, X, UserCheck, Clock, Search, MapPin } from 'lucide-react';

export default function PartnerManagersPage() {
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<Record<string, any>>({});
  const [loadingTeam, setLoadingTeam] = useState<string | null>(null);

  // Create: multi-select clients + executives + location tag
  const [createAllClients, setCreateAllClients] = useState<any[]>([]);
  const [createAllExecs, setCreateAllExecs] = useState<any[]>([]);
  const [createSelectedClients, setCreateSelectedClients] = useState<string[]>([]);
  const [createSelectedExecs, setCreateSelectedExecs] = useState<string[]>([]);
  const [createClientSearch, setCreateClientSearch] = useState('');
  const [createExecSearch, setCreateExecSearch] = useState('');
  const [locationTags, setLocationTags] = useState<any[]>([]);
  const [createSelectedLocationTag, setCreateSelectedLocationTag] = useState<string>('');

  // Manager tags data (for expanded view)
  const [managerTagsData, setManagerTagsData] = useState<Record<string, any[]>>({});

  // Assign executive to manager
  const [showAssign, setShowAssign] = useState(false);
  const [assignManagerId, setAssignManagerId] = useState('');
  const [allExecs, setAllExecs] = useState<any[]>([]);
  const [selectedExecId, setSelectedExecId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignExecSearch, setAssignExecSearch] = useState('');

  // Assign client to manager
  const [showAssignClient, setShowAssignClient] = useState(false);
  const [assignClientManagerId, setAssignClientManagerId] = useState('');
  const [allClients, setAllClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [assigningClient, setAssigningClient] = useState(false);
  const [assignClientSearch, setAssignClientSearch] = useState('');

  // Manager clients data
  const [clientData, setClientData] = useState<Record<string, any[]>>({});

  // Manager search
  const [managerSearch, setManagerSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await listManagers();
      const mgrs = r?.items || r?.managers || [];
      setManagers(mgrs);
      // Preload tags for each manager
      for (const mgr of mgrs) {
        const mid = mgr.id || mgr.manager_id;
        if (!managerTagsData[mid]) {
          getManagerTags(mid).then((tags) => {
            setManagerTagsData((prev) => ({ ...prev, [mid]: tags || [] }));
          }).catch(() => {});
        }
      }
    } catch {
      toast.error('Failed to load managers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredManagers = useMemo(() => {
    if (!managerSearch) return managers;
    const q = managerSearch.toLowerCase();
    return managers.filter((m) => (m.full_name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q));
  }, [managers, managerSearch]);

  const openCreate = async () => {
    setForm({ full_name: '', email: '', password: '' });
    setCreateSelectedClients([]);
    setCreateSelectedExecs([]);
    setCreateClientSearch('');
    setCreateExecSearch('');
    setCreateSelectedLocationTag('');
    try {
      const [clientsRes, execsRes, tagsRes] = await Promise.all([
        listClients({ page_size: 100, account_status: 'ACTIVE' }),
        listExecutives(),
        listTags('LOCATION'),
      ]);
      setCreateAllClients(clientsRes?.items || []);
      setCreateAllExecs(execsRes?.items || execsRes?.executives || execsRes || []);
      setLocationTags(tagsRes?.items || tagsRes || []);
    } catch {}
    setShowCreate(true);
  };

  const handleCreate = async (e: any) => {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password) return;
    setSubmitting(true);
    try {
      const res = await createManager(form);
      const newManagerId = res?.id || res?.manager_id;
      toast.success('Manager created successfully');

      // Assign selected executives
      if (newManagerId && createSelectedExecs.length > 0) {
        for (const execId of createSelectedExecs) {
          try { await assignExecutiveToManager(newManagerId, execId); } catch {}
        }
        toast.success(`${createSelectedExecs.length} executive(s) assigned`);
      }

      // Assign selected clients
      if (newManagerId && createSelectedClients.length > 0) {
        for (const clientId of createSelectedClients) {
          try { await assignClientToManager(newManagerId, clientId); } catch {}
        }
        toast.success(`${createSelectedClients.length} client(s) assigned`);
      }

      // Assign location tag
      if (newManagerId && createSelectedLocationTag) {
        try { await assignTagToManager(newManagerId, createSelectedLocationTag); } catch {}
      }

      setShowCreate(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create manager');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCreateClient = (id: string) => {
    setCreateSelectedClients((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleCreateExec = (id: string) => {
    setCreateSelectedExecs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const filteredCreateClients = useMemo(() => {
    if (!createClientSearch) return createAllClients;
    const q = createClientSearch.toLowerCase();
    return createAllClients.filter((c) => (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
  }, [createAllClients, createClientSearch]);

  const filteredCreateExecs = useMemo(() => {
    if (!createExecSearch) return createAllExecs;
    const q = createExecSearch.toLowerCase();
    return createAllExecs.filter((e) => (e.full_name || e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q));
  }, [createAllExecs, createExecSearch]);

  const toggleExpand = async (managerId: string) => {
    if (expandedManager === managerId) {
      setExpandedManager(null);
      return;
    }
    setExpandedManager(managerId);
    if (!teamData[managerId]) {
      setLoadingTeam(managerId);
      try {
        const r = await getManagerTeam(managerId);
        setTeamData((prev) => ({ ...prev, [managerId]: r }));
      } catch {}
      finally { setLoadingTeam(null); }
    }
    loadManagerClients(managerId);
    loadManagerTags(managerId);
  };

  const loadManagerTags = async (managerId: string) => {
    if (!managerTagsData[managerId]) {
      try {
        const r = await getManagerTags(managerId);
        setManagerTagsData((prev) => ({ ...prev, [managerId]: r || [] }));
      } catch {}
    }
  };

  const handleRemoveManagerTag = async (managerId: string, tagId: string) => {
    try {
      await removeTagFromManager(managerId, tagId);
      toast.success('Location tag removed');
      const r = await getManagerTags(managerId);
      setManagerTagsData((prev) => ({ ...prev, [managerId]: r || [] }));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to remove tag');
    }
  };

  const openAssign = async (managerId: string) => {
    setAssignManagerId(managerId);
    setAssignExecSearch('');
    try {
      const r = await listExecutives();
      setAllExecs(r?.items || r?.executives || r || []);
    } catch {}
    setShowAssign(true);
  };

  const filteredAssignExecs = useMemo(() => {
    if (!assignExecSearch) return allExecs;
    const q = assignExecSearch.toLowerCase();
    return allExecs.filter((e) => (e.full_name || e.name || '').toLowerCase().includes(q) || (e.email || '').toLowerCase().includes(q));
  }, [allExecs, assignExecSearch]);

  const handleAssign = async () => {
    if (!selectedExecId || !assignManagerId) return;
    setAssigning(true);
    try {
      await assignExecutiveToManager(assignManagerId, selectedExecId);
      toast.success('Executive assigned to manager');
      setShowAssign(false);
      setSelectedExecId('');
      const r = await getManagerTeam(assignManagerId);
      setTeamData((prev) => ({ ...prev, [assignManagerId]: r }));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign executive');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveExec = async (managerId: string, executiveId: string) => {
    try {
      await removeExecutiveFromManager(managerId, executiveId);
      toast.success('Executive removed from team');
      const r = await getManagerTeam(managerId);
      setTeamData((prev) => ({ ...prev, [managerId]: r }));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to remove executive');
    }
  };

  const openAssignClient = async (managerId: string) => {
    setAssignClientManagerId(managerId);
    setSelectedClientIds([]);
    setAssignClientSearch('');
    try {
      const r = await listClients({ page_size: 100, account_status: 'ACTIVE' });
      setAllClients(r?.items || []);
    } catch (err: any) {
      toast.error('Failed to load clients');
    }
    setShowAssignClient(true);
  };

  const filteredAssignClients = useMemo(() => {
    if (!assignClientSearch) return allClients;
    const q = assignClientSearch.toLowerCase();
    return allClients.filter((c) => (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone_number || '').includes(q));
  }, [allClients, assignClientSearch]);

  const toggleAssignClient = (id: string) => {
    setSelectedClientIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleAssignClient = async () => {
    if (selectedClientIds.length === 0 || !assignClientManagerId) return;
    setAssigningClient(true);
    try {
      for (const clientId of selectedClientIds) {
        await assignClientToManager(assignClientManagerId, clientId);
      }
      toast.success(`${selectedClientIds.length} client(s) assigned to manager`);
      setShowAssignClient(false);
      setSelectedClientIds([]);
      const r = await getManagerClients(assignClientManagerId);
      setClientData((prev) => ({ ...prev, [assignClientManagerId]: r?.items || [] }));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign client');
    } finally {
      setAssigningClient(false);
    }
  };

  const handleRemoveClient = async (managerId: string, clientId: string) => {
    try {
      await removeClientFromManager(managerId, clientId);
      toast.success('Client unassigned from manager');
      const r = await getManagerClients(managerId);
      setClientData((prev) => ({ ...prev, [managerId]: r?.items || [] }));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to unassign client');
    }
  };

  const loadManagerClients = async (managerId: string) => {
    if (!clientData[managerId]) {
      try {
        const r = await getManagerClients(managerId);
        setClientData((prev) => ({ ...prev, [managerId]: r?.items || [] }));
      } catch {}
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Managers</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage managers. Assign executives and clients to their teams.</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
          <UserPlus className="h-4 w-4 mr-1" /> Create Manager
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Search managers…" value={managerSearch} onChange={(e) => setManagerSearch(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : filteredManagers.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-900">No managers found</h3>
          <p className="text-sm text-slate-500 mt-1">{managerSearch ? 'Try a different search term.' : 'Create your first manager to start organizing executives into teams.'}</p>
        </Card>
      ) : (
        <Card className="rounded-xl overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-5 py-3 font-semibold w-8"></th>
                <th className="text-left px-5 py-3 font-semibold">Manager</th>
                <th className="text-left px-5 py-3 font-semibold">Email</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Executives</th>
                <th className="text-left px-5 py-3 font-semibold">Clients</th>
              </tr>
            </thead>
            <tbody>
              {filteredManagers.map((mgr: any) => {
                const id = mgr.id || mgr.manager_id;
                const isExpanded = expandedManager === id;
                const team = teamData[id];
                const teamExecs = team?.executives || [];
                const mgrClients = clientData[id] || [];
                const mgrTags = managerTagsData[id] || [];

                return (
                  <>
                    <tr key={id} className="border-t border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={() => toggleExpand(id)}>
                      <td className="px-5 py-3">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">{mgr.full_name}</span>
                            {mgrTags.length > 0 && (
                              <div className="flex items-center gap-1 mt-0.5">
                                {mgrTags.map((t: any) => (
                                  <span key={t.id} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                                    <MapPin className="h-2.5 w-2.5" />{t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{mgr.email}</td>
                      <td className="px-5 py-3"><StatusBadge status={mgr.account_status || (mgr.is_active === false ? 'DEACTIVATED' : 'ACTIVE')} size="sm" /></td>
                      <td className="px-5 py-3 text-slate-600">{mgr.team_count ?? mgr.executive_count ?? teamExecs.length ?? '—'}</td>
                      <td className="px-5 py-3 text-slate-600">{mgr.client_count ?? mgrClients.length ?? '—'}</td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${id}-expanded`}>
                        <td colSpan={6} className="px-0 py-0 bg-slate-50/30">
                          <div className="px-8 py-5 border-t border-slate-200">
                            {loadingTeam === id ? (
                              <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin text-indigo-600 mx-auto" /></div>
                            ) : (
                              <div className="space-y-5">
                                {/* Location Tags */}
                                {mgrTags.length > 0 && (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-semibold text-slate-500 uppercase">Location:</span>
                                    {mgrTags.map((t: any) => (
                                      <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                                        <MapPin className="h-3 w-3" /> {t.name}
                                        <button className="ml-1 text-blue-400 hover:text-rose-500" onClick={(e) => { e.stopPropagation(); handleRemoveManagerTag(id, t.id); }}>
                                          <X className="h-3 w-3" />
                                        </button>
                                      </span>
                                    ))}
                                  </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Team Executives */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                      <Shield className="h-4 w-4 text-indigo-500" /> Team Executives ({teamExecs.length})
                                    </h4>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAssign(id); }}>
                                      <UserPlus className="h-3 w-3 mr-1" /> Assign
                                    </Button>
                                  </div>
                                  {teamExecs.length === 0 ? (
                                    <p className="text-sm text-slate-500">No executives assigned yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                                      {teamExecs.map((exec: any) => (
                                        <div key={exec.executive_id || exec.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                                          <div>
                                            <p className="text-sm font-medium text-slate-900">{exec.executive_name || exec.full_name}</p>
                                            <p className="text-xs text-slate-500">{exec.email || ''}</p>
                                          </div>
                                          <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50 h-7 w-7 p-0"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveExec(id, exec.executive_id || exec.id); }}>
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Assigned Clients */}
                                <div>
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                                      <UserCheck className="h-4 w-4 text-emerald-500" /> Assigned Clients ({mgrClients.length})
                                    </h4>
                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openAssignClient(id); }}>
                                      <UserPlus className="h-3 w-3 mr-1" /> Assign
                                    </Button>
                                  </div>
                                  {mgrClients.length === 0 ? (
                                    <p className="text-sm text-slate-500">No clients assigned yet.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                                      {mgrClients.map((client: any) => (
                                        <div key={client.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                                          <div>
                                            <p className="text-sm font-medium text-slate-900">{client.full_name}</p>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-500">{client.email}</span>
                                              {client.assignment_status === 'ASSIGNED' ? (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">{client.assigned_executive_name}</span>
                                              ) : (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded-full flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Pending</span>
                                              )}
                                            </div>
                                          </div>
                                          <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50 h-7 w-7 p-0"
                                            onClick={(e) => { e.stopPropagation(); handleRemoveClient(id, client.id); }}>
                                            <X className="h-3.5 w-3.5" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Create Manager Dialog - with multi-select clients + executives */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Manager</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            {/* Location Tag */}
            <div>
              <Label className="mb-2 block">Location Tag</Label>
              <div className="flex flex-wrap gap-2">
                {locationTags.length === 0 ? (
                  <p className="text-sm text-slate-500">No location tags available. Create one in Tags management.</p>
                ) : locationTags.map((tag: any) => {
                  const selected = createSelectedLocationTag === tag.id;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setCreateSelectedLocationTag(selected ? '' : tag.id)}
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

            {/* Assign Executives during creation */}
            <div>
              <Label className="mb-2 block">Assign Executives ({createSelectedExecs.length} selected)</Label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search executives…" value={createExecSearch} onChange={(e) => setCreateExecSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="border rounded-lg max-h-[160px] overflow-y-auto">
                {filteredCreateExecs.length === 0 ? (
                  <p className="text-sm text-slate-500 p-3 text-center">No executives found</p>
                ) : filteredCreateExecs.map((e: any) => {
                  const eid = e.id || e.executive_id;
                  const checked = createSelectedExecs.includes(eid);
                  return (
                    <label key={eid} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${checked ? 'bg-indigo-50/50' : ''}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleCreateExec(eid)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{e.full_name || e.name}</p>
                        <p className="text-xs text-slate-500 truncate">{e.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Assign Clients during creation */}
            <div>
              <Label className="mb-2 block">Assign Clients ({createSelectedClients.length} selected)</Label>
              <div className="relative mb-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search clients by name, email…" value={createClientSearch} onChange={(e) => setCreateClientSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="border rounded-lg max-h-[160px] overflow-y-auto">
                {filteredCreateClients.length === 0 ? (
                  <p className="text-sm text-slate-500 p-3 text-center">No clients found</p>
                ) : filteredCreateClients.map((c: any) => {
                  const cid = c.id || c.client_id;
                  const checked = createSelectedClients.includes(cid);
                  return (
                    <label key={cid} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${checked ? 'bg-indigo-50/50' : ''}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleCreateClient(cid)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{c.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Create Manager
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Executive Dialog - with search */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Executive to Manager</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search &amp; Select Executive</Label>
              <div className="relative mt-1 mb-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search executives…" value={assignExecSearch} onChange={(e) => setAssignExecSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="border rounded-lg max-h-[240px] overflow-y-auto">
                {filteredAssignExecs.length === 0 ? (
                  <p className="text-sm text-slate-500 p-3 text-center">No executives found</p>
                ) : filteredAssignExecs.map((e: any) => {
                  const eid = e.id || e.executive_id;
                  return (
                    <label key={eid} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedExecId === eid ? 'bg-indigo-50' : ''}`}
                      onClick={() => setSelectedExecId(eid)}>
                      <input type="radio" name="exec" checked={selectedExecId === eid} onChange={() => setSelectedExecId(eid)} className="accent-indigo-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{e.full_name || e.name}</p>
                        <p className="text-xs text-slate-500 truncate">{e.email}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={assigning || !selectedExecId} className="bg-indigo-600 hover:bg-indigo-700">
              {assigning && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Client to Manager Dialog - with search + multi-select */}
      <Dialog open={showAssignClient} onOpenChange={setShowAssignClient}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign Clients to Manager</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search &amp; Select Clients ({selectedClientIds.length} selected)</Label>
              <div className="relative mt-1 mb-2">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Search by name, email, or phone…" value={assignClientSearch} onChange={(e) => setAssignClientSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                {filteredAssignClients.length === 0 ? (
                  <p className="text-sm text-slate-500 p-3 text-center">No clients found</p>
                ) : filteredAssignClients.map((c: any) => {
                  const cid = c.id || c.client_id;
                  const checked = selectedClientIds.includes(cid);
                  return (
                    <label key={cid} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${checked ? 'bg-indigo-50/50' : ''}`}>
                      <Checkbox checked={checked} onCheckedChange={() => toggleAssignClient(cid)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{c.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{c.email}{c.phone_number ? ` · ${c.phone_number}` : ''}</p>
                      </div>
                      {c.assigned_executive_name && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full flex-shrink-0">{c.assigned_executive_name}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignClient(false)}>Cancel</Button>
            <Button onClick={handleAssignClient} disabled={assigningClient || selectedClientIds.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {assigningClient && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign {selectedClientIds.length > 0 ? `(${selectedClientIds.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
