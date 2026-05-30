'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { getFeedbackSummary } from '@/lib/api';
import { Star, Loader2, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const STAR_LABELS = ['Poor', 'Below Average', 'Average', 'Good', 'Excellent'];

export default function PartnerFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getFeedbackSummary();
        setSummary(data);
      } catch (e: any) {
        toast.error(e?.response?.data?.detail || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-16 text-sm text-slate-500">
        Unable to load feedback data.
      </div>
    );
  }

  const { total_feedbacks, average_rating, rating_breakdown, feedbacks } = summary;
  const maxCount = Math.max(...Object.values(rating_breakdown || {}).map((v: any) => Number(v)), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of all ratings from your clients.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-xl p-5 border-l-4 border-l-amber-400 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {average_rating != null ? average_rating.toFixed(1) : '—'}
              </div>
              <div className="text-xs text-slate-500">Average Rating</div>
            </div>
          </div>
          {average_rating != null && (
            <div className="flex items-center gap-0.5 mt-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`h-4 w-4 ${s <= Math.round(average_rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                />
              ))}
              <span className="ml-2 text-xs text-slate-500">
                {STAR_LABELS[Math.round(average_rating) - 1] || ''}
              </span>
            </div>
          )}
        </Card>

        <Card className="rounded-xl p-5 border-l-4 border-l-indigo-400 bg-indigo-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{total_feedbacks}</div>
              <div className="text-xs text-slate-500">Total Feedbacks</div>
            </div>
          </div>
        </Card>

        <Card className="rounded-xl p-5 border-l-4 border-l-emerald-400 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {rating_breakdown?.['5'] || 0}
              </div>
              <div className="text-xs text-slate-500">5-Star Ratings</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Rating Breakdown */}
      <Card className="rounded-xl p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Rating Breakdown</h2>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = rating_breakdown?.[String(star)] || 0;
            const pct = total_feedbacks > 0 ? (count / total_feedbacks) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-20 flex-shrink-0">
                  <span className="text-sm font-medium text-slate-700 w-3">{star}</span>
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] text-slate-400 ml-0.5">{STAR_LABELS[star - 1]}</span>
                </div>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-600 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Individual Feedbacks Table */}
      <Card className="rounded-xl p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
          <h2 className="font-semibold text-slate-900">All Client Feedbacks</h2>
        </div>
        {feedbacks.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No feedbacks yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Financial Year</th>
                  <th className="text-left px-5 py-3 font-semibold">Rating</th>
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map((fb: any) => (
                  <tr key={fb.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{fb.client_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{fb.financial_year || '—'}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3.5 w-3.5 ${s <= fb.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`}
                          />
                        ))}
                        <span className="ml-1.5 text-xs text-slate-500">{STAR_LABELS[fb.rating - 1]}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {new Date(fb.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
