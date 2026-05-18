'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { listAudit, generateAuditReport } from '@/lib/api';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';

const EVENT_COLORS: Record<string, string> = {
  DOCUMENT_UPLOADED: 'bg-blue-100 text-blue-700',
  DOCUMENT_APPROVED: 'bg-emerald-100 text-emerald-700',
  DOCUMENT_REJECTED: 'bg-rose-100 text-rose-700',
  FILING_STATE_CHANGED: 'bg-indigo-100 text-indigo-700',
  FILING_INITIATED: 'bg-indigo-100 text-indigo-700',
  ACCOUNT_REGISTERED: 'bg-amber-100 text-amber-700',
  ACCOUNT_ACTIVATED: 'bg-amber-100 text-amber-700',
};

export default function AuditPage() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);

  const load = async () => { setLoading(true); try { const params: any = { page: 1, page_size: 50 }; if (start) params.start_date = start; if (end) params.end_date = end; const r = await listAudit(params); setLogs(r?.items || r?.logs || r || []); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGen(true);
    try {
      const params: any = {}; if (start) params.start_date = start; if (end) params.end_date = end;
      const r = await generateAuditReport(params);
      const blob = r.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `audit-report-${new Date().toISOString().slice(0,10)}.html`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setGen(false); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
      <Card className="rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div><Label>Start Date</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1.5" /></div>
          <div><Label>End Date</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1.5" /></div>
          <Button onClick={load} variant="outline">Apply Filters</Button>
          <Button onClick={generate} disabled={gen} className="bg-indigo-600 hover:bg-indigo-700 ml-auto">{gen ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />} Generate Report</Button>
        </div>
      </Card>
      <Card className="rounded-xl p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left px-5 py-3 font-semibold">Timestamp</th><th className="text-left px-5 py-3 font-semibold">Event</th><th className="text-left px-5 py-3 font-semibold">Actor</th><th className="text-left px-5 py-3 font-semibold">Description</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={4} className="p-10 text-center text-slate-500">Loading…</td></tr> : logs.length === 0 ? <tr><td colSpan={4} className="p-10 text-center text-slate-500">No audit entries.</td></tr> : logs.map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                  <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${EVENT_COLORS[l.event_type] || 'bg-slate-100 text-slate-700'}`}>{l.event_type}</span></td>
                  <td className="px-5 py-3 text-slate-700">{l.actor_name || '—'}</td>
                  <td className="px-5 py-3 text-slate-600">{l.client_name ? `Client: ${l.client_name}` : ''}{l.details && Object.keys(l.details).length > 0 ? ` ${JSON.stringify(l.details)}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
