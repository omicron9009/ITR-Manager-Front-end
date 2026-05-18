'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FileCheck2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth, getUser } from '@/lib/auth';
import NotificationBell from '@/components/shared/NotificationBell';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/client/dashboard', label: 'My Filings' },
  { href: '/client/documents', label: 'Documents' },
  { href: '/client/profile', label: 'Profile' },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  useEffect(() => { setUser(getUser()); }, []);
  const initials = (user?.full_name || user?.name || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6">
        <Link href="/client/dashboard" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
          <span className="font-bold text-slate-900">FileTax Pro</span>
        </Link>
        <nav className="hidden md:flex items-center gap-2">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(n.href + '/');
            return <Link key={n.href} href={n.href} className={cn('px-3 py-1.5 rounded-md text-sm font-medium', active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50')}>{n.label}</Link>;
          })}
        </nav>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="hidden md:flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-indigo-500 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            <Button variant="ghost" size="sm" onClick={() => { clearAuth(); router.push('/auth/login'); }}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
