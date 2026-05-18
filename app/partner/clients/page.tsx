'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { listClients, listExecutives, assignExecutive } from '@/lib/api';
import { Search, Users, Eye, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientsListPage() {
  const params = useSearchParams();
  const initialStatus = params.get('status') || '';
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [filingStatus, setFilingStatus] = useState(initialStatus);
  const [clients, setClients] = useState<any[]>([]);
  const [execs, setExecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (search) params.search = search;
      if (accountStatus) params.account_status = accountStatus;
      const r = await listClients(params);
      setClients(r?.items || r?.clients || r || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); listExecutives().then((r) => setExecs(r?.items || r?.executives || r || [])).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, accountStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try { await assignExecutive(client_id, executive_id); toast.success('Executive assigned'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const filtered = filingStatus ? clients.filter((c) => (c.current_state || c.filing_state) === filingStatus) : clients;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} total</p>
        </div>
      </div>

      <Card className="rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
          <Select value={accountStatus || 'all'} onValueChange={(v) => setAccountStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Account Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">Pending</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="DEACTIVATED">Deactivated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filingStatus || 'all'} onValueChange={(v) => setFilingStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filing State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Filing States</SelectItem>
              {['INITIATED','ON_BOARDING','PROCESSING','COMPUTATION','FILING','PAYMENT','COMPLETED','HALTED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-xl overflow-hidden p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No clients yet" subtitle="Clients will appear here once they register." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Account</th>
                  <th className="text-left px-5 py-3 font-semibold">Executive</th>
                  <th className="text-left px-5 py-3 font-semibold">Current State</th>
                  <th className="text-left px-5 py-3 font-semibold">Updated</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{c.full_name || c.name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.account_status} /></td>
                    <td className="px-5 py-3">
                      {c.assigned_executive_name || c.executive_name ? (
                        <span className="text-slate-700">{c.assigned_executive_name || c.executive_name}</span>
                      ) : (
                        <Select onValueChange={(v) => onAssign(c.id, v)}>
                          <SelectTrigger className="h-8 w-[160px] text-xs border-amber-300 bg-amber-50 text-amber-700"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                          <SelectContent>{execs.filter((e) => e.is_active !== false).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.name}</SelectItem>)}</SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-5 py-3">{(c.current_state || c.filing_state) ? <StatusBadge status={c.current_state || c.filing_state} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{c.last_updated ? new Date(c.last_updated).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/partner/clients/${c.id}`}><Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
