// @ts-nocheck
'use client';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { listAudit } from '@/lib/api';
import { toast } from 'sonner';
import {
  Download, Loader2, Search, ChevronLeft, ChevronRight, RefreshCcw,
  UserPlus, UserCheck, UserX, UserMinus, Users, FilePlus, FileCheck2, FileX2, FileText,
  Upload, CheckCircle2, XCircle, ClipboardList, Settings2, Pencil, Trash2, Calculator,
  IndianRupee, Receipt, Type, Activity,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Event metadata: human label, colour, icon, category. Keep keys aligned with
// AuditEventType enum from the OpenAPI spec.
// ─────────────────────────────────────────────────────────────────────────────
type EventMeta = { label: string; tone: string; icon: any; category: string };

const EVENT_META: Record<string, EventMeta> = {
  // Accounts
  ACCOUNT_REGISTERED:    { label: 'Account Registered',    tone: 'bg-amber-50 text-amber-700 border-amber-200',     icon: UserPlus,  category: 'Accounts' },
  ACCOUNT_ACTIVATED:     { label: 'Account Activated',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: UserCheck, category: 'Accounts' },
  ACCOUNT_REJECTED:      { label: 'Account Rejected',      tone: 'bg-rose-50 text-rose-700 border-rose-200',         icon: UserX,     category: 'Accounts' },
  ACCOUNT_DEACTIVATED:   { label: 'Account Deactivated',   tone: 'bg-slate-100 text-slate-700 border-slate-200',     icon: UserMinus, category: 'Accounts' },
  ACCOUNT_REACTIVATED:   { label: 'Account Reactivated',   tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: UserCheck, category: 'Accounts' },
  // Staff
  EXECUTIVE_CREATED:     { label: 'Executive Created',     tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',   icon: UserPlus,  category: 'Staff' },
  EXECUTIVE_ASSIGNED:    { label: 'Executive Assigned',    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',   icon: Users,     category: 'Staff' },
  EXECUTIVE_UNASSIGNED:  { label: 'Executive Unassigned',  tone: 'bg-slate-100 text-slate-700 border-slate-200',     icon: UserMinus, category: 'Staff' },
  MANAGER_CREATED:       { label: 'Manager Created',       tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',   icon: UserPlus,  category: 'Staff' },
  MANAGER_EXECUTIVE_ASSIGNED:   { label: 'Manager → Executive Assigned',   tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Users, category: 'Staff' },
  MANAGER_EXECUTIVE_UNASSIGNED: { label: 'Manager → Executive Unassigned', tone: 'bg-slate-100 text-slate-700 border-slate-200',   icon: UserMinus, category: 'Staff' },
  MANAGER_CLIENT_ASSIGNED:      { label: 'Manager → Client Assigned',     tone: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Users, category: 'Staff' },
  MANAGER_CLIENT_UNASSIGNED:    { label: 'Manager → Client Unassigned',   tone: 'bg-slate-100 text-slate-700 border-slate-200',   icon: UserMinus, category: 'Staff' },
  // Filings
  FILING_INITIATED:      { label: 'Filing Initiated',      tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',   icon: FilePlus,    category: 'Filings' },
  FILING_STATE_CHANGED:  { label: 'Filing State Changed',  tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',   icon: Activity,    category: 'Filings' },
  FILING_HALTED:         { label: 'Filing Halted',         tone: 'bg-rose-50 text-rose-700 border-rose-200',         icon: XCircle,     category: 'Filings' },
  ITR_FILED:             { label: 'ITR Filed',             tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: FileCheck2, category: 'Filings' },
  PAYMENT_RECEIVED:      { label: 'Payment Received',      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: IndianRupee, category: 'Filings' },
  INVOICE_UPLOADED:      { label: 'Invoice Uploaded',      tone: 'bg-blue-50 text-blue-700 border-blue-200',         icon: Receipt,     category: 'Filings' },
  INCOME_HEADS_CONFIRMED:{ label: 'Income Heads Confirmed',tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: ClipboardList, category: 'Filings' },
  // Documents
  DOCUMENT_PLACEHOLDER_CREATED: { label: 'Document Requested',  tone: 'bg-blue-50 text-blue-700 border-blue-200',     icon: ClipboardList, category: 'Documents' },
  DOCUMENT_PLACEHOLDER_REMOVED: { label: 'Document Cancelled',  tone: 'bg-slate-100 text-slate-700 border-slate-200', icon: Trash2,        category: 'Documents' },
  DOCUMENT_UPLOADED:     { label: 'Document Uploaded',     tone: 'bg-blue-50 text-blue-700 border-blue-200',         icon: Upload,        category: 'Documents' },
  DOCUMENT_APPROVED:     { label: 'Document Approved',     tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2,  category: 'Documents' },
  DOCUMENT_REJECTED:     { label: 'Document Rejected',     tone: 'bg-rose-50 text-rose-700 border-rose-200',         icon: XCircle,        category: 'Documents' },
  DOCUMENT_DOWNLOADED:   { label: 'Document Downloaded',   tone: 'bg-slate-50 text-slate-700 border-slate-200',      icon: Download,      category: 'Documents' },
  // Computations
  COMPUTATION_UPLOADED:  { label: 'Computation Uploaded',  tone: 'bg-blue-50 text-blue-700 border-blue-200',         icon: Upload,        category: 'Computations' },
  COMPUTATION_APPROVED:  { label: 'Computation Approved',  tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, category: 'Computations' },
  COMPUTATION_MANAGER_APPROVED: { label: 'Computation Approved (Manager)', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, category: 'Computations' },
  COMPUTATION_PARTNER_APPROVED: { label: 'Computation Approved (Partner)', tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, category: 'Computations' },
  COMPUTATION_MANAGER_REJECTED: { label: 'Computation Rejected (Manager)', tone: 'bg-rose-50 text-rose-700 border-rose-200',          icon: XCircle, category: 'Computations' },
  COMPUTATION_REJECTED:  { label: 'Computation Rejected',  tone: 'bg-rose-50 text-rose-700 border-rose-200',         icon: XCircle,       category: 'Computations' },
  COMPUTATION_SUPERSEDED:{ label: 'Computation Superseded',tone: 'bg-slate-100 text-slate-700 border-slate-200',     icon: Calculator,    category: 'Computations' },
  // Form / Master
  FORM_FIELD_ADDED:      { label: 'Form Field Added',      tone: 'bg-violet-50 text-violet-700 border-violet-200',   icon: FilePlus,   category: 'Configuration' },
  FORM_FIELD_UPDATED:    { label: 'Form Field Updated',    tone: 'bg-violet-50 text-violet-700 border-violet-200',   icon: Pencil,     category: 'Configuration' },
  FORM_FIELD_REMOVED:    { label: 'Form Field Removed',    tone: 'bg-slate-100 text-slate-700 border-slate-200',     icon: Trash2,     category: 'Configuration' },
  MASTER_DOC_TYPE_ADDED:    { label: 'Doc Type Added',     tone: 'bg-violet-50 text-violet-700 border-violet-200',   icon: FilePlus,   category: 'Configuration' },
  MASTER_DOC_TYPE_UPDATED:  { label: 'Doc Type Updated',   tone: 'bg-violet-50 text-violet-700 border-violet-200',   icon: Pencil,     category: 'Configuration' },
  MASTER_DOC_TYPE_REMOVED:  { label: 'Doc Type Removed',   tone: 'bg-slate-100 text-slate-700 border-slate-200',     icon: Trash2,     category: 'Configuration' },
  TEXT_FIELD_TYPE_ADDED:    { label: 'Text Field Type Added',    tone: 'bg-violet-50 text-violet-700 border-violet-200', icon: Type,    category: 'Configuration' },
  TEXT_FIELD_TYPE_UPDATED:  { label: 'Text Field Type Updated',  tone: 'bg-violet-50 text-violet-700 border-violet-200', icon: Pencil,  category: 'Configuration' },
  TEXT_FIELD_TYPE_REMOVED:  { label: 'Text Field Type Removed',  tone: 'bg-slate-100 text-slate-700 border-slate-200',   icon: Trash2,  category: 'Configuration' },
  // Text fields
  TEXT_FIELD_PLACEHOLDER_CREATED: { label: 'Info Field Requested', tone: 'bg-blue-50 text-blue-700 border-blue-200',     icon: ClipboardList, category: 'Text Fields' },
  TEXT_FIELD_PLACEHOLDER_REMOVED: { label: 'Info Field Cancelled', tone: 'bg-slate-100 text-slate-700 border-slate-200', icon: Trash2,        category: 'Text Fields' },
  TEXT_FIELD_FILLED:     { label: 'Info Field Filled',     tone: 'bg-blue-50 text-blue-700 border-blue-200',         icon: Type,         category: 'Text Fields' },
  TEXT_FIELD_APPROVED:   { label: 'Info Field Approved',   tone: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2, category: 'Text Fields' },
  TEXT_FIELD_REJECTED:   { label: 'Info Field Rejected',   tone: 'bg-rose-50 text-rose-700 border-rose-200',         icon: XCircle,      category: 'Text Fields' },
};

const EVENT_OPTIONS = Object.entries(EVENT_META)
  .map(([key, m]) => ({ value: key, label: m.label, category: m.category }))
  .sort((a, b) => (a.category + a.label).localeCompare(b.category + b.label));

const CATEGORIES = ['All', 'Accounts', 'Staff', 'Filings', 'Documents', 'Computations', 'Text Fields', 'Configuration'];

const getMeta = (eventType: string): EventMeta =>
  EVENT_META[eventType] || { label: eventType || 'Unknown Event', tone: 'bg-slate-100 text-slate-700 border-slate-200', icon: Activity, category: 'Other' };

// Pretty key from snake/camel case → Title Case
const prettyKey = (k: string) =>
  k.replace(/[_\-]+/g, ' ')
   .replace(/([a-z])([A-Z])/g, '$1 $2')
   .replace(/\b\w/g, (c) => c.toUpperCase());

// Format a value for display (handles nested objects/arrays compactly)
const formatValue = (v: any): string => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') {
    // ISO date detection
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try { return new Date(v).toLocaleString(); } catch { return v; }
    }
    return v;
  }
  if (Array.isArray(v)) return v.map(formatValue).join(', ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([kk, vv]) => `${prettyKey(kk)}: ${formatValue(vv)}`)
      .join(', ');
  }
  return String(v);
};

// One-line plain-text summary for the table row
const summarizeDetails = (l: any): string => {
  const parts: string[] = [];
  if (l.client_name) parts.push(`Client: ${l.client_name}`);
  const d = l.details || {};
  const keys = Object.keys(d);
  if (keys.length === 0) return parts.join(' · ');
  // Prioritise the most meaningful keys first
  const PRIORITY = [
    'document_type_name', 'field_type_name', 'financial_year', 'from_state', 'to_state',
    'reason', 'rejection_reason', 'amount', 'fee', 'role', 'status', 'manager_name',
    'executive_name', 'count', 'name',
  ];
  const ordered = [
    ...PRIORITY.filter((k) => k in d),
    ...keys.filter((k) => !PRIORITY.includes(k)),
  ];
  for (const k of ordered.slice(0, 4)) {
    parts.push(`${prettyKey(k)}: ${formatValue(d[k])}`);
  }
  if (ordered.length > 4) parts.push(`+${ordered.length - 4} more`);
  return parts.join(' · ');
};

const escapeHtml = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// ─────────────────────────────────────────────────────────────────────────────
// Build a self-contained, readable HTML report (sidesteps backend \n issues).
// ─────────────────────────────────────────────────────────────────────────────
function buildReportHtml(logs: any[], range: { start: string; end: string }) {
  const generated = new Date().toLocaleString();
  const total = logs.length;
  const byCategory: Record<string, number> = {};
  const byEvent: Record<string, number> = {};
  for (const l of logs) {
    const meta = getMeta(l.event_type);
    byCategory[meta.category] = (byCategory[meta.category] || 0) + 1;
    byEvent[l.event_type] = (byEvent[l.event_type] || 0) + 1;
  }

  const summaryRows = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, c]) => `<tr><td>${escapeHtml(cat)}</td><td class="num">${c}</td></tr>`)
    .join('');

  const detailRows = logs.map((l) => {
    const meta = getMeta(l.event_type);
    const ts = l.created_at ? new Date(l.created_at).toLocaleString() : '—';
    const detailEntries = Object.entries(l.details || {});
    const detailHtml = detailEntries.length === 0
      ? '<span class="muted">No details</span>'
      : `<dl class="kv">${detailEntries.map(([k, v]) => `<dt>${escapeHtml(prettyKey(k))}</dt><dd>${escapeHtml(formatValue(v))}</dd>`).join('')}</dl>`;
    return `
      <tr>
        <td class="ts">${escapeHtml(ts)}</td>
        <td><span class="badge">${escapeHtml(meta.label)}</span><div class="cat">${escapeHtml(meta.category)}</div></td>
        <td>${escapeHtml(l.actor_name || '—')}</td>
        <td>${escapeHtml(l.client_name || '—')}</td>
        <td class="details">${detailHtml}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Audit Report</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 32px; color: #0f172a; background: #f8fafc; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .sub { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
  .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; }
  .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin: 0 0 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { text-align: left; padding: 10px 12px; background: #f1f5f9; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid #e2e8f0; }
  tbody td { padding: 12px; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #fafbfc; }
  .ts { white-space: nowrap; color: #64748b; font-variant-numeric: tabular-nums; font-size: 12px; }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 600; font-size: 12px; }
  .cat { color: #94a3b8; font-size: 11px; margin-top: 4px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .muted { color: #94a3b8; font-style: italic; }
  dl.kv { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; }
  dl.kv dt { color: #64748b; font-weight: 500; font-size: 12px; }
  dl.kv dd { margin: 0; color: #0f172a; font-size: 12px; word-break: break-word; }
  .totals { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .stat { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; min-width: 140px; }
  .stat .v { font-size: 22px; font-weight: 700; color: #4338ca; }
  .stat .l { font-size: 12px; color: #64748b; }
  @media print { body { background: #fff; padding: 16px; } .card, .stat { box-shadow: none; } }
</style>
</head>
<body>
  <h1>Audit Report</h1>
  <div class="sub">Generated on ${escapeHtml(generated)}${range.start || range.end ? ` &middot; Range: ${escapeHtml(range.start || '—')} → ${escapeHtml(range.end || '—')}` : ''}</div>
  <div class="totals">
    <div class="stat"><div class="v">${total}</div><div class="l">Total Events</div></div>
    <div class="stat"><div class="v">${Object.keys(byCategory).length}</div><div class="l">Categories</div></div>
    <div class="stat"><div class="v">${Object.keys(byEvent).length}</div><div class="l">Distinct Event Types</div></div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>Events by Category</h2>
      <table>
        <thead><tr><th>Category</th><th class="num">Count</th></tr></thead>
        <tbody>${summaryRows || '<tr><td colspan="2" class="muted">No data</td></tr>'}</tbody>
      </table>
    </div>
    <div class="card">
      <h2>Notes</h2>
      <p style="margin:0;color:#475569;font-size:13px;line-height:1.5">
        Each entry below shows the timestamp, the event type, who performed the action, the client it relates to,
        and any contextual details captured at the time. Open the file in any browser to print or save as PDF.
      </p>
    </div>
  </div>
  <div class="card" style="padding:0;overflow:hidden">
    <table>
      <thead>
        <tr>
          <th style="width:170px">Timestamp</th>
          <th style="width:240px">Event</th>
          <th style="width:160px">Actor</th>
          <th style="width:160px">Client</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${detailRows || '<tr><td colspan="5" class="muted" style="padding:24px;text-align:center">No audit entries match the selected filters.</td></tr>'}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

export default function AuditPage() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [eventType, setEventType] = useState<string>('all');
  const [category, setCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);

  const buildParams = (overrides: Record<string, any> = {}) => {
    const params: any = { page, page_size: pageSize, ...overrides };
    if (start) params.start_date = start;
    if (end) params.end_date = end;
    if (eventType && eventType !== 'all') params.event_type = eventType;
    return params;
  };

  const load = async (overrides: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const r = await listAudit(buildParams(overrides));
      setLogs(r?.items || []);
      setTotal(r?.total ?? (r?.items?.length || 0));
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to load audit logs');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);

  const applyFilters = () => {
    if (page !== 1) setPage(1); else load({ page: 1 });
  };

  const reset = () => {
    setStart(''); setEnd(''); setEventType('all'); setCategory('All'); setSearchTerm('');
    if (page !== 1) setPage(1); else load({ page: 1, start_date: undefined, end_date: undefined, event_type: undefined });
  };

  // Client-side category + search filtering on the current page
  const visibleLogs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return logs.filter((l) => {
      const meta = getMeta(l.event_type);
      if (category !== 'All' && meta.category !== category) return false;
      if (!term) return true;
      const haystack = [
        meta.label, l.event_type, l.actor_name, l.client_name,
        ...Object.entries(l.details || {}).map(([k, v]) => `${k} ${formatValue(v)}`),
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [logs, category, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Generate the readable HTML report on the client (fetches all matching logs)
  const generate = async () => {
    setGen(true);
    try {
      const PAGE_SIZE = 200; // backend max
      const all: any[] = [];
      let p = 1;
      // Hard cap to avoid runaway loops
      const MAX_PAGES = 50; // 50 * 200 = 10,000 entries
      while (p <= MAX_PAGES) {
        const params: any = { page: p, page_size: PAGE_SIZE };
        if (start) params.start_date = start;
        if (end) params.end_date = end;
        if (eventType && eventType !== 'all') params.event_type = eventType;
        const r = await listAudit(params);
        const items = r?.items || [];
        all.push(...items);
        const t = r?.total ?? items.length;
        if (all.length >= t || items.length < PAGE_SIZE) break;
        p += 1;
      }
      // Apply category filter client-side to mirror what the user sees
      const filtered = category === 'All'
        ? all
        : all.filter((l) => getMeta(l.event_type).category === category);

      const html = buildReportHtml(filtered, { start, end });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-report-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Report downloaded · ${filtered.length} event${filtered.length === 1 ? '' : 's'}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate report');
    } finally { setGen(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track every meaningful action across the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => load()} variant="outline" size="sm"><RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh</Button>
          <Button onClick={generate} disabled={gen} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            {gen ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Start Date</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">End Date</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Event Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="All events" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All events</SelectItem>
                {EVENT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Search</Label>
            <div className="relative mt-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Actor, client, detail…"
                className="pl-8"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Button onClick={applyFilters} size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">Apply</Button>
          <Button onClick={reset} variant="outline" size="sm">Reset</Button>
          <span className="text-xs text-slate-400 ml-auto">
            Showing <span className="font-semibold text-slate-700">{visibleLogs.length}</span> of <span className="font-semibold text-slate-700">{total}</span> entries
          </span>
        </div>
      </Card>

      {/* Log list */}
      <Card className="rounded-xl p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            <div className="text-sm">Loading audit log…</div>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-slate-300 mb-2" />
            <div className="text-sm font-medium text-slate-700">No audit entries</div>
            <div className="text-xs text-slate-500 mt-1">Try adjusting your filters or date range.</div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visibleLogs.map((l: any) => {
              const meta = getMeta(l.event_type);
              const Icon = meta.icon;
              const detailEntries = Object.entries(l.details || {});
              return (
                <li key={l.id} className="p-4 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 h-9 w-9 rounded-lg border flex items-center justify-center ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${meta.tone}`}>{meta.label}</span>
                        <span className="text-[11px] text-slate-400">{meta.category}</span>
                        <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">
                          {l.created_at ? new Date(l.created_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm text-slate-700">
                        <span className="font-medium">{l.actor_name || 'System'}</span>
                        {l.client_name && (
                          <>
                            <span className="text-slate-400 mx-1.5">→</span>
                            <span className="text-slate-600">Client: <span className="font-medium text-slate-800">{l.client_name}</span></span>
                          </>
                        )}
                      </div>
                      {detailEntries.length > 0 && (
                        <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          {detailEntries.map(([k, v]) => (
                            <div key={k} className="flex gap-2 min-w-0">
                              <dt className="text-slate-500 flex-shrink-0">{prettyKey(k)}:</dt>
                              <dd className="text-slate-800 min-w-0 break-words">{formatValue(v)}</dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {l.ip_address && (
                        <div className="mt-2 text-[10px] text-slate-400 font-mono">IP {l.ip_address}</div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {!loading && total > pageSize && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <div className="text-xs text-slate-500">
              Page <span className="font-semibold text-slate-700">{page}</span> of <span className="font-semibold text-slate-700">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

