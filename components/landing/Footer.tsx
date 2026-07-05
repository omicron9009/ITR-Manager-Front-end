import { Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-14">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 text-white">
            <Image src="/logo1r.png" alt="ITR Manager" width={160} height={50} className="h-10 w-auto object-contain" />
          </div>
          <p className="mt-3 text-sm leading-relaxed">The end-to-end ITR filing management platform for modern CA practices in India.</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-indigo-400" /> info@pgjco.com</p>
          </div>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm">Contact Us</h4>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">NAGPUR</span><br />Dhanwate Chambers, Pt. Malviya Road, Sitabuldi, Nagpur, Maharashtra 440012, India<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-400" /> 0712 2524309</span></div>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">MUMBAI</span><br />C7, Ultra Co-op. Hsg. Society, Lieutenant Dilip Gupte Marg, Mahim West, Mumbai - 400 016<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-400" /> +91 98235 24309</span></div>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-400 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-300">PUNE</span><br />Flat No.6, Janhavi Apartments, CTS No. 40/22, Shantabai Kalmadi Path, Bhonde Colony, Erandwane, Pune, Maharashtra 411004<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-400" /> +91 92269 37929</span></div>
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
            <li><a href="/privacy-policy" className="hover:text-white">Privacy Policy</a></li>
            <li><a href="/aikar.apk" download="aikar.apk" className="hover:text-white">Download App</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col md:flex-row justify-end gap-2">
        <span>© {new Date().getFullYear()} AIकर. All rights reserved.</span>
        <Image src="/built by White.png" alt="A Pgjco Product" width={640} height={160} className="h-12 object-contain" />
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

