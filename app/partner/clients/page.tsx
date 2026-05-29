// @ts-nocheck
'use client';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { listClients, listExecutives, assignExecutive, getPartnerAnalytics, getExecutiveAnalytics, getFilingsByStatus, getActionItems, listManagers, assignClientToManager, getManagerClients, getManagerTeam } from '@/lib/api';
import { Search, Users, Eye, IndianRupee, AlertTriangle, CircleDot, ArrowUpDown, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

function getFYOptions() {
  const opts: string[] = [];
  const now = new Date();
  const endYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  for (let y = endYear - 1; y >= 2000; y--) {
    opts.push(`${y}-${y + 1}`);
  }
  return opts;
}

export default function ClientsListPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>}>
      <ClientsListPage />
    </Suspense>
  );
}

function ClientsListPage() {
  const params = useSearchParams();
  const pathname = usePathname();
  const routePrefix = pathname.startsWith('/executive') ? '/executive' : '/partner';
  const initialStatus = params.get('status') || '';
  const [search, setSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('');
  const [filingStatus, setFilingStatus] = useState(initialStatus);
  const [financialYear, setFinancialYear] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [filingRows, setFilingRows] = useState<any[]>([]); // from analytics: all client-FY-status combos
  const [awaitingTaxRows, setAwaitingTaxRows] = useState<any[]>([]); // computation filings with tax not paid
  const [execs, setExecs] = useState<any[]>([]);
  const [mgrs, setMgrs] = useState<any[]>([]);
  const [clientManagerMap, setClientManagerMap] = useState<Map<string, string>>(new Map());
  const [managerExecsMap, setManagerExecsMap] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [showTimeInState, setShowTimeInState] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fyOptions = useMemo(() => getFYOptions(), []);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (search) params.search = search;
      if (accountStatus) params.account_status = accountStatus;
      const [clientsRes, analyticsRes] = await Promise.all([
        listClients(params),
        (routePrefix === '/executive' ? getExecutiveAnalytics() : getPartnerAnalytics()).catch(() => null),
      ]);
      setClients(clientsRes?.items || clientsRes?.clients || clientsRes || []);

      // Extract all filing rows from analytics filing_status_breakdown
      const rows: any[] = [];
      if (analyticsRes?.filing_status_breakdown) {
        for (const group of analyticsRes.filing_status_breakdown) {
          for (const item of group.clients || []) {
            rows.push({
              client_id: item.client_id,
              client_name: item.client_name,
              financial_year: item.financial_year,
              filing_status: group.status,
              assigned_executive: item.assigned_executive,
              last_updated: item.last_updated,
              is_tax_paid: item.is_tax_paid,
            });
          }
        }
      }
      setFilingRows(rows);

      // Fetch PAYMENT filings for tax payment awaiting section
      if (filingStatus === 'AWAITING_TAX_PAYMENT' || initialStatus === 'AWAITING_TAX_PAYMENT') {
        try {
          const paymentRes = await getFilingsByStatus('PAYMENT', 1, 100);
          const items = paymentRes?.items || paymentRes?.filings || [];
          setAwaitingTaxRows(items);
        } catch { setAwaitingTaxRows([]); }
      }
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    listExecutives().then((r) => setExecs(r?.items || r?.executives || r || [])).catch(() => {});
    listManagers().then(async (r) => {
      const mgrList = r?.items || r?.managers || r || [];
      setMgrs(mgrList);
      // Build client → manager map AND manager → executives map
      const map = new Map<string, string>();
      const execMap = new Map<string, any[]>();
      await Promise.all(mgrList.map(async (m: any) => {
        try {
          const [clientsRes, teamRes] = await Promise.all([
            getManagerClients(m.id, { page: 1, page_size: 100 }),
            getManagerTeam(m.id).catch(() => null),
          ]);
          const items = clientsRes?.items || [];
          for (const c of items) {
            map.set(c.id, m.id);
          }
          if (teamRes?.executives) {
            execMap.set(m.id, teamRes.executives);
          }
        } catch {}
      }));
      setClientManagerMap(map);
      setManagerExecsMap(execMap);
    }).catch(() => {});
    getActionItems().then((r) => setActionItems(r?.items || [])).catch(() => {});
  }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, accountStatus, filingStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try { await assignExecutive(client_id, executive_id); toast.success('Executive assigned'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const onAssignManager = async (client_id: string, manager_id: string) => {
    try {
      await assignClientToManager(manager_id, client_id);
      toast.success('Manager assigned');
      setClientManagerMap((prev) => new Map(prev).set(client_id, manager_id));
      // Ensure we have this manager's team cached for the executive dropdown
      if (!managerExecsMap.has(manager_id)) {
        const team = await getManagerTeam(manager_id).catch(() => null);
        if (team?.executives) {
          setManagerExecsMap((prev) => new Map(prev).set(manager_id, team.executives));
        }
      }
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };


  // Build expanded rows combining clients list + analytics filing data
  const expandedRows = useMemo(() => {
    // Create a map of client details by id (from clients endpoint - has phone, account_status, executive_id)
    const clientMap = new Map<string, any>();
    for (const c of clients) {
      clientMap.set(c.id, c);
    }

    // Build unique filing rows from analytics (has ALL filings including COMPLETED)
    // Key: client_id + financial_year
    const filingMap = new Map<string, any>();
    for (const fr of filingRows) {
      const key = `${fr.client_id}-${fr.financial_year}`;
      filingMap.set(key, fr);
    }

    // Merge: for each filing row from analytics, enrich with client details
    const rows: any[] = [];
    const seen = new Set<string>();

    for (const fr of filingRows) {
      const key = `${fr.client_id}-${fr.financial_year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const clientInfo = clientMap.get(fr.client_id);
      rows.push({
        id: fr.client_id,
        full_name: clientInfo?.full_name || clientInfo?.name || fr.client_name,
        email: clientInfo?.email || fr.client_email || '',
        phone_number: clientInfo?.phone_number || null,
        account_status: clientInfo?.account_status || 'ACTIVE',
        assigned_manager_id: clientInfo?.assigned_manager_id || null,
        assigned_manager_name: clientInfo?.assigned_manager_name || null,
        assigned_executive_id: clientInfo?.assigned_executive_id || null,
        assigned_executive_name: clientInfo?.assigned_executive_name || fr.assigned_executive || null,
        current_state: fr.filing_status,
        last_updated: fr.last_updated || clientInfo?.last_updated,
        _fy: fr.financial_year,
        _rowKey: key,
      });
    }

    // Also add clients that have NO filings at all (not in analytics)
    for (const c of clients) {
      const hasAnyFiling = filingRows.some((fr) => fr.client_id === c.id);
      if (!hasAnyFiling) {
        rows.push({
          ...c,
          _fy: null,
          _rowKey: `${c.id}-none`,
        });
      }
    }

    return rows;
  }, [clients, filingRows]);

  // Apply filters
  const filtered = useMemo(() => {
    // Special case: AWAITING_TAX_PAYMENT uses data from getFilingsByStatus
    if (filingStatus === 'AWAITING_TAX_PAYMENT') {
      const clientMap = new Map<string, any>();
      for (const c of clients) clientMap.set(c.id, c);
      return awaitingTaxRows.map((f: any) => {
        const clientInfo = clientMap.get(f.client_id);
        return {
          id: f.client_id,
          full_name: clientInfo?.full_name || clientInfo?.name || f.client_name,
          email: clientInfo?.email || '',
          phone_number: clientInfo?.phone_number || null,
          account_status: clientInfo?.account_status || 'ACTIVE',
          assigned_manager_id: clientInfo?.assigned_manager_id || null,
          assigned_manager_name: clientInfo?.assigned_manager_name || null,
          assigned_executive_id: clientInfo?.assigned_executive_id || null,
          assigned_executive_name: clientInfo?.assigned_executive_name || f.assigned_executive_name || null,
          current_state: 'COMPUTATION',
          is_tax_paid: false,
          last_updated: f.last_updated || f.updated_at,
          _fy: f.financial_year,
          _rowKey: `${f.client_id}-${f.financial_year}-tax`,
        };
      });
    }

    let result = expandedRows;
    if (financialYear) {
      result = result.filter((c) => c._fy === financialYear);
    }
    if (filingStatus) {
      result = result.filter((c) => (c.current_state || c.filing_state) === filingStatus);
    }
    // Client-side search filter (name or email)
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const name = (c.full_name || c.name || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    return result;
  }, [expandedRows, financialYear, filingStatus, awaitingTaxRows, clients, search]);

  // Build action item lookup by client_id
  const actionItemByClient = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of actionItems) {
      const cid = item.related_client_id;
      if (cid && !map.has(cid)) map.set(cid, item);
    }
    return map;
  }, [actionItems]);

  // Helper: compute hours since last_updated
  const getHoursInState = (lastUpdated: string | null) => {
    if (!lastUpdated) return null;
    const diff = Date.now() - new Date(lastUpdated).getTime();
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
        case 'client': va = (a.full_name || a.name || '').toLowerCase(); vb = (b.full_name || b.name || '').toLowerCase(); break;
        case 'phone': va = a.phone_number || ''; vb = b.phone_number || ''; break;
        case 'fy': va = a._fy || ''; vb = b._fy || ''; break;
        case 'account': va = a.account_status || ''; vb = b.account_status || ''; break;
        case 'manager': va = (mgrs.find((m) => m.id === clientManagerMap.get(a.id))?.full_name || mgrs.find((m) => m.id === clientManagerMap.get(a.id))?.name || 'zzz').toLowerCase(); vb = (mgrs.find((m) => m.id === clientManagerMap.get(b.id))?.full_name || mgrs.find((m) => m.id === clientManagerMap.get(b.id))?.name || 'zzz').toLowerCase(); break;
        case 'executive': va = (a.assigned_executive_name || 'zzz').toLowerCase(); vb = (b.assigned_executive_name || 'zzz').toLowerCase(); break;
        case 'state': va = a.current_state || a.filing_state || ''; vb = b.current_state || b.filing_state || ''; break;
        case 'action': va = actionItemByClient.get(a.id)?.title || 'zzz'; vb = actionItemByClient.get(b.id)?.title || 'zzz'; break;
        case 'time': va = getHoursInState(a.last_updated) ?? 99999; vb = getHoursInState(b.last_updated) ?? 99999; break;
        case 'updated': va = a.last_updated || ''; vb = b.last_updated || ''; break;
        default: return 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir, mgrs, clientManagerMap, actionItemByClient]);

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
              <SelectItem value="AWAITING_TAX_PAYMENT">Awaiting Tax Payment</SelectItem>
              {['INITIATED','DOCUMENT_UPLOAD','PROCESSING','COMPUTATION','FILING','PAYMENT','COMPLETED','HALTED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={financialYear || 'all'} onValueChange={(v) => setFinancialYear(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Financial Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Financial Years</SelectItem>
              {fyOptions.map((fy) => <SelectItem key={fy} value={fy}>{`FY ${fy}`}</SelectItem>)}
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
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
              <Button size="sm" variant={showTimeInState ? 'default' : 'outline'} className="text-xs gap-1" onClick={() => { setShowTimeInState((v) => !v); if (!showTimeInState && sortCol !== 'time') { setSortCol('time'); setSortDir('desc'); } }}>
                <Clock className="h-3.5 w-3.5" /> Time in State
              </Button>
              {sortCol && (
                <Button size="sm" variant="ghost" className="text-xs text-slate-500" onClick={() => { setSortCol(null); setSortDir('asc'); }}>
                  Clear Sort
                </Button>
              )}
            </div>
            <div ref={scrollRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <SortHeader col="client">Client</SortHeader>
                    <SortHeader col="phone">Phone</SortHeader>
                    <SortHeader col="fy" className="w-[160px]">Financial Year</SortHeader>
                    <SortHeader col="account">Account</SortHeader>
                    {routePrefix === '/partner' && <SortHeader col="manager">Manager</SortHeader>}
                    {routePrefix === '/partner' && <SortHeader col="executive">Executive</SortHeader>}
                    <SortHeader col="state">Current State</SortHeader>
                    <SortHeader col="action">Action Required</SortHeader>
                    {showTimeInState && <SortHeader col="time">Time in State</SortHeader>}
                    {(filingStatus === 'AWAITING_TAX_PAYMENT' || filingStatus === 'COMPUTATION') && <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>}
                    <SortHeader col="updated">Updated</SortHeader>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c: any) => (
                    <tr key={c._rowKey} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{c.full_name || c.name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-700">{c.phone_number || <span className="text-xs text-slate-400">—</span>}</td>
                    <td className="px-5 py-3 text-sm text-slate-700">
                      {c._fy ? `FY ${c._fy}` : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.account_status} /></td>
                    {routePrefix === '/partner' && (
                      <td className="px-5 py-3">
                        <Select value={clientManagerMap.get(c.id) || ''} onValueChange={(v) => onAssignManager(c.id, v)}>
                          <SelectTrigger className={`h-8 w-[160px] text-xs ${clientManagerMap.get(c.id) ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>{mgrs.filter((m) => m.is_active !== false).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name || m.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                    )}
                    {routePrefix === '/partner' && (
                      <td className="px-5 py-3">
                        <Select value={c.assigned_executive_id || ''} onValueChange={(v) => onAssign(c.id, v)}>
                          <SelectTrigger className={`h-8 w-[160px] text-xs ${c.assigned_executive_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>{(() => {
                            const mgrId = clientManagerMap.get(c.id);
                            const mgrExecs = mgrId ? managerExecsMap.get(mgrId) : null;
                            const list = mgrExecs || execs;
                            return list.filter((e) => e.is_active !== false).map((e) => <SelectItem key={e.executive_id || e.id} value={e.executive_id || e.id}>{e.executive_name || e.full_name || e.name}</SelectItem>);
                          })()}</SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="px-5 py-3">{(c.current_state || c.filing_state) ? <StatusBadge status={c.current_state || c.filing_state} /> : <span className="text-xs text-slate-400">—</span>}</td>
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
                          const hours = getHoursInState(c.last_updated);
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
                    <td className="px-5 py-3 text-xs text-slate-500">{c.last_updated ? new Date(c.last_updated).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`${routePrefix}/clients/${c.id}`}><Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" /> View</Button></Link>
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
