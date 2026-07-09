// @ts-nocheck
'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { getActionItems, getClient, listTags } from '@/lib/api';
import { CheckCircle2, Circle, AlertTriangle, ArrowRight, ClipboardList, Filter, Users, Tag } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITY_COLORS = {
  HIGH: 'bg-red-50 text-red-700 ring-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const TYPE_LABELS: Record<string, string> = {
  VERIFY_CLIENT: 'Verify Client',
  ASSIGN_EXECUTIVE: 'Assign Executive',
  SEND_DOCUMENT_CHECKLIST: 'Send Document Checklist',
  REVIEW_DOCUMENTS: 'Review Documents',
  MOVE_TO_COMPUTATION: 'Move to Computation',
  UPLOAD_COMPUTATION: 'Upload Computation',
  MOVE_TO_FILING: 'Move to Filing',
  UPLOAD_COMPLETED_DOCS: 'Upload Completed Docs',
  MARK_PAYMENT_RECEIVED: 'Mark Payment Received',
  COMPLETE_ONBOARDING: 'Complete Onboarding',
  UPLOAD_DOCUMENTS: 'Upload Documents',
  SUBMIT_DOCUMENTS: 'Submit Documents',
  REVIEW_COMPUTATION: 'Review Computation',
  CONFIRM_TAX_PAID: 'Confirm Tax Paid',
};

function getActionUrl(item: any, routePrefix: string) {
  if (item.related_client_id) return `${routePrefix}/clients/${item.related_client_id}`;
  return `${routePrefix}/clients`;
}

export default function ActionItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [partnerOnly, setPartnerOnly] = useState(false);
  const [partnerTagId, setPartnerTagId] = useState('');
  const [partnerTags, setPartnerTags] = useState<any[]>([]);

  const [clientMap, setClientMap] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    listTags('PARTNER').then((res) => {
      setPartnerTags(res?.items || res?.tags || []);
    }).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (typeFilter) params.type = typeFilter;
      if (partnerOnly) params.partner_only = true;
      if (partnerTagId) params.partner_tag_id = partnerTagId;
      const res = await getActionItems(params);
      const actionItems = (res?.items || []).reverse();
      setItems(actionItems);
      setCountsByType(res?.counts_by_type || {});

      // Enrich: fetch client profiles for assignment info
      const uniqueClientIds = [...new Set(actionItems.map((i: any) => i.related_client_id).filter(Boolean))] as string[];
      const map = new Map<string, any>();
      await Promise.all(uniqueClientIds.map(async (cid) => {
        try { const profile = await getClient(cid); map.set(cid, profile); } catch {}
      }));
      setClientMap(map);
    } catch (e: any) {
      toast.error('Failed to load action items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [typeFilter, partnerOnly, partnerTagId]);

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
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch
              checked={partnerOnly}
              onCheckedChange={setPartnerOnly}
              id="partner-only"
            />
            <label htmlFor="partner-only" className="text-sm font-medium text-slate-700 cursor-pointer">
              Partner Only
            </label>
          </div>
          <Select value={partnerTagId} onValueChange={(v) => setPartnerTagId(v === '_all' ? '' : v)}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="All Partner Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Partner Tags</SelectItem>
              {partnerTags.map((tag: any) => (
                <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary badges */}
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
            {items.map((item, idx) => {
              const client = clientMap.get(item.related_client_id);
              return (
              <div key={idx} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                  item.priority === 'HIGH' ? 'bg-red-500' : item.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />
                <div className="flex-1 min-w-0">
                  {client && (
                    <div className="text-base font-bold text-slate-900 mb-1">{client.full_name || client.name}</div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.LOW}`}>
                      {item.priority}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{TYPE_LABELS[item.type] || item.type}</span>
                    {item.financial_year && <span className="text-[10px] text-slate-400">FY {item.financial_year}</span>}
                  </div>
                  <p className="text-sm text-slate-700 mt-1">{item.title}</p>
                  {item.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>}
                  {client && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {client.assigned_manager_name && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold"><Users className="h-3.5 w-3.5" /> {client.assigned_manager_name}</span>}
                      {client.assigned_executive_name && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold"><Users className="h-3.5 w-3.5" /> {client.assigned_executive_name}</span>}
                      {client.partner_tag_name && <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold"><Tag className="h-3.5 w-3.5" /> {client.partner_tag_name}</span>}
                    </div>
                  )}
                </div>
                <Link href={getActionUrl(item, '/partner')}>
                  <Button size="sm" variant="outline" className="text-xs gap-1 mt-1">
                    Go <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
