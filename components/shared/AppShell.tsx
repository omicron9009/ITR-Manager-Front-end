//@ts-nocheck
'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, UserCheck, MapPin, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { clearAuth, getUser, getIsElevated } from '@/lib/auth';
import NotificationBell from '@/components/shared/NotificationBell';
import GlobalFooter from '@/components/shared/GlobalFooter';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo, useState } from 'react';
import { getMyTags, getActionItems } from '@/lib/api';

export interface NavItem { href?: string; label: string; icon?: any; section?: boolean; }

export default function AppShell({ nav, role, children }: { nav: NavItem[]; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [myTags, setMyTags] = useState<{ manager_tags: any[]; location_tags: any[] }>({ manager_tags: [], location_tags: [] });

  useEffect(() => {
    const u = getUser();
    if (u && role === 'MANAGER') setUser({ ...u, is_elevated: getIsElevated() });
    else setUser(u);
  }, []);
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

  const [actionItemCount, setActionItemCount] = useState(0);
  useEffect(() => {
    if (role === 'CLIENT') return;
    const fetchCount = () => {
      getActionItems().then((res) => {
        const total = res?.items?.length ?? 0;
        setActionItemCount(total);
      }).catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [role]);

  const logout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const initials = (user?.full_name || user?.name || user?.email || 'U').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  const linkNav = nav.filter((n) => !n.section && n.href);
  const currentNav = [...linkNav].sort((a, b) => (b.href as string).length - (a.href as string).length).find((n) => pathname === n.href || pathname.startsWith((n.href as string) + '/'));

  // Group nav into sections. Items before the first `section` marker live in the
  // implicit root group (title === null, never collapsible).
  const groups = useMemo(() => {
    const out: { title: string | null; items: NavItem[] }[] = [{ title: null, items: [] }];
    for (const item of nav) {
      if (item.section) out.push({ title: item.label, items: [] });
      else out[out.length - 1].items.push(item);
    }
    return out.filter((g) => g.items.length > 0 || g.title !== null);
  }, [nav]);

  // Collapsed state, keyed by section title. Sections default to expanded; the
  // section containing the current route stays open. Toggling persists per session.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const isItemActive = (item: NavItem) => {
    if (!item.href) return false;
    return pathname === item.href || pathname.startsWith((item.href as string) + '/');
  };
  useEffect(() => {
    // On first render (and whenever the route changes) make sure the section
    // that owns the active link is expanded — never auto-collapse the others.
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const g of groups) {
        if (g.title && g.items.some(isItemActive) && next[g.title]) {
          next[g.title] = false;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (title: string) =>
    setCollapsed((s) => ({ ...s, [title]: !s[title] }));

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
          {groups.map((group, gIdx) => {
            const isCollapsible = group.title !== null;
            const isOpen = !isCollapsible || !collapsed[group.title as string];
            return (
              <div key={`group-${gIdx}-${group.title ?? 'root'}`} className={cn(gIdx > 0 && 'pt-3')}>
                {isCollapsible && (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.title as string)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 select-none rounded-md hover:bg-slate-50 transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span className="flex-1 text-left">{group.title}</span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        isOpen ? 'rotate-0' : '-rotate-90'
                      )}
                    />
                  </button>
                )}
                {isOpen && (
                  <div className="space-y-1 mt-1">
                    {group.items.map((item) => {
                      const hasMoreSpecific = linkNav.some(
                        (other) =>
                          other.href !== item.href &&
                          (other.href as string).startsWith((item.href as string) + '/') &&
                          (pathname === other.href || pathname.startsWith((other.href as string) + '/'))
                      );
                      const active =
                        !hasMoreSpecific &&
                        (pathname === item.href || pathname.startsWith((item.href as string) + '/'));
                      const Icon = item.icon;
                      const isActionItems = item.label === 'Action Items';
                      return (
                        <Link
                          key={item.href}
                          href={item.href as string}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                            active
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          <span className="flex-1">{item.label}</span>
                          {isActionItems && actionItemCount > 0 && (
                            <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                              {actionItemCount > 99 ? '99+' : actionItemCount}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name || user?.name || 'User'}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[10px] uppercase tracking-wide text-indigo-600 font-bold">{role === 'MANAGER' && user?.is_elevated ? 'ADMIN' : role}</p>
              </div>
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
        <header className="sticky top-0 z-30 bg-indigo-50 border-b border-indigo-100 h-16 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="md:hidden flex-shrink-0" onClick={() => setMobileOpen((v) => !v)}><Menu className="h-5 w-5" /></Button>
            <h1 className="font-semibold text-slate-900 truncate min-w-0">{currentNav?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
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
