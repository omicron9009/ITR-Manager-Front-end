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
import { listClients, listExecutives, listFilings, assignExecutive, getPartnerAnalytics, getExecutiveAnalytics, getFilingsByStatus, getActionItems, listManagers, assignClientToManager, getManagerTeam, listTags, setClientPartnerTag, getClient } from '@/lib/api';
import { Search, Users, Eye, IndianRupee, AlertTriangle, CircleDot, ArrowUpDown, Clock, ArrowUp, ArrowDown, Tag } from 'lucide-react';
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
  const [computationSubFilter, setComputationSubFilter] = useState('');
  const [filingDocSubFilter, setFilingDocSubFilter] = useState('');
  const [computationFilings, setComputationFilings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filingRows, setFilingRows] = useState<any[]>([]); // from analytics: all client-FY-status combos
  const [awaitingTaxRows, setAwaitingTaxRows] = useState<any[]>([]); // computation filings with tax not paid
  const [execs, setExecs] = useState<any[]>([]);
  const [mgrs, setMgrs] = useState<any[]>([]);
  const [managerExecsMap, setManagerExecsMap] = useState<Map<string, any[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [showTimeInState, setShowTimeInState] = useState(false);
  const [timeThreshold, setTimeThreshold] = useState<number | null>(null); // hours threshold filter
  const [filingTimestamps, setFilingTimestamps] = useState<Map<string, string>>(new Map()); // key: client_id-fy -> state_entered_at
  const [loadingTimestamps, setLoadingTimestamps] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [partnerTags, setPartnerTags] = useState<any[]>([]);
  const [partnerTagFilter, setPartnerTagFilter] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const fyOptions = useMemo(() => getFYOptions(), []);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, page_size: 100 };
      if (search) params.search = search;
      if (accountStatus) params.account_status = accountStatus;
      if (filingStatus === 'ONBOARDED_PENDING_FILING') params.onboarded_pending_filing = true;
      if (filingStatus === 'ACTIVATED_NOT_ONBOARDED') params.activated_not_onboarded = true;
      // partner_tag_id is filtered client-side so we can support an "Unassigned" option.
      const skipAnalytics = filingStatus === 'ONBOARDED_PENDING_FILING' || filingStatus === 'ACTIVATED_NOT_ONBOARDED';
      const [clientsRes, analyticsRes] = await Promise.all([
        listClients(params),
        skipAnalytics ? Promise.resolve(null) : (routePrefix === '/executive' ? getExecutiveAnalytics() : getPartnerAnalytics()).catch(() => null),
      ]);
      const clientList = clientsRes?.items || clientsRes?.clients || clientsRes || [];

      // Enrich clients with partner_tag_id/partner_tag_name from individual profiles
      const enriched = await Promise.all(
        clientList.map(async (c: any) => {
          try {
            const profile = await getClient(c.id);
            return { ...c, partner_tag_id: profile.partner_tag_id || null, partner_tag_name: profile.partner_tag_name || null };
          } catch { return c; }
        })
      );
      setClients(enriched);

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

      // Fetch COMPUTATION filings with sub-status for drill-down
      if (filingStatus === 'COMPUTATION' || initialStatus === 'COMPUTATION') {
        try {
          const compRes = await getFilingsByStatus('COMPUTATION', 1, 200);
          setComputationFilings(compRes?.items || []);
        } catch { setComputationFilings([]); }
      }
    } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    listExecutives().then((r) => setExecs(r?.items || r?.executives || r || [])).catch(() => {});
    listManagers().then(async (r) => {
      const mgrList = r?.items || r?.managers || r || [];
      setMgrs(mgrList);
      // Build manager → executives map only. The client → manager mapping
      // comes directly from each client's `assigned_manager_id` (returned by
      // /api/v1/clients) — we must NOT reconstruct it from
      // getManagerClients() because elevated managers see every client
      // firm-wide, which would overwrite every client's true assignment.
      const execMap = new Map<string, any[]>();
      await Promise.all(mgrList.map(async (m: any) => {
        try {
          const teamRes = await getManagerTeam(m.id).catch(() => null);
          if (teamRes?.executives) {
            execMap.set(m.id, teamRes.executives);
          }
        } catch {}
      }));
      setManagerExecsMap(execMap);
    }).catch(() => {});
    getActionItems().then((r) => setActionItems(r?.items || [])).catch(() => {});
    if (routePrefix === '/partner') {
      listTags('PARTNER').then((r) => setPartnerTags((r?.items || r || []).filter((t: any) => t.is_active !== false))).catch(() => {});
    }
  }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, accountStatus, filingStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try { await assignExecutive(client_id, executive_id); toast.success('Executive assigned'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const onAssignManager = async (client_id: string, manager_id: string) => {
    try {
      await assignClientToManager(manager_id, client_id);
      toast.success('Manager assigned');
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
        partner_tag_id: clientInfo?.partner_tag_id || null,
        partner_tag_name: clientInfo?.partner_tag_name || null,
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

  // Build computation sub-status lookup: key = client_id-fy -> sub_status
  const computationSubStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of computationFilings) {
      if (f.computation_sub_status) {
        const key = `${f.client_id}-${f.financial_year}`;
        map.set(key, f.computation_sub_status);
      }
    }
    return map;
  }, [computationFilings]);

  // Get unique computation sub-statuses for filter dropdown
  const computationSubStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const f of computationFilings) {
      if (f.computation_sub_status) set.add(f.computation_sub_status);
    }
    return Array.from(set);
  }, [computationFilings]);

  // Build filing doc sub-status lookup from action items (for FILING state clients)
  const FILING_DOC_ACTION_LABELS: Record<string, string> = {
    MANAGER_APPROVE_COMPLETED_DOCS: 'Awaiting Manager Approval',
    PARTNER_APPROVE_COMPLETED_DOCS: 'Awaiting Partner Approval',
    REVISE_COMPLETED_DOC: 'Rejected — Re-upload Required',
  };
  const filingDocSubStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ai of actionItems) {
      const label = FILING_DOC_ACTION_LABELS[ai.type];
      if (label && ai.related_client_id) {
        map.set(ai.related_client_id, label);
      }
    }
    return map;
  }, [actionItems]);

  const filingDocSubStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const label of filingDocSubStatusMap.values()) set.add(label);
    return Array.from(set);
  }, [filingDocSubStatusMap]);

  // Apply filters
  const filtered = useMemo(() => {
    // Special case: ONBOARDED_PENDING_FILING / ACTIVATED_NOT_ONBOARDED use server-filtered
    // clients list directly. These clients by definition have no filings, so we skip the
    // analytics merge entirely.
    if (filingStatus === 'ONBOARDED_PENDING_FILING' || filingStatus === 'ACTIVATED_NOT_ONBOARDED') {
      const suffix = filingStatus === 'ONBOARDED_PENDING_FILING' ? 'onboarded-pending' : 'activated-not-onboarded';
      let result = clients.map((c: any) => ({
        ...c,
        _fy: null,
        _rowKey: `${c.id}-${suffix}`,
        current_state: null,
      }));
      if (search) {
        const q = search.toLowerCase();
        result = result.filter((c: any) => {
          const name = (c.full_name || c.name || '').toLowerCase();
          const email = (c.email || '').toLowerCase();
          return name.includes(q) || email.includes(q);
        });
      }
      if (partnerTagFilter === '__unassigned__') {
        result = result.filter((c: any) => !c.partner_tag_id);
      } else if (partnerTagFilter) {
        result = result.filter((c: any) => c.partner_tag_id === partnerTagFilter);
      }
      return result;
    }

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
          partner_tag_id: clientInfo?.partner_tag_id || null,
          partner_tag_name: clientInfo?.partner_tag_name || null,
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
    // Filter by computation sub-status when viewing COMPUTATION filings
    if (filingStatus === 'COMPUTATION' && computationSubFilter) {
      result = result.filter((c) => {
        const key = `${c.id}-${c._fy}`;
        return computationSubStatusMap.get(key) === computationSubFilter;
      });
    }
    // Filter by filing doc sub-status when viewing FILING filings
    if (filingStatus === 'FILING' && filingDocSubFilter) {
      result = result.filter((c) => {
        return filingDocSubStatusMap.get(c.id) === filingDocSubFilter;
      });
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
    // Partner-tag filter (client-side, supports "unassigned")
    if (partnerTagFilter === '__unassigned__') {
      result = result.filter((c) => !c.partner_tag_id);
    } else if (partnerTagFilter) {
      result = result.filter((c) => c.partner_tag_id === partnerTagFilter);
    }
    return result;
  }, [expandedRows, financialYear, filingStatus, awaitingTaxRows, clients, search, computationSubFilter, computationSubStatusMap, filingDocSubFilter, filingDocSubStatusMap, partnerTagFilter]);

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
    const key = `${row.id}-${row._fy}`;
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
        case 'client': va = (a.full_name || a.name || '').toLowerCase(); vb = (b.full_name || b.name || '').toLowerCase(); break;
        case 'phone': va = a.phone_number || ''; vb = b.phone_number || ''; break;
        case 'fy': va = a._fy || ''; vb = b._fy || ''; break;
        case 'account': va = a.account_status || ''; vb = b.account_status || ''; break;
        case 'manager': va = (a.assigned_manager_name || 'zzz').toLowerCase(); vb = (b.assigned_manager_name || 'zzz').toLowerCase(); break;
        case 'executive': va = (a.assigned_executive_name || 'zzz').toLowerCase(); vb = (b.assigned_executive_name || 'zzz').toLowerCase(); break;
        case 'partner_tag': va = (a.partner_tag_name || 'zzz').toLowerCase(); vb = (b.partner_tag_name || 'zzz').toLowerCase(); break;
        case 'state': va = a.current_state || a.filing_state || ''; vb = b.current_state || b.filing_state || ''; break;
        case 'comp_sub': va = (computationSubStatusMap.get(`${a.id}-${a._fy}`) || 'zzz').toLowerCase(); vb = (computationSubStatusMap.get(`${b.id}-${b._fy}`) || 'zzz').toLowerCase(); break;
        case 'filing_doc_sub': va = (filingDocSubStatusMap.get(a.id) || 'zzz').toLowerCase(); vb = (filingDocSubStatusMap.get(b.id) || 'zzz').toLowerCase(); break;
        case 'action': va = actionItemByClient.get(a.id)?.title || 'zzz'; vb = actionItemByClient.get(b.id)?.title || 'zzz'; break;
        case 'time': va = getHoursInState(a) ?? 99999; vb = getHoursInState(b) ?? 99999; break;
        case 'updated': va = a.last_updated || ''; vb = b.last_updated || ''; break;
        default: return 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortCol, sortDir, mgrs, actionItemByClient, computationSubStatusMap]);

  // Apply time threshold filter on top of sorted
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
          <Select value={filingStatus || 'all'} onValueChange={(v) => { setFilingStatus(v === 'all' ? '' : v); setComputationSubFilter(''); setFilingDocSubFilter(''); }}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Filing State" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Filing States</SelectItem>
              <SelectItem value="ACTIVATED_NOT_ONBOARDED">Activated — Not Onboarded</SelectItem>
              <SelectItem value="ONBOARDED_PENDING_FILING">Filing Not Initiated</SelectItem>
              <SelectItem value="AWAITING_TAX_PAYMENT">Awaiting Tax Payment</SelectItem>
              {['INITIATED','DOCUMENT_UPLOAD','PROCESSING','COMPUTATION','FILING','PAYMENT','COMPLETED','HALTED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          {filingStatus === 'COMPUTATION' && computationSubStatuses.length > 0 && (
            <Select value={computationSubFilter || 'all'} onValueChange={(v) => setComputationSubFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[220px] border-violet-200 bg-violet-50/50"><SelectValue placeholder="Sub-Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sub-States</SelectItem>
                {computationSubStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {filingStatus === 'FILING' && filingDocSubStatuses.length > 0 && (
            <Select value={filingDocSubFilter || 'all'} onValueChange={(v) => setFilingDocSubFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[240px] border-orange-200 bg-orange-50/50"><SelectValue placeholder="Doc Approval Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Doc States</SelectItem>
                {filingDocSubStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={financialYear || 'all'} onValueChange={(v) => setFinancialYear(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Financial Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Financial Years</SelectItem>
              {fyOptions.map((fy) => <SelectItem key={fy} value={fy}>{`FY ${fy}`}</SelectItem>)}
            </SelectContent>
          </Select>
          {routePrefix === '/partner' && partnerTags.length > 0 && (
            <Select value={partnerTagFilter || 'all'} onValueChange={(v) => setPartnerTagFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Partner Tag" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Partner Tags</SelectItem>
                <SelectItem value="__unassigned__">Unassigned</SelectItem>
                {partnerTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      <Card className="rounded-xl overflow-hidden p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading clients…</div>
        ) : filtered.length === 0 ? (
          filingStatus === 'ONBOARDED_PENDING_FILING'
            ? <EmptyState icon={Users} title="No clients pending filing initiation" subtitle="All onboarded clients have started their filings." />
            : filingStatus === 'ACTIVATED_NOT_ONBOARDED'
            ? <EmptyState icon={Users} title="No clients with incomplete onboarding" subtitle="All activated clients have submitted their onboarding form." />
            : <EmptyState icon={Users} title="No clients yet" subtitle="Clients will appear here once they register." />
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
            <div ref={scrollRef} className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 z-10">
                  <tr>
                    <SortHeader col="client">Client</SortHeader>
                    <SortHeader col="phone">Phone</SortHeader>
                    <SortHeader col="fy" className="w-[160px]">Financial Year</SortHeader>
                    <SortHeader col="account">Account</SortHeader>
                    <SortHeader col="partner_tag">Partner</SortHeader>
                    {routePrefix === '/partner' && <SortHeader col="manager">Manager</SortHeader>}
                    {routePrefix === '/partner' && <SortHeader col="executive">Executive</SortHeader>}
                    <SortHeader col="state">Current State</SortHeader>
                    {filingStatus === 'COMPUTATION' && <SortHeader col="comp_sub">Sub-Status</SortHeader>}
                    {filingStatus === 'FILING' && <SortHeader col="filing_doc_sub">Doc Status</SortHeader>}
                    <SortHeader col="action">Action Required</SortHeader>
                    {showTimeInState && <SortHeader col="time">Time in State</SortHeader>}
                    {(filingStatus === 'AWAITING_TAX_PAYMENT' || filingStatus === 'COMPUTATION') && <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>}
                    <SortHeader col="updated">Updated</SortHeader>
                    <th className="text-right px-5 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((c: any) => (
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
                    <td className="px-5 py-3">
                      {routePrefix === '/partner' ? (
                        <Select value={c.partner_tag_id || ''} onValueChange={async (v) => { try { await setClientPartnerTag(c.id, v); toast.success('Partner tag updated'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } }}>
                          <SelectTrigger className="h-7 w-[130px] text-xs border-slate-200">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>{partnerTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <span className="text-xs text-slate-700">{c.partner_tag_name || <span className="text-slate-400">—</span>}</span>
                      )}
                    </td>
                    {routePrefix === '/partner' && (
                      <td className="px-5 py-3">
                        <Select value={c.assigned_manager_id || ''} onValueChange={(v) => onAssignManager(c.id, v)}>
                          <SelectTrigger className={`h-8 w-[160px] text-xs ${c.assigned_manager_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
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
                            const mgrId = c.assigned_manager_id;
                            const mgrExecs = mgrId ? managerExecsMap.get(mgrId) : null;
                            const list = mgrExecs || execs;
                            return list.filter((e) => e.is_active !== false).map((e) => <SelectItem key={e.executive_id || e.id} value={e.executive_id || e.id}>{e.executive_name || e.full_name || e.name}</SelectItem>);
                          })()}</SelectContent>
                        </Select>
                      </td>
                    )}
                    <td className="px-5 py-3">{(c.current_state || c.filing_state) ? <StatusBadge status={c.current_state || c.filing_state} /> : <span className="text-xs text-slate-400">—</span>}</td>
                    {filingStatus === 'COMPUTATION' && (
                      <td className="px-5 py-3">
                        {(() => {
                          const subStatus = computationSubStatusMap.get(`${c.id}-${c._fy}`);
                          if (!subStatus) return <span className="text-xs text-slate-400">—</span>;
                          return (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-100 text-violet-700 ring-1 ring-inset ring-violet-200">
                              {subStatus}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    {filingStatus === 'FILING' && (
                      <td className="px-5 py-3">
                        {(() => {
                          const docSub = filingDocSubStatusMap.get(c.id);
                          if (!docSub) return <span className="text-xs text-slate-400">—</span>;
                          const colors = docSub.includes('Rejected') ? 'bg-rose-100 text-rose-700 ring-rose-200' : docSub.includes('Partner') ? 'bg-teal-100 text-teal-700 ring-teal-200' : 'bg-orange-100 text-orange-700 ring-orange-200';
                          return (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ring-inset ${colors}`}>
                              {docSub}
                            </span>
                          );
                        })()}
                      </td>
                    )}
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
