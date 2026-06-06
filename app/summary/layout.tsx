//@ts-nocheck 
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, LayoutDashboard, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuth, getUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback, useRef } from "react";
import { getCompletedQueue, dismissQueueItem, dismissAllQueue } from "@/lib/api";

// ─── Fullscreen Celebration Card (TV-friendly, viewport-scaled) ─────────────
type CelebrationItem = {
  id: string;
  filing_id: string;
  client_name: string;
  financial_year: string;
  completed_at: string;
  completed_by_name?: string;
  executive_id?: string | null;
  executive_name?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
};

function CelebrationCard({ item, onClose }: { item: CelebrationItem; onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(15);

  // Hero is executive if present, otherwise fall back to completed_by_name
  const heroName = item.executive_name || item.completed_by_name || null;
  const showExecutiveHero = !!item.executive_name;

  useEffect(() => {
    let cancelled = false;

    // Confetti — golden/warm palette for award feel
    import('canvas-confetti').then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const end = Date.now() + 15000;
      const colors = ['#f59e0b', '#fbbf24', '#fde68a', '#6366f1', '#a78bfa', '#ffffff', '#10b981'];
      const fire = () => {
        if (Date.now() > end || cancelled) return;
        confetti({ particleCount: 5, angle: 60, spread: 65, origin: { x: 0, y: 0.5 }, colors, zIndex: 99999 });
        confetti({ particleCount: 5, angle: 120, spread: 65, origin: { x: 1, y: 0.5 }, colors, zIndex: 99999 });
        requestAnimationFrame(fire);
      };
      confetti({ particleCount: 150, spread: 130, origin: { y: 0.35 }, colors, zIndex: 99999 });
      confetti({ particleCount: 80, spread: 80, angle: 60, origin: { x: 0.05, y: 0.5 }, colors, zIndex: 99999 });
      confetti({ particleCount: 80, spread: 80, angle: 120, origin: { x: 0.95, y: 0.5 }, colors, zIndex: 99999 });
      fire();
    });

    // Sound
    playTadaSound();

    // Countdown tick
    const countdown = setInterval(() => {
      setTimeLeft(t => (t <= 1 ? 0 : t - 1));
    }, 1000);

    const timer = setTimeout(() => { cancelled = true; onClose(); }, 15000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(countdown); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1c1833 40%, #0a2818 100%)' }}
      onClick={onClose}
    >
      {/* Radial glow — warm gold for award stage */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(245,158,11,0.15) 0%, rgba(99,102,241,0.12) 50%, transparent 75%)' }} />

      {/* Skip button */}
      <button
        className="absolute text-white/50 hover:text-white transition-colors border border-white/20 hover:border-white/50 rounded-full backdrop-blur-sm"
        style={{ top: '2vw', right: '2vw', fontSize: 'clamp(0.7rem, 1.4vw, 1.4rem)', padding: '0.6vw 1.4vw' }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        ✕ Skip
      </button>

      {/* Central content */}
      <div
        className="relative flex flex-col items-center text-center select-none"
        style={{ gap: 'clamp(0.5rem, 2.2vh, 2.2rem)', padding: '0 5vw', maxWidth: '90vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Trophy icon */}
        <div style={{ fontSize: 'clamp(3rem, 10vw, 10rem)', lineHeight: 1, filter: 'drop-shadow(0 0 2vw rgba(245,158,11,0.7))' }}>🏆</div>

        {/* Appreciation label */}
        <div
          className="font-semibold uppercase tracking-widest"
          style={{ fontSize: 'clamp(0.65rem, 1.6vw, 1.8rem)', color: '#fbbf24', letterSpacing: '0.25em' }}
        >
          Filing Completed
        </div>

        {/* ── HERO: Executive Name ── */}
        {heroName && (
          <div
            className="font-black tracking-tight"
            style={{
              fontSize: 'clamp(2rem, 7.5vw, 9rem)',
              lineHeight: 1,
              color: showExecutiveHero ? '#fde68a' : '#e0e7ff',
              textShadow: showExecutiveHero
                ? '0 0 4vw rgba(245,158,11,0.7), 0 0 8vw rgba(245,158,11,0.4)'
                : '0 0 4vw rgba(99,102,241,0.6)',
            }}
          >
            {heroName}
          </div>
        )}

        {/* Manager name — shown only if executive is the hero */}
        {showExecutiveHero && item.manager_name && (
          <div
            className="font-medium"
            style={{ fontSize: 'clamp(0.75rem, 2vw, 2.4rem)', color: 'rgba(255,255,255,0.55)' }}
          >
            under&nbsp;<span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{item.manager_name}</span>
          </div>
        )}

        {/* Divider */}
        <div style={{ width: 'clamp(60px, 15vw, 200px)', height: 'clamp(1px, 0.2vw, 2px)', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.25), transparent)' }} />

        {/* Client name */}
        <div style={{ fontSize: 'clamp(0.7rem, 1.8vw, 2rem)', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
          Filed for
        </div>
        <div
          className="font-bold"
          style={{ fontSize: 'clamp(1.2rem, 4vw, 5rem)', color: '#a5f3fc', lineHeight: 1.1 }}
        >
          {item.client_name}
        </div>

        {/* FY badge */}
        <div
          className="font-extrabold text-white rounded-full"
          style={{
            fontSize: 'clamp(0.8rem, 2.2vw, 2.8rem)',
            padding: 'clamp(0.3rem, 0.9vh, 0.9rem) clamp(0.8rem, 2.5vw, 3rem)',
            background: 'rgba(255,255,255,0.08)',
            border: 'clamp(1px, 0.2vw, 2px) solid rgba(99,102,241,0.45)',
            backdropFilter: 'blur(10px)',
          }}
        >
          FY {item.financial_year}
        </div>

        {/* Divider */}
        <div style={{ width: 'clamp(60px, 15vw, 200px)', height: 'clamp(1px, 0.2vw, 2px)', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent)' }} />

        {/* Completed by + timestamp */}
        <div className="flex flex-col items-center" style={{ gap: 'clamp(0.2rem, 0.8vh, 0.8rem)' }}>
          {item.completed_by_name && (
            <div style={{ fontSize: 'clamp(0.65rem, 1.5vw, 1.8rem)', color: 'rgba(255,255,255,0.45)' }}>
              Marked complete by&nbsp;<span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{item.completed_by_name}</span>
            </div>
          )}
          {item.completed_at && (
            <div style={{ fontSize: 'clamp(0.55rem, 1.1vw, 1.3rem)', color: 'rgba(255,255,255,0.3)' }}>
              {new Date(item.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </div>
          )}
        </div>

        {/* Countdown */}
        <div style={{ fontSize: 'clamp(0.55rem, 1vw, 1.1rem)', color: 'rgba(255,255,255,0.25)' }}>
          Dismissing in {timeLeft}s
        </div>
      </div>

      {/* Countdown progress bar pinned to bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: 'clamp(4px, 0.8vh, 10px)', background: 'rgba(255,255,255,0.08)' }}
      >
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 15) * 100}%`, background: 'linear-gradient(to right, #f59e0b, #6366f1)' }}
        />
      </div>
    </div>
  );
}

function playTadaSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // resume() resolves immediately if context is already running (after a user gesture),
    // or once the browser allows audio — prevents silent failure under autoplay policy.
    audioCtx.resume().then(() => {
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
    });
  } catch {}
}

function CelebrationBanner_UNUSED() { return null; }

const NAV = [
  { href: "/summary/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/summary/leaderboard", label: "Leaderboard", icon: Trophy },
];

export default function SummaryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Completed-queue celebration state
  const [queue, setQueue] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState<any | null>(null);
  // Track IDs already shown this session to prevent re-showing on poll cycles
  const shownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { setUser(getUser()); }, []);

  // Pre-unlock AudioContext on first user interaction so the tada sound can play
  // under browsers' autoplay policy (especially important on TV/kiosk displays).
  useEffect(() => {
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        ctx.resume().then(() => ctx.close());
      } catch {}
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };
    window.addEventListener('click', unlock, true);
    window.addEventListener('keydown', unlock, true);
    window.addEventListener('touchstart', unlock, true);
    return () => {
      window.removeEventListener('click', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      window.removeEventListener('touchstart', unlock, true);
    };
  }, []);

  // Poll completed-queue every 12 seconds
  const pollQueue = useCallback(async () => {
    try {
      const res = await getCompletedQueue();
      const items = res?.items || [];
      setQueue(items);
    } catch {}
  }, []);

  useEffect(() => {
    pollQueue();
    const interval = setInterval(pollQueue, 12000);
    return () => clearInterval(interval);
  }, [pollQueue]);

  // Show next unseen item from queue when nothing is currently displayed
  useEffect(() => {
    if (currentItem || queue.length === 0) return;
    const next = queue.find(item => !shownIdsRef.current.has(item.id));
    if (!next) return;
    shownIdsRef.current.add(next.id);
    setCurrentItem(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentItem]);

  const handleDismiss = async (id: string) => {
    try { await dismissQueueItem(id); } catch {}
    setCurrentItem(null);
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDismissAll = async () => {
    try { await dismissAllQueue(); } catch {}
    setCurrentItem(null);
    setQueue([]);
  };

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
  };

  const initials = (user?.full_name || user?.name || user?.email || "U").split(" ").map((p: string) => p[0]).slice(0, 2).join("").toUpperCase();
  const currentNav = [...NAV].sort((a, b) => b.href.length - a.href.length).find((n) => pathname === n.href || pathname.startsWith(n.href + "/"));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-64 tv:w-96 bg-white border-r border-slate-200 flex flex-col transition-transform md:translate-x-0", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="h-16 tv:h-24 px-6 tv:px-8 flex items-center border-b border-indigo-100 bg-indigo-50">
          <Link href="/summary/dashboard" className="flex items-center">
            <Image src="/darklogo1.png" alt="ITR Manager" width={160} height={50} className="h-10 tv:h-16 w-auto object-contain" />
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-3 px-3 tv:px-5 py-2 tv:py-4 rounded-lg text-sm tv:text-xl font-medium transition-colors", active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
                <Icon className="h-4 w-4 tv:h-7 tv:w-7" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 tv:h-14 tv:w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs tv:text-base font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm tv:text-lg font-semibold text-slate-900 truncate">{user?.full_name || user?.name || "User"}</p>
              <p className="text-[10px] tv:text-sm uppercase tracking-wide text-indigo-600 font-bold">VIEWER</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full mt-1 justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="md:pl-64 tv:pl-96 flex flex-col min-h-screen">
        <main className="p-6 tv:p-16 flex-1">{children}</main>
      </div>
      {mobileOpen && <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Celebration overlay — fullscreen, covers entire viewport */}
      {currentItem && (
        <CelebrationCard
          item={currentItem}
          onClose={() => handleDismiss(currentItem.id)}
        />
      )}
      {/* Dismiss All button when queue has more items */}
      {queue.length > 1 && currentItem && (
        <div className="fixed bottom-6 right-6 z-[99999]">
          <Button size="sm" variant="outline" className="bg-white/90 backdrop-blur shadow-lg border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200" onClick={handleDismissAll}>
            Skip All ({queue.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
