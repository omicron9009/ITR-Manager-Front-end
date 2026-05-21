// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { me, changePassword } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState<any>({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    me().then((p) => setProfile(p)).catch(() => {});
  }, []);

  const handleChangePassword = async () => {
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
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      {/* Account Info */}
      <Card className="rounded-xl p-6">
        <h2 className="font-bold text-slate-900 mb-4">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div><div className="text-xs text-slate-500">Name</div><div className="font-medium text-slate-900">{profile.full_name || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Email</div><div className="font-medium text-slate-900">{profile.email || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Phone</div><div className="font-medium text-slate-900">{profile.phone_number || profile.phone || '—'}</div></div>
          <div><div className="text-xs text-slate-500">Role</div><div className="font-medium text-slate-900">Partner</div></div>
        </div>
      </Card>

      {/* Change Password */}
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
            onClick={handleChangePassword}
          >
            {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Update Password
          </Button>
        </div>
      </Card>
    </div>
  );
}
