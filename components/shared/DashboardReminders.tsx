// @ts-nocheck
'use client';

/**
 * Compact grouped tile strip that surfaces reminder-notifications for the
 * current user. Used at the top of the Manager and Executive dashboards.
 *
 * Data source: `GET /api/v1/notifications?unread_only=true`
 * Each item carries `reminder_type: string | null` — anything non-null is a
 * reminder. Items are grouped by `reminder_type` and rendered as counter
 * tiles; clicking a tile jumps to the most useful destination for the role.
 * When there is exactly one reminder of a type, we deep-link straight to the
 * related filing/client. Empty state hides the whole strip.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  BellRing,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  FileCheck,
  Calculator,
  IndianRupee,
  UserX,
  UserPlus,
  ClipboardList,
  Star,
  Clock,
  FileText,
  Type,
  Receipt,
  X,
} from 'lucide-react';
import { listNotifications, markRead, getFiling } from '@/lib/api';

// Broader role type used by the shared reminders page (which also supports
// the Client route). The tile-strip destination functions only handle
// 'manager' | 'executive' — a Client viewing the strip is not a supported
// case (Client dashboards get a sidebar link instead).
export type RemindersRole = 'manager' | 'executive' | 'client';

type Role = 'manager' | 'executive';

export interface Meta {
  label: string;
  short: string;
  icon: any;
  color: string; // border + bg tailwind classes
  text: string;
  destination: (role: Role) => string;
}

export const REMINDER_META: Record<string, Meta> = {
  UNASSIGNED_CLIENT: {
    label: 'Client not fully assigned',
    short: 'Assign executive',
    icon: UserPlus,
    color: 'border-l-purple-500 bg-purple-50',
    text: 'text-purple-700',
    destination: (r) => `/${r}/clients`,
  },
  FILING_NOT_INITIATED: {
    label: 'Filing not initiated',
    short: 'Initiate filing',
    icon: UserX,
    color: 'border-l-amber-500 bg-amber-50',
    text: 'text-amber-800',
    destination: (r) => `/${r}/clients?status=ONBOARDED_PENDING_FILING`,
  },
  TAX_PAYMENT_PENDING: {
    label: 'Tax payment pending',
    short: 'Tax payment',
    icon: IndianRupee,
    color: 'border-l-amber-600 bg-amber-50',
    text: 'text-amber-800',
    destination: (r) => `/${r}/clients?status=AWAITING_TAX_PAYMENT`,
  },
  FILING_STAGNANT_PRE_FILING: {
    label: 'Filing stagnant (pre-filing)',
    short: 'Stagnant filings',
    icon: Clock,
    color: 'border-l-rose-500 bg-rose-50',
    text: 'text-rose-700',
    destination: (r) => `/${r}/clients`,
  },
  INVOICE_PENDING_POST_FILING: {
    label: 'Invoice pending (post-filing)',
    short: 'Upload invoice',
    icon: Receipt,
    color: 'border-l-orange-500 bg-orange-50',
    text: 'text-orange-700',
    destination: (r) => `/${r}/clients?status=PAYMENT`,
  },
  CLIENT_DOCS_PENDING_UPLOAD: {
    label: 'Docs pending upload',
    short: 'Docs pending',
    icon: FileText,
    color: 'border-l-blue-500 bg-blue-50',
    text: 'text-blue-700',
    destination: (r) => `/${r}/clients?status=DOCUMENT_UPLOAD`,
  },
  TEXT_FIELDS_PENDING_FILL: {
    label: 'Text fields pending fill',
    short: 'Text fields',
    icon: Type,
    color: 'border-l-blue-500 bg-blue-50',
    text: 'text-blue-700',
    destination: (r) => `/${r}/clients?status=DOCUMENT_UPLOAD`,
  },
  COMPUTATION_AWAITING_MANAGER_APPROVAL: {
    label: 'Computation → Manager approval',
    short: 'Manager approval',
    icon: Calculator,
    color: 'border-l-violet-500 bg-violet-50',
    text: 'text-violet-700',
    destination: (r) => `/${r}/clients?status=COMPUTATION`,
  },
  COMPUTATION_AWAITING_PARTNER_APPROVAL: {
    label: 'Computation → Partner approval',
    short: 'Partner approval',
    icon: Calculator,
    color: 'border-l-violet-500 bg-violet-50',
    text: 'text-violet-700',
    destination: (r) => `/${r}/clients?status=COMPUTATION`,
  },
  COMPUTATION_AWAITING_CLIENT_APPROVAL: {
    label: 'Computation → Client approval',
    short: 'Client approval',
    icon: Calculator,
    color: 'border-l-indigo-500 bg-indigo-50',
    text: 'text-indigo-700',
    destination: (r) => `/${r}/clients?status=COMPUTATION`,
  },
  COMPLETED_DOCS_PENDING: {
    label: 'Completed docs pending',
    short: 'Completed docs',
    icon: FileCheck,
    color: 'border-l-emerald-500 bg-emerald-50',
    text: 'text-emerald-700',
    destination: (r) => `/${r}/clients?status=FILING`,
  },
  PAYMENT_NOT_MARKED_RECEIVED: {
    label: 'Payment not marked received',
    short: 'Mark payment',
    icon: IndianRupee,
    color: 'border-l-yellow-500 bg-yellow-50',
    text: 'text-yellow-700',
    destination: (r) => `/${r}/clients?status=PAYMENT`,
  },
  FEEDBACK_NOT_SUBMITTED: {
    label: 'Feedback not submitted',
    short: 'Feedback',
    icon: Star,
    color: 'border-l-slate-400 bg-slate-50',
    text: 'text-slate-700',
    destination: (r) => `/${r}/clients?status=COMPLETED`,
  },
};

const FALLBACK_META: Meta = {
  label: 'Reminder',
  short: 'Reminder',
  icon: ClipboardList,
  color: 'border-l-slate-400 bg-slate-50',
  text: 'text-slate-700',
  destination: (r) => `/${r}/clients`,
};

export { FALLBACK_META };

export default function DashboardReminders({ role }: { role: Role }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      // Pull a healthy page of unread notifications and keep only reminders.
      const r = await listNotifications({ page: 1, page_size: 100, unread_only: true });
      const list = r?.items ?? r?.notifications ?? r ?? [];
      setItems(list.filter((n: any) => n && n.reminder_type));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Refresh periodically so the strip stays in sync with server-side
    // reminder dispatches without a full page reload.
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    const buckets: Record<string, any[]> = {};
    for (const n of items) {
      const k = String(n.reminder_type);
      (buckets[k] ||= []).push(n);
    }
    return Object.entries(buckets)
      .map(([type, arr]) => ({ type, count: arr.length, sample: arr[0], meta: REMINDER_META[type] || FALLBACK_META }))
      .sort((a, b) => b.count - a.count);
  }, [items]);

  const total = items.length;

  // Latest-10 view — newest first, individual rows for the dashboard.
  const latest = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return sorted.slice(0, 10);
  }, [items]);

  // Compute the click destination for a group. Single-item groups deep-link to
  // the related filing/client so the user lands on the actionable page; multi-
  // item groups jump to a filtered list.
  const groupHref = (g: { type: string; count: number; sample: any; meta: Meta }): string => {
    if (g.count === 1) {
      if (g.sample?.related_client_id) return `/${role}/clients/${g.sample.related_client_id}`;
      if (g.sample?.related_filing_id) return `/${role}/clients?filing=${g.sample.related_filing_id}`;
    }
    return g.meta.destination(role);
  };

  // Resolve the per-row click destination. Client-related notifications
  // deep-link to that client; filing-only rows resolve the client id first.
  // NOTE: row click does NOT mark the reminder as read — dismissal is an
  // explicit user action via the X button so reminders stay visible on the
  // dashboard until the user clears them.
  const handleRowClick = async (n: any) => {
    let route: string | null = null;
    if (n.related_client_id) route = `/${role}/clients/${n.related_client_id}`;
    else if (n.related_filing_id) {
      try {
        const filing = await getFiling(n.related_filing_id);
        if (filing?.client_id) route = `/${role}/clients/${filing.client_id}`;
      } catch {}
    }
    if (route) router.push(route);
  };

  // Explicit dismiss: mark the reminder read. The dashboard filters by
  // `unread_only`, so the row drops out immediately. On the /reminders page
  // the row stays (that view shows read + unread) but visually greys out.
  const handleDismiss = async (e: React.MouseEvent, n: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await markRead([n.id]);
    } catch {}
    // Optimistic: drop from the dashboard's unread list right away.
    setItems((prev) => prev.filter((x) => x.id !== n.id));
  };

  // Empty state: hide the whole section so the dashboard stays clean.
  if (!loading && total === 0) return null;

  return (
    <div className="space-y-3">
      <Card className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
              <BellRing className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                Reminders
                <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-bold">
                  {loading ? '…' : total}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-tight">
                Grouped by type — click a tile to jump to the related page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 px-2">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {groups.length > 4 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
                className="h-7 px-2 text-xs gap-1"
              >
                {expanded ? (
                  <>
                    Less <ChevronUp className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    All <ChevronDown className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {loading && total === 0 ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading reminders…
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {(expanded ? groups : groups.slice(0, 4)).map((g) => {
              const Icon = g.meta.icon;
              return (
                <Link
                  key={g.type}
                  href={groupHref(g)}
                  title={g.meta.label}
                  className={`group inline-flex items-center gap-2 rounded-lg border-l-4 border border-slate-200 px-3 py-1.5 text-xs font-medium bg-white hover:shadow-sm transition-all ${g.meta.color}`}
                >
                  <Icon className={`h-3.5 w-3.5 ${g.meta.text}`} />
                  <span className={`font-bold text-sm ${g.meta.text}`}>{g.count}</span>
                  <span className="text-slate-700 truncate max-w-[180px]">{g.meta.short}</span>
                  <ArrowRight className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
            {!expanded && groups.length > 4 && (
              <button
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                +{groups.length - 4} more
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Latest-10 individual reminders. Same data as the tile strip, just
          rendered as an actionable list. Hidden while empty. */}
      {!loading && latest.length > 0 && (
        <Card className="rounded-xl border border-slate-200 p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-semibold text-slate-900">Latest reminders</div>
            <Link
              href={`/${role}/reminders`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-1.5">
            {latest.map((n) => {
              const meta = REMINDER_META[n.reminder_type] || FALLBACK_META;
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  className="group w-full rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white transition-all p-2 flex items-start gap-2.5"
                >
                  <button
                    onClick={() => handleRowClick(n)}
                    className="flex-1 min-w-0 flex items-start gap-2.5 text-left"
                  >
                    <div
                      className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 border-l-4 ${meta.color}`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${meta.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide ${meta.text}`}
                        >
                          {meta.short}
                        </span>
                        {!n.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="Unread" />
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {n.created_at
                            ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true })
                            : ''}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 leading-snug truncate">
                        {n.title || n.message}
                      </p>
                      {n.message && n.title && (
                        <p className="text-xs text-slate-500 line-clamp-1">{n.message}</p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 self-center" />
                  </button>
                  {/* Explicit dismiss — mark read + drop from the dashboard. */}
                  <button
                    onClick={(e) => handleDismiss(e, n)}
                    title="Dismiss (mark as read)"
                    aria-label="Dismiss reminder"
                    className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0 self-center opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
