// @ts-nocheck
'use client';

/**
 * Shared reminders page for Manager / Executive / Client (and Elevated
 * Manager, which shares the Manager layout). Renders every reminder the
 * current user has received, one row per reminder, paginated. Reminders are
 * just notifications whose `reminder_type` is non-null — so we hit
 * `GET /api/v1/notifications` and filter client-side.
 *
 * Clicking a row (or "Open") navigates to the related filing/client using
 * the role-appropriate URL prefix, and marks the notification as read.
 *
 * Partner has its own richer settings surface at /partner/settings/reminders
 * — this component is not used there.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import {
  BellRing,
  Loader2,
  RefreshCw,
  ArrowRight,
  Filter,
  X,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { listNotifications, markRead, markAllRead, getFiling } from '@/lib/api';
import { REMINDER_META, FALLBACK_META, type RemindersRole } from './DashboardReminders';

const ALL = '__ALL__';
const PAGE_SIZE_SERVER = 100; // pull generously so we can filter client-side

async function resolveRoute(n: any, role: RemindersRole): Promise<string | null> {
  if (role === 'client') {
    if (n.related_filing_id) return `/client/filings/${n.related_filing_id}`;
    return null;
  }
  if (n.related_client_id) return `/${role}/clients/${n.related_client_id}`;
  if (n.related_filing_id) {
    try {
      const filing = await getFiling(n.related_filing_id);
      if (filing?.client_id) return `/${role}/clients/${filing.client_id}`;
    } catch {}
  }
  return null;
}

export default function RemindersPage({ role }: { role: RemindersRole }) {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const router = useRouter();

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      // Pull a wide window and filter for reminder-typed rows locally. This
      // trades a little bandwidth for correctness — the backend has no
      // reminder-only filter on /notifications yet.
      const r = await listNotifications({
        page: 1,
        page_size: PAGE_SIZE_SERVER,
        unread_only: unreadOnly,
      });
      const list = r?.items ?? r?.notifications ?? r ?? [];
      const reminders = list.filter((n: any) => n && n.reminder_type);
      setItems(reminders);
      setTotal(reminders.length);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // Keep view fresh — reminders get dispatched by a backend worker so
    // the list can grow without the user reloading.
    const id = setInterval(() => load(true), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const filtered = useMemo(
    () =>
      typeFilter === ALL ? items : items.filter((n) => n.reminder_type === typeFilter),
    [items, typeFilter],
  );

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const n of items) if (n.reminder_type) set.add(n.reminder_type);
    return Array.from(set).sort();
  }, [items]);

  const handleClick = async (n: any) => {
    // Row body click navigates but does NOT mark read. Dismissal is an
    // explicit action via the X button on each row.
    const route = await resolveRoute(n, role);
    if (route) router.push(route);
  };

  const handleDismiss = async (n: any) => {
    try {
      await markRead([n.id]);
    } catch {}
    // Optimistic — flip is_read locally so the row updates instantly.
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  };

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      load(true);
    } catch {}
  };

  const unreadRemaining = filtered.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="h-6 w-6 text-indigo-600" />
            Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Every reminder that has been sent to you, newest first. Click a card to jump to the
            related filing or client.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => load(true)}
            disabled={loading || refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAll}
            disabled={unreadRemaining === 0}
            className="gap-1.5"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-slate-600">
            <Filter className="h-4 w-4" /> Filter
          </div>
          <div className="min-w-[240px]">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All reminder types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All reminder types</SelectItem>
                {availableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {(REMINDER_META[t] || FALLBACK_META).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-slate-300"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
            Unread only
          </label>
          {(typeFilter !== ALL || unreadOnly) && (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 h-8"
              onClick={() => {
                setTypeFilter(ALL);
                setUnreadOnly(false);
              }}
            >
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
          <div className="ml-auto text-xs text-slate-500">
            {filtered.length} shown · {unreadRemaining} unread
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-10 text-center text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading reminders…
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No reminders yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <ReminderRow
              key={n.id}
              n={n}
              onClick={() => handleClick(n)}
              onDismiss={() => handleDismiss(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Row — reused for the full reminders page. Includes an explicit
// dismiss (X) button; row body click just navigates.
// ────────────────────────────────────────────────────────────────
export function ReminderRow({
  n,
  onClick,
  onDismiss,
}: {
  n: any;
  onClick: () => void;
  onDismiss?: () => void;
}) {
  const meta = REMINDER_META[n.reminder_type] || FALLBACK_META;
  const Icon = meta.icon;
  return (
    <div
      className={`group rounded-xl border transition-all hover:shadow-sm hover:border-slate-300 ${
        n.is_read ? 'bg-white border-slate-200 opacity-70' : 'bg-indigo-50/50 border-indigo-100'
      }`}
    >
      <div className="p-3 flex items-start gap-3">
        <button
          onClick={onClick}
          className="flex-1 min-w-0 flex items-start gap-3 text-left"
        >
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 border-l-4 ${meta.color}`}
          >
            <Icon className={`h-4 w-4 ${meta.text}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${meta.text}`}>
                {meta.short}
              </span>
              {!n.is_read ? (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" title="Unread" />
              ) : (
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Read</span>
              )}
              <span className="text-[11px] text-slate-400 ml-auto">
                {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-900 mt-0.5 leading-snug">
              {n.title || n.message}
            </p>
            {n.message && n.title && (
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{n.message}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0 self-center" />
        </button>
        {onDismiss && !n.is_read && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
            title="Dismiss (mark as read)"
            aria-label="Dismiss reminder"
            className="h-7 w-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0 self-center opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
