import Link from 'next/link';
import { ArrowRight, Lock, Shield, FolderLock, Mail, CheckCircle2, Clock, Users, FileText, IndianRupee } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-600 pt-32 pb-24">
      {/* decorative gradient orbs */}
      <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-4 py-1.5 text-xs font-medium text-white/90 border border-white/15">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Built for Indian CA practices &middot; FY 2024-25 ready
        </div>
        <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          The Smartest Way to Manage <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-200">ITR Filings</span> for Your CA Practice
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-white/80 leading-relaxed">
          Client onboarding, document collection, computation approval, and end-to-end filing tracking &mdash; all in one place. Built for Chartered Accountants managing up to 2,000 clients.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/login">
            <Button size="lg" className="bg-white hover:bg-slate-100 text-indigo-700 font-semibold px-8 rounded-lg shadow-lg">
              Start Filing Smarter <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <a href="#how">
            <Button size="lg" variant="outline" className="border-white/40 bg-white/0 hover:bg-white/10 text-white font-semibold px-8 rounded-lg">
              See How It Works
            </Button>
          </a>
        </div>

        {/* Dashboard mockup */}
        <div className="mt-16 max-w-5xl mx-auto">
          <DashboardMockup />
        </div>

        {/* Trust badges */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> 256-bit Encrypted Storage</span>
          <span className="inline-flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Role-based Access Control</span>
          <span className="inline-flex items-center gap-2"><FolderLock className="h-3.5 w-3.5" /> MinIO Document Vault</span>
          <span className="inline-flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Gmail Notifications</span>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const stats = [
    { label: 'Initiated', value: 24, color: 'bg-slate-100 text-slate-700 border-slate-300' },
    { label: 'Processing', value: 87, color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
    { label: 'Computation', value: 34, color: 'bg-violet-50 text-violet-700 border-violet-300' },
    { label: 'Completed', value: 412, color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  ];
  const rows = [
    { name: 'Rajesh Kumar', fy: 'FY 2024-25', state: 'PROCESSING', stateColor: 'bg-indigo-100 text-indigo-700' },
    { name: 'Priya Sharma', fy: 'FY 2024-25', state: 'COMPUTATION', stateColor: 'bg-violet-100 text-violet-700' },
    { name: 'Anil Verma', fy: 'FY 2024-25', state: 'COMPLETED', stateColor: 'bg-emerald-100 text-emerald-700' },
    { name: 'Meera Iyer', fy: 'FY 2024-25', state: 'ON_BOARDING', stateColor: 'bg-blue-100 text-blue-700' },
  ];
  return (
    <div className="rounded-2xl bg-white/95 backdrop-blur shadow-2xl ring-1 ring-black/5 overflow-hidden">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
        <span className="h-3 w-3 rounded-full bg-rose-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <div className="mx-auto bg-white rounded-md px-4 py-1 text-xs text-slate-500 border border-slate-200">filetaxpro.app/partner/dashboard</div>
      </div>
      {/* Dashboard content */}
      <div className="grid grid-cols-12 text-left">
        {/* Sidebar */}
        <aside className="col-span-3 bg-slate-50 border-r border-slate-200 p-4 hidden sm:block">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-4">
            <span className="h-7 w-7 rounded-md bg-indigo-600 text-white inline-flex items-center justify-center text-xs font-bold">FT</span>
            <span className="font-semibold text-sm text-slate-900">FileTax Pro</span>
          </div>
          {['Dashboard', 'Clients', 'Executives', 'Documents', 'Form Builder', 'Audit Log'].map((item, i) => (
            <div key={item} className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium mb-1 ${i === 0 ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" /> {item}
            </div>
          ))}
        </aside>
        {/* Main */}
        <div className="col-span-12 sm:col-span-9 p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Partner Dashboard</h3>
            <span className="text-xs text-slate-500">Today, 3:42 PM</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {stats.map((s) => (
              <div key={s.label} className={`rounded-lg border-l-4 p-3 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-[10px] uppercase tracking-wide opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-12 bg-slate-50 px-3 py-2 text-[10px] font-semibold uppercase text-slate-500">
              <div className="col-span-5">Client</div>
              <div className="col-span-3">FY</div>
              <div className="col-span-4">State</div>
            </div>
            {rows.map((r) => (
              <div key={r.name} className="grid grid-cols-12 px-3 py-2 text-xs border-t border-slate-100">
                <div className="col-span-5 font-medium text-slate-800">{r.name}</div>
                <div className="col-span-3 text-slate-500">{r.fy}</div>
                <div className="col-span-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${r.stateColor}`}>{r.state}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
