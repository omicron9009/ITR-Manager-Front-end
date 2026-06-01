//@ts-nocheck
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, UserCheck, MapPin } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { clearAuth, getUser } from '@/lib/auth';
import NotificationBell from '@/components/shared/NotificationBell';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { getMyTags } from '@/lib/api';

export interface NavItem { href: string; label: string; icon: any; }

export default function AppShell({ nav, role, children }: { nav: NavItem[]; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [myTags, setMyTags] = useState<{ manager_tags: any[]; location_tags: any[] }>({ manager_tags: [], location_tags: [] });

  useEffect(() => { setUser(getUser()); }, []);
  useEffect(() => {
    if (role === 'EXECUTIVE') {
      getMyTags().then((r) => {
        setMyTags({
          manager_tags: r?.manager_tags || [],
          location_tags: r?.location_tags || [],
        });
      }).catch(() => {});
    }
  }, [role]);

  const logout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const initials = (user?.full_name || user?.name || user?.email || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  const currentNav = [...nav].sort((a, b) => b.href.length - a.href.length).find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform md:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="h-16 px-6 flex items-center border-b border-indigo-100 bg-indigo-50">
          <Link href="/" className="flex items-center">
            <Image src="/darklogo1.png" alt="ITR Manager" width={160} height={50} className="h-10 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => {
            // Check if a more specific nav item matches — if so, don't highlight this one
            const hasMoreSpecific = nav.some((other) => other.href !== item.href && other.href.startsWith(item.href + '/') && (pathname === other.href || pathname.startsWith(other.href + '/')));
            const active = !hasMoreSpecific && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors', active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')}>
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name || user?.name || 'User'}</p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-600 font-bold">{role}</p>
            </div>
          </div>
          {role === 'EXECUTIVE' && (myTags.manager_tags.length > 0 || myTags.location_tags.length > 0) && (
            <div className="px-2 py-2 space-y-1.5">
              {myTags.manager_tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <UserCheck className="h-3 w-3 text-violet-500 flex-shrink-0" />
                  {myTags.manager_tags.map((t: any) => (
                    <span key={t.tag_id || t.id} className="text-[10px] px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded-full font-medium">{t.name || t.tag_name}</span>
                  ))}
                </div>
              )}
              {myTags.location_tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MapPin className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  {myTags.location_tags.map((t: any) => (
                    <span key={t.tag_id || t.id} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">{t.name || t.tag_name}</span>
                  ))}
                </div>
              )}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-1 justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-indigo-50 border-b border-indigo-100 h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen((v) => !v)}><Menu className="h-5 w-5" /></Button>
            <h1 className="font-semibold text-slate-900">{currentNav?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <main className="p-6 flex-1">{children}</main>
        <GlobalFooter />
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
