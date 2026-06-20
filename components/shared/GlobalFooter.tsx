import { Phone, Mail, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function GlobalFooter() {
  return (
    <footer className="bg-indigo-50 border-t border-indigo-100 text-slate-600 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2">
            <Image src="/darklogo1.png" alt="ITR Manager" width={160} height={50} className="h-10 w-auto object-contain" />
          </div>
          <p className="mt-2 text-sm leading-relaxed">The end-to-end ITR filing management platform for modern CA practices in India.</p>
          <div className="mt-3 space-y-1 text-sm">
            <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-indigo-500" /> info@pgjco.com</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 mb-2 text-sm">Contact Us</h4>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-800">NAGPUR</span><br />Dhanwate Chambers, Pt. Malviya Road, Sitabuldi, Nagpur, Maharashtra 440012, India<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-500" /> 0712 2524309</span></div>
            </div>
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-800">MUMBAI</span><br />C7, Ultra Co-op. Hsg. Society, Lieutenant Dilip Gupte Marg, Mahim West, Mumbai - 400 016<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-500" /> +91 98235 24309</span></div>
            </div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 mb-2 text-sm">&nbsp;</h4>
          <div className="space-y-3 text-xs leading-relaxed">
            <div className="flex gap-2">
              <MapPin className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" />
              <div><span className="font-semibold text-slate-800">PUNE</span><br />Flat No.6, Janhavi Apartments, CTS No. 40/22, Shantabai Kalmadi Path, Bhonde Colony, Erandwane, Pune, Maharashtra 411004<br /><span className="flex items-center gap-1 mt-1"><Phone className="h-3 w-3 text-indigo-500" /> +91 92269 37929</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-6 pt-4 border-t border-indigo-200 text-xs text-slate-500 flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
          <span>© {new Date().getFullYear()} AIकर. All rights reserved.</span>
          <Link href="/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
          <a href="/aikar.apk" download="aikar.apk" className="hover:text-indigo-600 transition-colors">Download App</a>
        </div>
        <Image src="/built by Black.png" alt="A Pgjco Product" width={640} height={320} className="h-12 object-contain ml-auto" />
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-3 text-xs text-slate-500 flex flex-col md:flex-row items-center md:items-start gap-1 md:gap-4">
        <span className="font-semibold text-slate-700">Developer Info</span>
        <span className="text-slate-600">Aditya Joshi</span>
        <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-indigo-500" /> jaditya2020@gmail.com</span>
        <span className="flex items-center gap-1"><Phone className="h-3 w-3 text-indigo-500" /> 9423685389</span>
      </div>
    </footer>
  );
}

