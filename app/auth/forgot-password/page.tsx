'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPassword } from '@/lib/api';
import { toast } from 'sonner';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
});

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values: any) => {
    setErr('');
    setSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSuccess(true);
      toast.success('Reset link sent to your email!');
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;
      if (status === 404) {
        setErr(typeof detail === 'string' ? detail : 'No active account found with this email address.');
      } else if (status === 429) {
        setErr(typeof detail === 'string' ? detail : 'Too many password reset requests. Please try again later.');
      } else {
        setErr(typeof detail === 'string' ? detail : 'Failed to send reset email. Please try again later or contact support.');
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
                <Mail className="h-5 w-5" />
              </span>
              <span className="font-bold text-xl text-slate-900">Forgot Password</span>
            </div>

            {success ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm text-emerald-800 font-medium">Reset link sent!</p>
                      <p className="text-xs text-emerald-700 mt-1">Check your email inbox for a password reset link. The link expires in 15 minutes.</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-700">Didn&apos;t receive the email? Check your spam folder or try again after a few minutes.</p>
                </div>
                <Button onClick={() => setSuccess(false)} variant="outline" className="w-full h-11 rounded-lg font-semibold">
                  Send Again
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  Enter your registered email address and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="you@example.com" {...register('email')} className="mt-1.5" />
                    {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending…</> : 'Send Reset Link'}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 text-center space-y-2">
              <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline font-medium">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to login
              </Link>
              <p className="text-xs text-slate-500">
                Have a recovery code?{' '}
                <Link href="/auth/reset-password" className="text-indigo-600 hover:underline font-medium">Reset with recovery code</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <GlobalFooter />
    </div>
  );
}
