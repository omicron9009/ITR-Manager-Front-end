'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { getFilingDirectory, docUploadUrl, docConfirmUpload, docDownloadUrl, storageDownloadUrl, compDownloadUrl, approveComp, submitDocs, completedDocs } from '@/lib/api';
import { toast } from 'sonner';
import { ChevronRight, Folder, FolderOpen, FileText, UploadCloud, Download, Lock, CheckCircle2, XCircle, Calculator, RefreshCw, ArrowLeft, FileSpreadsheet, FileImage, Send, AlertTriangle } from 'lucide-react';

export default function FilingDirectoryPage() {
  const { filing_id } = useParams<{ filing_id: string }>();
  const router = useRouter();
  const [dir, setDir] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [completedFiles, setCompletedFiles] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getFilingDirectory(filing_id);
      setDir(r);
      if (r?.status === 'COMPLETED') {
        try { const c = await completedDocs(filing_id); setCompletedFiles(c || []); } catch {}
      }
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [filing_id]);

  const onUpload = async (placeholder_id: string, doc_type_name: string, file: File) => {
    setUploading(placeholder_id);
    const loadingToast = toast.loading(`Uploading “${doc_type_name}”…`);
    try {
      const url = await docUploadUrl({ filing_id, document_id: placeholder_id, filename: file.name, content_type: file.type, file_size: file.size });
      await axios.put(url.upload_url || url.url, file, { headers: { 'Content-Type': file.type } });
      await docConfirmUpload({ document_id: placeholder_id, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success(`“${doc_type_name}” uploaded`, { id: loadingToast });
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || `Upload failed for “${doc_type_name}”`, { id: loadingToast });
    } finally { setUploading(null); }
  };

  const download = async (id: string, kind: 'doc' | 'comp' | 'storage' = 'doc') => {
    try {
      let r: any;
      if (kind === 'comp') r = await compDownloadUrl(id);
      else if (kind === 'storage') r = await storageDownloadUrl(id);
      else r = await docDownloadUrl(id);
      window.open(r.url || r.download_url, '_blank');
    } catch { toast.error('Failed to get download URL'); }
  };

  const onApproveComp = async (id: string) => { try { await approveComp(id); toast.success('Computation approved'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } };

  const onSubmitDocs = async () => {
    setSubmitting(true);
    try { await submitDocs(filing_id); toast.success('Documents submitted to your CA'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading filing…</div>;
  if (!dir) return <div className="text-sm text-slate-500">Filing not found.</div>;

  const status = dir.status;
  const isHalted = status === 'HALTED';
  const isCompleted = status === 'COMPLETED';
  const docs = dir.documents_required || [];
  const comps = dir.computations || [];
  const completed = (dir.completed_docs && dir.completed_docs.length ? dir.completed_docs : completedFiles) || [];

  const allDocsReady = docs.length > 0 && docs.every((d: any) => d.status === 'UPLOADED' || d.status === 'APPROVED');
  const canSubmit = (status === 'ON_BOARDING' || status === 'PROCESSING') && allDocsReady;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Button variant="ghost" size="sm" className="h-8 -ml-2" onClick={() => router.push('/client/dashboard')}><ArrowLeft className="h-4 w-4 mr-1" /> My Filings</Button>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-slate-700">ITR-{dir.financial_year}</span>
      </div>

      {/* Header */}
      <Card className="rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FolderOpen className="h-10 w-10 text-indigo-600" strokeWidth={1.5} />
            <div>
              <div className="text-xs uppercase font-bold text-slate-400">{dir.financial_year}</div>
              <h1 className="text-2xl font-bold text-slate-900">ITR Filing &middot; {dir.financial_year}</h1>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>
        {isHalted && <div className="mt-4 rounded-lg bg-rose-50 border border-rose-200 p-3 flex items-start gap-2 text-sm text-rose-800"><AlertTriangle className="h-4 w-4 mt-0.5" />This filing has been halted by your CA. Please contact them.</div>}
        <div className="mt-5"><FilingProgressBar currentState={status} /></div>
      </Card>

      {/* Documents Required folder */}
      <DirectorySection title="Documents Required" icon={Folder} count={docs.length} subtitle="Upload each document below. Your CA will review and approve.">
        {docs.length === 0 ? (
          <EmptyFolder text="Awaiting checklist from your CA." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {docs.map((d: any) => <PlaceholderCard key={d.id} doc={d} uploading={uploading === d.id} onUpload={(file) => onUpload(d.id, d.document_type_name, file)} onDownload={() => download(d.file_id || d.id, 'doc')} />)}
          </div>
        )}
        {canSubmit && (
          <div className="mt-4 flex justify-end">
            <Button onClick={onSubmitDocs} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">{submitting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Submit Documents to CA</Button>
          </div>
        )}
      </DirectorySection>

      {/* Computation folder */}
      <DirectorySection title="Computation" icon={Calculator} count={comps.length} subtitle="Your tax computation prepared by the CA. Approve to authorise filing.">
        {comps.length === 0 ? (
          <EmptyFolder text="Your computation will appear here once your CA uploads it." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {comps.map((c: any) => (
              <div key={c.id} className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                <div className="flex items-start justify-between">
                  <FileText className="h-10 w-10 text-violet-600" strokeWidth={1.5} />
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">v{c.version}</span>
                </div>
                <div className="mt-3 font-medium text-sm text-slate-900 truncate">{c.original_filename || `Computation v${c.version}`}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Uploaded {new Date(c.uploaded_at).toLocaleDateString()}</div>
                <div className="mt-2"><StatusBadge status={c.status} size="sm" /></div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => download(c.id, 'comp')}><Download className="h-3.5 w-3.5 mr-1" /> View</Button>
                  {c.status !== 'APPROVED' && c.status !== 'SUPERSEDED' && <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onApproveComp(c.id)}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </DirectorySection>

      {/* Filed Documents folder */}
      <DirectorySection title="Filed Documents" icon={isCompleted ? FolderOpen : Lock} count={isCompleted ? completed.length : 0} subtitle={isCompleted ? 'Your filing is complete — download your records below.' : 'Unlocks once your filing is completed.'} locked={!isCompleted}>
        {!isCompleted ? (
          <div className="flex items-center gap-3 p-6 bg-slate-50 rounded-lg text-slate-400 text-sm">
            <Lock className="h-5 w-5" /> Filed documents will appear here once your filing reaches the Completed stage.
          </div>
        ) : completed.length === 0 ? (
          <EmptyFolder text="Documents will be uploaded shortly." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {completed.map((d: any) => (
              <div key={d.id} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 hover:shadow-md transition-all">
                <FileText className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />
                <div className="mt-3 font-bold text-sm text-slate-900">{d.doc_type?.replace(/_/g, ' ')}</div>
                <div className="text-xs text-slate-600 truncate mt-0.5">{d.original_filename}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{new Date(d.uploaded_at).toLocaleDateString()}</div>
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => download(d.id, 'storage')}><Download className="h-3.5 w-3.5 mr-1" /> Download</Button>
              </div>
            ))}
          </div>
        )}
      </DirectorySection>
    </div>
  );
}

function DirectorySection({ title, icon: Icon, count, subtitle, locked, children }: any) {
  return (
    <Card className={`rounded-xl p-5 ${locked ? 'opacity-80' : ''}`}>
      <div className="flex items-center gap-3 mb-1">
        <Icon className={`h-5 w-5 ${locked ? 'text-slate-400' : 'text-indigo-600'}`} />
        <h2 className="font-bold text-slate-900">{title}</h2>
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{count} item{count === 1 ? '' : 's'}</span>
      </div>
      {subtitle && <p className="text-xs text-slate-500 mb-4 ml-8">{subtitle}</p>}
      <div className="ml-2 border-l-2 border-dashed border-slate-200 pl-5">{children}</div>
    </Card>
  );
}

function EmptyFolder({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-6 px-4 bg-slate-50 rounded-lg text-slate-500 text-sm">
      <Folder className="h-5 w-5" /> {text}
    </div>
  );
}

function iconForFile(name?: string) {
  if (!name) return FileText;
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return FileSpreadsheet;
  if (['jpg','jpeg','png','heic','webp'].includes(ext || '')) return FileImage;
  return FileText;
}

function PlaceholderCard({ doc, onUpload, onDownload, uploading }: { doc: any; onUpload: (f: File) => void; onDownload: () => void; uploading: boolean }) {
  const status = doc.status;
  const name = doc.document_type_name;
  const handle = (e: any) => { const f = e.target.files?.[0]; if (f) onUpload(f); };
  const FileIcon = iconForFile(doc.original_filename);

  if (status === 'PENDING_UPLOAD' || (status === 'REJECTED')) {
    const rejected = status === 'REJECTED';
    return (
      <label className={`relative cursor-pointer rounded-xl border-2 border-dashed p-4 transition-all flex flex-col items-center text-center ${rejected ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-50' : 'border-slate-300 bg-slate-50/40 hover:border-indigo-400 hover:bg-indigo-50/40'}`}>
        {uploading ? <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" /> : <UploadCloud className={`h-10 w-10 ${rejected ? 'text-rose-500' : 'text-slate-400'}`} strokeWidth={1.5} />}
        <div className="mt-2 font-semibold text-sm text-slate-900 break-words">Upload {name}</div>
        {rejected ? (
          <>
            <div className="mt-1"><StatusBadge status="REJECTED" size="sm" /></div>
            {doc.rejection_reason && <div className="text-[11px] text-rose-700 mt-1.5 px-2">Reason: {doc.rejection_reason}</div>}
            <div className="text-[10px] text-rose-600 mt-1 font-semibold">Click to re-upload</div>
          </>
        ) : (
          <div className="text-[10px] text-slate-500 mt-1">PDF, JPG, PNG, XLS &middot; click to upload</div>
        )}
        <input type="file" hidden onChange={handle} accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.doc,.docx" />
      </label>
    );
  }

  // UPLOADED or APPROVED
  const isApproved = status === 'APPROVED';
  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center text-center transition-all hover:shadow-md ${isApproved ? 'border-emerald-200 bg-emerald-50/40' : 'border-blue-200 bg-blue-50/40'}`}>
      <div className="relative">
        <FileIcon className={`h-10 w-10 ${isApproved ? 'text-emerald-600' : 'text-blue-600'}`} strokeWidth={1.5} />
        {isApproved && <CheckCircle2 className="h-4 w-4 text-emerald-600 absolute -bottom-1 -right-1 bg-white rounded-full" />}
      </div>
      <div className="mt-2 font-semibold text-sm text-slate-900 break-words">{name}</div>
      <div className="text-[10px] text-slate-500 truncate w-full mt-0.5">{doc.original_filename}</div>
      <div className="mt-1"><StatusBadge status={status} size="sm" /></div>
      <Button size="sm" variant="outline" className="mt-2 w-full h-7 text-xs" onClick={onDownload}><Download className="h-3 w-3 mr-1" /> View</Button>
    </div>
  );
}
