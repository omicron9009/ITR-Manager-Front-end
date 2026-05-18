import { UserPlus, FilePlus2, ClipboardList, FolderUp, Calculator, FileCheck2, IndianRupee } from 'lucide-react';

const STEPS = [
  { icon: UserPlus, title: 'Client Registers & PAN Verified', desc: 'Client signs up and uploads PAN for verification by the Partner.' },
  { icon: FilePlus2, title: 'Filing Initiated', desc: 'A new ITR filing is created for the selected financial year.' },
  { icon: ClipboardList, title: 'Document Checklist Assigned', desc: 'Partner / Executive assigns required documents from the master list.' },
  { icon: FolderUp, title: 'Documents Submitted & Reviewed', desc: 'Client uploads documents; CA reviews and approves each placeholder.' },
  { icon: Calculator, title: 'Tax Computation Uploaded & Approved', desc: 'CA shares computation PDF; client digitally approves.' },
  { icon: FileCheck2, title: 'ITR Filed & Acknowledged', desc: 'Return is filed and the acknowledgement is uploaded to the vault.' },
  { icon: IndianRupee, title: 'Payment Received → Completed', desc: 'Payment marked, invoice issued, filing marked complete.' },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wide">How it Works</div>
          <h2 className="mt-4 text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">From PAN to Payment.</h2>
          <p className="mt-4 text-lg text-slate-600">Seven steps. One unified workflow. Real-time visibility for every stakeholder.</p>
        </div>
        <ol className="relative grid grid-cols-1 md:grid-cols-7 gap-8 md:gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col items-center text-center">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-7 left-1/2 w-full h-0.5 bg-gradient-to-r from-indigo-300 to-indigo-100" aria-hidden />
              )}
              <div className="relative z-10 h-14 w-14 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center font-bold shadow-md ring-4 ring-white">
                {i + 1}
              </div>
              <div className="mt-4 inline-flex items-center justify-center h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600">
                <s.icon className="h-4 w-4" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900 text-sm">{s.title}</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
