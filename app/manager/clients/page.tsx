// @ts-nocheck
'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { getMyClients, getMyTeam, listFilings, assignExecutive, getActionItems, getFilingsByStatus } from '@/lib/api';
import { Search, Users, Eye, IndianRupee, AlertTriangle, CircleDot, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { toast } from 'sonner';

const FILING_STATES = ['INITIATED', 'DOCUMENT_UPLOAD', 'PROCESSING', 'COMPUTATION', 'FILING', 'PAYMENT', 'COMPLETED', 'HALTED'];

export default function ManagerClientsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>}>
      <ManagerClientsPage />
    </Suspense>
  );
}

function ManagerClientsPage() {
  const params = useSearchParams();
  const initialStatus = params.get('status') || '';
  const [search, setSearch] = useState('');
  const [filingStatus, setFilingStatus] = useState(initialStatus);
  const [clients, setClients] = useState<any[]>([]);
  const [teamExecs, setTeamExecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [awaitingTaxRows, setAwaitingTaxRows] = useState<any[]>([]);
  const [showTimeInState, setShowTimeInState] = useState(false);
  const [timeThreshold, setTimeThreshold] = useState<number | null>(null);
  const [filingTimestamps, setFilingTimestamps] = useState<Map<string, string>>(new Map());
  const [loadingTimestamps, setLoadingTimestamps] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const load = async () => {
    setLoading(true);
    try {
      const r = await getMyClients({ page: 1, page_size: 100 });
      setClients(r?.items || []);

      if (filingStatus === 'AWAITING_TAX_PAYMENT' || initialStatus === 'AWAITING_TAX_PAYMENT') {
        try {
          const paymentRes = await getFilingsByStatus('PAYMENT', 1, 100);
          const items = paymentRes?.items || paymentRes?.filings || [];
          setAwaitingTaxRows(items);
        } catch { setAwaitingTaxRows([]); }
      }
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    getMyTeam().then((r) => setTeamExecs(r?.executives || [])).catch(() => {});
    getActionItems().then((r) => setActionItems(r?.items || [])).catch(() => {});
  }, []);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [filingStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try {
      await assignExecutive(client_id, executive_id);
      toast.success('Executive assigned');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to assign');
    }
  };

  // Build filtered rows
  const filtered = useMemo(() => {
    let result = clients;

    // Special case: AWAITING_TAX_PAYMENT uses data from getFilingsByStatus
    if (filingStatus === 'AWAITING_TAX_PAYMENT') {
      const clientMap = new Map<string, any>();
      for (const c of clients) clientMap.set(c.id, c);
      // Only show awaiting-tax rows for clients that belong to this manager
      return awaitingTaxRows
        .filter((f: any) => clientMap.has(f.client_id))
        .map((f: any) => {
          const clientInfo = clientMap.get(f.client_id);
          return {
            id: f.client_id,
            full_name: clientInfo?.full_name || f.client_name,
            email: clientInfo?.email || '',
            phone_number: clientInfo?.phone_number || null,
            account_status: clientInfo?.account_status || 'ACTIVE',
            assigned_executive_id: clientInfo?.assigned_executive_id || null,
            assigned_executive_name: clientInfo?.assigned_executive_name || null,
            current_filing_state: 'COMPUTATION',
            is_tax_paid: false,
            active_filing_year: f.financial_year,
            _rowKey: `${f.client_id}-${f.financial_year}-tax`,
          };
        });
    }

    if (filingStatus) {
      result = result.filter((c) => (c.current_filing_state) === filingStatus);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = (c.full_name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return result;
  }, [clients, filingStatus, awaitingTaxRows, search]);

  // Build action item lookup by client_id
  const actionItemByClient = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of actionItems) {
      const cid = item.related_client_id;
      if (cid && !map.has(cid)) map.set(cid, item);
    }
    return map;
  }, [actionItems]);

  // Helper: get the timestamp when filing entered its current state
  const getStateEnteredAt = (status: string, filing: any): string | null => {
    switch (status) {
      case 'INITIATED': return filing.initiated_at;
      case 'DOCUMENT_UPLOAD': return filing.engagement_accepted_at || filing.initiated_at;
      case 'PROCESSING': return filing.documents_submitted_at;
      case 'COMPUTATION': return filing.documents_approved_at || filing.documents_submitted_at;
      case 'FILING': return filing.computation_approved_at;
      case 'PAYMENT': return filing.filed_at;
      case 'COMPLETED': return filing.completed_at;
      case 'HALTED': return filing.halted_at;
      default: return filing.updated_at;
    }
  };

  // Fetch filing timestamps when Time in State is activated
  const loadFilingTimestamps = async () => {
    setLoadingTimestamps(true);
    try {
      const res = await listFilings({ page: 1, page_size: 500 });
      const filings = res?.items || res?.filings || [];
      const map = new Map<string, string>();
      for (const f of filings) {
        const key = `${f.client_id}-${f.financial_year}`;
        const enteredAt = getStateEnteredAt(f.status, f);
        if (enteredAt) map.set(key, enteredAt);
      }
      setFilingTimestamps(map);
    } catch {} finally { setLoadingTimestamps(false); }
  };

  // Helper: compute hours in state using accurate timestamps
  const getHoursInState = (row: any) => {
    const key = `${row.id}-${row.active_filing_year}`;
    const enteredAt = filingTimestamps.get(key) || row.last_updated;
    if (!enteredAt) return null;
    const diff = Date.now() - new Date(enteredAt).getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60)));
  };

  const formatDuration = (hours: number | null) => {
    if (hours === null) return '—';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
  };

  // Sorting logic
  const toggleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let va: any, vb: any;
      switch (sortCol) {
        case 'client': va = (a.full_name || '').toLowerCase(); vb = (b.full_name || '').toLowerCase(); break;
        case 'phone': va = a.phone_number || ''; vb = b.phone_number || ''; break;
        case 'fy': va = a.active_filing_year || ''; vb = b.active_filing_year || ''; break;
        case 'account': va = a.account_status || ''; vb = b.account_status || ''; break;
        case 'executive': va = (a.assigned_executive_name || 'zzz').toLowerCase(); vb = (b.assigned_executive_name || 'zzz').toLowerCase(); break;
        case 'state': va = a.current_filing_state || ''; vb = b.current_filing_state || ''; break;
        case 'action': va = actionItemByClient.get(a.id)?.title || 'zzz'; vb = actionItemByClient.get(b.id)?.title || 'zzz'; break;
        case 'time': va = getHoursInState(a) ?? 99999; vb = getHoursInState(b) ?? 99999; break;
        default: return 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir, actionItemByClient]);

  // Apply time threshold filter
  const displayRows = useMemo(() => {
    if (!timeThreshold || !showTimeInState) return sorted;
    return sorted.filter((row) => {
      const hours = getHoursInState(row);
      return hours !== null && hours >= timeThreshold;
    });
  }, [sorted, timeThreshold, showTimeInState, filingTimestamps]);

  const SortHeader = ({ col, children, className = '' }: { col: string; children: React.ReactNode; className?: string }) => (
    <th className={`text-left px-5 py-3 font-semibold cursor-pointer select-none hover:text-indigo-700 transition-colors ${className}`} onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {sortCol === col ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-30" />}
      </span>
    </th>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{filtered.length} client{filtered.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
      </div>

      <Card className="rounded-xl p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
          </div>
          <Select value={filingStatus || 'all'} onValueChange={(v) => setFilingStatus(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filing State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Filing States</SelectItem>
              <SelectItem value="AWAITING_TAX_PAYMENT">Awaiting Tax Payment</SelectItem>
              {FILING_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-xl overflow-hidden p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No clients found" subtitle={search ? 'Try a different search term.' : 'No clients have been assigned to you yet.'} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
              <Button size="sm" variant={showTimeInState ? 'default' : 'outline'} className="text-xs gap-1" onClick={() => { const next = !showTimeInState; setShowTimeInState(next); if (next) { loadFilingTimestamps(); if (sortCol !== 'time') { setSortCol('time'); setSortDir('desc'); } } else { setTimeThreshold(null); } }}>
                <Clock className="h-3.5 w-3.5" /> {loadingTimestamps ? 'Loading…' : 'Time in State'}
              </Button>
              {showTimeInState && (
                <Select value={timeThreshold !== null ? String(timeThreshold) : 'all'} onValueChange={(v) => setTimeThreshold(v === 'all' ? null : Number(v))}>
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="24">&gt; 24 hours</SelectItem>
                    <SelectItem value="48">&gt; 48 hours</SelectItem>
                    <SelectItem value="72">&gt; 3 days</SelectItem>
                    <SelectItem value="168">&gt; 7 days</SelectItem>
                    <SelectItem value="336">&gt; 14 days</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {sortCol && (
                <Button size="sm" variant="ghost" className="text-xs text-slate-500" onClick={() => { setSortCol(null); setSortDir('asc'); }}>
                  Clear Sort
                </Button>
              )}
            </div>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                <tr>
                  <SortHeader col="client">Client</SortHeader>
                  <SortHeader col="phone">Phone</SortHeader>
                  <SortHeader col="fy">FY</SortHeader>
                  <SortHeader col="account">Account</SortHeader>
                  <SortHeader col="executive">Executive</SortHeader>
                  <SortHeader col="state">Current State</SortHeader>
                  <SortHeader col="action">Action Required</SortHeader>
                  {showTimeInState && <SortHeader col="time">Time in State</SortHeader>}
                  {(filingStatus === 'AWAITING_TAX_PAYMENT' || filingStatus === 'COMPUTATION') && (
                    <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>
                  )}
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((c: any) => (
                  <tr key={c._rowKey || c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{c.full_name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{c.phone_number || <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {c.active_filing_year ? `FY ${c.active_filing_year}` : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.account_status} /></td>
                    <td className="px-5 py-3">
                      <Select value={c.assigned_executive_id || ''} onValueChange={(v) => onAssign(c.id, v)}>
                        <SelectTrigger className={`h-8 w-[160px] text-xs ${c.assigned_executive_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamExecs.map((e: any) => (
                            <SelectItem key={e.executive_id || e.id} value={e.executive_id || e.id}>
                              {e.executive_name || e.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3">
                      {c.current_filing_state ? <StatusBadge status={c.current_filing_state} /> : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {(() => {
                        const ai = actionItemByClient.get(c.id);
                        if (!ai) return <span className="text-xs text-slate-400">—</span>;
                        const colors = ai.priority === 'HIGH' ? 'bg-red-50 text-red-700 ring-red-200' : ai.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-slate-50 text-slate-600 ring-slate-200';
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${colors}`}>
                            <CircleDot className="h-3 w-3" /> {ai.title?.length > 25 ? ai.title.slice(0, 25) + '…' : ai.title}
                          </span>
                        );
                      })()}
                    </td>
                    {showTimeInState && (
                      <td className="px-5 py-3">
                        {(() => {
                          const hours = getHoursInState(c);
                          const bg = hours !== null && hours > 72 ? 'text-red-600 font-medium' : hours !== null && hours > 24 ? 'text-amber-600 font-medium' : 'text-slate-600';
                          return <span className={`text-xs ${bg}`}>{formatDuration(hours)}</span>;
                        })()}
                      </td>
                    )}
                    {(filingStatus === 'AWAITING_TAX_PAYMENT' || filingStatus === 'COMPUTATION') && (
                      <td className="px-5 py-3">
                        {c.is_tax_paid === true ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <IndianRupee className="h-3 w-3" /> Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertTriangle className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3 text-right">
                      <Link href={`/manager/clients/${c.id}`}><Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
