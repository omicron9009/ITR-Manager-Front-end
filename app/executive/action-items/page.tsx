// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/EmptyState';
import { getActionItems } from '@/lib/api';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITY_COLORS = {
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  ASSIGN_EXECUTIVE: 'Assign Executive',
  SEND_DOCUMENT_CHECKLIST: 'Send Document Checklist',
  REVIEW_DOCUMENTS: 'Review Documents',
  MOVE_TO_COMPUTATION: 'Move to Computation',
  UPLOAD_COMPUTATION: 'Upload Computation',
  MOVE_TO_FILING: 'Move to Filing',
  UPLOAD_COMPLETED_DOCS: 'Upload Completed Docs',
  MARK_PAYMENT_RECEIVED: 'Mark Payment Received',
};

function getActionUrl(item: any) {
  if (item.related_client_id) return `/executive/clients/${item.related_client_id}`;
  return '/executive/clients';
}

export default function ExecutiveActionItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      const res = await getActionItems(params);
      setItems((res?.items || []).reverse());
      setCountsByType(res?.counts_by_type || {});
    } catch {
      toast.error('Failed to load action items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter]);

  const totalCount = items.length;
  const highCount = items.filter(i => i.priority === 'HIGH').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Action Items</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {totalCount} pending {highCount > 0 && <span className="text-red-600 font-medium">({highCount} high priority)</span>}
          </p>
        </div>
      </div>

      {Object.keys(countsByType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(countsByType).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-all ${
                typeFilter === type ? 'bg-indigo-100 text-indigo-800 ring-indigo-300' : 'bg-slate-50 text-slate-600 ring-slate-200 hover:bg-slate-100'
              }`}
            >
              {TYPE_LABELS[type] || type} <span className="font-bold">{count}</span>
            </button>
          ))}
        </div>
      )}

      <Card className="rounded-xl overflow-hidden p-0">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading action items…</div>
        ) : items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All caught up!" subtitle="No pending action items right now." />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  item.priority === 'HIGH' ? 'bg-red-500' : item.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.LOW}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">{TYPE_LABELS[item.type] || item.type}</span>
                  </div>
                  <p className="font-medium text-slate-900 mt-1 text-sm">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>}
                  {item.financial_year && <span className="text-[10px] text-slate-400 mt-0.5">FY {item.financial_year}</span>}
                </div>
                <Link href={getActionUrl(item)}>
                  <Button size="sm" variant="outline" className="text-xs gap-1">
                    Go <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
