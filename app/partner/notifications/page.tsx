'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listNotifications, markRead, markAllRead, getFiling } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, RefreshCw, ArrowRight } from 'lucide-react';

function getRoleFromPath(pathname: string): 'partner' | 'executive' | 'manager' {
  if (pathname.startsWith('/executive')) return 'executive';
  if (pathname.startsWith('/manager')) return 'manager';
  return 'partner';
}

// Manager and Executive surface reminder-notifications on their dashboard
// via <DashboardReminders/>. Hide them from this generic feed for those roles
// to keep the two surfaces from duplicating each other.
function shouldHideReminders(role: string): boolean {
  return role === 'manager' || role === 'executive';
}

async function resolveRoute(n: any, role: string): Promise<string | null> {
  if (n.related_client_id) return `/${role}/clients/${n.related_client_id}`;
  if (n.related_filing_id) {
    try {
      const filing = await getFiling(n.related_filing_id);
      if (filing?.client_id) return `/${role}/clients/${filing.client_id}`;
    } catch {}
  }
  return null;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const role = getRoleFromPath(pathname);
  const hideReminders = shouldHideReminders(role);

  const load = async (p = page) => {
    setLoading(true);
    try {
      // When we need to filter locally, pull a bigger page so we can still
      // render a meaningful set even after removing reminder rows. `total`
      // is adjusted below to reflect the client-side filtered count.
      const pageSize = hideReminders ? 60 : 20;
      const r = await listNotifications({ page: p, page_size: pageSize });
      let list = r?.items ?? r?.notifications ?? r ?? [];
      const rawTotal = r?.total ?? r?.total_count ?? 0;
      if (hideReminders) {
        const filtered = list.filter((n: any) => !n?.reminder_type);
        setItems(filtered.slice(0, 20));
        // Approximate: we can't cheaply know the true non-reminder total.
        // Use the returned page's filtered ratio to estimate — safe enough
        // for a Prev/Next control.
        const ratio = list.length > 0 ? filtered.length / list.length : 1;
        setTotal(Math.max(filtered.length, Math.round(rawTotal * ratio)));
      } else {
        setItems(list);
        setTotal(rawTotal);
      }
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const handleMarkAll = async () => {
    await markAllRead();
    load();
  };

  const handleMarkOne = async (id: string) => {
    await markRead([id]);
    load();
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={handleMarkAll}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        </div>
      </div>

      {hideReminders && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-xs text-indigo-800">
          Reminders are shown on your dashboard, not in this list.
        </div>
      )}

      {items.length === 0 && !loading && (
        <Card className="rounded-xl p-10 text-center">
          <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((n: any) => {
          const hasLink = !!(n.related_filing_id || n.related_client_id);
          return (
          <Card key={n.id} onClick={async () => { if (!n.is_read) await markRead([n.id]); const route = await resolveRoute(n, role); if (route) router.push(route); }} className={`rounded-xl p-4 transition-colors ${hasLink ? 'cursor-pointer hover:shadow-md' : ''} ${n.is_read ? 'bg-white' : 'bg-indigo-50/40 border-indigo-100'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${n.is_read ? 'bg-slate-300' : 'bg-indigo-500'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{n.title || n.message}</p>
                    {n.message && n.title && <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>}
                  </div>
                  {hasLink && <ArrowRight className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                  {n.notification_type && <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] uppercase">{n.notification_type}</span>}
                  {n.reminder_type && !hideReminders && <span className="ml-2 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[10px] uppercase font-semibold">Reminder</span>}
                </p>
              </div>
            </div>
          </Card>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
