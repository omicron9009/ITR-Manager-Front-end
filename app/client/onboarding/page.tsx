// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { getOnboardingForm, submitOnboardingForm, onboardingUploadUrl, confirmOnboardingUpload, storageDownloadUrl } from '@/lib/api';
import { FileViewer } from '@/components/shared/FileViewer';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Upload, Eye, CheckCircle2, ClipboardList, ArrowRight, AlertTriangle } from 'lucide-react';

export default function ClientOnboardingPage() {
  const router = useRouter();
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({}); // Files waiting to be uploaded on submit
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fieldKey: string } | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);

  useEffect(() => {
    getOnboardingForm().then((r) => {
      const items = r?.fields || [];
      items.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
      setFields(items);
      if (r?.submitted_data) {
        setValues(r.submitted_data);
        // Recover filenames from __filename keys
        const names: Record<string, string> = {};
        Object.keys(r.submitted_data).forEach((k) => {
          if (k.endsWith('__filename') && r.submitted_data[k]) {
            names[k.replace('__filename', '')] = r.submitted_data[k];
          }
        });
        setFileNames(names);
        setSubmitted(true);
      }
      else if (r?.submitted) { setSubmitted(true); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const isPanField = (f: any) => Array.isArray(f.field_options) && f.field_options.includes('__pan_validation');
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const handleFileSelect = (fieldKey: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setPendingFiles((prev) => ({ ...prev, [fieldKey]: file }));
    setFileNames((prev) => ({ ...prev, [fieldKey]: file.name }));
  };

  const removePendingFile = (fieldKey: string) => {
    setPendingFiles((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
    // Only clear filename if there's no already-uploaded file
    if (!values[fieldKey]) {
      setFileNames((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
    }
  };

  const uploadSingleFile = async (fieldKey: string, file: File): Promise<boolean> => {
    try {
      const r = await onboardingUploadUrl({ field_key: fieldKey, filename: file.name, content_type: file.type });
      await axios.put(r.upload_url, file, { headers: { 'Content-Type': file.type } });
      const confirm = await confirmOnboardingUpload({ field_key: fieldKey, object_key: r.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      const fileId = confirm?.file_id || confirm?.id || r.object_key;
      setValues((prev) => ({ ...prev, [fieldKey]: fileId, [`${fieldKey}__filename`]: file.name }));
      return true;
    } catch (e: any) {
      toast.error(`Upload failed for "${file.name}": ${e?.response?.data?.detail || e?.message || 'Unknown error'}`);
      return false;
    }
  };

  const save = async () => {
    const missing = fields.filter((f) => f.is_required && !values[f.field_key]?.toString().trim() && !pendingFiles[f.field_key]);
    if (missing.length > 0) { toast.error(`Please fill: ${missing.map((f) => f.field_label).join(', ')}`); return; }
    const invalidPan = fields.filter((f) => isPanField(f) && values[f.field_key] && !PAN_REGEX.test(values[f.field_key]));
    if (invalidPan.length > 0) { toast.error(`Invalid PAN format: ${invalidPan.map((f) => f.field_label).join(', ')}. Expected: ABCDE1234F`); return; }
    setSaving(true);

    // Upload pending files one by one
    const pendingEntries = Object.entries(pendingFiles);
    if (pendingEntries.length > 0) {
      let uploaded = 0;
      for (const [fieldKey, file] of pendingEntries) {
        setUploadProgress({ current: uploaded + 1, total: pendingEntries.length, fieldKey });
        const success = await uploadSingleFile(fieldKey, file);
        if (!success) {
          // Stop on first failure, keep form open for retry
          setSaving(false);
          setUploadProgress(null);
          toast.error('File upload failed. Please fix and try again.');
          return;
        }
        uploaded++;
        // Remove from pending after successful upload
        setPendingFiles((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      }
      setUploadProgress(null);
    }

    // Now submit the form data (values already updated by uploadSingleFile)
    try {
      // Get latest values after file uploads
      await submitOnboardingForm(values);
      toast.success('Onboarding form submitted!');
      router.push('/client/dashboard');
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); setUploadProgress(null); }
  };

  const handleFileView = async (fieldKey: string) => {
    const fileId = values[fieldKey];
    if (!fileId || typeof fileId !== 'string') return;
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.download_url || r.url);
      setViewerFileName(fileNames[fieldKey] || undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;

  // Already submitted - show confirmation message
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="inline-flex h-16 w-16 rounded-full bg-emerald-50 text-emerald-600 items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Onboarding Complete</h2>
        <p className="text-sm text-slate-500 mt-2">Your onboarding form has already been filled. You can now view and manage your filings.</p>
        <Link href="/client/dashboard">
          <Button className="mt-5 bg-indigo-600 hover:bg-indigo-700">
            Go to My Filings <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  // Not filled - show the form
  return (
    <div className="w-full space-y-6 overflow-x-hidden -m-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-indigo-600" /> Onboarding
        </h1>
        <p className="text-sm text-slate-500 mt-1">Please fill in your details to get started with filing.</p>
      </div>

      <Card className="rounded-xl p-4 sm:p-6">
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.id}>
              <Label className="text-sm font-medium text-slate-700">{f.field_label}{f.is_required && <span className="text-rose-500 ml-0.5">*</span>}</Label>
              {f.field_type === 'FILE' ? (
                <FileUploadField
                  fieldKey={f.field_key}
                  value={values[f.field_key]}
                  fileName={fileNames[f.field_key]}
                  pendingFile={pendingFiles[f.field_key] || null}
                  onSelect={(file) => handleFileSelect(f.field_key, file)}
                  onRemove={() => removePendingFile(f.field_key)}
                  onView={() => handleFileView(f.field_key)}
                  isUploading={uploadProgress?.fieldKey === f.field_key}
                />
              ) : f.field_type === 'DATE' ? (
                <Input type="date" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1.5" />
              ) : f.field_type === 'NUMBER' ? (
                <Input type="number" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1.5" />
              ) : f.field_type === 'DROPDOWN' ? (
                <Select value={values[f.field_key] || ''} onValueChange={(v) => setValues({ ...values, [f.field_key]: v })}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{(f.field_options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: isPanField(f) ? e.target.value.toUpperCase().slice(0, 10) : e.target.value })} className={`mt-1.5 ${isPanField(f) ? 'uppercase' : ''}`} placeholder={isPanField(f) ? 'ABCDE1234F' : `Enter ${f.field_label.toLowerCase()}`} maxLength={isPanField(f) ? 10 : undefined} />
              )}
            </div>
          ))}
        </div>

        {/* Upload progress indicator */}
        {uploadProgress && (
          <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-indigo-900 truncate">Uploading files... ({uploadProgress.current}/{uploadProgress.total})</p>
              <p className="text-xs text-indigo-600">Please wait, uploads are in progress</p>
            </div>
          </div>
        )}

        {/* Pending files summary */}
        {Object.keys(pendingFiles).length > 0 && !saving && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-amber-800">
              {Object.keys(pendingFiles).length} file{Object.keys(pendingFiles).length > 1 ? 's' : ''} selected — will be uploaded when you submit.
            </p>
          </div>
        )}

        <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-6 w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {saving ? (uploadProgress ? 'Uploading Files...' : 'Submitting...') : 'Submit Onboarding Form'}
        </Button>
      </Card>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={viewerFileName} />
    </div>
  );
}

function FileUploadField({ fieldKey, value, fileName, pendingFile, onSelect, onRemove, onView, isUploading }: {
  fieldKey: string;
  value: any;
  fileName?: string;
  pendingFile: File | null;
  onSelect: (f: File) => void;
  onRemove: () => void;
  onView: () => void;
  isUploading: boolean;
}) {
  const hasFile = !!value && typeof value === 'string' && value.length > 0;
  const rawName = pendingFile?.name || fileName || (hasFile ? 'Uploaded file' : null);
  // Truncate long filenames: show first 12 + ... + last 8 chars (with extension)
  const truncateName = (name: string | null, max = 24) => {
    if (!name || name.length <= max) return name;
    const ext = name.lastIndexOf('.') > 0 ? name.slice(name.lastIndexOf('.')) : '';
    const base = name.slice(0, name.length - ext.length);
    const keep = max - ext.length - 3; // 3 for "..."
    if (keep < 6) return name.slice(0, max - 3) + '...' + ext;
    return base.slice(0, Math.ceil(keep * 0.6)) + '...' + base.slice(-(Math.floor(keep * 0.4))) + ext;
  };
  const displayName = truncateName(rawName);

  return (
    <div className="mt-1.5 w-full overflow-hidden">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          {isUploading ? (
            <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2">
              <Loader2 className="h-4 w-4 text-indigo-600 animate-spin flex-shrink-0" />
              <span className="text-xs sm:text-sm text-indigo-700 truncate" title={pendingFile?.name}>{pendingFile?.name ? `Uploading ${truncateName(pendingFile.name)}...` : 'Uploading...'}</span>
            </div>
          ) : pendingFile ? (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2">
              <Upload className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-700 truncate flex-1 min-w-0" title={pendingFile.name}>{truncateName(pendingFile.name)}</span>
              <span className="text-[10px] text-amber-600 font-medium flex-shrink-0">Ready</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-rose-500 hover:bg-rose-50 flex-shrink-0" onClick={onRemove}>✕</Button>
            </div>
          ) : hasFile ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span className="text-xs sm:text-sm text-slate-700 truncate flex-1 min-w-0" title={rawName || undefined}>{displayName}</span>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-indigo-600 hover:bg-indigo-50 flex-shrink-0" onClick={onView}><Eye className="h-3.5 w-3.5" /></Button>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-400">No file selected</div>
          )}
        </div>
        {!isUploading && (
          <label className="cursor-pointer flex-shrink-0">
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ''; }} />
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors whitespace-nowrap">
              <Upload className="h-3.5 w-3.5" />
              {hasFile || pendingFile ? 'Replace' : 'Choose'}
            </span>
          </label>
        )}
      </div>
      <p className="text-[10px] sm:text-xs text-slate-400 mt-1 break-words">PDF, Word, Excel, CSV, PNG, JPG (max 10MB)</p>
    </div>
  );
}
