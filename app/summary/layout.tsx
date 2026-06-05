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
function CelebrationCard({ item, onClose }: { item: { id: string; client_name: string; financial_year: string; completed_by_name?: string; completed_at: string }; onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(15);

  useEffect(() => {
    let cancelled = false;

    // Confetti for 15 seconds
    import('canvas-confetti').then((mod) => {
      if (cancelled) return;
      const confetti = mod.default;
      const end = Date.now() + 15000;
      const colors = ['#6366f1', '#10b981', '#f59e0b', '#22d3ee', '#a78bfa', '#ffffff'];
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
      style={{ width: '100vw', height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #064e3b 100%)' }}
      onClick={onClose}
    >
      {/* Radial glow behind content */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.2) 0%, transparent 70%)' }} />

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
        style={{ gap: 'clamp(0.75rem, 3vh, 3rem)', padding: '0 5vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 'clamp(4rem, 16vw, 15rem)', lineHeight: 1 }}>🎉</div>

        <div
          className="font-black text-white tracking-tight"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 7rem)', lineHeight: 1.05, textShadow: '0 0 40px rgba(99,102,241,0.6)' }}
        >
          Filing Completed!
        </div>

        <div
          className="font-bold"
          style={{ fontSize: 'clamp(1.2rem, 4vw, 5rem)', color: '#a5f3fc', lineHeight: 1.2 }}
        >
          {item.client_name}
        </div>

        <div
          className="font-extrabold text-white rounded-full"
          style={{
            fontSize: 'clamp(1rem, 2.8vw, 3.5rem)',
            padding: 'clamp(0.4rem, 1.2vh, 1.2rem) clamp(1rem, 3vw, 3.5rem)',
            background: 'rgba(255,255,255,0.12)',
            border: 'clamp(1px, 0.25vw, 3px) solid rgba(99,102,241,0.5)',
            backdropFilter: 'blur(10px)',
          }}
        >
          🏆 FY {item.financial_year}
        </div>

        {item.completed_by_name && (
          <div className="text-white/60" style={{ fontSize: 'clamp(0.7rem, 1.8vw, 2rem)' }}>
            Completed by <span className="text-white/90 font-semibold">{item.completed_by_name}</span>
          </div>
        )}

        {item.completed_at && (
          <div className="text-white/40" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 1.4rem)' }}>
            {new Date(item.completed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        )}

        <div className="text-white/30" style={{ fontSize: 'clamp(0.6rem, 1.2vw, 1.2rem)' }}>
          Dismissing in {timeLeft}s
        </div>
      </div>

      {/* Countdown progress bar pinned to bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: 'clamp(4px, 0.8vh, 10px)', background: 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 15) * 100}%`, background: 'linear-gradient(to right, #6366f1, #10b981)' }}
        />
      </div>
    </div>
  );
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
