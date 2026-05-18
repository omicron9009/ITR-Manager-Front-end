'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { myTracking, getClientDashboard, initiateFiling, submitDocs, approveComp, rejectComp, compForFiling, compDownloadUrl, completedDocs, storageDownloadUrl, getOnboardingForm, submitOnboardingForm } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Plus, FolderUp, IndianRupee, CheckCircle2, Calculator, Send, Download, AlertTriangle, Loader2, ClipboardList, X } from 'lucide-react';

function getFYOptions() {
  const d = new Date();
  const cur = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const arr: string[] = [];
  for (let y = cur; y >= cur - 4; y--) arr.push(`${y}-${y + 1}`);
  return arr;
}

export default function ClientDashboard() {
  const [filings, setFilings] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInit, setOpenInit] = useState(false);
  const [fy, setFy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Onboarding state
  const [onboardingFields, setOnboardingFields] = useState<any[]>([]);
  const [onboardingValues, setOnboardingValues] = useState<Record<string, any>>({});
  const [onboardingComplete, setOnboardingComplete] = useState(true); // assume true until we know
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const u = getUser(); setUser(u);
      const r = await myTracking();
      setFilings(r?.items || []);
    } catch {
      try { const r = await getClientDashboard(); setFilings(r?.active_filings || []); } catch {}
    } finally { setLoading(false); }
  };

  const checkOnboarding = async () => {
    try {
      const r = await getOnboardingForm();
      const fields = r?.fields || [];
      setOnboardingFields(fields);
      if (fields.length > 0 && (!r?.submitted_data || Object.keys(r.submitted_data).length === 0)) {
        setOnboardingComplete(false);
        setShowOnboarding(true);
      } else {
        setOnboardingComplete(true);
        if (r?.submitted_data) setOnboardingValues(r.submitted_data);
      }
    } catch {
      // If API fails, don't block the user
      setOnboardingComplete(true);
    }
  };

  useEffect(() => { load(); checkOnboarding(); }, []);

  const pendingVerification = (user?.account_status || '') === 'PENDING_VERIFICATION';
  const canInitiate = !pendingVerification && onboardingComplete;

  const doInitiate = async () => {
    if (!fy) return;
    setSubmitting(true);
    try { await initiateFiling({ financial_year: fy }); toast.success('Filing initiated'); setOpenInit(false); setFy(''); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleOnboardingSubmit = async () => {
    // Validate required fields
    const missing = onboardingFields.filter((f) => f.is_required && !onboardingValues[f.field_key]?.toString().trim());
    if (missing.length > 0) {
      toast.error(`Please fill required fields: ${missing.map((f) => f.field_label).join(', ')}`);
      return;
    }
    setOnboardingSaving(true);
    try {
      await submitOnboardingForm(onboardingValues);
      toast.success('Onboarding form submitted successfully!');
      setOnboardingComplete(true);
      setShowOnboarding(false);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to submit'); }
    finally { setOnboardingSaving(false); }
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

      {!pendingVerification && !onboardingComplete && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Complete your onboarding form</p>
            <p className="text-sm text-blue-800 mt-0.5">Please fill in your details before initiating a filing.</p>
            <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowOnboarding(true)}>Fill Onboarding Form</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Filings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track every step of your tax return.</p>
        </div>
        <Button onClick={() => { if (!onboardingComplete) { setShowOnboarding(true); return; } setOpenInit(true); }} disabled={pendingVerification} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate ITR Filing</Button>
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : filings.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-3"><FolderUp className="h-7 w-7" /></div>
          <h3 className="font-bold text-slate-900">No filings yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start by initiating your first ITR filing.</p>
        </Card>
      ) : filings.map((f: any) => <FilingPanel key={f.id} filing={f} onChange={load} />)}

      {/* Initiate Filing Dialog */}
      <Dialog open={openInit} onOpenChange={setOpenInit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Initiate new ITR filing</DialogTitle></DialogHeader>
          <div><label className="text-sm font-medium">Financial Year</label><Select value={fy} onValueChange={setFy}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Select FY" /></SelectTrigger><SelectContent>{getFYOptions().map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenInit(false)}>Cancel</Button><Button onClick={doInitiate} disabled={submitting || !fy} className="bg-indigo-600 hover:bg-indigo-700">{submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm &amp; Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Form Dialog */}
      <Dialog open={showOnboarding} onOpenChange={(o) => { if (onboardingComplete) setShowOnboarding(o); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /> Complete Your Onboarding</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Please fill in the following details. This is required before you can initiate a filing.</p>
          <div className="space-y-4 mt-2">
            {onboardingFields.map((f) => (
              <div key={f.id}>
                <Label className="flex items-center gap-1">
                  {f.field_label}
                  {f.is_required && <span className="text-rose-500">*</span>}
                </Label>
                {f.field_type === 'TEXT' && (
                  <Input value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" placeholder={`Enter ${f.field_label.toLowerCase()}`} />
                )}
                {f.field_type === 'NUMBER' && (
                  <Input type="number" value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" placeholder="0" />
                )}
                {f.field_type === 'DATE' && (
                  <Input type="date" value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" />
                )}
                {f.field_type === 'DROPDOWN' && (
                  <Select value={onboardingValues[f.field_key] || ''} onValueChange={(v) => setOnboardingValues({ ...onboardingValues, [f.field_key]: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder={`Select ${f.field_label.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>{(f.field_options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {f.field_type === 'FILE' && (
                  <Input type="file" className="mt-1.5" onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.files?.[0]?.name || '' })} />
                )}
                {!['TEXT', 'NUMBER', 'DATE', 'DROPDOWN', 'FILE'].includes(f.field_type) && (
                  <Input value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            {onboardingComplete && <Button variant="outline" onClick={() => setShowOnboarding(false)}>Close</Button>}
            <Button onClick={handleOnboardingSubmit} disabled={onboardingSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {onboardingSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit Onboarding Form
            </Button>
          </DialogFooter>
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
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [completed, setCompleted] = useState<any[]>([]);
  const [rejectingComp, setRejectingComp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (state === 'COMPUTATION') {
      compForFiling(filing.id).then((r) => {
        setComputations(r?.items || []);
        setCurrentVersion(r?.current_version || null);
      }).catch(() => {});
    }
    if (['FILING', 'PAYMENT', 'COMPLETED'].includes(state)) {
      completedDocs(filing.id).then((r) => setCompleted(r || [])).catch(() => {});
    }
  }, [state, filing.id]);

  const submit = async () => { setActing(true); try { await submitDocs(filing.id); toast.success('Documents submitted'); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setActing(false); } };

  const handleApproveComp = async (id: string) => {
    setActing(true);
    try { await approveComp(id); toast.success('Computation approved! Filing moves to next stage.'); onChange(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const handleRejectComp = async () => {
    if (!rejectingComp || !rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    setActing(true);
    try {
      await rejectComp(rejectingComp.id, rejectReason);
      toast.success('Computation rejected. Your CA will upload a revised version.');
      setRejectingComp(null);
      setRejectReason('');
      // Refresh computations
      compForFiling(filing.id).then((r) => { setComputations(r?.items || []); setCurrentVersion(r?.current_version || null); }).catch(() => {});
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const downloadComp = async (compId: string) => {
    try { const r = await compDownloadUrl(compId); window.open(r.download_url || r.url, '_blank'); } catch { toast.error('Download failed'); }
  };
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
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calculator className="h-5 w-5 text-violet-600 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Your tax computation is ready for review</p>
                <p className="text-sm text-slate-600 mt-0.5">Review the computation document and approve or request changes.</p>
              </div>
            </div>

            {/* Current version - prominent */}
            {currentVersion && currentVersion.status === 'UPLOADED' && (
              <div className="rounded-lg border-2 border-violet-200 bg-violet-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Computation v{currentVersion.version}</div>
                    <div className="text-xs text-slate-500">{currentVersion.original_filename || 'computation.pdf'} · from {currentVersion.uploaded_by_name || 'your CA'}</div>
                    {currentVersion.uploaded_at && <div className="text-[10px] text-slate-400 mt-0.5">{new Date(currentVersion.uploaded_at).toLocaleDateString()}</div>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadComp(currentVersion.id)}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" onClick={() => handleApproveComp(currentVersion.id)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setRejectingComp(currentVersion)}>
                    <X className="h-3.5 w-3.5 mr-1" /> Request Changes
                  </Button>
                </div>
              </div>
            )}

            {/* Version history */}
            {computations.length > 1 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Version History</p>
                <div className="space-y-1.5">
                  {computations.sort((a: any, b: any) => b.version - a.version).filter((c: any) => c.id !== currentVersion?.id || c.status !== 'UPLOADED').map((c: any) => (
                    <div key={c.id} className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border text-sm ${c.status === 'REJECTED' ? 'border-rose-100 bg-rose-50/30' : c.status === 'APPROVED' ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-slate-500">v{c.version}</span>
                        <span className="text-slate-700 truncate">{c.original_filename || 'computation'}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={c.status} size="sm" />
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => downloadComp(c.id)}><Download className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
                {computations.some((c: any) => c.status === 'REJECTED' && c.rejection_reason) && (
                  <div className="mt-2">
                    {computations.filter((c: any) => c.status === 'REJECTED' && c.rejection_reason).slice(0, 1).map((c: any) => (
                      <div key={c.id} className="text-xs text-rose-600 bg-rose-50 rounded p-2">Last rejection: {c.rejection_reason}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {computations.length === 0 && (
              <p className="text-sm text-slate-500">Waiting for your CA to upload the computation document...</p>
            )}
          </div>
        )}
        {state === 'FILING' && <div className="flex items-start gap-3"><Send className="h-5 w-5 text-orange-600" /><div className="flex-1"><p className="font-semibold text-slate-900">Your ITR is being filed</p><p className="text-sm text-slate-600 mt-0.5">We&rsquo;ll notify you when done.</p></div></div>}
        {state === 'PAYMENT' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <IndianRupee className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="font-semibold text-slate-900">Your ITR has been filed!</p>
                <p className="text-sm text-slate-600 mt-0.5">Please complete payment with your CA to finalize.</p>
              </div>
            </div>
            {completed.filter((d: any) => d.doc_type === 'INVOICE').length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-xs font-semibold text-amber-800 uppercase mb-2">Invoice</p>
                <div className="flex flex-wrap gap-2">
                  {completed.filter((d: any) => d.doc_type === 'INVOICE').map((d: any) => (
                    <Button key={d.id} size="sm" variant="outline" onClick={() => download(d.id)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> {d.original_filename || d.filename || 'Invoice'}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {state === 'COMPLETED' && (
          <div className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div className="flex-1"><p className="font-semibold text-slate-900">✅ Filing Complete!</p><p className="text-sm text-slate-600 mt-0.5">Download your acknowledgement and invoice below.</p><div className="mt-3 flex flex-wrap gap-2">{completed.length === 0 && <span className="text-xs text-slate-500">Documents will appear here.</span>}{completed.map((d: any) => <Button key={d.id} size="sm" variant="outline" onClick={() => download(d.id)}><Download className="h-3.5 w-3.5 mr-1" /> {d.doc_type || d.filename}</Button>)}</div></div></div>
        )}
        {state === 'INITIATED' && <div className="text-sm text-slate-600">Your filing has been initiated. The CA will assign your document checklist soon.</div>}
      </div>

      <div className="mt-4"><Link href="/client/documents"><Button variant="outline" size="sm">View Documents</Button></Link></div>

      {/* Reject Computation Dialog */}
      <Dialog open={!!rejectingComp} onOpenChange={(o) => { if (!o) { setRejectingComp(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Changes to Computation</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Explain what needs to be changed. Your CA will upload a revised version.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Describe the changes needed…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingComp(null); setRejectReason(''); }}>Cancel</Button>
            <Button onClick={handleRejectComp} disabled={acting || !rejectReason.trim()} className="bg-rose-600 hover:bg-rose-700">
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
