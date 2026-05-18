import { Users, Layers, FolderLock, FileCheck2, Bell, ScrollText } from 'lucide-react';

const FEATURES = [
  { icon: Users, title: 'Multi-Role Access', desc: 'Partner, Executive, and Client portals, each with precisely scoped permissions and role-based dashboards.' },
  { icon: Layers, title: '8-Stage Filing Pipeline', desc: 'Track every filing from Initiated through Completed with real-time state transitions and automated notifications.' },
  { icon: FolderLock, title: 'Document Vault', desc: 'Secure MinIO-backed storage with per-placeholder status tracking. Supports PDF, Excel, images up to 1 GB per file.' },
  { icon: FileCheck2, title: 'Computation Approval Workflow', desc: 'Upload tax computation PDFs, send to client for digital approval, handle revision loops — all without email chaos.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Every state change triggers dual-channel delivery: Gmail transactional email + in-app bell feed for all stakeholders simultaneously.' },
  { icon: ScrollText, title: 'Audit Log & Compliance', desc: 'Generate a downloadable HTML audit report covering document events, status transitions, and account activations, filterable by client and date.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide">Features</div>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Everything your CA practice needs.</h2>
          <p className="mt-4 text-lg text-slate-600">From client onboarding to filed acknowledgement — every step automated, every change tracked.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-slate-200 bg-white p-7 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-bold text-lg text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
