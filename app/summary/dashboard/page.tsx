"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getReportDashboard, downloadReport } from "@/lib/api";
import {
  BarChart3, Users, TrendingUp, Clock, Activity, Download, FileText,
  FileSpreadsheet, Database, AlertTriangle, MapPin, Calendar, Crown, PartyPopper
} from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
// ─── Types ──────────────────────────────────────────────────────────────
interface StatusCount { status: string; count: number }
interface StageTiming {
  avg_days_document_processing: number | null;
  avg_days_computation: number | null;
  avg_days_filing: number | null;
  avg_days_payment: number | null;
}
interface OverallSummary {
  total_clients: number;
  active_clients: number;
  total_executives: number;
  active_executives: number;
  total_filings: number;
  active_filings: number;
  completed_filings: number;
  halted_filings: number;
  filing_status_breakdown: StatusCount[];
  avg_days_to_complete: number | null;
  avg_days_by_stage: StageTiming;
}
interface FYSummary {
  financial_year: string;
  total_filings: number;
  active_filings: number;
  completed_filings: number;
  halted_filings: number;
  filing_status_breakdown: StatusCount[];
  avg_days_to_complete: number | null;
}
interface ManagerDistItem {
  tag_id: string;
  manager_name: string;
  executive_count: number;
  total_filings: number;
  active_filings: number;
  completed_filings: number;
  halted_filings: number;
  avg_days_to_complete: number | null;
}
interface LocationDistItem {
  tag_id: string;
  location_name: string;
  executive_count: number;
  total_filings: number;
  active_filings: number;
  completed_filings: number;
  halted_filings: number;
  avg_days_to_complete: number | null;
}
interface PendingFilingItem {
  filing_id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  financial_year: string;
  status: string;
  assigned_executive_name: string | null;
  manager_tag: string | null;
  location_tag: string | null;
  days_pending: number;
  initiated_at: string;
  last_updated: string;
}
interface LocationLeaderboardItem {
  rank: number;
  tag_id: string;
  location_name: string;
  executive_count: number;
  total_filings: number;
  completed_filings: number;
  avg_days_to_complete: number | null;
}
interface DashboardData {
  generated_at: string;
  financial_years: string[];
  filtered_fy: string | null;
  overall: OverallSummary;
  fy_wise: FYSummary[];
  manager_distribution: ManagerDistItem[];
  location_distribution: LocationDistItem[];
  pending_report: PendingFilingItem[];
  leaderboard_executive: any[];
  leaderboard_manager: any[];
  leaderboard_location: LocationLeaderboardItem[];
}

// ─── Colors ─────────────────────────────────────────────────────────────
const PIE_COLORS = ["#10b981", "#22d3ee", "#f59e0b", "#fb7185", "#6366f1", "#a78bfa", "#38bdf8", "#d946ef"];
const CHART_COLORS = { indigo: "#6366f1", emerald: "#10b981", cyan: "#22d3ee", rose: "#fb7185", amber: "#f59e0b", violet: "#a78bfa" };

// ─── Utility ────────────────────────────────────────────────────────────
function completionRate(completed: number, total: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}
function getSeverity(days: number) {
  if (days >= 30) return { label: "CRITICAL", cls: "bg-rose-100 text-rose-700 border-rose-200" };
  if (days >= 20) return { label: "HIGH", cls: "bg-amber-100 text-amber-700 border-amber-200" };
  if (days >= 10) return { label: "MEDIUM", cls: "bg-sky-100 text-sky-700 border-sky-200" };
  return { label: "LOW", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
}
function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

// ─── Confetti Celebration ───────────────────────────────────────────────
async function fireCelebration() {
  const confettiModule = await import("canvas-confetti");
  const confetti = confettiModule.default;
  const duration = 4000;
  const end = Date.now() + duration;
  const colors = ["#6366f1", "#10b981", "#f59e0b", "#22d3ee", "#a78bfa"];

  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  // Big burst in center
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors });
  setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 }, colors }), 1500);
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }), 3000);
}

// Sound effect
function playTadaSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.15);
      osc.stop(audioCtx.currentTime + i * 0.15 + 0.8);
    });

    // Clap sounds (noise bursts)
    setTimeout(() => {
      [0, 200, 400].forEach((delay) => {
        setTimeout(() => {
          const bufferSize = audioCtx.sampleRate * 0.05;
          const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
          const source = audioCtx.createBufferSource();
          const gain = audioCtx.createGain();
          source.buffer = buffer;
          gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
          source.connect(gain);
          gain.connect(audioCtx.destination);
          source.start();
        }, delay);
      });
    }, 1200);
  } catch {}
}

