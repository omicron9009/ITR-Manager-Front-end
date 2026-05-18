'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getClientDashboard, initiateFiling, getOnboardingForm, submitOnboardingForm, onboardingUploadUrl, confirmOnboardingUpload } from '@/lib/api';
import { getUser } from '@/lib/auth';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, FolderOpen, AlertTriangle, Loader2, ClipboardList, CheckCircle2, Upload } from 'lucide-react';

function getFYOptions() {
  const d = new Date();
  const cur = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const arr: string[] = [];
  for (let y = cur; y >= cur - 4; y--) arr.push(`${y}-${y + 1}`);
  return arr;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [filings, setFilings] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInit, setOpenInit] = useState(false);
  const [fy, setFy] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [onboardingFields, setOnboardingFields] = useState<any[]>([]);
  const [onboardingValues, setOnboardingValues] = useState<Record<string, any>>({});
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingSaving, setOnboardingSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getClientDashboard();
      setDashData(r);
      const items = (r?.active_filings || []).map((f: any) => ({ ...f, id: f.filing_id || f.id }));
      setFilings(items);
    } catch {
      setFilings([]);
    } finally { setLoading(false); }
  };

  const checkOnboarding = async () => {
    try {
      const r = await getOnboardingForm();
      const fields = r?.fields || [];
      setOnboardingFields(fields);
      if (fields.length > 0 && !r?.submitted) {
        setOnboardingComplete(false);
        setShowOnboarding(true);
      } else {
        setOnboardingComplete(true);
        if (r?.submitted_data) setOnboardingValues(r.submitted_data);
      }
    } catch { setOnboardingComplete(true); }
  };

  useEffect(() => { load(); checkOnboarding(); }, []);

  const [clientUser, setClientUser] = useState<any>(null);
  useEffect(() => { setClientUser(getUser()); }, []);

  const accountStatus = dashData?.account_status || clientUser?.account_status || '';
  const pendingVerification = accountStatus === 'PENDING_VERIFICATION';

  const doInitiate = async () => {
    if (!fy) return;
    setSubmitting(true);
    try {
      await initiateFiling({ financial_year: fy });
      toast.success('Filing initiated');
      setOpenInit(false); setFy(''); load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleOnboardingSubmit = async () => {
    const missing = onboardingFields.filter((f) => f.is_required && !onboardingValues[f.field_key]?.toString().trim());
    if (missing.length > 0) { toast.error(`Please fill: ${missing.map((f) => f.field_label).join(', ')}`); return; }
    setOnboardingSaving(true);
    try {
      await submitOnboardingForm(onboardingValues);
      toast.success('Onboarding form submitted!');
      setOnboardingComplete(true);
      setShowOnboarding(false);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setOnboardingSaving(false); }
  };

  return (
    <div className="space-y-6">
      {pendingVerification && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Your account is under verification.</p>
            <p className="text-sm text-amber-800">You&rsquo;ll receive an email once activated.</p>
          </div>
        </div>
      )}

      {!pendingVerification && !onboardingComplete && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Complete your onboarding form</p>
            <p className="text-sm text-blue-800 mt-0.5">Fill in your details before initiating a filing.</p>
            <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowOnboarding(true)}>Fill Onboarding Form</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {dashData?.full_name ? `Welcome, ${dashData.full_name}` : 'My Filings'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Click a filing to view documents and details.</p>
        </div>
        <Button onClick={() => { if (!onboardingComplete) { setShowOnboarding(true); return; } setOpenInit(true); }} disabled={pendingVerification} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Initiate ITR Filing
        </Button>
      </div>

      {/* Filing Directory Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : filings.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-3"><FolderOpen className="h-7 w-7" /></div>
          <h3 className="font-bold text-slate-900">No filings yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start by initiating your first ITR filing.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filings.map((f: any) => (
            <FilingCard key={f.id} filing={f} onClick={() => router.push(`/client/filings/${f.id}`)} />
          ))}
        </div>
      )}

      {/* Initiate Filing Dialog */}
      <Dialog open={openInit} onOpenChange={setOpenInit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Initiate new ITR filing</DialogTitle></DialogHeader>
          <div>
            <label className="text-sm font-medium">Financial Year</label>
            <Select value={fy} onValueChange={setFy}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select FY" /></SelectTrigger>
              <SelectContent>{getFYOptions().map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInit(false)}>Cancel</Button>
            <Button onClick={doInitiate} disabled={submitting || !fy} className="bg-indigo-600 hover:bg-indigo-700">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={(o) => { if (onboardingComplete) setShowOnboarding(o); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /> Complete Your Onboarding</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            {onboardingFields.map((f) => (
              <div key={f.id}>
                <Label>{f.field_label}{f.is_required && <span className="text-rose-500 ml-1">*</span>}</Label>
                {f.field_type === 'TEXT' && <Input value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" />}
                {f.field_type === 'NUMBER' && <Input type="number" value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" />}
                {f.field_type === 'DATE' && <Input type="date" value={onboardingValues[f.field_key] || ''} onChange={(e) => setOnboardingValues({ ...onboardingValues, [f.field_key]: e.target.value })} className="mt-1.5" />}
                {f.field_type === 'DROPDOWN' && (
                  <Select value={onboardingValues[f.field_key] || ''} onValueChange={(v) => setOnboardingValues({ ...onboardingValues, [f.field_key]: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{(f.field_options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                {f.field_type === 'FILE' && (
                  <OnboardingFileInput fieldKey={f.field_key} value={onboardingValues[f.field_key]} onUploaded={(fileId, name) => setOnboardingValues({ ...onboardingValues, [f.field_key]: fileId })} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter className="mt-4">
            {onboardingComplete && <Button variant="outline" onClick={() => setShowOnboarding(false)}>Close</Button>}
            <Button onClick={handleOnboardingSubmit} disabled={onboardingSaving} className="bg-indigo-600 hover:bg-indigo-700">
              {onboardingSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilingCard({ filing, onClick }: { filing: any; onClick: () => void }) {
  const state = filing.status || filing.current_state;
  const progress = filing.progress_percentage || 0;
  const docsApproved = filing.documents_approved || 0;
  const docsTotal = filing.documents_total || 0;
  const lastUpdated = filing.last_updated ? new Date(filing.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const stateColors: Record<string, string> = {
    INITIATED: 'border-slate-200 bg-slate-50/80',
    ON_BOARDING: 'border-blue-200 bg-blue-50/50',
    PROCESSING: 'border-indigo-200 bg-indigo-50/50',
    COMPUTATION: 'border-violet-200 bg-violet-50/50',
    FILING: 'border-orange-200 bg-orange-50/50',
    PAYMENT: 'border-amber-200 bg-amber-50/50',
    COMPLETED: 'border-emerald-200 bg-emerald-50/50',
    HALTED: 'border-rose-200 bg-rose-50/50',
  };

  return (
    <div
      className={`rounded-xl border-2 ${stateColors[state] || 'border-slate-200 bg-white'} p-5 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all group`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">ITR {filing.financial_year}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{lastUpdated}</p>
          </div>
        </div>
        <StatusBadge status={state} size="sm" />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span>{progress}% complete</span>
          {docsTotal > 0 && <span>{docsApproved}/{docsTotal} docs</span>}
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${state === 'COMPLETED' ? 'bg-emerald-500' : state === 'HALTED' ? 'bg-rose-400' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        {state === 'HALTED' && <span className="text-rose-600 font-medium">Filing halted by CA</span>}
        {state === 'COMPUTATION' && <span className="text-violet-600 font-medium">Review computation</span>}
        {state === 'ON_BOARDING' && <span className="text-blue-600 font-medium">Upload documents</span>}
        {state === 'COMPLETED' && <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Filed</span>}
        {state === 'PROCESSING' && <span className="text-indigo-600 font-medium">CA reviewing</span>}
        {state === 'INITIATED' && <span className="text-slate-600 font-medium">Awaiting checklist</span>}
      </div>
    </div>
  );
}

/** Inline file upload for onboarding dialog */
function OnboardingFileInput({ fieldKey, value, onUploaded }: { fieldKey: string; value: any; onUploaded: (fileId: string, name: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const hasFile = !!value && typeof value === 'string' && value.length > 0;

  const handle = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const r = await onboardingUploadUrl({ field_key: fieldKey, filename: file.name, content_type: file.type });
      await axios.put(r.upload_url, file, { headers: { 'Content-Type': file.type } });
      const confirm = await confirmOnboardingUpload({ field_key: fieldKey, object_key: r.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      const fileId = confirm?.file_id || confirm?.id || r.object_key;
      setFileName(file.name);
      onUploaded(fileId, file.name);
      toast.success(`${file.name} uploaded`);
    } catch (err: any) { toast.error(err?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div className="mt-1.5 flex items-center gap-2">
      {hasFile || fileName ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm text-slate-700 truncate">{fileName || 'Uploaded file'}</span>
        </div>
      ) : (
        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">No file uploaded</div>
      )}
      <label className="cursor-pointer">
        <input type="file" className="hidden" onChange={handle} />
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {hasFile || fileName ? 'Replace' : 'Upload'}
        </span>
      </label>
    </div>
  );
}
