'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { myTracking, filingDocs, docUploadUrl, docConfirmUpload, docDownloadUrl, completedDocs, storageDownloadUrl } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { Folder, Upload, FileText, Lock, Download, RefreshCw } from 'lucide-react';

export default function ClientDocumentsPage() {
  const [filings, setFilings] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [completed, setCompleted] = useState<Record<string, any[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const load = async () => {
    try {
      const r = await myTracking();
      const list = r?.items || [];
      setFilings(list);
      for (const f of list) {
        try { const d = await filingDocs(f.id); setDocs((p) => ({ ...p, [f.id]: d?.items || [] })); } catch {}
        if ((f.status || f.current_state) === 'COMPLETED') { try { const c = await completedDocs(f.id); setCompleted((p) => ({ ...p, [f.id]: c || [] })); } catch {} }
      }
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const onUpload = async (filing_id: string, placeholder_id: string, file: File) => {
    setUploading(placeholder_id);
    try {
      const url = await docUploadUrl({ document_id: placeholder_id, filename: file.name, content_type: file.type });
      await axios.put(url.upload_url || url.url, file, { headers: { 'Content-Type': file.type } });
      await docConfirmUpload({ document_id: placeholder_id, object_key: url.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Uploaded');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const download = async (id: string, type: 'doc' | 'completed' = 'doc') => {
    try {
      const r = type === 'doc' ? await docDownloadUrl(id) : await storageDownloadUrl(id);
      window.open(r.url || r.download_url, '_blank');
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
      {filings.length === 0 && <Card className="rounded-xl p-10 text-center text-sm text-slate-500">No filings yet. Initiate one from My Filings.</Card>}
      {filings.map((f) => {
        const state = f.status || f.current_state;
        const isCompleted = state === 'COMPLETED';
        const placeholders = docs[f.id] || [];
        return (
          <Card key={f.id} className="rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4"><Folder className="h-5 w-5 text-indigo-600" /><h2 className="font-bold text-slate-900">ITR-{f.financial_year}</h2><StatusBadge status={state} /></div>

            <div className="ml-2 border-l-2 border-slate-200 pl-5 space-y-5">
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-2">📁 Documents Required</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {placeholders.length === 0 ? <p className="text-xs text-slate-400 col-span-2">Awaiting checklist assignment from CA.</p> : placeholders.map((d: any) => <DocCard key={d.id} doc={d} uploading={uploading === d.id} onUpload={(file) => onUpload(f.id, d.id, file)} onDownload={() => download(d.id, 'doc')} />)}
                </div>
              </div>
              {isCompleted && (
                <div>
                  <div className="text-sm font-semibold text-slate-700 mb-2">✅ Filed Documents</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(completed[f.id] || []).map((d: any) => (
                      <div key={d.id} className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-600" /><div><div className="font-medium text-sm text-slate-900">{d.doc_type || d.filename}</div><div className="text-xs text-slate-500">{d.filename}</div></div></div>
                        <Button size="sm" variant="outline" onClick={() => download(d.id, 'completed')}><Download className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!isCompleted && (
                <div className="text-sm text-slate-400 flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Filed Documents — unlocks once filing is completed</div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DocCard({ doc, onUpload, onDownload, uploading }: { doc: any; onUpload: (f: File) => void; onDownload: () => void; uploading: boolean }) {
  const status = doc.status;
  const handle = (e: any) => { const f = e.target.files?.[0]; if (f) onUpload(f); };
  if (status === 'PENDING_UPLOAD') {
    return (
      <label className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50 p-4 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
        <div className="flex items-center gap-3">
          {uploading ? <RefreshCw className="h-5 w-5 text-indigo-600 animate-spin" /> : <Upload className="h-5 w-5 text-slate-500" />}
          <div className="flex-1"><div className="font-medium text-sm text-slate-900">{doc.document_type_name || doc.original_filename}</div><div className="text-xs text-slate-500">Pending upload • PDF / JPG / PNG / XLS</div></div>
        </div>
        <input type="file" hidden onChange={handle} accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.doc,.docx" />
      </label>
    );
  }
  if (status === 'REJECTED') {
    return (
      <label className="cursor-pointer rounded-lg border-2 border-rose-300 bg-rose-50/60 p-4 hover:bg-rose-50">
        <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><FileText className="h-4 w-4 text-rose-600 flex-shrink-0" /><div className="min-w-0"><div className="font-medium text-sm text-rose-900 truncate">{doc.document_type_name || doc.original_filename}</div>{doc.rejection_reason && <div className="text-xs text-rose-700 mt-0.5">Reason: {doc.rejection_reason}</div>}</div></div><StatusBadge status="REJECTED" size="sm" /></div>
        <div className="mt-3"><Button size="sm" className="bg-rose-600 hover:bg-rose-700" onClick={(e) => { e.preventDefault(); (e.currentTarget.parentElement?.parentElement?.querySelector('input[type=file]') as HTMLInputElement)?.click(); }}><Upload className="h-3.5 w-3.5 mr-1" /> Re-upload</Button></div>
        <input type="file" hidden onChange={handle} accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.doc,.docx" />
      </label>
    );
  }
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0"><FileText className="h-4 w-4 text-emerald-600 flex-shrink-0" /><div className="min-w-0"><div className="font-medium text-sm text-slate-900 truncate">{doc.document_type_name || doc.original_filename}</div><div className="text-xs text-slate-500 truncate">{doc.original_filename}</div></div></div>
      <div className="flex items-center gap-2"><StatusBadge status={status} size="sm" /><Button size="sm" variant="ghost" onClick={onDownload}><Download className="h-3.5 w-3.5" /></Button></div>
    </div>
  );
}
