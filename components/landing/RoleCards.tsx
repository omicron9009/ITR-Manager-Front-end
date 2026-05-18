import { Crown, Users2, User, Check } from 'lucide-react';

const ROLES = [
  { icon: Crown, title: 'Partner', subtitle: 'CA Owner', tint: 'bg-indigo-50 border-indigo-200', badge: 'bg-indigo-600 text-white', features: ['Full client visibility', 'Executive management', 'Form builder', 'Audit log', 'Account activation queue'] },
  { icon: Users2, title: 'Executive', subtitle: 'CA Staff', tint: 'bg-slate-50 border-slate-200', badge: 'bg-slate-700 text-white', features: ['Assigned client dashboard', 'Document review', 'Computation upload', 'Mark payment', 'Scoped notifications'] },
  { icon: User, title: 'Client', subtitle: 'Taxpayer', tint: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-600 text-white', features: ['Self-registration', 'Real-time filing status bar', 'Document upload', 'Computation approval', 'Invoice download'] },
];

export default function RoleCards() {
  return (
    <section id="roles" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide">For Every Stakeholder</div>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Built for every role.</h2>
          <p className="mt-4 text-lg text-slate-600">Each portal tailored to the workflows of its user — nothing more, nothing less.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ROLES.map((r) => (
            <div key={r.title} className={`rounded-xl border ${r.tint} p-8 shadow-sm`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${r.badge}`}>
                <r.icon className="h-3.5 w-3.5" /> {r.subtitle}
              </div>
              <h3 className="mt-4 text-2xl font-bold text-slate-900">{r.title}</h3>
              <ul className="mt-6 space-y-3">
                {r.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-600" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
