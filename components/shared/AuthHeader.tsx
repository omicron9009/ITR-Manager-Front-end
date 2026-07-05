'use client';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function AuthHeader({ activePage }: { activePage?: 'login' | 'register' }) {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo1r.png" alt="ITR Manager" width={180} height={60} className="h-12 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-3">
          {activePage === 'login' ? (
            <Link href="/auth/register">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg shadow-sm">Get Started</Button>
            </Link>
          ) : activePage === 'register' ? (
            <Link href="/auth/login">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg shadow-sm">Sign In</Button>
            </Link>
          ) : (
            <Link href="/auth/login">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg shadow-sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
