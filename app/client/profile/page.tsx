'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { me, updateClientProfile, myForm } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ClientProfilePage() {
  const [profile, setProfile] = useState<any>({});
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    me().then((p) => { setProfile(p); setValues(p?.profile_data || p?.onboarding || {}); }).catch(() => {});
    myForm().then((r) => { setFields(r?.fields || r?.items || []); setValues((prev) => ({ ...prev, ...(r?.values || r?.profile_data || {}) })); }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try { await updateClientProfile(profile.id, { profile_data: values }); toast.success('Profile saved'); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card className="rounded-xl p-6 h-fit">
        <h2 className="font-bold text-slate-900">Account</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div><div className="text-xs text-slate-500">Name</div><div className="font-medium">{profile.full_name}</div></div>
          <div><div className="text-xs text-slate-500">Email</div><div className="font-medium">{profile.email}</div></div>
          <div><div className="text-xs text-slate-500">Status</div><StatusBadge status={profile.account_status} /></div>
        </div>
      </Card>
      <Card className="rounded-xl p-6">
        <h2 className="font-bold text-slate-900">Onboarding Details</h2>
        <div className="mt-4 space-y-3">
          {fields.length === 0 && <p className="text-xs text-slate-400">No onboarding fields configured.</p>}
          {fields.map((f) => (
            <div key={f.id}>
              <Label>{f.label}</Label>
              {f.field_type === 'DATE' ? (
                <Input type="date" value={values[f.field_key || f.id] || ''} onChange={(e) => setValues({ ...values, [f.field_key || f.id]: e.target.value })} className="mt-1.5" />
              ) : f.field_type === 'NUMBER' ? (
                <Input type="number" value={values[f.field_key || f.id] || ''} onChange={(e) => setValues({ ...values, [f.field_key || f.id]: e.target.value })} className="mt-1.5" />
              ) : (
                <Input value={values[f.field_key || f.id] || ''} onChange={(e) => setValues({ ...values, [f.field_key || f.id]: e.target.value })} className="mt-1.5" />
              )}
            </div>
          ))}
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 mt-2">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save Profile</Button>
        </div>
      </Card>
    </div>
  );
}
