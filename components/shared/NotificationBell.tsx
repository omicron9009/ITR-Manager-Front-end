'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { listNotifications, getUnreadCount, markAllRead, markRead, getFiling } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

function getRoleFromPath(pathname: string): 'client' | 'partner' | 'executive' | 'manager' {
  if (pathname.startsWith('/client')) return 'client';
  if (pathname.startsWith('/executive')) return 'executive';
  if (pathname.startsWith('/manager')) return 'manager';
  return 'partner';
}

// Manager and Executive see reminder-notifications on their dashboards
// (via <DashboardReminders/>) instead of in the bell — hide them here so
// the notifications feed doesn't double-count reminders.
function shouldHideReminders(role: string): boolean {
  return role === 'manager' || role === 'executive';
}

async function resolveNotificationRoute(n: any, role: string): Promise<string | null> {
  if (role === 'client') {
    if (n.related_filing_id) return `/client/filings/${n.related_filing_id}`;
    return null;
  }
  // partner, executive, or manager — all use `/{role}/clients/:id` shape
  if (n.related_client_id) return `/${role}/clients/${n.related_client_id}`;
  if (n.related_filing_id) {
    try {
      const filing = await getFiling(n.related_filing_id);
      const clientId = filing?.client_id;
      if (clientId) return `/${role}/clients/${clientId}`;
    } catch {}
  }
  return null;
}

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const role = getRoleFromPath(pathname);
  const hideReminders = shouldHideReminders(role);

  const refresh = async () => {
    try {
      if (hideReminders) {
        // Server unread count includes reminders; compute a reminder-free count
        // client-side by pulling recent unread and filtering.
        const r = await listNotifications({ page: 1, page_size: 100, unread_only: true });
        const list = r?.items ?? r?.notifications ?? r ?? [];
        setCount(list.filter((n: any) => !n?.reminder_type).length);
      } else {
        const c = await getUnreadCount();
        setCount(c?.count ?? c?.unread_count ?? 0);
      }
    } catch {}
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideReminders]);

  const load = async () => {
    try {
      // Pull a wider page when we need to filter locally so the popover still
      // shows ~10 non-reminder items.
      const pageSize = hideReminders ? 40 : 10;
      const r = await listNotifications({ page: 1, page_size: pageSize });
      let list = r?.items ?? r?.notifications ?? r ?? [];
      if (hideReminders) list = list.filter((n: any) => !n?.reminder_type).slice(0, 10);
      setItems(list);
    } catch { setItems([]); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <button className="relative h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
          <Bell className="h-5 w-5 text-slate-600" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{count > 99 ? '99+' : count}</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-1rem))] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={async () => { await markAllRead(); setCount(0); load(); }}>Mark all as read</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">No notifications yet</div>
          )}
          {items.map((n: any) => (
            <button key={n.id} onClick={async () => { await markRead([n.id]); refresh(); load(); const route = await resolveNotificationRoute(n, role); if (route) { setOpen(false); router.push(route); } }} className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0 ${(n.related_filing_id || n.related_client_id) ? 'cursor-pointer' : ''}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${n.is_read ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 leading-snug">{n.title || n.message}</p>
                  {n.message && n.title && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
