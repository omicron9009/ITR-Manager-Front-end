// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileViewer } from '@/components/shared/FileViewer';
import { me, getClient, getOnboardingForm, submitOnboardingForm, onboardingUploadUrl, confirmOnboardingUpload, storageDownloadUrl, getOnboardingFiles, changePassword, changeEmail, updateMyName, updateMyIncomeHeads } from '@/lib/api';
import { getUser } from '@/lib/auth';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, Upload, Eye, EyeOff, FileText, CheckCircle2, Lock, Mail, IndianRupee, Briefcase, Home, TrendingUp, Building2, Coins, HelpCircle, Pencil } from 'lucide-react';

const REFERRAL_SOURCE_LABELS: Record<string, string> = {
  WEBSITE: 'Website',
  FRIEND_RELATIVE: 'Friend / Relative',
  PROFESSIONAL_REFERRAL: 'Professional Referral',
  DIRECTED_BY_FIRM: 'Directed by Firm',
  OTHER: 'Other',
};

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<any>({});
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerFileName, setViewerFileName] = useState<string | undefined>(undefined);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  const [clientProfile, setClientProfile] = useState<any>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [incomeHeads, setIncomeHeads] = useState<Record<string, boolean>>({});
  const [anyOtherText, setAnyOtherText] = useState('');
  const [savingIncomeHeads, setSavingIncomeHeads] = useState(false);
  // Income Sources, Professional Fee, and Onboarding form fields are masked by
  // default on every page reload. Click "View Docs" to reveal; click again to mask.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    me().then((p) => {
      setProfile(p);
      setNameValue(p?.full_name || '');
      // Also fetch full client profile (has income_heads + professional_fee)
      const userId = p?.id || p?.user_id || getUser()?.user_id;
      if (userId) getClient(userId).then((cp) => {
        setClientProfile(cp);
        if (cp?.income_heads) setIncomeHeads({ ...cp.income_heads });
        if (cp?.income_heads?.any_other_text) setAnyOtherText(cp.income_heads.any_other_text);
      }).catch(() => {});
    }).catch(() => {});
    const loadForm = async () => {
      try {
        const r = await getOnboardingForm();
        const items = r?.fields || [];
        items.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setFields(items);
        const formValues: Record<string, any> = r?.submitted_data || {};
        const names: Record<string, string> = {};
        Object.keys(formValues).forEach((k) => {
          if (k.endsWith('__filename') && formValues[k]) {
            names[k.replace('__filename', '')] = formValues[k];
          }
        });

        // Fetch uploaded onboarding files to resolve file IDs and filenames
        try {
          const files = await getOnboardingFiles();
          if (files?.length) {
            files.forEach((f: any) => {
              const key = f.field_key;
              if (!key) return;
              const fileId = f.id || f.file_id || f.stored_file_id;
              const filename = f.original_filename || f.filename;
              if (fileId) formValues[key] = fileId;
              if (filename) names[key] = filename;
            });
          }
        } catch {}

        setValues(formValues);
        setFileNames(names);
      } catch {}
    };
    loadForm();
  }, []);

  const isPanField = (f: any) => Array.isArray(f.field_options) && f.field_options.includes('__pan_validation');
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

  const save = async () => {
    const invalidPan = fields.filter((f) => isPanField(f) && values[f.field_key] && !PAN_REGEX.test(values[f.field_key]));
    if (invalidPan.length > 0) { toast.error(`Invalid PAN format: ${invalidPan.map((f) => f.field_label).join(', ')}. Expected: ABCDE1234F`); return; }
    setSaving(true);
    try { await submitOnboardingForm(values); toast.success('Profile saved'); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleFileUpload = async (fieldKey: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(fieldKey);
    try {
      const r = await onboardingUploadUrl({ field_key: fieldKey, filename: file.name, content_type: file.type });
      await axios.put(r.upload_url, file, { headers: { 'Content-Type': file.type } });
      const confirm = await confirmOnboardingUpload({ field_key: fieldKey, object_key: r.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      const fileId = confirm?.file_id || confirm?.id || r.object_key;
      setValues((prev) => ({ ...prev, [fieldKey]: fileId, [`${fieldKey}__filename`]: file.name }));
      setFileNames((prev) => ({ ...prev, [fieldKey]: file.name }));
      toast.success(`${file.name} uploaded`);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const handleFileView = async (fieldKey: string) => {
    const fileId = values[fieldKey];
    if (!fileId || typeof fileId !== 'string') return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId)) {
      toast.error('File was uploaded before viewer support was added. Please re-upload.');
      return;
    }
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.download_url || r.url);
      setViewerFileName(fileNames[fieldKey] || undefined);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <Button
          variant={revealed ? 'outline' : 'default'}
          size="sm"
          className={revealed ? '' : 'bg-indigo-600 hover:bg-indigo-700'}
          onClick={() => setRevealed((v) => !v)}
        >
          {revealed ? (<><EyeOff className="h-4 w-4 mr-1.5" /> Mask Details</>) : (<><Eye className="h-4 w-4 mr-1.5" /> View Docs</>)}
        </Button>
      </div>

      <Card className="rounded-xl p-6">
        {/* Account info */}
        <h2 className="font-bold text-slate-900 mb-4">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Name</div>
            {editingName ? (
              <div className="flex items-center gap-2 mt-1">
                <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="h-8 text-sm" autoFocus />
                <Button size="sm" className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs" disabled={savingName || !nameValue.trim()} onClick={async () => {
                  setSavingName(true);
                  try {
                    const res = await updateMyName(nameValue.trim());
                    setProfile((p: any) => ({ ...p, full_name: res.full_name || nameValue.trim() }));
                    toast.success('Name updated');
                    setEditingName(false);
                  } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
                  finally { setSavingName(false); }
                }}>{savingName ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}</Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setEditingName(false); setNameValue(profile.full_name || ''); }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900">{profile.full_name || '—'}</span>
                <button onClick={() => setEditingName(true)} className="text-slate-400 hover:text-indigo-600 transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
          <div><div className="text-xs text-slate-500">Email</div><div className="font-medium text-slate-900">{profile.email || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium text-slate-900">{profile.phone_number || profile.phone || profile.mobile || values['phone'] || values['mobile'] || values['phone_number'] || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={profile.account_status} /></div>
          {clientProfile?.referral_source && (
            <div>
              <div className="text-xs text-slate-500">Referral Source</div>
              <div className="font-medium text-slate-900">
                {REFERRAL_SOURCE_LABELS[clientProfile.referral_source] || clientProfile.referral_source}
                {clientProfile.referral_source === 'OTHER' && clientProfile.referral_source_other && (
                  <span className="text-slate-500 font-normal"> — {clientProfile.referral_source_other}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Income Heads */}
        {clientProfile?.income_heads && (
          <>
            <hr className="my-5 border-slate-100" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-slate-900">Income Sources</h2>
              {revealed ? (
                <Button size="sm" className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-xs" disabled={savingIncomeHeads} onClick={async () => {
                  setSavingIncomeHeads(true);
                  try {
                    const res = await updateMyIncomeHeads({ ...incomeHeads, any_other_text: incomeHeads.any_other ? anyOtherText.trim() || null : null });
                    setClientProfile((cp: any) => ({ ...cp, income_heads: res }));
                    toast.success('Income sources updated');
                  } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to update'); }
                  finally { setSavingIncomeHeads(false); }
                }}>{savingIncomeHeads ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Save</Button>
              ) : null}
            </div>
            {revealed ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(INCOME_HEAD_LABELS).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setIncomeHeads((prev) => ({ ...prev, [key]: !prev[key] }))} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors ${incomeHeads[key] ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 hover:bg-slate-50'}`}>
                      <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${incomeHeads[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {incomeHeads[key] ? '✓' : '✗'}
                      </span>
                      <span className="text-sm text-slate-700">{label}</span>
                    </button>
                  ))}
                </div>
                {incomeHeads.any_other && (
                  <div className="mt-3">
                    <Input
                      value={anyOtherText}
                      onChange={(e) => setAnyOtherText(e.target.value)}
                      placeholder="Describe your other income source (e.g. Freelance consulting)"
                      maxLength={255}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-3 flex items-center gap-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" /> Hidden — click “View Docs” above to reveal.
              </div>
            )}
          </>
        )}

        {/* Professional Fee */}
        {clientProfile?.no_fees_applicable ? (
          <>
            <hr className="my-5 border-slate-100" />
            {revealed ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">No Fees Applicable</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" /> Professional fee status hidden
              </div>
            )}
          </>
        ) : (
          <>
            <hr className="my-5 border-slate-100" />
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-indigo-600" />
              <span className="text-xs uppercase text-slate-500 font-semibold">Professional Fee</span>
            </div>
            {revealed ? (
              clientProfile?.professional_fee ? (
                <>
                  <div className="text-lg font-bold text-slate-900 mt-1">₹{Number(clientProfile.professional_fee).toLocaleString('en-IN')}</div>
                  <p className="text-xs text-slate-500 mt-0.5">Plus applicable taxes, if any</p>
                </>
              ) : (
                <div className="text-sm font-medium text-amber-600 mt-1">To be decided</div>
              )
            ) : (
              <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-500">
                <Lock className="h-3.5 w-3.5" /> Hidden
              </div>
            )}
          </>
        )}

        {/* All onboarding fields inline */}
        {fields.length > 0 && (
          <>
            <hr className="my-5 border-slate-100" />
            {revealed ? (
              <div className="space-y-4">
                {fields.map((f) => (
                  <div key={f.id}>
                    <Label className="text-xs text-slate-500">{f.field_label}{f.is_required && <span className="text-rose-500 ml-0.5">*</span>}</Label>
                    {f.field_type === 'FILE' ? (
                      <FileField fieldKey={f.field_key} value={values[f.field_key]} fileName={fileNames[f.field_key]} uploading={uploading === f.field_key} onUpload={(file) => handleFileUpload(f.field_key, file)} onView={() => handleFileView(f.field_key)} />
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
                      <Input value={values[f.field_key] || ''} onChange={(e) => setValues({ ...values, [f.field_key]: isPanField(f) ? e.target.value.toUpperCase().slice(0, 10) : e.target.value })} className={`mt-1 ${isPanField(f) ? 'uppercase' : ''}`} placeholder={isPanField(f) ? 'ABCDE1234F' : undefined} maxLength={isPanField(f) ? 10 : undefined} />
                    )}
                  </div>
                ))}
                <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-2">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 flex items-start gap-2">
                <Lock className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Onboarding details hidden</p>
                  <p className="text-xs text-slate-500 mt-0.5">{fields.length} field{fields.length === 1 ? '' : 's'} including uploaded documents — click “View Docs” above to reveal.</p>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Change Email */}
      <Card className="rounded-xl p-6">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Mail className="h-4 w-4 text-indigo-600" /> Change Email</h2>
        <p className="text-sm text-slate-500 mb-4">Enter your new email and confirm with your password.</p>
        <div className="space-y-4 max-w-sm">
          <div>
            <Label htmlFor="new_email" className="text-xs text-slate-500">New Email</Label>
            <Input id="new_email" type="email" placeholder="Enter new email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email_password" className="text-xs text-slate-500">Password</Label>
            <Input id="email_password" type="password" placeholder="Enter your password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} className="mt-1" />
          </div>
          <Button
            disabled={changingEmail || !newEmail || !emailPassword}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={async () => {
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { toast.error('Enter a valid email address'); return; }
              setChangingEmail(true);
              try {
                await changeEmail({ new_email: newEmail, password: emailPassword });
                toast.success('Email changed successfully');
                setNewEmail(''); setEmailPassword('');
                me().then((p) => setProfile(p)).catch(() => {});
              } catch (e: any) {
                const detail = e?.response?.data?.detail;
                toast.error(typeof detail === 'string' ? detail : 'Failed to change email. Check your password.');
              } finally { setChangingEmail(false); }
            }}
          >
            {changingEmail && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update Email
          </Button>
        </div>
      </Card>

      {/* Change Password Section */}
      <Card className="rounded-xl p-6">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-600" /> Change Password</h2>
        <p className="text-sm text-slate-500 mb-4">Enter your current password to set a new one.</p>
        <div className="space-y-4 max-w-sm">
          <div>
            <Label htmlFor="old_password" className="text-xs text-slate-500">Current Password</Label>
            <Input id="old_password" type="password" placeholder="Enter current password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="new_password" className="text-xs text-slate-500">New Password</Label>
            <Input id="new_password" type="password" placeholder="Min 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="confirm_new_password" className="text-xs text-slate-500">Confirm New Password</Label>
            <Input id="confirm_new_password" type="password" placeholder="Re-enter new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="mt-1" />
          </div>
          <Button
            disabled={changingPassword || !oldPassword || !newPassword || !confirmNewPassword}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={async () => {
              if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
              if (newPassword.length > 128) { toast.error('New password is too long'); return; }
              if (newPassword !== confirmNewPassword) { toast.error('New passwords do not match'); return; }
              setChangingPassword(true);
              try {
                await changePassword({ old_password: oldPassword, new_password: newPassword });
                toast.success('Password changed successfully');
                setOldPassword(''); setNewPassword(''); setConfirmNewPassword('');
              } catch (e: any) {
                const detail = e?.response?.data?.detail;
                toast.error(typeof detail === 'string' ? detail : 'Failed to change password. Check your current password.');
              } finally { setChangingPassword(false); }
            }}
          >
            {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update Password
          </Button>
        </div>
      </Card>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={viewerFileName} />
    </div>
  );
}

function FileField({ fieldKey, value, fileName, uploading, onUpload, onView }: { fieldKey: string; value: any; fileName?: string; uploading: boolean; onUpload: (f: File) => void; onView: () => void }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const hasFile = !!value && typeof value === 'string' && value.length > 0;
  const filename = fileName || (hasFile ? 'File uploaded' : null);

  return (
    <div className="mt-1 flex items-center gap-2">
      {uploading ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-indigo-200 bg-indigo-50/50 px-3 py-2">
          <Loader2 className="h-4 w-4 text-indigo-600 animate-spin flex-shrink-0" />
          <span className="text-sm text-indigo-700 truncate flex-1">Uploading{pendingFile ? ` ${pendingFile.name}` : ''}...</span>
        </div>
      ) : pendingFile ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2">
          <Upload className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-500 hover:bg-rose-50" onClick={() => setPendingFile(null)}>✕</Button>
        </div>
      ) : hasFile ? (
        <div className="flex items-center gap-2 flex-1 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm text-slate-700 truncate flex-1">{filename}</span>
          <Button size="sm" variant="outline" className="h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={onView}>
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
        </div>
      ) : (
        <div className="flex-1 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-400">No file uploaded</div>
      )}
      {!uploading && pendingFile ? (
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3 py-2" onClick={() => { onUpload(pendingFile); setPendingFile(null); }}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Confirm
        </Button>
      ) : !uploading ? (
        <label className="cursor-pointer">
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} />
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            <Upload className="h-3.5 w-3.5" />
            {hasFile ? 'Replace' : 'Choose File'}
          </span>
        </label>
      ) : null}
      <p className="text-xs text-slate-400 mt-1">Allowed file types: PDF, Word, Excel, CSV, PNG, JPG</p>
    </div>
  );
}

const INCOME_HEAD_LABELS: Record<string, string> = {
  salary: 'Salary / Pension',
  esop: 'ESOP / RSU',
  rental_income: 'Rental Income',
  more_than_2_properties: 'More than 2 Properties',
  capital_gain_shares: 'Capital Gain – Shares / MF',
  capital_gain_land: 'Capital Gain – Land / Property',
  business_profession: 'Business / Profession',
  interest_dividend: 'Interest / Dividend',
  foreign_assets: 'Foreign Assets / Income',
  any_other: 'Any Other Income',
};
