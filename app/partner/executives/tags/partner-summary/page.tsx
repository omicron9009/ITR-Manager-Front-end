'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPartnerTagSummary, getPartnerTagDetail } from '@/lib/api';
import { toast } from 'sonner';
import { Tag, ChevronDown, ChevronUp, Users, FileText } from 'lucide-react';

export default function PartnerSummaryPage() {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    getPartnerTagSummary()
      .then((r) => setSummary(r?.items || r || []))
      .catch(() => toast.error('Failed to load summary'))
      .finally(() => setLoading(false));
  }, []);

  const toggleDetail = async (tagId: string) => {
    if (expanded === tagId) { setExpanded(null); setDetail(null); return; }
    setExpanded(tagId);
    setDetailLoading(true);
    try {
      const d = await getPartnerTagDetail(tagId);
      setDetail(d);
    } catch { toast.error('Failed to load detail'); }
    finally { setDetailLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Partner Tag Summary</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of clients and filings per partner tag</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {summary.map((item: any) => (
          <Card key={item.tag_id} className="rounded-xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Tag className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{item.tag_name}</div>
                  <div className="text-xs text-slate-500">{item.client_count} clients</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center p-2 bg-slate-50 rounded-lg">
                  <div className="text-lg font-bold text-slate-900">{item.total_filings ?? 0}</div>
                  <div className="text-[10px] text-slate-500 uppercase">Total</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-700">{item.active_filings ?? 0}</div>
                  <div className="text-[10px] text-blue-600 uppercase">Active</div>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded-lg">
                  <div className="text-lg font-bold text-emerald-700">{item.completed_filings ?? 0}</div>
                  <div className="text-[10px] text-emerald-600 uppercase">Done</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="text-lg font-bold text-amber-700">{item.halted_filings ?? 0}</div>
                  <div className="text-[10px] text-amber-600 uppercase">Halted</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => toggleDetail(item.tag_id)}>
                {expanded === item.tag_id ? <><ChevronUp className="h-3 w-3 mr-1" /> Hide Details</> : <><ChevronDown className="h-3 w-3 mr-1" /> View Details</>}
              </Button>
            </div>
            {expanded === item.tag_id && (
              <div className="border-t border-slate-100 bg-slate-50/50 p-4">
                {detailLoading ? (
                  <p className="text-xs text-slate-500 text-center py-2">Loading…</p>
                ) : detail ? (
                  <div className="space-y-3">
                    {detail.clients?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Clients</div>
                        <div className="space-y-1">
                          {detail.clients.map((c: any) => (
                            <div key={c.id || c.client_id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-white">
                              <span className="font-medium text-slate-800">{c.full_name || c.name}</span>
                              <span className="text-xs text-slate-400">{c.email}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.recent_filings?.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1"><FileText className="h-3 w-3" /> Recent Filings</div>
                        <div className="space-y-1">
                          {detail.recent_filings.map((f: any) => (
                            <div key={f.id || f.filing_id} className="flex items-center justify-between text-sm px-2 py-1 rounded hover:bg-white">
                              <span className="text-slate-800">{f.client_name || f.full_name}</span>
                              <span className="text-xs text-slate-500">{f.status || f.current_state}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(!detail.clients?.length && !detail.recent_filings?.length) && (
                      <p className="text-xs text-slate-400 text-center">No data yet</p>
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
          No partner tags with data yet. Assign partner tags to clients first.
        </Card>
      )}
    </div>
  );
}
