'use client';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, FileCheck2, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerClient } from '@/lib/api';

const schema = z.object({
  full_name: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min 8 characters'),
  confirm: z.string(),
  phone: z.string().optional(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });

export default function RegisterPage() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values: any) => {
    setErr('');
    if (!panFile) { setErr('Please upload your PAN card document.'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('full_name', values.full_name);
      fd.append('email', values.email);
      fd.append('password', values.password);
      if (values.phone) fd.append('phone', values.phone);
      fd.append('pan_document', panFile);
      await registerClient(fd);
      setDone(true);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || 'Registration failed.');
    } finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-emerald-50 via-white to-indigo-100">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 p-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mx-auto"><CheckCircle2 className="h-8 w-8" /></div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Registration submitted!</h2>
          <p className="mt-2 text-sm text-slate-600">Your account is under verification. We&rsquo;ll email you once it&rsquo;s activated by the CA team.</p>
          <Link href="/auth/login"><Button className="mt-6 bg-indigo-600 hover:bg-indigo-700">Back to Login</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-indigo-50 via-white to-indigo-100">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md"><FileCheck2 className="h-6 w-6" /></span>
          <span className="font-bold text-2xl text-slate-900">ITR Manager</span>
        </Link>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900">Create your client account</h1>
          <p className="mt-1 text-sm text-slate-500">Register to start filing your ITR with your CA.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {err && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{err}</div>}
            <div>
              <Label>Full Name</Label>
              <Input {...register('full_name')} placeholder="Rajesh Kumar" className="mt-1.5" />
              {errors.full_name && <p className="text-xs text-rose-600 mt-1">{errors.full_name.message as string}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" {...register('email')} placeholder="you@example.com" className="mt-1.5" />
                {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email.message as string}</p>}
              </div>
              <div>
                <Label>Phone <span className="text-slate-400">(optional)</span></Label>
                <Input {...register('phone')} placeholder="+91 …" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            <div>
              <Label>PAN Card</Label>
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setPanFile(f); }}
                className={`mt-1.5 cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-colors ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'}`}
              >
                {panFile ? (
                  <div className="inline-flex items-center gap-2 text-sm text-emerald-700 font-medium"><FileText className="h-4 w-4" /> {panFile.name} <span className="text-slate-400">({(panFile.size/1024).toFixed(0)} KB)</span></div>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 mx-auto text-indigo-500" />
                    <p className="mt-2 text-sm text-slate-700"><span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop</p>
                    <p className="text-[11px] text-slate-500 mt-1">PDF, JPG or PNG</p>
                  </>
                )}
                <input ref={inputRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPanFile(f); }} />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 h-11 rounded-lg font-semibold">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting…</> : 'Create Account'}
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link href="/auth/login" className="font-semibold text-indigo-600 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
