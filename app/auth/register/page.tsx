// @ts-nocheck
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileCheck2, CheckCircle2, ShieldCheck, Bell, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerClient } from '@/lib/api';
import GlobalFooter from '@/components/shared/GlobalFooter';
import AuthHeader from '@/components/shared/AuthHeader';

const schema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
  phone_number: z.string().regex(/^\d{10}$/, 'Phone number must be exactly 10 digits').optional().or(z.literal('')),
  declaration_accepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the declaration to proceed' }) }),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const declarationAccepted = watch('declaration_accepted');

  const onSubmit = async (values: any) => {
    setErr('');
    setSubmitting(true);
    try {
      await registerClient({
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        phone_number: values.phone_number || undefined,
        declaration_accepted: true,
      });
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader activePage="register" />
        <main className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 p-10 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto"><CheckCircle2 className="h-8 w-8" /></div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Registration submitted!</h2>
            <p className="mt-2 text-sm text-slate-600">Your account is under verification. We&rsquo;ll email you once it&rsquo;s activated by the CA team.</p>
            <Link href="/auth/login"><Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">Back to Login</Button></Link>
          </div>
        </main>
        <GlobalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <AuthHeader activePage="register" />

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
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

          {/* Right: Register form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
              <div className="flex items-center gap-2 mb-6 lg:hidden">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md"><FileCheck2 className="h-5 w-5" /></span>
                <span className="font-bold text-xl text-slate-900">ITR Manager</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
              <p className="mt-1 text-sm text-slate-500">Register to start filing your ITR with your CA.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
                <div>
                  <Label>Full Name</Label>
                  <Input {...register('full_name')} placeholder="Rajesh Kumar" className="mt-1.5" />
                  {errors.full_name && <p className="text-xs text-rose-600 mt-1">{errors.full_name.message as string}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" {...register('email')} placeholder="you@example.com" className="mt-1.5" />
                    {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
                  </div>
                  <div>
                    <Label>Phone <span className="text-slate-400">(optional)</span></Label>
                    <Input {...register('phone_number')} placeholder="9876543210" maxLength={10} className="mt-1.5" />
                    {errors.phone_number && <p className="text-xs text-rose-600 mt-1">{errors.phone_number.message as string}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Password</Label>
                    <Input type="password" {...register('password')} className="mt-1.5" />
                    {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password.message as string}</p>}
                  </div>
                  <div>
                    <Label>Confirm Password</Label>
                    <Input type="password" {...register('confirm')} className="mt-1.5" />
                    {errors.confirm && <p className="text-xs text-rose-600 mt-1">{errors.confirm.message as string}</p>}
                  </div>
                </div>
                {/* Declaration Consent */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold text-slate-800">Confidentiality & Data Protection Declaration</h3>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 text-xs text-slate-600 leading-relaxed bg-slate-50">
                    <p className="mb-2">We are committed to safeguarding the confidentiality, privacy, and security of your personal and financial information. All documents and information shared with us for Income Tax Return (&ldquo;ITR&rdquo;) filing and related professional services shall be handled with due care, professional confidentiality, and appropriate security safeguards in accordance with applicable laws and professional standards.</p>
                    <ol className="list-decimal list-inside space-y-2">
                      <li>All information and documents submitted by you including, but not limited to, PAN, Aadhaar, bank account details, income details, investment proofs, tax documents, financial statements, and supporting records shall be used strictly for the purpose of preparation, verification, processing, filing, and compliance relating to Income Tax Returns and allied professional services.</li>
                      <li>Your information shall not be used, shared, disclosed, sold, transferred, or circulated for any unrelated marketing or commercial purpose except:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>where required under applicable law or regulatory requirements;</li>
                          <li>where specifically authorized by you; or</li>
                          <li>where required for statutory compliance with government authorities, portals, intermediaries, or authorized service providers involved in the filing or compliance process.</li>
                        </ul>
                      </li>
                      <li>All client data and documents are stored securely within the firm&rsquo;s controlled internal infrastructure, including secure storage systems and restricted-access environments, and are protected through appropriate technical and organizational safeguards.</li>
                      <li>Client documents and confidential information shall not knowingly be uploaded to any publicly accessible repository or unsecured external platform.</li>
                      <li>Access to client information is restricted only to authorized personnel, employees, consultants, or professionals associated with the firm on a strict need-to-know basis for carrying out the intended professional services.</li>
                      <li>Reasonable security measures including access controls, authentication mechanisms, encryption practices, backup procedures, and monitoring systems are implemented to safeguard information against unauthorized access, alteration, disclosure, loss, or misuse.</li>
                      <li>Client data and records may be retained for such period as may be necessary for professional, legal, regulatory, audit, documentation, or compliance purposes and may thereafter be securely archived or deleted in accordance with applicable requirements and internal policies.</li>
                    </ol>
                    <p className="mt-3 font-semibold text-slate-700">Risk & Limitation Disclaimer</p>
                    <p className="mt-1">While reasonable industry-standard safeguards and security controls are maintained, no digital system, internet-based transmission, or electronic storage mechanism can guarantee absolute security. Accordingly, the firm shall not be liable for any indirect or consequential loss arising from unauthorized access, cyberattacks, malware, service interruptions, internet failures, governmental actions, force majeure events, or unauthorized acts of third parties beyond the firm&rsquo;s reasonable control, despite implementation of reasonable safeguards.</p>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" {...register('declaration_accepted')} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-xs text-slate-700 leading-snug">I/We have read and understood the above Confidentiality & Data Protection Declaration and hereby consent to the collection, storage, processing, retention, and use of the information and documents provided by me/us solely for the purpose of ITR filing, verification, compliance, and related professional services.</span>
                  </label>
                  {errors.declaration_accepted && <p className="text-xs text-rose-600">{errors.declaration_accepted.message as string}</p>}
                </div>
                <Button type="submit" disabled={submitting || !declarationAccepted} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold disabled:opacity-50">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</> : 'Create Account'}
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-slate-500">
                Already have an account? <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
              </p>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <GlobalFooter />
    </div>
  );
}
