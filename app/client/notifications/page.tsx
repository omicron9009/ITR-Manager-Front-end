'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { listNotifications, markRead, markAllRead } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, RefreshCw, ArrowRight } from 'lucide-react';

export default function ClientNotificationsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const load = async (p = page) => {
    setLoading(true);
    try {
      const r = await listNotifications({ page: p, page_size: 20 });
      setItems(r?.items ?? r?.notifications ?? r ?? []);
      setTotal(r?.total ?? r?.total_count ?? 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const handleMarkAll = async () => { await markAllRead(); load(); };
  const handleMarkOne = async (id: string) => { await markRead([id]); load(); };
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

      {items.length === 0 && !loading && (
        <Card className="rounded-xl p-10 text-center">
          <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </Card>
      )}

      <div className="space-y-2">
        {items.map((n: any) => {
          const hasLink = !!n.related_filing_id;
          return (
          <Card key={n.id} onClick={async () => { if (!n.is_read) await markRead([n.id]); if (n.related_filing_id) router.push(`/client/filings/${n.related_filing_id}`); }} className={`rounded-xl p-4 transition-colors ${hasLink ? 'cursor-pointer hover:shadow-md' : ''} ${n.is_read ? 'bg-white' : 'bg-indigo-50/40 border-indigo-100'}`}>
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
