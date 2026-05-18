'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getClientDashboard } from '@/lib/api';
import { FolderOpen, Loader2 } from 'lucide-react';

export default function ClientDocumentsPage() {
  const router = useRouter();
  const [filings, setFilings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await getClientDashboard();
        setFilings((r?.active_filings || []).map((f: any) => ({ ...f, id: f.filing_id || f.id })));
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select a filing to view and manage its documents.</p>
      </div>

      {filings.length === 0 ? (
        <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No filings yet. Initiate one from My Filings.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filings.map((f) => {
            const state = f.status || f.current_state;
            const docsTotal = f.documents_total || 0;
            const docsApproved = f.documents_approved || 0;
            return (
              <Card key={f.id} className="rounded-xl p-5 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all" onClick={() => router.push(`/client/filings/${f.id}`)}>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center"><FolderOpen className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">ITR {f.financial_year}</h3>
                    {docsTotal > 0 && <p className="text-xs text-slate-500">{docsApproved}/{docsTotal} docs approved</p>}
                  </div>
                  <StatusBadge status={state} size="sm" />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
