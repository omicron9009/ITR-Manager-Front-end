'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getClientDashboard, initiateFiling } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Folder, FolderOpen, FileText, CheckCircle2, Hourglass, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

function getFYOptions() {
  const d = new Date();
  const cur = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const arr: string[] = [];
  for (let y = cur; y >= cur - 4; y--) arr.push(`FY ${y}-${(y + 1).toString().slice(-2)}`);
  return arr;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInit, setOpenInit] = useState(false);
  const [fy, setFy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await getClientDashboard(); setDashboard(r); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to load dashboard'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pendingVerification = dashboard?.account_status === 'PENDING_VERIFICATION';
  const filings = dashboard?.active_filings || [];

  const doInitiate = async () => {
    if (!fy) return;
    setSubmitting(true);
    try { await initiateFiling({ financial_year: fy }); toast.success('Filing initiated'); setOpenInit(false); setFy(''); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white p-6 shadow-md">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">{loading ? 'Welcome' : `Welcome, ${dashboard?.full_name?.split(' ')[0] || 'there'} 👋`}</h1>
            <p className="text-sm text-white/80 mt-1">{dashboard?.email}</p>
            {dashboard?.pan_number && <p className="text-xs text-white/60 mt-1">PAN &middot; {dashboard.pan_number}</p>}
          </div>
          {dashboard && <StatusBadge status={dashboard.account_status} />}
        </div>
      </div>

      {pendingVerification && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-900">Your account is under verification.</p>
            <p className="text-sm text-amber-800">You&rsquo;ll receive an email once activated. All filing actions are currently disabled.</p>
          </div>
        </div>
      )}

      {/* My Filings directory */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Filings</h2>
          <p className="text-sm text-slate-500 mt-0.5">Double-click a folder to open documents.</p>
        </div>
        <Button onClick={() => setOpenInit(true)} disabled={pendingVerification} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate ITR Filing</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => <div key={i} className="rounded-xl bg-slate-200/60 h-48 animate-pulse" />)}
        </div>
      ) : filings.length === 0 ? (
        <Card className="rounded-xl p-12 text-center bg-white">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 items-center justify-center mb-3"><Folder className="h-8 w-8" /></div>
          <h3 className="font-bold text-slate-900 text-lg">No filings yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start by initiating your first ITR filing.</p>
          {!pendingVerification && <Button onClick={() => setOpenInit(true)} className="mt-5 bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate Filing</Button>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filings.map((f: any) => <FilingFolder key={f.filing_id} filing={f} onOpen={() => router.push(`/client/filings/${f.filing_id}`)} />)}
        </div>
      )}

      <Dialog open={openInit} onOpenChange={setOpenInit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Initiate new ITR filing</DialogTitle></DialogHeader>
          <div><label className="text-sm font-medium">Financial Year</label><Select value={fy} onValueChange={setFy}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select FY" /></SelectTrigger><SelectContent>{getFYOptions().map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenInit(false)}>Cancel</Button><Button onClick={doInitiate} disabled={submitting || !fy} className="bg-indigo-600 hover:bg-indigo-700">{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm &amp; Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilingFolder({ filing, onOpen }: { filing: any; onOpen: () => void }) {
  const status = filing.status;
  const isCompleted = status === 'COMPLETED';
  const isHalted = status === 'HALTED';
  const progress = filing.progress_percentage ?? 0;

  // Folder color theming
  const folderColor = isHalted ? 'text-rose-500' : isCompleted ? 'text-emerald-500' : 'text-indigo-500';
  const ring = isHalted ? 'hover:ring-rose-300' : isCompleted ? 'hover:ring-emerald-300' : 'hover:ring-indigo-300';

  return (
    <div onDoubleClick={onOpen} onClick={onOpen} className={`group rounded-xl bg-white border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:ring-2 ${ring} transition-all select-none`} title="Click to open">
      {/* Folder icon */}
      <div className="relative">
        <FolderOpen className={`h-14 w-14 ${folderColor} group-hover:scale-105 transition-transform`} strokeWidth={1.5} />
        {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-600 absolute -bottom-1 -right-1 bg-white rounded-full" />}
        {isHalted && <XCircle className="h-5 w-5 text-rose-600 absolute -bottom-1 -right-1 bg-white rounded-full" />}
      </div>
      <div className="mt-3">
        <div className="font-bold text-slate-900 text-sm truncate">ITR-{filing.financial_year}</div>
        <div className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 mt-0.5">Filing &middot; {filing.financial_year}</div>
      </div>
      <div className="mt-3"><StatusBadge status={status} size="sm" /></div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1"><span>{progress}% complete</span></div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full ${isCompleted ? 'bg-emerald-500' : isHalted ? 'bg-rose-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1 text-[10px]">
        <div className="text-center px-1 py-1 rounded bg-emerald-50 text-emerald-700" title="Approved"><CheckCircle2 className="h-3 w-3 mx-auto" /><div className="font-bold mt-0.5">{filing.documents_approved ?? 0}</div></div>
        <div className="text-center px-1 py-1 rounded bg-amber-50 text-amber-700" title="Pending"><Hourglass className="h-3 w-3 mx-auto" /><div className="font-bold mt-0.5">{filing.documents_pending ?? 0}</div></div>
        <div className="text-center px-1 py-1 rounded bg-rose-50 text-rose-700" title="Rejected"><XCircle className="h-3 w-3 mx-auto" /><div className="font-bold mt-0.5">{filing.documents_rejected ?? 0}</div></div>
      </div>
      <div className="mt-3 text-[10px] text-slate-400">Last updated: {filing.last_updated ? new Date(filing.last_updated).toLocaleDateString() : '—'}</div>
    </div>
  );
}
