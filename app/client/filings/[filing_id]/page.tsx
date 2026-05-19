// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { FileViewer } from '@/components/shared/FileViewer';
import { getFiling, filingDocs, docUploadUrl, docConfirmUpload, docDownloadUrl, compForFiling, compDownloadUrl, approveComp, rejectComp, completedDocs, storageDownloadUrl, submitDocs } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Upload, FileText, Download, Eye, CheckCircle2, XCircle, Clock, RefreshCw, Loader2, FolderOpen, Calculator, Send, X } from 'lucide-react';

export default function FilingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const filingId = params.filing_id as string;

  const [filing, setFiling] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [docsMeta, setDocsMeta] = useState<any>({});
  const [computations, setComputations] = useState<any[]>([]);
  const [currentComp, setCurrentComp] = useState<any>(null);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [rejectingComp, setRejectingComp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const f = await getFiling(filingId);
      setFiling(f);

      const d = await filingDocs(filingId);
      setDocs(d?.items || []);
      setDocsMeta({ all_approved: d?.all_approved, pending: d?.pending_count, uploaded: d?.uploaded_count, rejected: d?.rejected_count, approved: d?.approved_count, total: d?.total });

      const state = f?.status;
      if (state === 'COMPUTATION' || state === 'FILING' || state === 'PAYMENT' || state === 'COMPLETED') {
        const c = await compForFiling(filingId);
        setComputations(c?.items || []);
        setCurrentComp(c?.current_version || null);
      }
      if (['FILING', 'PAYMENT', 'COMPLETED'].includes(state)) {
        const cd = await completedDocs(filingId);
        setCompleted(cd || []);
      }
    } catch (e: any) {
      toast.error('Failed to load filing');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (filingId) load(); }, [filingId]);

  const onUpload = async (docId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(docId);
    try {
      const url = await docUploadUrl({ document_id: docId, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url, file, { headers: { 'Content-Type': file.type } });
      await docConfirmUpload({ document_id: docId, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Document uploaded');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const onDownloadDoc = async (docId: string) => {
    try {
      const r = await docDownloadUrl(docId);
      setViewerUrl(r.download_url || r.url);
      setViewerFileName(undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const onDownloadStorage = async (fileId: string) => {
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.url || r.download_url);
      setViewerFileName(undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const onSubmitDocs = async () => {
    setActing(true);
    try { await submitDocs(filingId); toast.success('Documents submitted for review'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onApproveComp = async (id: string) => {
    setActing(true);
    try { await approveComp(id); toast.success('Computation approved!'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onRejectComp = async () => {
    if (!rejectingComp || !rejectReason.trim()) { toast.error('Provide a reason'); return; }
    setActing(true);
    try {
      await rejectComp(rejectingComp.id, rejectReason);
      toast.success('Sent back for revision');
      setRejectingComp(null); setRejectReason(''); load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setActing(false); }
  };

  const onDownloadComp = async (id: string) => {
    try { const r = await compDownloadUrl(id); setViewerUrl(r.download_url || r.url); setViewerFileName(undefined); setViewerOpen(true); }
    catch { toast.error('Could not load file'); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  if (!filing) return <div className="text-center py-16 text-slate-500">Filing not found.</div>;

  const state = filing.status;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/client/dashboard')}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">ITR Filing &middot; {filing.financial_year}</h1>
          <p className="text-sm text-slate-500">Initiated {new Date(filing.initiated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
        <StatusBadge status={state} />
      </div>

      {/* Progress */}
      <Card className="rounded-xl p-5">
        <FilingProgressBar currentState={state} />
      </Card>

      {/* Documents Section - File System View */}
      <Card className="rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">Documents</h2>
            {docsMeta.total > 0 && (
              <span className="text-xs text-slate-500 ml-2">
                {docsMeta.approved || 0} approved / {docsMeta.total} total
              </span>
            )}
          </div>
          {state === 'PROCESSING' && (
            <Button size="sm" onClick={onSubmitDocs} disabled={acting} className="bg-indigo-600 hover:bg-indigo-700">
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />} Submit Documents
            </Button>
          )}
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            {state === 'INITIATED' ? 'Your CA will assign a document checklist soon.' : 'No documents assigned yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((doc) => (
              <DocumentPlaceholder
                key={doc.id}
                doc={doc}
                uploading={uploading === doc.id}
                onUpload={(file) => onUpload(doc.id, file)}
                onView={() => onDownloadDoc(doc.id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Computation Section */}
      {(state === 'COMPUTATION' || computations.length > 0) && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="h-5 w-5 text-violet-600" />
            <h2 className="font-bold text-slate-900">Tax Computation</h2>
          </div>

          {currentComp && currentComp.status === 'UPLOADED' && (
            <div className="rounded-lg border-2 border-violet-200 bg-violet-50/50 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Version {currentComp.version}</div>
                  <div className="text-xs text-slate-500">{currentComp.original_filename || 'computation.pdf'}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadComp(currentComp.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={() => onApproveComp(currentComp.id)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setRejectingComp(currentComp)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Request Changes
                </Button>
              </div>
            </div>
          )}

          {computations.filter((c) => c.id !== currentComp?.id || c.status !== 'UPLOADED').length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">History</p>
              {computations.filter((c) => c.id !== currentComp?.id || c.status !== 'UPLOADED').sort((a, b) => b.version - a.version).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">v{c.version}</span>
                    <span className="text-slate-700 truncate">{c.original_filename || 'computation'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} size="sm" />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => onDownloadComp(c.id)}><Eye className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {computations.length === 0 && <p className="text-sm text-slate-500">Waiting for your CA to upload computation...</p>}
        </Card>
      )}

      {/* Completed Documents (filed) */}
      {completed.length > 0 && (
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-slate-900">Filed Documents</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {completed.map((d: any) => (
              <div key={d.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">{d.doc_type || d.original_filename || 'Document'}</div>
                    <div className="text-xs text-slate-500">{d.original_filename || d.filename}</div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onDownloadStorage(d.id)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reject Computation Dialog */}
      <Dialog open={!!rejectingComp} onOpenChange={(o) => { if (!o) { setRejectingComp(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Changes</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Explain what needs to be changed.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Describe changes needed..." rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingComp(null); setRejectReason(''); }}>Cancel</Button>
            <Button onClick={onRejectComp} disabled={acting || !rejectReason.trim()} className="bg-rose-600 hover:bg-rose-700">
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={viewerFileName} />
    </div>
  );
}

/** Document placeholder - Windows file system style */
function DocumentPlaceholder({ doc, uploading, onUpload, onView }: { doc: any; uploading: boolean; onUpload: (f: File) => void; onView: () => void }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const status = doc.status;

  const statusConfig: Record<string, { bg: string; border: string; icon: any; iconColor: string }> = {
    PENDING_UPLOAD: { bg: 'bg-slate-50', border: 'border-dashed border-slate-300 hover:border-indigo-400', icon: Upload, iconColor: 'text-slate-400' },
    UPLOADED: { bg: 'bg-blue-50/50', border: 'border-blue-200', icon: Clock, iconColor: 'text-blue-500' },
    APPROVED: { bg: 'bg-emerald-50/50', border: 'border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-500' },
    REJECTED: { bg: 'bg-rose-50/50', border: 'border-rose-200', icon: XCircle, iconColor: 'text-rose-500' },
  };

  const config = statusConfig[status] || statusConfig.PENDING_UPLOAD;
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-all`}>
      <div className="flex items-start gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${config.bg} ${config.iconColor}`}>
          {uploading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{doc.document_type_name || 'Document'}</p>
          {doc.original_filename && <p className="text-xs text-slate-500 truncate mt-0.5">{doc.original_filename}</p>}
          {pendingFile && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 border border-amber-200">
              <Upload className="h-3 w-3" />
              <span className="truncate">{pendingFile.name}</span>
              <button className="text-rose-500 hover:text-rose-700 ml-auto flex-shrink-0" onClick={() => setPendingFile(null)}>✕</button>
            </div>
          )}
          {!pendingFile && (
            <div className="mt-1">
              <StatusBadge status={status} size="sm" />
            </div>
          )}
          {status === 'REJECTED' && doc.rejection_reason && (
            <p className="text-xs text-rose-600 mt-1.5 bg-rose-50 rounded px-2 py-1">{doc.rejection_reason}</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {(status === 'PENDING_UPLOAD' || status === 'REJECTED') && !pendingFile && (
          <label className="flex-1">
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
            <span className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors">
              <Upload className="h-3.5 w-3.5" /> {status === 'REJECTED' ? 'Re-upload' : 'Choose File'}
            </span>
          </label>
        )}
        {pendingFile && (
          <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs" disabled={uploading} onClick={() => { onUpload(pendingFile); setPendingFile(null); }}>
            {uploading ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
            Confirm Upload
          </Button>
        )}
        {(status === 'UPLOADED' || status === 'APPROVED') && (
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={onView}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
        )}
      </div>
    </div>
  );
}
