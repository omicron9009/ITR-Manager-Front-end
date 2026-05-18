import { Clock, Wallet, Users, BadgeCheck } from 'lucide-react';

const BENEFITS = [
  { icon: Clock, title: 'Save 10+ hours', desc: 'No coordination calls, email threads, or document chasing. Upload once and let your CA work.', tint: 'bg-indigo-50 border-indigo-200', iconBg: 'bg-indigo-600' },
  { icon: Wallet, title: 'Transparent pricing', desc: 'Your CA sets the fee upfront. Pay only when your return is filed and you&rsquo;re satisfied.', tint: 'bg-emerald-50 border-emerald-200', iconBg: 'bg-emerald-600' },
  { icon: Users, title: 'For every taxpayer', desc: 'Salaried, freelancer, business owner, or NRI &mdash; your CA configures your filing flow.', tint: 'bg-amber-50 border-amber-200', iconBg: 'bg-amber-600' },
  { icon: BadgeCheck, title: 'Audit-ready trail', desc: 'Every document, approval, and timestamp is logged. Re-download anytime, anywhere.', tint: 'bg-violet-50 border-violet-200', iconBg: 'bg-violet-600' },
];

export default function RoleCards() {
  return (
    <section id="benefits" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide">Why taxpayers love it</div>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Built for you, the taxpayer.</h2>
          <p className="mt-4 text-lg text-slate-600">Your CA does the filing. You stay informed every step of the way.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className={`rounded-xl border ${b.tint} p-6 shadow-sm`}>
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-white ${b.iconBg}`}><b.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-bold text-slate-900">{b.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
