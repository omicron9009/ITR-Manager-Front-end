'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { listNotifications, unreadCount, markAllRead, markRead } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export default function NotificationBell() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    try {
      const c = await unreadCount();
      setCount(c?.count ?? c?.unread_count ?? 0);
    } catch {}
  };

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 30000);
    return () => clearInterval(i);
  }, []);

  const load = async () => {
    try {
      const r = await listNotifications({ page: 1, page_size: 10 });
      setItems(r?.items ?? r?.notifications ?? r ?? []);
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
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={async () => { await markAllRead(); setCount(0); load(); }}>Mark all as read</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-500">No notifications yet</div>
          )}
          {items.map((n: any) => (
            <button key={n.id} onClick={async () => { await markRead(n.id); refresh(); load(); }} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b last:border-0">
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
