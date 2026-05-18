'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { me, getOnboardingForm, submitOnboardingForm, onboardingUploadUrl, confirmOnboardingUpload, storageDownloadUrl } from '@/lib/api';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Upload, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<any>({});
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    me().then((p) => { setProfile(p); }).catch(() => {});
    getOnboardingForm().then((r) => { setFields(r?.fields || []); if (r?.submitted_data) setValues(r.submitted_data); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await submitOnboardingForm(values); toast.success('Profile saved'); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
      toast.error('File was uploaded before download support was added. Please re-upload.');
      return;
    }
    try {
      const r = await storageDownloadUrl(fileId);
      window.open(r.download_url || r.url, '_blank');
    } catch { toast.error('Download failed'); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      <Card className="rounded-xl p-6">
        {/* Account info */}
        <h2 className="font-bold text-slate-900 mb-4">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs text-slate-500">Name</div><div className="font-medium text-slate-900">{profile.full_name || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Email</div><div className="font-medium text-slate-900">{profile.email || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium text-slate-900">{profile.phone || profile.mobile || values['phone'] || values['mobile'] || values['phone_number'] || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={profile.account_status} /></div>
        </div>

        {/* All onboarding fields inline */}
        {fields.length > 0 && (
          <>
            <hr className="my-5 border-slate-100" />
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.id}>
                  <Label className="text-xs text-slate-500">{f.field_label}{f.is_required && <span className="text-rose-500 ml-0.5">*</span>}</Label>
                  {f.field_type === 'FILE' ? (
                    <FileField fieldKey={f.field_key} value={values[f.field_key]} fileName={fileNames[f.field_key]} uploading={uploading === f.field_key} onUpload={(file) => handleFileUpload(f.field_key, file)} onDownload={() => handleFileDownload(f.field_key)} />
                  ) : f.field_type === 'DATE' ? (
                    <Input type="date" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1" />
                  ) : f.field_type === 'NUMBER' ? (
                    <Input type="number" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1" />
                  ) : f.field_type === 'DROPDOWN' ? (
                    <Select value={values[f.field_key] || ''} onValueChange={(v) => setValues({ ...values, [f.field_key]: v })}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>{(f.field_options || []).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : (
                    <Input value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1" />
                  )}
                </div>
              ))}
              <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-2">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function FileField({ fieldKey, value, fileName, uploading, onUpload, onDownload }: { fieldKey: string; value: any; fileName?: string; uploading: boolean; onUpload: (f: File) => void; onDownload: () => void }) {
  const hasFile = !!value && typeof value === 'string' && value.length > 0;
  const filename = fileName || (hasFile ? 'File uploaded' : null);

  return (
    <div className="mt-1 flex items-center gap-2">
      {hasFile ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 truncate flex-1">{filename}</span>
          <Button size="sm" variant="outline" className="h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={onDownload}>
            <Download className="h-3.5 w-3.5 mr-1" /> View
          </Button>
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
