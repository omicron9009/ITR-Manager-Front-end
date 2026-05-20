"use client";

import { useEffect, useState, useCallback } from "react";
import { getReportDashboard } from "@/lib/api";
import { Users, Crown, AlertTriangle, Trophy, Target, TrendingUp } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────
interface ExecutiveLeaderboardItem {
  rank: number;
  executive_id: string;
  executive_name: string;
  completed_filings: number;
  active_filings: number;
  total_filings: number;
  avg_days_to_complete: number | null;
}
interface ManagerLeaderboardItem {
  rank: number;
  tag_id: string;
  manager_name: string;
  executive_count: number;
  total_filings: number;
  completed_filings: number;
  avg_days_to_complete: number | null;
}

// ─── Utility ────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}
function completionRate(completed: number, total: number) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

// ─── Main Page ──────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [executives, setExecutives] = useState<ExecutiveLeaderboardItem[]>([]);
  const [managers, setManagers] = useState<ManagerLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getReportDashboard();
      setExecutives(res.leaderboard_executive || []);
      setManagers(res.leaderboard_manager || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading leaderboards...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <p className="text-slate-700 text-lg font-medium">{error}</p>
          <button onClick={fetchData} className="mt-3 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Leaderboards
          </h1>
          <p className="text-sm text-slate-500 mt-1">Who&apos;s leading the race? Performance rankings updated in real-time.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live · Auto-refreshing
        </div>
      </div>

      {/* Two Leaderboards Side by Side */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ─── Executive Leaderboard ─── */}
        {executives.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 grid place-items-center shadow-md shadow-indigo-200">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Executive Rankings</h3>
                    <p className="text-[11px] text-slate-500">Performance by filing completions</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full">
                  <Target className="w-3.5 h-3.5" /> {executives.length} competing
                </div>
              </div>

              {/* Podium */}
              {executives.length >= 3 && (
                <div className="flex items-end justify-center gap-3 px-6 pt-8 pb-4 bg-gradient-to-b from-slate-50 to-white">
                  {/* 2nd place */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 text-white grid place-items-center text-sm font-bold shadow-md ring-2 ring-slate-200 ring-offset-2">
                      {initials(executives[1].executive_name)}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-2 text-center truncate max-w-[70px]">{executives[1].executive_name.split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-500">{executives[1].completed_filings} done</div>
                    <div className="h-16 w-16 mt-2 rounded-t-xl bg-gradient-to-t from-slate-200 to-slate-100 border border-slate-200 border-b-0 flex items-center justify-center">
                      <span className="text-2xl">🥈</span>
                    </div>
                  </div>
                  {/* 1st place */}
                  <div className="flex flex-col items-center -mt-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white grid place-items-center text-base font-bold shadow-lg ring-4 ring-amber-200 ring-offset-2">
                      {initials(executives[0].executive_name)}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-2 text-center truncate max-w-[80px]">{executives[0].executive_name.split(" ")[0]}</div>
                    <div className="text-xs text-emerald-600 font-medium">{executives[0].completed_filings} done</div>
                    <div className="h-24 w-20 mt-2 rounded-t-xl bg-gradient-to-t from-amber-100 to-amber-50 border-2 border-amber-300 border-b-0 flex items-center justify-center">
                      <span className="text-3xl">🥇</span>
                    </div>
                  </div>
                  {/* 3rd place */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white grid place-items-center text-sm font-bold shadow-md ring-2 ring-amber-200 ring-offset-2">
                      {initials(executives[2].executive_name)}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-2 text-center truncate max-w-[70px]">{executives[2].executive_name.split(" ")[0]}</div>
                    <div className="text-[10px] text-slate-500">{executives[2].completed_filings} done</div>
                    <div className="h-12 w-16 mt-2 rounded-t-xl bg-gradient-to-t from-orange-100 to-orange-50 border border-amber-200 border-b-0 flex items-center justify-center">
                      <span className="text-2xl">🥉</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-12">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Executive</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Done</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Active</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Rate</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executives.map((ex, i) => {
                      const rate = completionRate(ex.completed_filings, ex.total_filings);
                      return (
                        <tr key={ex.executive_id} className={`border-b border-slate-50 last:border-0 transition ${
                          i === 0 ? "relative bg-gradient-to-r from-amber-50 to-amber-50/30 shadow-sm glow-row-amber" :
                          "hover:bg-slate-50"
                        }`}>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                              i === 0 ? "bg-amber-100 text-amber-700" :
                              i === 1 ? "bg-slate-100 text-slate-600" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-50 text-slate-400"
                            }`}>{ex.rank}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0 ${
                                  i === 0 ? "bg-gradient-to-br from-amber-400 to-orange-500 ring-2 ring-amber-200" :
                                  i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" :
                                  i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                                  "bg-gradient-to-br from-indigo-400 to-violet-500"
                                }`}>
                                  {initials(ex.executive_name)}
                                </div>
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full grid place-items-center text-[8px] font-bold border-[1.5px] border-white ${
                                  i === 0 ? "bg-amber-400 text-white" :
                                  i === 1 ? "bg-slate-400 text-white" :
                                  i === 2 ? "bg-amber-600 text-white" :
                                  "bg-slate-200 text-slate-600"
                                }`}>{ex.rank}</div>
                              </div>
                              <div>
                                <span className={`font-semibold ${i === 0 ? "text-amber-900" : "text-slate-900"}`}>{ex.executive_name}</span>
                                {i === 0 && <span className="ml-1.5 text-sm">👑</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="font-bold text-emerald-600">{ex.completed_filings}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-indigo-600 font-medium">{ex.active_filings}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-12 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              (ex.avg_days_to_complete || 999) <= 10 ? "bg-emerald-50 text-emerald-700" :
                              (ex.avg_days_to_complete || 999) <= 20 ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-600"
                            }`}>
                              {ex.avg_days_to_complete?.toFixed(1) || "—"}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

          </div>
        )}

        {/* ─── Manager Leaderboard ─── */}
        {managers.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center shadow-md shadow-violet-200">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Manager Rankings</h3>
                    <p className="text-[11px] text-slate-500">Team performance & efficiency</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium bg-violet-50 px-2.5 py-1 rounded-full">
                  <TrendingUp className="w-3.5 h-3.5" /> {managers.length} teams
                </div>
              </div>

              {/* Table - same style as executive */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left w-12">#</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">Manager</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Done</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Team</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Rate</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managers.map((m, i) => {
                      const rate = completionRate(m.completed_filings, m.total_filings);
                      return (
                        <tr key={m.tag_id} className={`border-b border-slate-50 last:border-0 transition ${
                          i === 0 ? "relative bg-gradient-to-r from-violet-50 to-violet-50/30 shadow-sm glow-row-violet" :
                          "hover:bg-slate-50"
                        }`}>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${
                              i === 0 ? "bg-violet-100 text-violet-700" :
                              i === 1 ? "bg-slate-100 text-slate-600" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-slate-50 text-slate-400"
                            }`}>{m.rank}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`w-8 h-8 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0 ${
                                  i === 0 ? "bg-gradient-to-br from-violet-500 to-indigo-600 ring-2 ring-violet-200" :
                                  i === 1 ? "bg-gradient-to-br from-slate-400 to-slate-500" :
                                  i === 2 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                                  "bg-gradient-to-br from-violet-400 to-indigo-500"
                                }`}>
                                  {initials(m.manager_name)}
                                </div>
                                <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full grid place-items-center text-[8px] font-bold border-[1.5px] border-white ${
                                  i === 0 ? "bg-violet-500 text-white" :
                                  i === 1 ? "bg-slate-400 text-white" :
                                  i === 2 ? "bg-amber-600 text-white" :
                                  "bg-slate-200 text-slate-600"
                                }`}>{m.rank}</div>
                              </div>
                              <div>
                                <span className={`font-semibold ${i === 0 ? "text-violet-900" : "text-slate-900"}`}>{m.manager_name}</span>
                                {i === 0 && <span className="ml-1.5 text-sm">👑</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="font-bold text-emerald-600">{m.completed_filings}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-indigo-600 font-medium">{m.executive_count}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-12 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500" style={{ width: `${rate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-slate-600">{rate}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                              (m.avg_days_to_complete || 999) <= 10 ? "bg-emerald-50 text-emerald-700" :
                              (m.avg_days_to_complete || 999) <= 20 ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-600"
                            }`}>
                              {m.avg_days_to_complete?.toFixed(1) || "—"}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

          </div>
        )}
      </div>
    </div>
  );
}
