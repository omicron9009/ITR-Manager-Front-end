'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck, Bell, FolderOpen, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { login as apiLogin } from '@/lib/api';
import { setToken, setUser, setRole, decodeRole, roleToDashboard } from '@/lib/auth';
import { me as apiMe } from '@/lib/api';
import { toast } from 'sonner';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Min 6 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const downloadRecoveryCodes = (codes: string[], email: string) => {
    const content = [
      '═══════════════════════════════════════════════════════════',
      '       ITR MANAGER — ACCOUNT RECOVERY CODES',
      '═══════════════════════════════════════════════════════════',
      '',
      `Account: ${email}`,
      '',
      'IMPORTANT: Store these codes in a safe place.',
      '',
      '• Each code can only be used ONCE to reset your password.',
      '• Once a code is used, it is permanently consumed.',
      '• If you lose all codes, contact your CA/Partner admin.',
      '• These codes are the ONLY way to reset your password',
      '  without contacting support.',
      '',
      '───────────────────────────────────────────────────────────',
      '  YOUR RECOVERY CODES',
      '───────────────────────────────────────────────────────────',
      '',
      ...codes.map((code, i) => `  ${i + 1}. ${code}`),
      '',
      '───────────────────────────────────────────────────────────',
      '',
      `Generated on: ${new Date().toLocaleString()}`,
      'Platform: ITR Filing Management Platform',
      '',
      'To reset your password:',
      '  1. Go to the login page and click "Forgot password?"',
      '  2. Enter your email address',
      '  3. Enter one of the recovery codes above',
      '  4. Set your new password',
      '',
      '═══════════════════════════════════════════════════════════',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ITR_platform_recovery_codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

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
      // Capture is_elevated from login response immediately
      if (res.is_elevated !== undefined) user.is_elevated = res.is_elevated;
      try {
        const profile = await apiMe();
        user = { ...user, ...profile };
        role = (profile.role || role || '').toString().toUpperCase() as any;
      } catch {
        // Re-set token in case interceptor cleared it
        setToken(token);
      }
      if (role) setRole(role as string);
      setUser(user);

      // Check if recovery codes were returned (first login or codes not yet issued)
      if (res.recovery_codes && Array.isArray(res.recovery_codes) && res.recovery_codes.length > 0) {
        setRecoveryCodes(res.recovery_codes);
        setShowRecoveryDialog(true);
        setPendingRedirect(roleToDashboard(role));
        setRecoveryEmail(res.email || values.email);
        // Auto-download the file
        downloadRecoveryCodes(res.recovery_codes, res.email || values.email);
      } else {
        toast.success('Welcome back!');
        router.push(roleToDashboard(role));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Login failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecoveryDialogClose = () => {
    setShowRecoveryDialog(false);
    toast.success('Welcome! Your recovery codes have been downloaded.');
    if (pendingRedirect) router.push(pendingRedirect);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <AuthHeader activePage="login" />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/bg-dark.png')" }}>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: About section */}
          <div className="hidden lg:block space-y-6">
            <h2 className="text-3xl font-bold text-slate-900 leading-tight">
              The smartest way to manage <span className="text-indigo-600">ITR filings</span>
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Upload your documents, track every step in real time, and approve your computation with one click. Your CA handles the rest — no more endless emails, calls, or WhatsApp follow-ups.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><ShieldCheck className="h-4 w-4" /></span>
                Bank-grade security for all your documents
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><Bell className="h-4 w-4" /></span>
                Real-time notifications at every filing stage
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-700">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"><FolderOpen className="h-4 w-4" /></span>
                Secure document vault with instant access
              </div>
            </div>
          </div>

          {/* Right: Login form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center mb-6 lg:hidden">
                <Image src="/darklogo1.png" alt="ITR Manager" width={180} height={60} className="h-12 w-auto object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="mt-1 text-sm text-slate-500">Sign in to your AIकर account.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" {...register('email')} className="mt-1.5" />
                  {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/auth/reset-password" className="text-xs text-indigo-600 hover:underline font-medium">Forgot password?</Link>
                  </div>
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
            <p className="mt-4 text-center text-xs text-slate-400">By signing in, you agree to AIकर&rsquo;s terms.</p>
          </div>
        </div>
      </main>

      {/* Recovery Codes Dialog */}
      <Dialog open={showRecoveryDialog} onOpenChange={(open) => { if (!open) handleRecoveryDialogClose(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="h-5 w-5" /> Recovery Codes — Save These Now!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <p className="text-sm text-amber-800 font-medium">These are your one-time recovery codes for password reset.</p>
              <p className="text-xs text-amber-700 mt-1">Each code can only be used once. Store them safely — this is the only time they will be displayed.</p>
            </div>
            {recoveryCodes && (
              <div className="grid grid-cols-2 gap-2">
                {recoveryCodes.map((code, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 border border-slate-200 font-mono text-sm text-slate-800">
                    <span className="text-xs text-slate-400 w-4">{i + 1}.</span>
                    {code}
                  </div>
                ))}
              </div>
            )}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs text-slate-600"><strong>How to use:</strong> If you forget your password, click &ldquo;Forgot password?&rdquo; on the login page, enter your email and one of these codes, then set a new password.</p>
            </div>
            {downloaded && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <Download className="h-3.5 w-3.5" /> File downloaded: ITR_platform_recovery_codes.txt
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!downloaded && recoveryCodes && (
              <Button variant="outline" onClick={() => downloadRecoveryCodes(recoveryCodes, recoveryEmail)} className="gap-2">
                <Download className="h-4 w-4" /> Download Again
              </Button>
            )}
            <Button onClick={handleRecoveryDialogClose} className="bg-indigo-600 hover:bg-indigo-700">
              I&apos;ve saved my codes — Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <GlobalFooter />
    </div>
  );
}
