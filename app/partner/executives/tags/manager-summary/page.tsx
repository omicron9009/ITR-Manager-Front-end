'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { } from '@/lib/api';
import { toast } from 'sonner';
import { UserCheck, Users, FileCheck, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';

export default function ManagerSummaryPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getManagerSummary()
      .then((r) => setSummary(r?.items || r || []))
      .catch(() => toast.error('Failed to load summary'))
      .finally(() => setLoading(false));
  }, []);

  const toggleDetail = async (tagId: string) => {
    if (expanded === tagId) { setExpanded(null); setDetail(null); return; }
    setExpanded(tagId);
    setDetailLoading(true);
    try {
      const d = await getManagerDetail(tagId);
      setDetail(d);
    } catch { toast.error('Failed to load detail'); }
    finally { setDetailLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manager Summary</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of work completed under each manager</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summary.map((m: any) => (
          <Card key={m.tag_id || m.id} className="rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{m.manager_name || m.name}</div>
                  <div className="text-xs text-slate-500">{m.description || 'Manager'}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{m.executive_count ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Executives(Articles)</div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <div className="text-lg font-bold text-emerald-700">{m.completed_filings ?? m.completed ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Completed</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-700">{m.total_filings ?? m.total ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Total</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-indigo-600"
                onClick={() => toggleDetail(m.tag_id || m.id)}
              >
                {expanded === (m.tag_id || m.id) ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {expanded === (m.tag_id || m.id) ? 'Hide Details' : 'View Details'}
              </Button>
            </div>
            {expanded === (m.tag_id || m.id) && (
              <div className="border-t border-slate-100 bg-slate-50 p-4">
                {detailLoading ? (
                  <p className="text-sm text-slate-500">Loading details…</p>
                ) : detail ? (
                  <div className="space-y-3">
                    {/* Status Breakdown */}
                    {detail.filing_status_breakdown && (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-2">Filing Status Breakdown</div>
                        <div className="grid grid-cols-2 gap-2">
                          {(detail.filing_status_breakdown || []).map((s: any) => (
                            <div key={s.status} className="flex justify-between text-xs p-1.5 bg-white rounded">
                              <span className="text-slate-600">{s.status}</span>
                              <span className="font-semibold">{s.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Executives list */}
                    {detail.executives && (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 mb-2">Executives(Articles)</div>
                        <div className="space-y-1.5">
                          {(detail.executives || []).map((e: any) => (
                            <div key={e.executive_id || e.id} className="flex items-center justify-between text-xs bg-white p-2 rounded">
                              <span className="text-slate-800 font-medium">{e.executive_name || e.name}</span>
                              <span className="text-slate-500">{e.client_count ?? e.assigned_clients ?? 0} clients</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        ))}
      </div>

      {!loading && summary.length === 0 && (
        <Card className="rounded-xl p-10 text-center text-sm text-slate-500">
          No manager tags assigned yet. Create and assign manager tags first.
        </Card>
      )}
    </div>
  );
}
