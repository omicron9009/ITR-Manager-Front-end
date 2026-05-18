'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { getClient, listFilings, filingDocs, initiateFiling, transitionFiling, haltFiling, markPayment, approveDoc, rejectDoc, listDocTypes, assignDocs, compForFiling, compUploadUrl, compConfirm, compDownloadUrl, completedDocs, completedDocUploadUrl, completedDocConfirm, storageDownloadUrl } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Phone, Pause, FileText, FolderUp, Plus, Check, X, Loader2, Send, FileCheck, Upload, Download, Calculator, RefreshCw, FileArchive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function ClientDetailPage() {
  const { client_id } = useParams<{ client_id: string }>();
  const [client, setClient] = useState<any>(null);
  const [filings, setFilings] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [haltFor, setHaltFor] = useState<any>(null);
  const [haltReason, setHaltReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getClient(client_id);
      setClient(c);
      const f = await listFilings({ client_id });
      const list = f?.items || f?.filings || f || [];
      setFilings(list);
      // load docs for each
      for (const fi of list) {
        try { const d = await filingDocs(fi.id); setDocs((prev) => ({ ...prev, [fi.id]: d?.items || d?.documents || d || [] })); } catch {}
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [client_id]);

  const initials = (client?.full_name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  const doInitiate = async () => {
    try { await initiateFiling({ financial_year: getCurrentFY() }); toast.success('Filing initiated'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const onHalt = async () => {
    if (!haltFor) return;
    setActing(true);
    try { await haltFiling(haltFor.id, haltReason || 'Halted by partner'); toast.success('Filing halted'); setHaltFor(null); setHaltReason(''); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setActing(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!client) return <EmptyState title="Client not found" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left */}
      <Card className="lg:col-span-2 rounded-xl p-6 h-fit">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-lg font-bold">{initials}</div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">{client.full_name}</h2>
            <StatusBadge status={client.account_status} />
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4" /> {client.email}</div>
          {client.phone_number && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4" /> {client.phone_number}</div>}
        </div>
        <div className="mt-5 pt-5 border-t border-slate-200">
          <div className="text-xs uppercase text-slate-400 font-semibold mb-2">Assigned Executive</div>
          <div className="text-sm font-medium text-slate-800">{client.assigned_executive_name || client.executive_name || 'Unassigned'}</div>
        </div>
        {client.pan_document_url && (
          <Button variant="outline" className="mt-5 w-full" onClick={() => window.open(client.pan_document_url, '_blank')}><FileText className="h-4 w-4 mr-2" /> View PAN Document</Button>
        )}
      </Card>

      {/* Right */}
      <div className="lg:col-span-3 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Filings &amp; Documents</h2>
          {client.account_status === 'ACTIVE' && <Button onClick={doInitiate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate New Filing</Button>}
        </div>
        {filings.length === 0 ? (
          <Card className="rounded-xl"><EmptyState icon={FolderUp} title="No filings yet" subtitle="Initiate the first filing for this client." /></Card>
        ) : filings.map((f: any) => (
          <Card key={f.id} className="rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase font-bold text-slate-400">{f.financial_year}</div>
                <h3 className="font-bold text-lg text-slate-900 mt-0.5">Filing &middot; {f.financial_year}</h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status || f.current_state} />
                {f.status !== 'COMPLETED' && f.status !== 'HALTED' && <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setHaltFor(f)}><Pause className="h-3.5 w-3.5 mr-1" /> Halt</Button>}
              </div>
            </div>
            <div className="mt-5"><FilingProgressBar currentState={f.status || f.current_state} /></div>
            <Tabs defaultValue="docs" className="mt-5">
              <TabsList>
                <TabsTrigger value="docs">Documents</TabsTrigger>
                <TabsTrigger value="computations">Computations</TabsTrigger>
                <TabsTrigger value="filed-docs">Filed Docs</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="docs" className="mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Documents</span>
                    {f.status !== 'COMPLETED' && f.status !== 'HALTED' && (
                      <AssignChecklistButton filingId={f.id} existingDocTypeNames={(docs[f.id] || []).map((d: any) => d.document_type_name)} onAssigned={load} />
                    )}
                  </div>
                  {(docs[f.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No documents assigned yet. Send a checklist to the client.</p>
                  ) : (docs[f.id] || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{d.document_type_name || d.original_filename}</div>
                          {d.original_filename && <div className="text-xs text-slate-500 truncate">{d.original_filename}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} size="sm" />
                        {d.status === 'UPLOADED' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={async () => { try { await approveDoc([d.id]); toast.success('Approved'); load(); } catch { toast.error('Failed'); } }}><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-200" onClick={async () => { const r = window.prompt('Rejection reason?'); if (r) { try { await rejectDoc([{ document_id: d.id, reason: r }]); toast.success('Rejected'); load(); } catch { toast.error('Failed'); } } }}><X className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="computations" className="mt-3">
                <ComputationPanel filingId={f.id} filingStatus={f.status || f.current_state} />
              </TabsContent>
              <TabsContent value="filed-docs" className="mt-3">
                <FiledDocsPanel filingId={f.id} filingStatus={f.status || f.current_state} />
              </TabsContent>
              <TabsContent value="actions" className="mt-3">
                <StateActions filing={f} onChange={load} />
              </TabsContent>
            </Tabs>
          </Card>
        ))}
      </div>

      <Dialog open={!!haltFor} onOpenChange={(o) => !o && setHaltFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Halt this filing?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Provide a reason. The client will see this banner.</p>
          <Textarea value={haltReason} onChange={(e) => setHaltReason(e.target.value)} placeholder="Reason…" rows={3} />
          <DialogFooter><Button variant="outline" onClick={() => setHaltFor(null)}>Cancel</Button><Button onClick={onHalt} disabled={acting} className="bg-rose-600 hover:bg-rose-700">{acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Halt</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StateActions({ filing, onChange }: { filing: any; onChange: () => void }) {
  const state = filing.status || filing.current_state;
  const tx = async (target: string) => {
    try { await transitionFiling(filing.id, { to_status: target }); toast.success(`Moved to ${target}`); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const doMarkPayment = async () => {
    try { await markPayment(filing.id); toast.success('Payment received — filing completed!'); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const items: { label: string; target: string; cls?: string; action?: () => void }[] = [];
  if (state === 'INITIATED') items.push({ label: 'Move to On Boarding', target: 'ON_BOARDING' });
  if (state === 'ON_BOARDING') items.push({ label: 'Move to Processing', target: 'PROCESSING' });
  if (state === 'PROCESSING') items.push({ label: 'Move to Computation', target: 'COMPUTATION' });
  if (state === 'COMPUTATION') items.push({ label: 'Move to Filing', target: 'FILING' });
  if (state === 'FILING') items.push({ label: 'Move to Payment', target: 'PAYMENT' });
  if (state === 'PAYMENT') items.push({ label: 'Mark Payment Received', target: 'COMPLETED', cls: 'bg-emerald-600 hover:bg-emerald-700', action: doMarkPayment });
  return (
    <div className="flex flex-wrap gap-2">
      {items.length === 0 && <p className="text-sm text-slate-500">No state actions available.</p>}
      {items.map((it) => <Button key={it.target} onClick={() => it.action ? it.action() : tx(it.target)} className={it.cls || 'bg-indigo-600 hover:bg-indigo-700'}>{it.label}</Button>)}
    </div>
  );
}

function AssignChecklistButton({ filingId, existingDocTypeNames, onAssigned }: { filingId: string; existingDocTypeNames: string[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    try {
      const r = await listDocTypes(false);
      const types = r?.items ?? r ?? [];
      setDocTypes(types);
      // Pre-select mandatory ones that aren't already assigned
      const mandatory = types.filter((t: any) => t.is_mandatory && !existingDocTypeNames.includes(t.name)).map((t: any) => t.id);
      setSelected(mandatory);
    } catch { toast.error('Failed to load document types'); }
  };

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const send = async () => {
    if (selected.length === 0) { toast.error('Select at least one document type'); return; }
    setSending(true);
    try {
      await assignDocs(filingId, selected);
      toast.success('Document checklist sent to client');
      setOpen(false);
      setSelected([]);
      onAssigned();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to assign'); }
    finally { setSending(false); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog} className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">
        <Send className="h-3.5 w-3.5 mr-1" /> Send Checklist
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-indigo-600" /> Send Document Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Select document types to assign to this filing. The client will be notified to upload these.</p>
          {docTypes.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No document types available. Create them in Document Checklist page first.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {docTypes.map((t: any) => {
                const alreadyAssigned = existingDocTypeNames.includes(t.name);
                return (
                  <label key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${alreadyAssigned ? 'border-slate-100 bg-slate-50 opacity-50' : selected.includes(t.id) ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <Checkbox
                      checked={selected.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      disabled={alreadyAssigned}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{t.name}</div>
                      {t.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.is_mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">REQUIRED</span>}
                      {alreadyAssigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">ASSIGNED</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending || selected.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComputationPanel({ filingId, filingStatus }: { filingId: string; filingStatus: string }) {
  const [computations, setComputations] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await compForFiling(filingId);
      setComputations(r?.items || []);
      setCurrentVersion(r?.current_version || null);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filingId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const urlRes = await compUploadUrl({ filing_id: filingId, filename: file.name, content_type: file.type });
      // Upload to presigned URL
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, file, { headers: { 'Content-Type': file.type } });
      // Confirm upload
      await compConfirm({ filing_id: filingId, object_key: urlRes.object_key, filename: file.name, content_type: file.type, file_size: file.size, version: urlRes.version });
      toast.success(`Computation v${urlRes.version} uploaded successfully`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const download = async (compId: string) => {
    try {
      const r = await compDownloadUrl(compId);
      window.open(r.download_url || r.url, '_blank');
    } catch { toast.error('Download failed'); }
  };

  const canUpload = ['COMPUTATION', 'PROCESSING'].includes(filingStatus);
  const latestRejected = currentVersion?.status === 'REJECTED';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">Tax Computations</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
          {canUpload && (
            <>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700" disabled={uploading} onClick={() => document.getElementById(`comp-upload-${filingId}`)?.click()}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                {latestRejected ? 'Upload New Version' : 'Upload Computation'}
              </Button>
              <input id={`comp-upload-${filingId}`} type="file" hidden accept=".pdf,.xlsx,.xls,.doc,.docx,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            </>
          )}
        </div>
      </div>

      {computations.length === 0 ? (
        <div className="text-center py-6">
          <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No computations uploaded yet.</p>
          {canUpload && <p className="text-xs text-slate-400 mt-1">Upload the tax computation for client review.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {computations.sort((a: any, b: any) => b.version - a.version).map((c: any) => (
            <div key={c.id} className={`p-3 rounded-lg border ${c.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/40' : c.status === 'REJECTED' ? 'border-rose-200 bg-rose-50/40' : c.status === 'SUPERSEDED' ? 'border-slate-200 bg-slate-50/60 opacity-60' : 'border-indigo-200 bg-indigo-50/40'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      Version {c.version}
                      {currentVersion?.id === c.id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">CURRENT</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.original_filename || 'computation.pdf'} · uploaded by {c.uploaded_by_name || 'Unknown'}
                    </div>
                    {c.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(c.uploaded_at).toLocaleDateString()} {new Date(c.uploaded_at).toLocaleTimeString()}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={c.status} size="sm" />
                  <Button size="sm" variant="ghost" onClick={() => download(c.id)}><Download className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {c.status === 'REJECTED' && c.rejection_reason && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-100 rounded px-2 py-1.5">
                  <span className="font-semibold">Rejection reason:</span> {c.rejection_reason}
                </div>
              )}
              {c.status === 'APPROVED' && c.approved_at && (
                <div className="mt-1 text-[10px] text-emerald-700">Approved on {new Date(c.approved_at).toLocaleDateString()}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const COMPLETED_DOC_TYPES = [
  { key: 'ITR_ACKNOWLEDGEMENT', label: 'ITR Acknowledgement', description: 'PDF acknowledgement from ITR portal' },
  { key: 'INVOICE', label: 'Invoice', description: 'Service invoice for the client' },
  { key: 'ITR_JSON', label: 'ITR JSON', description: 'ITR JSON file submitted to portal' },
];

function FiledDocsPanel({ filingId, filingStatus }: { filingId: string; filingStatus: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await completedDocs(filingId);
      setDocs(r || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filingId]);

  const canUpload = ['FILING', 'PAYMENT', 'COMPLETED'].includes(filingStatus);

  const handleUpload = async (docType: string, file: File) => {
    setUploading(docType);
    try {
      const urlRes = await completedDocUploadUrl({ filing_id: filingId, doc_type: docType, filename: file.name, content_type: file.type });
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, file, { headers: { 'Content-Type': file.type } });
      await completedDocConfirm({ filing_id: filingId, doc_type: docType, object_key: urlRes.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success(`${COMPLETED_DOC_TYPES.find(d => d.key === docType)?.label} uploaded`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const download = async (fileId: string) => {
    try {
      const r = await storageDownloadUrl(fileId);
      window.open(r.url || r.download_url, '_blank');
    } catch { toast.error('Download failed'); }
  };

  const getUploadedDoc = (docType: string) => docs.find((d: any) => d.doc_type === docType);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">ITR Filed Documents</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>

      {!canUpload ? (
        <div className="text-center py-6">
          <FileArchive className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Filing documents can be uploaded once the filing reaches the FILING stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {COMPLETED_DOC_TYPES.map((dt) => {
            const uploaded = getUploadedDoc(dt.key);
            const isUploading = uploading === dt.key;

            if (uploaded) {
              return (
                <div key={dt.key} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileArchive className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{dt.label}</div>
                        <div className="text-xs text-slate-500 truncate">{uploaded.original_filename || uploaded.filename}</div>
                        {uploaded.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(uploaded.uploaded_at).toLocaleDateString()}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">UPLOADED</span>
                      <Button size="sm" variant="ghost" onClick={() => download(uploaded.id)}><Download className="h-3.5 w-3.5" /></Button>
                      {/* Allow re-upload */}
                      <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => document.getElementById(`filed-${filingId}-${dt.key}`)?.click()}>
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <input id={`filed-${filingId}-${dt.key}`} type="file" hidden accept=".pdf,.json,.xlsx,.xls,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(dt.key, f); e.target.value = ''; }} />
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={dt.key} className="p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileArchive className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{dt.label}</div>
                      <div className="text-xs text-slate-400">{dt.description}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" disabled={isUploading} onClick={() => document.getElementById(`filed-${filingId}-${dt.key}`)?.click()}>
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                    Upload
                  </Button>
                  <input id={`filed-${filingId}-${dt.key}`} type="file" hidden accept=".pdf,.json,.xlsx,.xls,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(dt.key, f); e.target.value = ''; }} />
                </div>
              </div>
            );
          })}

          {docs.length === COMPLETED_DOC_TYPES.length && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 text-center">
              ✅ All filed documents uploaded. You can now mark payment and complete the filing.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCurrentFY() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}
