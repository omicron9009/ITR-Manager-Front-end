import { FileCheck2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-14">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
            <span className="font-bold text-lg">ITR Manager</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">File your Income Tax Return online — the easy way. Connected directly to your Chartered Accountant.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Product</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#features" className="hover:text-white">Why us</a></li>
            <li><a href="#how" className="hover:text-white">How it Works</a></li>
            <li><a href="#benefits" className="hover:text-white">Benefits</a></li>
            <li><a href="/auth/login" className="hover:text-white">Login</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Trust &amp; Security</h4>
          <ul className="space-y-2 text-sm">
            <li>256-bit encrypted storage</li>
            <li>End-to-end document privacy</li>
            <li>Role-based access control</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} ITR Manager. All rights reserved.</span>
        <span>Made in India 🇮🇳</span>
      </div>
    </footer>
  );
}
