// @ts-nocheck
'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { listClients, listExecutives, assignExecutive, getPartnerAnalytics, getExecutiveAnalytics, getFilingsByStatus, getActionItems } from '@/lib/api';
import { Search, Users, Eye, IndianRupee, AlertTriangle, CircleDot } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [actionItems, setActionItems] = useState<any[]>([]);

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

      // Fetch COMPUTATION filings for tax payment filter
      if (filingStatus === 'AWAITING_TAX_PAYMENT' || initialStatus === 'AWAITING_TAX_PAYMENT') {
        try {
          const compRes = await getFilingsByStatus('COMPUTATION', 1, 100);
          const items = compRes?.items || compRes?.filings || [];
          setAwaitingTaxRows(items.filter((f: any) => f.is_tax_paid === false));
        } catch { setAwaitingTaxRows([]); }
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); listExecutives().then((r) => setExecs(r?.items || r?.executives || r || [])).catch(() => {}); getActionItems().then((r) => setActionItems(r?.items || [])).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, accountStatus, filingStatus]);

  const onAssign = async (client_id: string, executive_id: string) => {
    try { await assignExecutive(client_id, executive_id); toast.success('Executive(Article) assigned'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold w-[160px]">Financial Year</th>
                  <th className="text-left px-5 py-3 font-semibold">Account</th>
                  {routePrefix === '/partner' && <th className="text-left px-5 py-3 font-semibold">Executive(Article)</th>}
                  <th className="text-left px-5 py-3 font-semibold">Current State</th>
                  <th className="text-left px-5 py-3 font-semibold">Action Required</th>
                  {(filingStatus === 'AWAITING_TAX_PAYMENT' || filingStatus === 'COMPUTATION') && <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>}
                  <th className="text-left px-5 py-3 font-semibold">Updated</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
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
                        <Select value={c.assigned_executive_id || ''} onValueChange={(v) => onAssign(c.id, v)}>
                          <SelectTrigger className={`h-8 w-[160px] text-xs ${c.assigned_executive_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                            <SelectValue placeholder="Unassigned" />
                          </SelectTrigger>
                          <SelectContent>{execs.filter((e) => e.is_active !== false).map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name || e.name}</SelectItem>)}</SelectContent>
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
        )}
      </Card>
    </div>
  );
}
