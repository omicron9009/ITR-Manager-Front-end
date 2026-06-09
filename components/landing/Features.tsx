import { UploadCloud, Bell, FileCheck2, Lock, Smartphone, MessageSquare } from 'lucide-react';

const FEATURES = [
  { icon: UploadCloud, title: 'Upload Once, Done', desc: 'Drag-and-drop your Form 16, bank statements, investment proofs. Your CA gets them instantly — no email attachments, no WhatsApp blur.' },
  { icon: Bell, title: 'Real-Time Updates', desc: 'Get notified every time your CA reviews a document, prepares your computation, or files your return. No more chasing.' },
  { icon: FileCheck2, title: 'One-Click Approval', desc: 'Review your tax computation right in the app. Approve digitally to authorise filing — no print, sign, scan, repeat.' },
  { icon: Lock, title: 'Your Data, Locked Down', desc: '256-bit encrypted storage. Only you and your assigned CA can see your documents. PAN and Aadhaar stay safe.' },
  { icon: Smartphone, title: 'Track on Any Device', desc: 'Works beautifully on your phone, tablet, or laptop. Check your filing status from anywhere.' },
  { icon: MessageSquare, title: 'All-in-One Trail', desc: 'Every document, every status change, every invoice in one place. Download everything after filing.' },
];

export default function Features() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          {/* <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide">Why AIकर</div> */}
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-indigo-900 tracking-tight">Filing taxes shouldn&rsquo;t feel like work.</h2>
          <p className="mt-4 text-lg text-slate-600">Everything you need to file your ITR with your Chartered Accountant &mdash; without the back-and-forth.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-white/20 bg-white/80 backdrop-blur-sm p-7 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
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
