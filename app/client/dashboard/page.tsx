'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { myTracking, getClientDashboard, initiateFiling, submitDocs, approveComp, compForFiling, completedDocs, storageDownloadUrl } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Plus, FolderUp, IndianRupee, CheckCircle2, Calculator, Send, Download, AlertTriangle, Loader2 } from 'lucide-react';

function getFYOptions() {
  const d = new Date();
  const cur = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const arr: string[] = [];
  for (let y = cur; y >= cur - 4; y--) arr.push(`FY ${y}-${(y + 1).toString().slice(-2)}`);
  return arr;
}

export default function ClientDashboard() {
  const [filings, setFilings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInit, setOpenInit] = useState(false);
  const [fy, setFy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const u = getUser(); setUser(u);
      const r = await myTracking();
      setFilings(r?.filings || r?.items || r || []);
    } catch {
      try { const r = await getClientDashboard(); setFilings(r?.filings || []); } catch {}
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const pendingVerification = (user?.account_status || '') === 'PENDING_VERIFICATION';

  const doInitiate = async () => {
    if (!fy) return;
    setSubmitting(true);
    try { await initiateFiling({ financial_year: fy }); toast.success('Filing initiated'); setOpenInit(false); setFy(''); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6">
      {pendingVerification && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Your account is under verification.</p>
            <p className="text-sm text-amber-800">You&rsquo;ll receive an email once activated. All filing actions are currently disabled.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Filings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track every step of your tax return.</p>
        </div>
        <Button onClick={() => setOpenInit(true)} disabled={pendingVerification} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate ITR Filing</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : filings.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-3"><FolderUp className="h-7 w-7" /></div>
          <h3 className="font-bold text-slate-900">No filings yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start by initiating your first ITR filing.</p>
        </Card>
      ) : filings.map((f: any) => <FilingPanel key={f.id} filing={f} onChange={load} />)}

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

function FilingPanel({ filing, onChange }: { filing: any; onChange: () => void }) {
  const state = filing.status || filing.current_state;
  const halted = state === 'HALTED';
  const [acting, setActing] = useState(false);
  const [computations, setComputations] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);

  useEffect(() => {
    if (state === 'COMPUTATION') compForFiling(filing.id).then((r) => setComputations(r?.items || r || [])).catch(() => {});
    if (state === 'COMPLETED') completedDocs(filing.id).then((r) => setCompleted(r || [])).catch(() => {});
  }, [state, filing.id]);

  const submit = async () => { setActing(true); try { await submitDocs(filing.id); toast.success('Documents submitted'); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setActing(false); } };
  const approve = async (id: string) => { setActing(true); try { await approveComp(id); toast.success('Computation approved'); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setActing(false); } };
  const download = async (file_id: string) => { try { const r = await storageDownloadUrl(file_id); window.open(r.url || r.download_url, '_blank'); } catch { toast.error('Failed'); } };

  return (
    <Card className="rounded-xl p-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase font-bold text-slate-400">{filing.financial_year}</div>
          <h3 className="font-bold text-lg text-slate-900 mt-0.5">ITR Filing &middot; {filing.financial_year}</h3>
        </div>
        <StatusBadge status={state} />
      </div>

      {halted && <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800">This filing has been halted by the Partner. Please contact your CA.</div>}

      <div className="mt-6"><FilingProgressBar currentState={state} /></div>

      <div className="mt-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
        {state === 'ON_BOARDING' && (
          <div className="flex items-start gap-3"><FolderUp className="h-5 w-5 text-blue-600" /><div><p className="font-semibold text-slate-900">Your document checklist is ready</p><p className="text-sm text-slate-600 mt-0.5">Please upload the required documents.</p><Link href="/client/documents"><Button size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">Go to Documents</Button></Link></div></div>
        )}
        {state === 'PROCESSING' && (
          <div className="flex items-start gap-3"><Send className="h-5 w-5 text-indigo-600" /><div className="flex-1"><p className="font-semibold text-slate-900">Submit your uploaded documents</p><p className="text-sm text-slate-600 mt-0.5">Once submitted, your CA will review them.</p><Button onClick={submit} disabled={acting} size="sm" className="mt-3 bg-indigo-600 hover:bg-indigo-700">{acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Submit Documents</Button></div></div>
        )}
        {state === 'COMPUTATION' && (
          <div className="flex items-start gap-3"><Calculator className="h-5 w-5 text-violet-600" /><div className="flex-1"><p className="font-semibold text-slate-900">Your tax computation is ready for review</p><p className="text-sm text-slate-600 mt-0.5">Review and approve to proceed with filing.</p>{computations.map((c: any) => (<div key={c.id} className="mt-3 flex items-center gap-2"><Button size="sm" variant="outline" onClick={() => download(c.id)}><Download className="h-3.5 w-3.5 mr-1" /> View Computation v{c.version || 1}</Button>{c.status !== 'APPROVED' && <Button size="sm" onClick={() => approve(c.id)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Computation</Button>}</div>))}<p className="text-xs text-slate-500 mt-2">Need changes? Contact your CA.</p></div></div>
        )}
        {state === 'FILING' && <div className="flex items-start gap-3"><Send className="h-5 w-5 text-orange-600" /><div><p className="font-semibold text-slate-900">Your ITR is being filed</p><p className="text-sm text-slate-600 mt-0.5">We&rsquo;ll notify you when done.</p></div></div>}
        {state === 'PAYMENT' && <div className="flex items-start gap-3"><IndianRupee className="h-5 w-5 text-yellow-600" /><div><p className="font-semibold text-slate-900">Your ITR has been filed!</p><p className="text-sm text-slate-600 mt-0.5">Please complete payment with your CA.</p></div></div>}
        {state === 'COMPLETED' && (
          <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div className="flex-1"><p className="font-semibold text-slate-900">✅ Filing Complete!</p><p className="text-sm text-slate-600 mt-0.5">Download your acknowledgement and invoice below.</p><div className="mt-3 flex flex-wrap gap-2">{completed.length === 0 && <span className="text-xs text-slate-500">Documents will appear here.</span>}{completed.map((d: any) => <Button key={d.id} size="sm" variant="outline" onClick={() => download(d.id)}><Download className="h-3.5 w-3.5 mr-1" /> {d.doc_type || d.filename}</Button>)}</div></div></div>
        )}
        {state === 'INITIATED' && <div className="text-sm text-slate-600">Your filing has been initiated. The CA will assign your document checklist soon.</div>}
      </div>

      <div className="mt-4"><Link href="/client/documents"><Button variant="outline" size="sm">View Documents</Button></Link></div>
    </Card>
  );
}
