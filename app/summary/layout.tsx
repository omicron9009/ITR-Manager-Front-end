"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileCheck2, LogOut, Menu, LayoutDashboard, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import GlobalFooter from "@/components/shared/GlobalFooter";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/summary/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/summary/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setUser(getUser()); }, []);

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  const initials = (user?.full_name || user?.name || user?.email || "U").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const currentNav = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-16 px-6 flex items-center border-b border-indigo-100 bg-indigo-50">
          <Link href="/summary/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white"><FileCheck2 className="h-5 w-5" /></span>
            <span className="font-bold text-slate-900">ITR Manager</span>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors", active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name || user?.name || "User"}</p>
              <p className="text-[10px] uppercase tracking-wide text-indigo-600 font-bold">VIEWER</p>
            </div>
          </div>
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
            <h1 className="font-semibold text-slate-900">{currentNav?.label || "Dashboard"}</h1>
          </div>
        </header>
        <main className="p-6 flex-1">{children}</main>
        <GlobalFooter />
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}
    </div>
  );
}
