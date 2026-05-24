"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileCheck2, LogOut, Menu, LayoutDashboard, Trophy, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { getReportDashboard } from "@/lib/api";

// ─── Confetti Celebration ───────────────────────────────────────────────
async function fireCelebration() {
  const confettiModule = await import("canvas-confetti");
  const confetti = confettiModule.default;
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#22d3ee", "#a78bfa"];

  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors, zIndex: 99999 });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors, zIndex: 99999 });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors, zIndex: 99999 });
  setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors, zIndex: 99999 }), 1500);
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors, zIndex: 99999 }), 3000);
}

function playTadaSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const clapTimes = [0, 120, 240, 400, 520, 680, 800, 950, 1100, 1250, 1400, 1580, 1750, 1900, 2050];
    clapTimes.forEach((delay) => {
      setTimeout(() => {
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.04);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const envelope = Math.exp(-i / (bufferSize * 0.15));
          data[i] = (Math.random() * 2 - 1) * envelope * (0.3 + Math.random() * 0.3);
        }
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        const filter = audioCtx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 2000 + Math.random() * 1500;
        filter.Q.value = 0.8;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.6 + Math.random() * 0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        source.start();
      }, delay);
    });
    setTimeout(() => {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.12);
        osc.stop(audioCtx.currentTime + i * 0.12 + 0.6);
      });
    }, 500);
  } catch {}
}

function CelebrationBanner({ executive, client, manager, financialYear, onClose }: { executive: string; client: string; manager: string; financialYear: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => { onClose(); }, 30000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[99998] pointer-events-none flex items-center justify-center">
      <div className="pointer-events-auto animate-bounce-in bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-8 max-w-md mx-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 opacity-80" />
        <div className="relative z-10">
          <div className="text-5xl mb-4 animate-pulse">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Filing Completed!</h2>
          <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent text-lg font-bold mb-3">
            {executive}
          </div>
          <p className="text-slate-600 text-sm">has successfully completed the filing for</p>
          <div className="mt-2 inline-block px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200">
            <span className="font-bold text-indigo-700">{client}</span>
          </div>
          <div className="mt-3 flex flex-col items-center gap-1 text-sm text-slate-500">
            {manager && <span>Manager: <span className="font-semibold text-slate-700">{manager}</span></span>}
            {financialYear && <span>Financial Year: <span className="font-semibold text-slate-700">{financialYear}</span></span>}
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
            <PartyPopper className="w-4 h-4" />
            <span>Great work! Keep it up!</span>
          </div>
          <button onClick={onClose} className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { href: "/summary/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/summary/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [celebration, setCelebration] = useState<{ executive: string; client: string; manager: string; financialYear: string } | null>(null);
  const prevDataRef = useRef<any>(null);
  const isFirstLoad = useRef(true);
  const celebratedIdsRef = useRef<Set<string>>(new Set(
    JSON.parse(typeof window !== 'undefined' ? (sessionStorage.getItem('celebrated_filings') || '[]') : '[]')
  ));

  const markCelebrated = (filingId: string) => {
    celebratedIdsRef.current.add(filingId);
    sessionStorage.setItem('celebrated_filings', JSON.stringify([...celebratedIdsRef.current]));
  };

  useEffect(() => { setUser(getUser()); }, []);

  // Celebration polling — runs at layout level covering all pages
  const checkForCompletions = useCallback(async () => {
    try {
      const res = await getReportDashboard(undefined);
      const prevData = prevDataRef.current;

      if (!isFirstLoad.current && prevData) {
        const prevTotal = prevData.overall?.completed_filings || 0;
        const newTotal = res.overall?.completed_filings || 0;

        if (newTotal > prevTotal) {
          const prevPendingIds = new Set((prevData.pending_report || []).map((p: any) => p.filing_id));
          const newPendingIds = new Set((res.pending_report || []).map((p: any) => p.filing_id));
          const justCompleted = [...prevPendingIds].filter(id => !newPendingIds.has(id));

          if (justCompleted.length > 0) {
            const uncelebrated = justCompleted.find(id => !celebratedIdsRef.current.has(id));
            if (uncelebrated) {
              const completedFiling = (prevData.pending_report || []).find((p: any) => p.filing_id === uncelebrated);
              if (completedFiling) {
                markCelebrated(uncelebrated);
                setCelebration({
                  executive: completedFiling.assigned_executive_name || "An Executive",
                  client: completedFiling.client_name,
                  manager: completedFiling.manager_tag || "",
                  financialYear: completedFiling.financial_year || "",
                });
                fireCelebration();
                playTadaSound();
              }
            }
            justCompleted.forEach(id => markCelebrated(id));
          }
        }
      }

      isFirstLoad.current = false;
      prevDataRef.current = res;
    } catch {}
  }, []);

  useEffect(() => {
    checkForCompletions();
    const interval = setInterval(checkForCompletions, 30000);
    return () => clearInterval(interval);
  }, [checkForCompletions]);

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
        <main className="p-6 flex-1">{children}</main>
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Celebration overlay — covers entire viewport */}
      {celebration && (
        <CelebrationBanner
          executive={celebration.executive}
          client={celebration.client}
          manager={celebration.manager}
          financialYear={celebration.financialYear}
          onClose={() => setCelebration(null)}
        />
      )}
    </div>
  );
}
