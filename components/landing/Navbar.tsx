'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={cn(
      'fixed top-0 inset-x-0 z-50 transition-all duration-300',
      scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm' : 'bg-transparent'
    )}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src={scrolled ? '/darklogo1.png' : '/logo1.png'} alt="ITR Manager" width={150} height={50} className="h-14 object-contain" />
        </Link>
        <nav className="hidden md:flex items-center gap-8">
          {[['Why us', '#features'], ['How it Works', '#how'], ['Benefits', '#benefits'], ['Login', '/auth/login']].map(([label, href]) => (
            <a key={label} href={href} className={cn('text-sm font-medium transition-colors', scrolled ? 'text-slate-600 hover:text-indigo-600' : 'text-white/85 hover:text-white')}>{label}</a>
          ))}
        </nav>
        <Link href="/auth/register">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">Get Started</Button>
        </Link>
      </div>
    </header>
  );
}
