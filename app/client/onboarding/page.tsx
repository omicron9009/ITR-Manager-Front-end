'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { getOnboardingForm, submitOnboardingForm, onboardingUploadUrl, confirmOnboardingUpload, storageDownloadUrl } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Upload, Download, CheckCircle2, ClipboardList, ArrowRight } from 'lucide-react';

export default function ClientOnboardingPage() {
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    getOnboardingForm().then((r) => {
      setFields(r?.fields || []);
      if (r?.submitted_data) { setValues(r.submitted_data); setSubmitted(true); }
      else if (r?.submitted) { setSubmitted(true); }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    const missing = fields.filter((f) => f.is_required && !values[f.field_key]?.toString().trim());
    if (missing.length > 0) { toast.error(`Please fill: ${missing.map((f) => f.field_label).join(', ')}`); return; }
    setSaving(true);
    try {
      await submitOnboardingForm(values);
      toast.success('Onboarding form submitted!');
      setSubmitted(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleFileUpload = async (fieldKey: string, file: File) => {
    setUploading(fieldKey);
    try {
      const r = await onboardingUploadUrl({ field_key: fieldKey, filename: file.name, content_type: file.type });
      await axios.put(r.upload_url, file, { headers: { 'Content-Type': file.type } });
      const confirm = await confirmOnboardingUpload({ field_key: fieldKey, object_key: r.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      const fileId = confirm?.file_id || confirm?.id || r.object_key;
      setValues((prev) => ({ ...prev, [fieldKey]: fileId }));
      setFileNames((prev) => ({ ...prev, [fieldKey]: file.name }));
      toast.success(`${file.name} uploaded`);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const handleFileDownload = async (fieldKey: string) => {
    const fileId = values[fieldKey];
    if (!fileId || typeof fileId !== 'string') return;
    try {
      const r = await storageDownloadUrl(fileId);
      window.open(r.download_url || r.url, '_blank');
    } catch { toast.error('Download failed'); }
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
        <p className="text-sm text-slate-500 mt-2">Your onboarding form has already been filled. You can update your details from your profile.</p>
        <Link href="/client/profile">
          <Button className="mt-5 bg-indigo-600 hover:bg-indigo-700">
            Go to Profile <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    );
  }

  // Not filled - show the form
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-indigo-600" /> Onboarding
        </h1>
        <p className="text-sm text-slate-500 mt-1">Please fill in your details to get started with filing.</p>
      </div>

      <Card className="rounded-xl p-6">
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f.id}>
              <Label className="text-sm font-medium text-slate-700">{f.field_label}{f.is_required && <span className="text-rose-500 ml-0.5">*</span>}</Label>
              {f.field_type === 'FILE' ? (
                <FileUploadField fieldKey={f.field_key} value={values[f.field_key]} fileName={fileNames[f.field_key]} uploading={uploading === f.field_key} onUpload={(file) => handleFileUpload(f.field_key, file)} onDownload={() => handleFileDownload(f.field_key)} />
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
                <Input value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1.5" placeholder={`Enter ${f.field_label.toLowerCase()}`} />
              )}
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-6 w-full">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit Onboarding Form
        </Button>
      </Card>
    </div>
  );
}

function FileUploadField({ fieldKey, value, fileName, uploading, onUpload, onDownload }: { fieldKey: string; value: any; fileName?: string; uploading: boolean; onUpload: (f: File) => void; onDownload: () => void }) {
  const hasFile = !!value && typeof value === 'string' && value.length > 0;
  const filename = fileName || (hasFile ? 'Uploaded file' : null);

  return (
    <div className="mt-1.5 flex items-center gap-2">
      {hasFile ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 truncate flex-1">{filename}</span>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDownload}><Download className="h-3.5 w-3.5" /></Button>
        </div>
      ) : (
        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">No file uploaded</div>
      )}
      <label className="cursor-pointer">
        <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {hasFile ? 'Replace' : 'Upload'}
        </span>
      </label>
    </div>
  );
}
