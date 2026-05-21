'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileCheck2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPassword } from '@/lib/api';
import { toast } from 'sonner';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  recovery_code: z.string().min(1, 'Recovery code is required').max(20, 'Recovery code is too long'),
  new_password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirm_password: z.string().min(8, 'Confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values: any) => {
    setErr('');
    setSubmitting(true);
    try {
      await resetPassword({
        email: values.email,
        recovery_code: values.recovery_code,
        new_password: values.new_password,
      });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === 'string') {
        setErr(detail);
      } else if (Array.isArray(detail)) {
        setErr(detail.map((d: any) => d.msg).join(', '));
      } else {
        setErr(e?.message || 'Failed to reset password. Check your recovery code and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <AuthHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span className="font-bold text-xl text-slate-900">Reset Password</span>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-sm text-emerald-800 font-medium">Password reset successfully!</p>
                  <p className="text-xs text-emerald-700 mt-1">You can now sign in with your new password.</p>
                </div>
                <Button onClick={() => router.push('/auth/login')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
                  Go to Login
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-1">Enter your email, one of your recovery codes, and a new password.</p>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
                  <p className="text-xs text-amber-700">Recovery codes were provided when you first logged in. Check the downloaded file <strong>ITR_platform_recovery_codes.txt</strong>.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="you@example.com" {...register('email')} className="mt-1.5" />
                    {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
                  </div>
                  <div>
                    <Label htmlFor="recovery_code">Recovery Code</Label>
                    <Input id="recovery_code" type="text" placeholder="Enter one of your recovery codes" {...register('recovery_code')} className="mt-1.5 font-mono" />
                    {errors.recovery_code && <p className="text-xs text-rose-600 mt-1">{errors.recovery_code.message as string}</p>}
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <Input id="new_password" type="password" placeholder="••••••••" {...register('new_password')} className="mt-1.5" />
                    {errors.new_password && <p className="text-xs text-rose-600 mt-1">{errors.new_password.message as string}</p>}
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirm New Password</Label>
                    <Input id="confirm_password" type="password" placeholder="••••••••" {...register('confirm_password')} className="mt-1.5" />
                    {errors.confirm_password && <p className="text-xs text-rose-600 mt-1">{errors.confirm_password.message as string}</p>}
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Resetting…</> : 'Reset Password'}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 text-center">
              <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </Link>
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
