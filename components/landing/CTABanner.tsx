// @ts-nocheck
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CTABanner() {
  return (
    <section className="relative py-20 overflow-hidden bg-indigo-950/90 backdrop-blur-sm">
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Ready to file your ITR the easy way?</h2>
        <p className="mt-4 text-lg text-white/80">Sign up free. Get connected with your CA. File without the stress.</p>
        <Link href="/auth/register" className="inline-block mt-8">
          <Button size="lg" className="bg-white hover:bg-slate-100 text-indigo-700 font-semibold px-10 py-6 text-base rounded-lg shadow-lg">
            Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-6 text-sm text-white/60">No credit card needed &middot; You only pay your CA after filing</p>
      </div>
    </section>
  );
}
