'use client';
import Link from 'next/link';
import { FileCheck2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AuthHeader({ activePage }: { activePage: 'login' | 'register' }) {
  return (
    <header className="bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur text-white">
            <FileCheck2 className="h-5 w-5" />
          </span>
          <span className="font-bold text-lg text-white">ITR Manager</span>
        </Link>
        <div className="flex items-center gap-3">
          {activePage === 'login' ? (
            <Link href="/auth/register">
              <Button size="sm" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg shadow-sm">Get Started</Button>
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
