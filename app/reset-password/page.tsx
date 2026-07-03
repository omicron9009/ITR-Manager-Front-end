'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ArrowLeft, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordWithLink } from '@/lib/api';
import { toast } from 'sonner';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const schema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password is too long'),
  confirm_password: z.string().min(8, 'Confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

function ResetPasswordLinkForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-amber-800 font-medium">Invalid reset link</p>
              <p className="text-xs text-amber-700 mt-1">This page requires a valid reset token from your email. Please request a new password reset link.</p>
            </div>
          </div>
        </div>
        <Link href="/auth/forgot-password">
          <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
            Request New Reset Link
          </Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (values: any) => {
    setErr('');
    setSubmitting(true);
    try {
      await resetPasswordWithLink({ token, new_password: values.new_password });
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (typeof detail === 'string') {
        setErr(detail);
      } else {
        setErr('Invalid or expired reset link. Please request a new one.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-emerald-800 font-medium">Password reset successfully!</p>
              <p className="text-xs text-emerald-700 mt-1">You can now sign in with your new password.</p>
            </div>
          </div>
        </div>
        <Button onClick={() => router.push('/auth/login')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-slate-500 mb-4">
        Enter your new password below. Password must be 8–128 characters.
      </p>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4">
        <p className="text-xs text-amber-700">This link expires in 15 minutes. If it has expired, you can request a new one.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {err && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">
            <p>{err}</p>
            {err.toLowerCase().includes('expired') || err.toLowerCase().includes('invalid') ? (
              <Link href="/auth/forgot-password" className="text-xs text-indigo-600 hover:underline font-medium mt-1 inline-block">
                Request a new reset link →
              </Link>
            ) : null}
          </div>
        )}
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
  );
}

export default function ResetPasswordLinkPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <AuthHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
                <KeyRound className="h-5 w-5" />
              </span>
              <span className="font-bold text-xl text-slate-900">Reset Password</span>
            </div>

            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>}>
              <ResetPasswordLinkForm />
            </Suspense>

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
