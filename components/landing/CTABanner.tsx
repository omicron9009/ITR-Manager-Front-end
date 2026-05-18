import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTABanner() {
  return (
    <section className="relative bg-gradient-to-br from-indigo-950 via-indigo-800 to-indigo-700 py-20 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to Streamline Your CA Practice?</h2>
        <p className="mt-4 text-lg text-white/80">Get started in minutes. Onboard your first clients today.</p>
        <Link href="/auth/register" className="inline-block mt-8">
          <Button size="lg" className="bg-white hover:bg-slate-100 text-indigo-700 font-semibold px-10 py-6 text-base rounded-lg shadow-lg">
            Request Access <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-6 text-sm text-white/60">Deployed on your own server. Your data, your control.</p>
      </div>
    </section>
  );
}
