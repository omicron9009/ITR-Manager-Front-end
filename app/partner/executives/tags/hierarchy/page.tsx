'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getHierarchySummary } from '@/lib/api';
import { toast } from 'sonner';
import { MapPin, UserCheck, Users, ChevronDown, ChevronRight, Network } from 'lucide-react';

export default function HierarchyPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());

  useEffect(() => {
    getHierarchySummary()
      .then((r) => setData(r?.items || r?.locations || r || []))
      .catch(() => toast.error('Failed to load hierarchy'))
      .finally(() => setLoading(false));
  }, []);

  const toggleLocation = (id: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleManager = (id: string) => {
    setExpandedManagers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hierarchy View</h1>
        <p className="text-sm text-slate-500 mt-1">Location → Managers → Executives → Filing Stats</p>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="space-y-4">
        {data.map((location: any) => {
          const locId = location.tag_id || location.location_id || location.id;
          const isExpanded = expandedLocations.has(locId);
          return (
            <Card key={locId} className="rounded-xl overflow-hidden">
              {/* Location Header */}
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                onClick={() => toggleLocation(locId)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{location.location_name || location.name}</div>
                    <div className="text-xs text-slate-500">
                      {location.manager_count ?? location.managers?.length ?? 0} managers · {location.executive_count ?? 0} executives
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-bold text-emerald-700">{location.completed_filings ?? 0} / {location.total_filings ?? 0}</div>
                    <div className="text-[10px] text-slate-500">Completed / Total</div>
                  </div>
                  {isExpanded ? <ChevronDown className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                </div>
              </div>

              {/* Managers under this location */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {(location.managers || []).map((manager: any) => {
                    const mgrId = manager.tag_id || manager.manager_id || manager.id;
                    const mgrExpanded = expandedManagers.has(mgrId);
                    return (
                      <div key={mgrId} className="border-b border-slate-50 last:border-b-0">
                        <div
                          className="pl-10 pr-5 py-4 cursor-pointer hover:bg-violet-50/50 transition-colors flex items-center justify-between"
                          onClick={() => toggleManager(mgrId)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                              <UserCheck className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-slate-900">{manager.manager_name || manager.name}</div>
                              <div className="text-xs text-slate-500">{manager.executive_count ?? manager.executives?.length ?? 0} executives</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs font-bold text-violet-700">{manager.completed_filings ?? 0} / {manager.total_filings ?? 0}</div>
                            </div>
                            {mgrExpanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                          </div>
                        </div>

                        {/* Executives under this manager */}
                        {mgrExpanded && (
                          <div className="pl-20 pr-5 pb-3 space-y-2">
                            {(manager.executives || []).map((exec: any) => (
                              <div key={exec.executive_id || exec.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                    {(exec.executive_name || exec.name || 'E')[0]}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-900">{exec.executive_name || exec.name}</div>
                                    <div className="text-[10px] text-slate-500">{exec.client_count ?? 0} clients</div>
                                  </div>
                                </div>
                                <div className="flex gap-3 text-xs">
                                  <span className="text-emerald-600 font-semibold">{exec.completed_filings ?? 0} done</span>
                                  <span className="text-blue-600">{exec.active_filings ?? 0} active</span>
                                  <span className="text-slate-500">{exec.total_filings ?? 0} total</span>
                                </div>
                              </div>
                            ))}
                            {(!manager.executives || manager.executives.length === 0) && (
                              <div className="text-xs text-slate-400 py-2">No executives under this manager</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {(!location.managers || location.managers.length === 0) && (
                    <div className="pl-10 py-4 text-xs text-slate-400">No managers at this location</div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {!loading && data.length === 0 && (
        <Card className="rounded-xl p-10 text-center">
          <Network className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hierarchy data available. Assign location and manager tags to executives first.</p>
        </Card>
      )}
    </div>
  );
}
