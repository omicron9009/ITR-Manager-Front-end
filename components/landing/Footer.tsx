import { FileCheck2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-14">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
            <span className="font-bold text-lg">FileTax Pro</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">The end-to-end ITR filing management platform for modern CA practices in India.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white">Features</a></li>
            <li><a href="#how" className="hover:text-white">How it Works</a></li>
            <li><a href="#roles" className="hover:text-white">For CAs</a></li>
            <li><a href="/auth/login" className="hover:text-white">Login</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Built On</h4>
          <div className="flex flex-wrap gap-2">
            {['FastAPI', 'Next.js', 'PostgreSQL', 'MinIO', 'Authentik'].map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} FileTax Pro. All rights reserved.</span>
        <span>Crafted for Indian CA practices.</span>
      </div>
    </footer>
  );
}
