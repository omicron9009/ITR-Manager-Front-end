'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login as apiLogin } from '@/lib/api';
import { setToken, setUser, decodeRole, roleToDashboard } from '@/lib/auth';
import { me as apiMe } from '@/lib/api';
import { toast } from 'sonner';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values: any) => {
    setErr('');
    setSubmitting(true);
    try {
      const res = await apiLogin(values.email, values.password);
      const token = res.access_token || res.token || res.accessToken;
      if (!token) throw new Error('No token returned');
      setToken(token);
      let role = decodeRole(token);
      let user: any = { email: values.email };
      try {
        const profile = await apiMe();
        user = { ...user, ...profile };
        role = (profile.role || role || '').toString().toUpperCase() as any;
      } catch {}
      setUser(user);
      toast.success('Welcome back!');
      router.push(roleToDashboard(role));
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md"><FileCheck2 className="h-6 w-6" /></span>
          <span className="font-bold text-2xl text-slate-900">ITR Manager</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your ITR Manager account.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register('email')} className="mt-1.5" />
              {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} className="mt-1.5" />
              {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password.message as string}</p>}
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…</> : 'Sign In'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            New client? <Link href="/auth/register" className="font-semibold text-indigo-600 hover:underline">Register here</Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">By signing in, you agree to ITR Manager&rsquo;s terms.</p>
      </div>
    </div>
  );
}
