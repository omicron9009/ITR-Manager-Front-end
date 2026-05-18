import Link from 'next/link';
import { ArrowRight, ShieldCheck, Bell, FolderOpen, FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 pt-32 pb-24">
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium text-white/90 border border-white/15">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> File your ITR online &middot; FY 2024-25 open now
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          File your <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-200">Income Tax Return</span> <br className="hidden md:block" />
          without the paperwork chaos.
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/80 leading-relaxed">
          Upload your documents, track every step in real time, and approve your computation with one click. Your CA handles the rest. No more endless emails, calls, or WhatsApp follow-ups.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="bg-white hover:bg-slate-100 text-indigo-700 font-semibold px-8 rounded-lg shadow-lg">
              Start Filing &mdash; It&rsquo;s Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="border-white/40 bg-white/0 hover:bg-white/10 text-white font-semibold px-8 rounded-lg">
              I already have an account
            </Button>
          </Link>
        </div>

        {/* Client-facing mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <ClientMockup />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Bank-grade security</span>
          <span className="inline-flex items-center gap-2"><Bell className="h-3.5 w-3.5" /> Real-time updates</span>
          <span className="inline-flex items-center gap-2"><FolderOpen className="h-3.5 w-3.5" /> Secure document vault</span>
          <span className="inline-flex items-center gap-2"><FileCheck2 className="h-3.5 w-3.5" /> Approved by your CA</span>
        </div>
      </div>
    </section>
  );
}

function ClientMockup() {
  const filings = [
    { fy: 'FY 2024-25', state: 'COMPUTATION', stateLabel: 'Computation Ready', progress: 70, color: 'from-violet-500 to-violet-600', tint: 'bg-violet-50' },
    { fy: 'FY 2023-24', state: 'COMPLETED', stateLabel: 'Completed', progress: 100, color: 'from-emerald-500 to-emerald-600', tint: 'bg-emerald-50' },
    { fy: 'FY 2022-23', state: 'COMPLETED', stateLabel: 'Completed', progress: 100, color: 'from-emerald-500 to-emerald-600', tint: 'bg-emerald-50' },
  ];
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
        <span className="h-3 w-3 rounded-full bg-rose-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-slate-500 border border-slate-200">itrmanager.app/client/dashboard</div>
      </div>
      <div className="p-6 bg-white text-left">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900">Welcome back, Rajesh 👋</h3>
            <p className="text-xs text-slate-500">Here are your filings.</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">1 action needed</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filings.map((f) => (
            <div key={f.fy} className={`rounded-xl border border-slate-200 ${f.tint} p-4 hover:shadow-md transition-all`}>
              <div className="flex items-start justify-between">
                <FolderOpen className="h-8 w-8 text-indigo-600" />
                <span className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{f.fy}</span>
              </div>
              <h4 className="mt-3 font-bold text-slate-900 text-sm">ITR Filing</h4>
              <p className="text-xs text-slate-600 mt-0.5">{f.stateLabel}</p>
              <div className="mt-3 h-1.5 rounded-full bg-white/80 overflow-hidden"><div className={`h-full bg-gradient-to-r ${f.color}`} style={{ width: `${f.progress}%` }} /></div>
              <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500"><span>{f.progress}% complete</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
