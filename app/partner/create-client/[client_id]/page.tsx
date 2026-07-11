// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  getClient, getClientOnboardingForm, listFields, submitOnboardingFormForClient,
  initiateFilingForClient, listFilings, onboardingUploadUrl, confirmOnboardingUpload,
  storageDownloadUrl,
} from '@/lib/api';
import { FileViewer } from '@/components/shared/FileViewer';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Loader2, ArrowLeft, User, ClipboardList, FileText, Check, CheckCircle2,
  Upload, Eye, X, AlertTriangle, Calendar,
} from 'lucide-react';

export default function StaffClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.client_id as string;
  const user = typeof window !== 'undefined' ? getUser() : null;
  const role = user?.role?.toLowerCase() || 'partner';

  // Client info
  const [client, setClient] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(true);

  // Onboarding
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [onboardingSubmitted, setOnboardingSubmitted] = useState(false);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);
  const [savingOnboarding, setSavingOnboarding] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Filing
  const [filings, setFilings] = useState<any[]>([]);
  const [loadingFilings, setLoadingFilings] = useState(false);
  const [showFYDialog, setShowFYDialog] = useState(false);
  const [selectedFY, setSelectedFY] = useState('');
  const [initiating, setInitiating] = useState(false);

  // File viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);

  // Generate FY options (current + previous 3)
  const currentYear = new Date().getFullYear();
  const FY_OPTIONS = Array.from({ length: 4 }, (_, i) => {
    const y = currentYear - i;
    return `${y}-${y + 1}`;
  });

  const isPanField = (f: any) => Array.isArray(f.field_options) && f.field_options.includes('__pan_validation');
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  useEffect(() => {
    // Load client info
    getClient(clientId)
      .then((r) => setClient(r))
      .catch(() => toast.error('Client not found'))
      .finally(() => setLoadingClient(false));

    // Load onboarding form fields + client's submitted data
    Promise.all([listFields(), getClientOnboardingForm(clientId)])
      .then(([fieldsRes, formRes]) => {
        const items = fieldsRes?.items || [];
        items.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setFields(items);
        if (formRes?.submitted_data) {
          setValues(formRes.submitted_data);
          const names: Record<string, string> = {};
          Object.keys(formRes.submitted_data).forEach((k) => {
            if (k.endsWith('__filename') && formRes.submitted_data[k]) {
              names[k.replace('__filename', '')] = formRes.submitted_data[k];
            }
          });
          setFileNames(names);
          setOnboardingSubmitted(true);
        } else if (formRes?.submitted) {
          setOnboardingSubmitted(true);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOnboarding(false));

    // Load filings
    setLoadingFilings(true);
    listFilings({ client_id: clientId })
      .then((r) => setFilings(r?.items || []))
      .catch(() => {})
      .finally(() => setLoadingFilings(false));
  }, [clientId]);

  // File handling
  const handleFileSelect = (fieldKey: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setPendingFiles((prev) => ({ ...prev, [fieldKey]: file }));
    setFileNames((prev) => ({ ...prev, [fieldKey]: file.name }));
  };

  const removePendingFile = (fieldKey: string) => {
    setPendingFiles((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
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

  const handleSaveOnboarding = async () => {
    const missing = fields.filter((f) => f.is_required && !values[f.field_key]?.toString().trim() && !pendingFiles[f.field_key]);
    if (missing.length > 0) { toast.error(`Please fill: ${missing.map((f) => f.field_label).join(', ')}`); return; }
    const invalidPan = fields.filter((f) => isPanField(f) && values[f.field_key] && !PAN_REGEX.test(values[f.field_key]));
    if (invalidPan.length > 0) { toast.error(`Invalid PAN format. Expected: ABCDE1234F`); return; }
    setSavingOnboarding(true);

    // Upload pending files
    const pendingEntries = Object.entries(pendingFiles);
    if (pendingEntries.length > 0) {
      let uploaded = 0;
      for (const [fieldKey, file] of pendingEntries) {
        setUploadProgress({ current: uploaded + 1, total: pendingEntries.length });
        const success = await uploadSingleFile(fieldKey, file);
        if (!success) { setSavingOnboarding(false); setUploadProgress(null); return; }
        uploaded++;
        setPendingFiles((prev) => { const n = { ...prev }; delete n[fieldKey]; return n; });
      }
      setUploadProgress(null);
    }

    try {
      await submitOnboardingFormForClient(clientId, values);
      toast.success('Onboarding form submitted successfully');
      setOnboardingSubmitted(true);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to submit'); }
    finally { setSavingOnboarding(false); setUploadProgress(null); }
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

  const handleInitiateFiling = async () => {
    if (!selectedFY) { toast.error('Select a financial year'); return; }
    setInitiating(true);
    try {
      await initiateFilingForClient({ client_id: clientId, financial_year: selectedFY });
      toast.success(`Filing initiated for FY ${selectedFY}`);
      setShowFYDialog(false);
      setSelectedFY('');
      // Reload filings
      const r = await listFilings({ client_id: clientId });
      setFilings(r?.items || []);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to initiate filing'); }
    finally { setInitiating(false); }
  };

  if (loadingClient) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-slate-500">Client not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-1" /> Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/${role}/create-client`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{client.full_name}</h1>
          <p className="text-sm text-slate-500">{client.email} {client.phone_number ? `· ${client.phone_number}` : ''}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded font-bold ${client.account_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {client.account_status}
        </span>
      </div>

      {/* Step 1: Client Info Card */}
      <Card className="rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</div>
          <h3 className="text-sm font-semibold text-slate-700">Client Created</h3>
          <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div><span className="text-slate-400">Name</span><p className="text-slate-900 font-medium">{client.full_name}</p></div>
          <div><span className="text-slate-400">Email</span><p className="text-slate-900 font-medium">{client.email}</p></div>
          <div><span className="text-slate-400">Phone</span><p className="text-slate-900 font-medium">{client.phone_number || '—'}</p></div>
          <div><span className="text-slate-400">City</span><p className="text-slate-900 font-medium">{client.city || '—'}</p></div>
        </div>
      </Card>

      {/* Step 2: Onboarding Form */}
      <Card className="rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</div>
          <h3 className="text-sm font-semibold text-slate-700">Onboarding Form</h3>
          {onboardingSubmitted && <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />}
        </div>

        {loadingOnboarding ? (
          <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" /></div>
        ) : onboardingSubmitted ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm font-medium text-emerald-800">Onboarding form has been submitted.</p>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setOnboardingSubmitted(false)}>
              <ClipboardList className="h-3.5 w-3.5 mr-1" /> Edit Form
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {fields.length === 0 ? (
              <p className="text-sm text-slate-500">No form fields configured. Set up fields in the Form Builder first.</p>
            ) : (
              <>
                {fields.map((f) => (
                  <div key={f.id}>
                    <Label className="text-sm font-medium text-slate-700">
                      {f.field_label}{f.is_required && <span className="text-rose-500 ml-0.5">*</span>}
                    </Label>
                    {f.field_type === 'FILE' ? (
                      <div className="mt-1.5 space-y-2">
                        {values[f.field_key] && fileNames[f.field_key] && !pendingFiles[f.field_key] && (
                          <div className="flex items-center gap-2 text-xs bg-slate-50 border rounded px-2 py-1.5">
                            <FileText className="h-3.5 w-3.5 text-slate-400" />
                            <span className="truncate flex-1">{fileNames[f.field_key]}</span>
                            <Button size="sm" variant="ghost" className="h-6 px-1" onClick={() => handleFileView(f.field_key)}><Eye className="h-3 w-3" /></Button>
                          </div>
                        )}
                        {pendingFiles[f.field_key] ? (
                          <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                            <Upload className="h-3.5 w-3.5 text-amber-600" />
                            <span className="truncate flex-1 text-amber-800">{pendingFiles[f.field_key].name}</span>
                            <Button size="sm" variant="ghost" className="h-6 px-1 text-rose-500" onClick={() => removePendingFile(f.field_key)}><X className="h-3 w-3" /></Button>
                          </div>
                        ) : (
                          <div>
                            <Button size="sm" variant="outline" className="text-xs" onClick={() => document.getElementById(`file-${f.id}`)?.click()}>
                              <Upload className="h-3 w-3 mr-1" /> {values[f.field_key] ? 'Replace File' : 'Choose File'}
                            </Button>
                            <input id={`file-${f.id}`} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(f.field_key, file); e.target.value = ''; }} />
                          </div>
                        )}
                      </div>
                    ) : f.field_type === 'DATE' ? (
                      <Input type="date" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1.5" />
                    ) : f.field_type === 'NUMBER' ? (
                      <Input type="number" value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: e.target.value })} className="mt-1.5" />
                    ) : f.field_type === 'DROPDOWN' ? (
                      <Select value={values[f.field_key] || ''} onValueChange={(v) => setValues({ ...values, [f.field_key]: v })}>
                        <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>{(f.field_options || []).filter((o: string) => !o.startsWith('__')).map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={values[f.field_key] || ''}
                        onChange={(e) => setValues({ ...values, [f.field_key]: isPanField(f) ? e.target.value.toUpperCase().slice(0, 10) : e.target.value })}
                        className={`mt-1.5 ${isPanField(f) ? 'uppercase' : ''}`}
                        placeholder={isPanField(f) ? 'ABCDE1234F' : `Enter ${f.field_label.toLowerCase()}`}
                        maxLength={isPanField(f) ? 10 : undefined}
                      />
                    )}
                  </div>
                ))}

                {uploadProgress && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                    <p className="text-xs text-indigo-900">Uploading files... ({uploadProgress.current}/{uploadProgress.total})</p>
                  </div>
                )}

                <Button onClick={handleSaveOnboarding} disabled={savingOnboarding} className="bg-indigo-600 hover:bg-indigo-700">
                  {savingOnboarding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Submit Onboarding Form
                </Button>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Step 3: Filing Initiation */}
      <Card className="rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</div>
          <h3 className="text-sm font-semibold text-slate-700">Filing</h3>
          {filings.length > 0 && <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />}
        </div>

        {loadingFilings ? (
          <div className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" /></div>
        ) : (
          <div className="space-y-3">
            {filings.length > 0 && (
              <div className="space-y-2">
                {filings.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200">
                    <div>
                      <div className="text-sm font-medium text-slate-900">FY {f.financial_year}</div>
                      <div className="text-xs text-slate-500">Status: {f.status}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => router.push(`/${role}/clients/${clientId}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> View
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!onboardingSubmitted ? (
              <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800">Complete the onboarding form first before initiating a filing.</p>
              </div>
            ) : (
              <Button onClick={() => setShowFYDialog(true)} className="bg-violet-600 hover:bg-violet-700">
                <Calendar className="h-4 w-4 mr-2" /> Initiate New Filing
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* FY Picker Dialog */}
      <Dialog open={showFYDialog} onOpenChange={(o) => { if (!o && !initiating) { setShowFYDialog(false); setSelectedFY(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Initiate Filing for {client?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-slate-700">Financial Year</Label>
              <Select value={selectedFY} onValueChange={setSelectedFY}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select FY..." /></SelectTrigger>
                <SelectContent>
                  {FY_OPTIONS.map((fy) => (
                    <SelectItem key={fy} value={fy} disabled={filings.some((f) => f.financial_year === fy)}>
                      {fy} {filings.some((f) => f.financial_year === fy) ? '(already exists)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={initiating} onClick={() => { setShowFYDialog(false); setSelectedFY(''); }}>Cancel</Button>
            <Button disabled={!selectedFY || initiating} className="bg-violet-600 hover:bg-violet-700" onClick={handleInitiateFiling}>
              {initiating && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Initiate Filing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={viewerFileName} />
    </div>
  );
}
