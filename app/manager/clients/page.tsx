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
import { getMyTeam, listFilings, listExecutives, assignExecutive, getActionItems, getFilingsByStatus, listClients } from '@/lib/api';
import { getUser, getIsElevated } from '@/lib/auth';
import { Search, Users, Eye, IndianRupee, AlertTriangle, CircleDot, ArrowUpDown, ArrowUp, ArrowDown, Clock } from 'lucide-react';
import { toast } from 'sonner';

const FILING_STATES = ['INITIATED', 'DOCUMENT_UPLOAD', 'PROCESSING', 'COMPUTATION', 'FILING', 'PAYMENT', 'COMPLETED', 'HALTED'];

function getFYOptions() {
  const opts: string[] = [];
  const now = new Date();
  const endYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
  for (let y = endYear - 1; y >= 2000; y--) {
    opts.push(`${y}-${y + 1}`);
  }
  return opts;
}

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
  const [accountStatus, setAccountStatus] = useState('');
  const [filingStatus, setFilingStatus] = useState(initialStatus);
  const [financialYear, setFinancialYear] = useState('');
  const [computationSubFilter, setComputationSubFilter] = useState('');
  const [filingDocSubFilter, setFilingDocSubFilter] = useState('');
  const [computationFilings, setComputationFilings] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [filingRows, setFilingRows] = useState<any[]>([]);
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

  const fyOptions = useMemo(() => getFYOptions(), []);

  const load = async () => {
    setLoading(true);
    try {
      const skipFilings = filingStatus === 'ONBOARDED_PENDING_FILING' || filingStatus === 'ACTIVATED_NOT_ONBOARDED';
      const [clientsRes, filingsRes] = await Promise.all([
        listClients({
          page: 1,
          page_size: 100,
          ...(search ? { search } : {}),
          ...(accountStatus ? { account_status: accountStatus } : {}),
          ...(filingStatus === 'ONBOARDED_PENDING_FILING' ? { onboarded_pending_filing: true } : {}),
          ...(filingStatus === 'ACTIVATED_NOT_ONBOARDED' ? { activated_not_onboarded: true } : {}),
        }),
        skipFilings ? Promise.resolve(null) : listFilings({ page: 1, page_size: 100 }).catch(() => null),
      ]);
      setClients(clientsRes?.items || []);

      const fRows: any[] = [];
      for (const f of (filingsRes?.items || filingsRes?.filings || [])) {
        fRows.push({
          client_id: f.client_id,
          financial_year: f.financial_year,
          filing_status: f.status,
          last_updated: f.updated_at,
          assigned_manager_id: f.assigned_manager_id || null,
          assigned_manager_name: f.assigned_manager_name || null,
          assigned_executive_id: f.assigned_executive_id || null,
          assigned_executive_name: f.assigned_executive_name || null,
        });
      }
      setFilingRows(fRows);

      if (filingStatus === 'AWAITING_TAX_PAYMENT' || initialStatus === 'AWAITING_TAX_PAYMENT') {
        try {
          const paymentRes = await getFilingsByStatus('PAYMENT', 1, 100);
          setAwaitingTaxRows(paymentRes?.items || paymentRes?.filings || []);
        } catch { setAwaitingTaxRows([]); }
      }

      if (filingStatus === 'COMPUTATION' || initialStatus === 'COMPUTATION') {
        try {
          const compRes = await getFilingsByStatus('COMPUTATION', 1, 200);
          setComputationFilings(compRes?.items || []);
        } catch { setComputationFilings([]); }
      }
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const isElevated = getIsElevated();

  // On mount: fetch team and action items; load() is handled by the filingStatus/accountStatus effect below
  useEffect(() => {
    if (isElevated) {
      listExecutives().then((r) => {
        const execs = r?.items || r?.executives || r || [];
        setTeamExecs(execs.map((e: any) => ({ ...e, executive_id: e.id || e.executive_id, executive_name: e.full_name || e.executive_name })));
      }).catch(() => {});
    } else {
      getMyTeam().then((r) => setTeamExecs(r?.executives || [])).catch(() => {});
    }
    getActionItems().then((r) => setActionItems(r?.items || [])).catch(() => {});
  }, []);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [filingStatus, accountStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try {
      await assignExecutive(client_id, executive_id);
      toast.success('Executive assigned');
      load();
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to assign executive';
      toast.error(detail);
    }
  };

  // Build expandedRows: one row per client-FY, with current_state from filing data
  const expandedRows = useMemo(() => {
    const clientMap = new Map(clients.map((c: any) => [c.id, c]));
    const seen = new Set<string>();
    const rows: any[] = [];
    for (const fr of filingRows) {
      const key = `${fr.client_id}-${fr.financial_year}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const c = clientMap.get(fr.client_id);
      if (!c) continue;
      rows.push({
        ...c,
        current_state: fr.filing_status,
        _fy: fr.financial_year,
        _rowKey: key,
        assigned_manager_id: c.assigned_manager_id || fr.assigned_manager_id || null,
        assigned_manager_name: c.assigned_manager_name || fr.assigned_manager_name || null,
        assigned_executive_id: c.assigned_executive_id || fr.assigned_executive_id || null,
        assigned_executive_name: c.assigned_executive_name || fr.assigned_executive_name || null,
      });
    }
    // Include clients with no filings
    for (const c of clients) {
      if (!filingRows.some((fr) => fr.client_id === c.id)) {
        rows.push({ ...c, current_state: null, _fy: null, _rowKey: `${c.id}-none` });
      }
    }
    return rows;
  }, [clients, filingRows]);

  // Build computation sub-status lookup: key = client_id-fy -> sub_status
  const computationSubStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of computationFilings) {
      if (f.computation_sub_status) {
        map.set(`${f.client_id}-${f.financial_year}`, f.computation_sub_status);
      }
    }
    return map;
  }, [computationFilings]);

  const computationSubStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const f of computationFilings) {
      if (f.computation_sub_status) set.add(f.computation_sub_status);
    }
    return Array.from(set);
  }, [computationFilings]);

  const FILING_DOC_ACTION_LABELS: Record<string, string> = {
    MANAGER_APPROVE_COMPLETED_DOCS: 'Awaiting Manager Approval',
    PARTNER_APPROVE_COMPLETED_DOCS: 'Awaiting Partner Approval',
    REVISE_COMPLETED_DOC: 'Rejected — Re-upload Required',
  };
  const filingDocSubStatusMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const ai of actionItems) {
      const label = FILING_DOC_ACTION_LABELS[ai.type];
      if (label && ai.related_client_id) map.set(ai.related_client_id, label);
    }
    return map;
  }, [actionItems]);

  const filingDocSubStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const label of filingDocSubStatusMap.values()) set.add(label);
    return Array.from(set);
  }, [filingDocSubStatusMap]);

  // Build filtered rows
  const filtered = useMemo(() => {
    // Special case: ONBOARDED_PENDING_FILING / ACTIVATED_NOT_ONBOARDED are server pre-filtered
    if (filingStatus === 'ONBOARDED_PENDING_FILING' || filingStatus === 'ACTIVATED_NOT_ONBOARDED') {
      const suffix = filingStatus === 'ONBOARDED_PENDING_FILING' ? 'onboarded-pending' : 'activated-not-onboarded';
      let result = clients.map((c: any) => ({ ...c, _rowKey: `${c.id}-${suffix}` }));
      if (search) {
        const q = search.toLowerCase();
        result = result.filter((c: any) => (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
      }
      return result;
    }

    // Special case: AWAITING_TAX_PAYMENT uses data from getFilingsByStatus
    if (filingStatus === 'AWAITING_TAX_PAYMENT') {
      const clientMap = new Map<string, any>();
      for (const c of clients) clientMap.set(c.id, c);
      return awaitingTaxRows
        .filter((f: any) => clientMap.has(f.client_id))
        .map((f: any) => {
          const ci = clientMap.get(f.client_id);
          return {
            id: f.client_id,
            full_name: ci?.full_name || f.client_name,
            email: ci?.email || '',
            phone_number: ci?.phone_number || null,
            account_status: ci?.account_status || 'ACTIVE',
            assigned_manager_id: ci?.assigned_manager_id || null,
            assigned_manager_name: ci?.assigned_manager_name || null,
            assigned_executive_id: ci?.assigned_executive_id || null,
            assigned_executive_name: ci?.assigned_executive_name || null,
            current_state: 'COMPUTATION',
            is_tax_paid: false,
            _fy: f.financial_year,
            _rowKey: `${f.client_id}-${f.financial_year}-tax`,
          };
        });
    }

    let result = expandedRows;
    if (financialYear) result = result.filter((c) => c._fy === financialYear);
    if (filingStatus) result = result.filter((c) => c.current_state === filingStatus);
    if (filingStatus === 'COMPUTATION' && computationSubFilter) {
      result = result.filter((c) => computationSubStatusMap.get(`${c.id}-${c._fy}`) === computationSubFilter);
    }
    if (filingStatus === 'FILING' && filingDocSubFilter) {
      result = result.filter((c) => filingDocSubStatusMap.get(c.id) === filingDocSubFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => (c.full_name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q));
    }
    return result;
  }, [expandedRows, clients, financialYear, filingStatus, awaitingTaxRows, search, computationSubFilter, computationSubStatusMap, filingDocSubFilter, filingDocSubStatusMap]);

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
      const res = await listFilings({ page: 1, page_size: 100 });
      const filings = res?.items || res?.filings || [];
      const map = new Map<string, string>();
      for (const f of filings) {
        const enteredAt = getStateEnteredAt(f.status, f);
        if (enteredAt) map.set(`${f.client_id}-${f.financial_year}`, enteredAt);
      }
      setFilingTimestamps(map);
    } catch {} finally { setLoadingTimestamps(false); }
  };

  const getHoursInState = (row: any) => {
    const key = `${row.id}-${row._fy}`;
    const enteredAt = filingTimestamps.get(key) || row.last_updated;
    if (!enteredAt) return null;
    return Math.max(0, Math.round((Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60)));
  };

  const formatDuration = (hours: number | null) => {
    if (hours === null) return '—';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const rem = hours % 24;
    return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
  };

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
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
        case 'fy': va = a._fy || ''; vb = b._fy || ''; break;
        case 'account': va = a.account_status || ''; vb = b.account_status || ''; break;
        case 'executive': va = (a.assigned_executive_name || 'zzz').toLowerCase(); vb = (b.assigned_executive_name || 'zzz').toLowerCase(); break;
        case 'partner_tag': va = (a.partner_tag_name || 'zzz').toLowerCase(); vb = (b.partner_tag_name || 'zzz').toLowerCase(); break;
        case 'manager': va = (a.assigned_manager_name || 'zzz').toLowerCase(); vb = (b.assigned_manager_name || 'zzz').toLowerCase(); break;
        case 'state': va = a.current_state || ''; vb = b.current_state || ''; break;
        case 'comp_sub': va = (computationSubStatusMap.get(`${a.id}-${a._fy}`) || 'zzz').toLowerCase(); vb = (computationSubStatusMap.get(`${b.id}-${b._fy}`) || 'zzz').toLowerCase(); break;
        case 'filing_doc_sub': va = (filingDocSubStatusMap.get(a.id) || 'zzz').toLowerCase(); vb = (filingDocSubStatusMap.get(b.id) || 'zzz').toLowerCase(); break;
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
          <h1 className="text-2xl font-bold text-slate-900">{isElevated ? 'All Clients' : 'My Clients'}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} client{filtered.length !== 1 ? 's' : ''} {isElevated ? 'firm-wide' : 'assigned to you'}
            {isElevated && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">Firm-wide</span>}
          </p>
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
              {FILING_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
        </div>
      </Card>

      <Card className="rounded-xl overflow-hidden p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading clients…</div>
        ) : filtered.length === 0 ? (
          filingStatus === 'ONBOARDED_PENDING_FILING'
            ? <EmptyState icon={Users} title="No clients pending filing initiation" subtitle="All your onboarded clients have started their filings." />
            : filingStatus === 'ACTIVATED_NOT_ONBOARDED'
            ? <EmptyState icon={Users} title="No clients with incomplete onboarding" subtitle="All your activated clients have submitted their onboarding form." />
            : <EmptyState icon={Users} title="No clients found" subtitle={search ? 'Try a different search term.' : 'No clients have been assigned to you yet.'} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100">
              <Button size="sm" variant={showTimeInState ? 'default' : 'outline'} className="text-xs gap-1" onClick={() => { const next = !showTimeInState; setShowTimeInState(next); if (next) { loadFilingTimestamps(); if (sortCol !== 'time') { setSortCol('time'); setSortDir('desc'); } } else { setTimeThreshold(null); } }}>
                <Clock className="h-3.5 w-3.5" /> {loadingTimestamps ? 'Loading…' : 'Time in State'}
              </Button>
              {showTimeInState && (
                <Select value={timeThreshold !== null ? String(timeThreshold) : 'all'} onValueChange={(v) => setTimeThreshold(v === 'all' ? null : Number(v))}>
                  <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue placeholder="All" /></SelectTrigger>
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
                  <SortHeader col="partner_tag">Partner</SortHeader>
                  {isElevated && <SortHeader col="manager">Manager</SortHeader>}
                  <SortHeader col="executive">Executive</SortHeader>
                  <SortHeader col="state">Current State</SortHeader>
                  {filingStatus === 'COMPUTATION' && <SortHeader col="comp_sub">Sub-Status</SortHeader>}
                  {filingStatus === 'FILING' && <SortHeader col="filing_doc_sub">Doc Status</SortHeader>}
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
                      {c._fy ? `FY ${c._fy}` : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.account_status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-700">{c.partner_tag_name || <span className="text-slate-400">—</span>}</td>
                    {isElevated && (
                      <td className="px-5 py-3 text-xs text-slate-700">{c.assigned_manager_name || <span className="text-slate-400">—</span>}</td>
                    )}
                    <td className="px-5 py-3">
                      {c.assigned_manager_id ? (
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
                      ) : (
                        <Select disabled>
                          <SelectTrigger className="h-8 w-[160px] text-xs border-slate-200 bg-slate-50 text-slate-400">
                            <SelectValue placeholder="Assign manager first" />
                          </SelectTrigger>
                        </Select>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {c.current_state ? <StatusBadge status={c.current_state} /> : <span className="text-xs text-slate-400">—</span>}
                    </td>
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