// ─── Celebration Banner Component ───────────────────────────────────────
function CelebrationBanner({ executive, client, onClose }: { executive: string; client: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 30000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
      <div className="pointer-events-auto animate-bounce-in bg-white rounded-2xl shadow-2xl border-2 border-indigo-200 p-8 max-w-md mx-4 text-center relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 opacity-80" />
        <div className="relative z-10">
          <div className="text-5xl mb-4 animate-pulse">🎉</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Filing Completed!</h2>
          <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 bg-clip-text text-transparent text-lg font-bold mb-3">
            {executive}
          </div>
          <p className="text-slate-600 text-sm">
            has successfully completed the filing for
          </p>
          <div className="mt-2 inline-block px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200">
            <span className="font-bold text-indigo-700">{client}</span>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-400">
            <PartyPopper className="w-4 h-4" />
            <span>Great work! Keep it up!</span>
          </div>
          <button onClick={onClose} className="mt-4 text-xs text-slate-400 hover:text-slate-600 transition">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function SummaryDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFY, setSelectedFY] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [celebration, setCelebration] = useState<{ executive: string; client: string } | null>(null);
  const prevDataRef = useRef<DashboardData | null>(null);
  const isFirstLoad = useRef(true);

  const fetchData = useCallback(async (fy?: string) => {
    try {
      const res = await getReportDashboard(fy || undefined);

      // Detect newly completed filings (compare with previous data)
      const prevData = prevDataRef.current;
      if (!isFirstLoad.current && prevData) {
        const prevTotal = prevData.overall?.completed_filings || 0;
        const newTotal = res.overall?.completed_filings || 0;

        if (newTotal > prevTotal) {
          // Find the newly completed filing by checking pending_report changes
          const prevPendingIds = new Set((prevData.pending_report || []).map((p: PendingFilingItem) => p.filing_id));
          const newPendingIds = new Set((res.pending_report || []).map((p: PendingFilingItem) => p.filing_id));

          // Filings that were pending before but not anymore = just completed
          const justCompleted = [...prevPendingIds].filter(id => !newPendingIds.has(id));

          if (justCompleted.length > 0) {
            const completedFiling = (prevData.pending_report || []).find((p: PendingFilingItem) => p.filing_id === justCompleted[0]);
            if (completedFiling) {
              setCelebration({
                executive: completedFiling.assigned_executive_name || "An Executive",
                client: completedFiling.client_name,
              });
              fireCelebration();
              playTadaSound();
            }
          }
        }
      }

      isFirstLoad.current = false;
      prevDataRef.current = res;
      setData(res);
      setError("");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    fetchData();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(selectedFY || undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedFY, fetchData]);

  const handleFYChange = (fy: string) => {
    setSelectedFY(fy);
    setLoading(true);
    fetchData(fy || undefined);
  };

  const handleDownload = async (format: string) => {
    setDownloading(true);
    try {
      const res = await downloadReport(selectedFY || undefined);
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${selectedFY || "all"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { }
    setDownloading(false);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-slate-700 text-lg font-medium">{error}</p>
          <button onClick={() => { setLoading(true); fetchData(); }} className="mt-3 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { overall, fy_wise, manager_distribution, location_distribution, pending_report, leaderboard_location } = data;
  const completionPct = completionRate(overall.completed_filings, overall.total_filings);

  const statusData = overall.filing_status_breakdown.map((s, i) => ({ name: s.status.replace(/_/g, " "), value: s.count, color: PIE_COLORS[i % PIE_COLORS.length] }));
  const stageData = [
    { stage: "Docs", days: overall.avg_days_by_stage?.avg_days_document_processing || 0 },
    { stage: "Computation", days: overall.avg_days_by_stage?.avg_days_computation || 0 },
    { stage: "Filing", days: overall.avg_days_by_stage?.avg_days_filing || 0 },
    { stage: "Payment", days: overall.avg_days_by_stage?.avg_days_payment || 0 },
  ];
  const fyChartData = fy_wise.map(f => ({
    fy: f.financial_year,
    total: f.total_filings,
    completed: f.completed_filings,
    active: f.active_filings,
    halted: f.halted_filings,
  }));
  const locationBarData = location_distribution.map(l => ({ name: l.location_name, filings: l.total_filings }));

  return (
    <div className="space-y-8">
      {/* Celebration Banner */}
      {celebration && (
        <CelebrationBanner
          executive={celebration.executive}
          client={celebration.client}
          onClose={() => setCelebration(null)}
        />
      )}

      {/* Header + FY Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generated {new Date(data.generated_at).toLocaleString()} · <span className="text-indigo-500">Auto-refreshes every 30s</span>
          </p>
        </div>
        <select
          value={selectedFY}
          onChange={e => handleFYChange(e.target.value)}
          className="border border-slate-200 rounded-lg text-sm px-4 py-2.5 text-slate-700 bg-white outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        >
          <option value="">All Financial Years</option>
          {data.financial_years.map(fy => (
            <option key={fy} value={fy}>{fy}</option>
          ))}
        </select>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Filings", value: overall.total_filings, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Completed", value: overall.completed_filings, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Active", value: overall.active_filings, icon: Activity, color: "text-sky-600", bg: "bg-sky-50" },
          { label: "Halted", value: overall.halted_filings, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Avg Days", value: overall.avg_days_to_complete?.toFixed(1) || "—", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completion", value: `${completionPct}%`, icon: Crown, color: "text-violet-600", bg: "bg-violet-50" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${kpi.bg} ${kpi.color} grid place-items-center mb-3`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Overall Analytics */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Overall Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-medium text-sm text-slate-700 mb-4">Filing Status Distribution</h3>
            <div className="h-[200px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {statusData.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                  <span className="text-slate-600 capitalize truncate">{s.name}</span>
                  <span className="ml-auto font-semibold text-slate-900">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-medium text-sm text-slate-700 mb-4">Avg Days by Stage</h3>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <BarChart data={stageData} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" stroke="#e2e8f0" tick={{ fill: "#64748b", fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" stroke="#e2e8f0" tick={{ fill: "#334155", fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                  <Bar dataKey="days" fill={CHART_COLORS.indigo} radius={[0, 6, 6, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center">
            <h3 className="font-medium text-sm text-slate-700 mb-4 self-start">Completion Rate</h3>
            <div className="relative w-36 h-36">
              <svg viewBox="0 0 160 160" className="-rotate-90 w-full h-full">
                <circle cx="80" cy="80" r="64" strokeWidth="10" fill="none" stroke="#f1f5f9" />
                <circle cx="80" cy="80" r="64" strokeWidth="10" fill="none" stroke={CHART_COLORS.emerald} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 64} strokeDashoffset={2 * Math.PI * 64 * (1 - completionPct / 100)}
                  style={{ transition: "stroke-dashoffset 1.5s ease" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{completionPct}%</span>
                <span className="text-xs text-slate-500">Completed</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-5 w-full text-center">
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">Clients</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{overall.total_clients}</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50">
                <div className="text-xs text-slate-500">Executives</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{overall.total_executives}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FY Intelligence */}
      {fy_wise.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Year Intelligence</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-medium text-sm text-slate-700 mb-4">FY Comparison</h3>
              <div className="h-[260px]">
                <ResponsiveContainer>
                  <BarChart data={fyChartData} margin={{ left: 10 }}>
                    <XAxis dataKey="fy" stroke="#e2e8f0" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis stroke="#e2e8f0" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.emerald} radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="active" name="Active" fill={CHART_COLORS.cyan} radius={[4, 4, 0, 0]} barSize={14} />
                    <Bar dataKey="halted" name="Halted" fill={CHART_COLORS.rose} radius={[4, 4, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fy_wise.slice(0, 4).map((fy, i) => {
                const pct = completionRate(fy.completed_filings, fy.total_filings);
                return (
                  <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-600">{fy.financial_year}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{fy.total_filings}</div>
                    <div className="text-xs text-slate-500">Total Filings</div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{pct}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-3 text-xs">
                      <div><span className="text-slate-400">Active</span><div className="font-semibold text-slate-700">{fy.active_filings}</div></div>
                      <div><span className="text-slate-400">Done</span><div className="font-semibold text-emerald-600">{fy.completed_filings}</div></div>
                      <div><span className="text-slate-400">Halted</span><div className="font-semibold text-rose-600">{fy.halted_filings}</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Manager Distribution */}
      {manager_distribution.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Manager Distribution</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {manager_distribution.map((m, i) => {
              const ratio = completionRate(m.completed_filings, m.total_filings);
              return (
                <div key={m.tag_id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400 font-medium">#{i + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                      {m.executive_count} exec{m.executive_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white grid place-items-center text-xs font-bold shrink-0">
                      {initials(m.manager_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{m.manager_name}</div>
                      <div className="text-xs text-slate-500">Manager</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                    <div><span className="text-slate-400">Filings</span><div className="text-base font-bold text-slate-900">{m.total_filings}</div></div>
                    <div><span className="text-slate-400">Avg Days</span><div className="text-base font-bold text-slate-900">{m.avg_days_to_complete?.toFixed(1) || "—"}</div></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Completion</span><span className="font-medium">{ratio}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Location Intelligence + Location Leaderboard */}
      {location_distribution.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Location Intelligence</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-medium text-sm text-slate-700 mb-4">Filings by Location</h3>
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={locationBarData} layout="vertical" margin={{ left: 10 }}>
                    <XAxis type="number" stroke="#e2e8f0" tick={{ fill: "#64748b", fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" stroke="#e2e8f0" tick={{ fill: "#334155", fontSize: 11 }} width={90} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }} />
                    <Bar dataKey="filings" fill={CHART_COLORS.indigo} radius={[0, 6, 6, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Radar Chart (if 3+ locations in leaderboard) */}
            {leaderboard_location.length >= 3 && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-medium text-sm text-slate-700 mb-4">Top Locations Comparison</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer>
                    <RadarChart data={[
                      { metric: "Volume", ...Object.fromEntries(leaderboard_location.slice(0, 3).map(l => [l.location_name, l.total_filings])) },
                      { metric: "Completed", ...Object.fromEntries(leaderboard_location.slice(0, 3).map(l => [l.location_name, l.completed_filings])) },
                      { metric: "Executives", ...Object.fromEntries(leaderboard_location.slice(0, 3).map(l => [l.location_name, l.executive_count * 10])) },
                    ]}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fill: "#64748b", fontSize: 10 }} />
                      <PolarRadiusAxis tick={false} axisLine={false} />
                      {leaderboard_location.slice(0, 3).map((loc, i) => (
                        <Radar key={loc.tag_id} name={loc.location_name} dataKey={loc.location_name}
                          stroke={[CHART_COLORS.emerald, CHART_COLORS.indigo, CHART_COLORS.violet][i]}
                          fill={[CHART_COLORS.emerald, CHART_COLORS.indigo, CHART_COLORS.violet][i]}
                          fillOpacity={0.15} strokeWidth={2} />
                      ))}
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Location Rankings */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-medium text-sm text-slate-700 mb-4">Location Rankings</h3>
              <div className="space-y-2.5">
                {(leaderboard_location.length > 0 ? leaderboard_location : location_distribution).map((loc: any, i: number) => {
                  const pct = completionRate(loc.completed_filings, loc.total_filings);
                  return (
                    <div key={loc.tag_id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition">
                      <span className="text-xs text-slate-400 font-semibold w-5">{String(i + 1).padStart(2, "0")}</span>
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 grid place-items-center shrink-0">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs text-slate-900 truncate">{loc.location_name}</span>
                          <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {loc.total_filings} filings · {loc.executive_count} execs
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Filings Table */}
      {pending_report.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pending Filings</h2>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Manager</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Executive</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Days</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {pending_report.slice(0, 15).map((p, i) => {
                    const sev = getSeverity(p.days_pending);
                    return (
                      <tr key={p.filing_id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
                        <td className="px-5 py-3 text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">{p.client_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{p.financial_year}</div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 capitalize">{p.status.replace(/_/g, " ")}</td>
                        <td className="px-5 py-3">
                          {p.manager_tag ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white grid place-items-center text-[9px] font-semibold">
                                {initials(p.manager_tag)}
                              </div>
                              <span className="text-sm text-slate-700">{p.manager_tag}</span>
                            </div>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-600">{p.assigned_executive_name || "—"}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-semibold ${p.days_pending >= 30 ? "text-rose-600" : p.days_pending >= 20 ? "text-amber-600" : "text-slate-700"}`}>
                            {Math.round(p.days_pending)}d
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full border ${sev.cls}`}>
                            {sev.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pending_report.length > 15 && (
              <div className="px-5 py-3 border-t border-slate-100 text-center text-xs text-slate-400">
                Showing top 15 of {pending_report.length} pending filings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Center */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Export Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: FileText, label: "PDF · Executive Summary", desc: "Boardroom-ready, paginated report with charts and KPIs.", color: "text-rose-600", bg: "bg-rose-50", format: "pdf" },
            { icon: FileSpreadsheet, label: "Excel · Comprehensive", desc: "Multi-sheet workbook — Overall, FY-Wise, Distribution & more.", color: "text-emerald-600", bg: "bg-emerald-50", format: "excel", primary: true },
            { icon: Database, label: "CSV · Raw Dataset", desc: "Flat dataset for analytics and BI tools.", color: "text-indigo-600", bg: "bg-indigo-50", format: "csv" },
          ].map((item) => (
            <div key={item.format} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className={`w-10 h-10 rounded-lg ${item.bg} ${item.color} grid place-items-center`}>
                <item.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mt-4">{item.label}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
              <button
                onClick={() => handleDownload(item.format)}
                disabled={downloading}
                className={`mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50 ${
                  item.primary
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
