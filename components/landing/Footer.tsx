import { FileCheck2, Phone, Mail, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-14">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
            <span className="font-bold text-lg">ITR Manager</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">The end-to-end ITR filing management platform for modern CA practices in India.</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-indigo-400" /> 0712-2524309</p>
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-indigo-400" /> info@pgjco.com</p>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Contact Us</h4>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">NAGPUR</span><br />Dhanwate Chambers, Pt. Malviya Road, Sitabuldi, Nagpur, Maharashtra 440012, India</div>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">MUMBAI</span><br />C7, Ultra Co-op. Hsg. Society, Lieutenant Dilip Gupte Marg, Mahim West, Mumbai - 400 016</div>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">PUNE</span><br />Flat No.6, Janhavi Apartments, CTS No. 40/22, Shantabai Kalmadi Path, Bhonde Colony, Erandwane, Pune, Maharashtra 411004</div>
            </div>
          </div>
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
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} ITR Manager. All rights reserved.</span>
        <span className="font-medium text-indigo-400">A Pgjco Product</span>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-4 text-xs text-slate-600 flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-4">
        <span className="font-semibold text-slate-400">Developer Info</span>
        <span className="text-slate-400">Aditya Joshi</span>
        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-400" /> jaditya2020@gmail.com</span>
        <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-indigo-400" /> 9423685389</span>
      </div>
    </footer>
  );
}

