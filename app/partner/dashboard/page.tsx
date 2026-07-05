'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { getSummary, getPartnerAnalytics, listFilings, listManagers, listExecutives, assignClientToManager, assignExecutive, listTags, setClientPartnerTag, listClients } from '@/lib/api';
import { AssignAfterActivationDialog } from '@/components/shared/ClientActivationDialogs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { ArrowRight, TrendingUp, Users, Loader2, FileText, IndianRupee, AlertTriangle, UserCheck, UserX, UserPlus } from 'lucide-react';

const CARDS = [
  { key: 'INITIATED', label: 'Initiated', color: 'border-l-slate-400 bg-slate-50', text: 'text-slate-700' },
  { key: 'DOCUMENT_UPLOAD', label: 'Document Upload', color: 'border-l-blue-500 bg-blue-50', text: 'text-blue-700' },
  { key: 'PROCESSING', label: 'Processing', color: 'border-l-indigo-500 bg-indigo-50', text: 'text-indigo-700' },
  { key: 'COMPUTATION', label: 'Computation', color: 'border-l-violet-500 bg-violet-50', text: 'text-violet-700' },
  { key: 'AWAITING_TAX_PAYMENT', label: 'Awaiting Tax Payment', color: 'border-l-amber-600 bg-amber-50', text: 'text-amber-800' },
  { key: 'FILING', label: 'Filing', color: 'border-l-orange-500 bg-orange-50', text: 'text-orange-700' },
  { key: 'PAYMENT', label: 'Payment', color: 'border-l-yellow-500 bg-yellow-50', text: 'text-yellow-700' },
  { key: 'COMPLETED', label: 'Completed', color: 'border-l-emerald-500 bg-emerald-50', text: 'text-emerald-700' },
];

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [acting, setActing] = useState(false);
  const [awaitingTaxPayment, setAwaitingTaxPayment] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [partnerTags, setPartnerTags] = useState<any[]>([]);
  const [unallottedClients, setUnallottedClients] = useState<any[]>([]);
  const [assigningClient, setAssigningClient] = useState<any>(null);
  const [onboardedPendingCount, setOnboardedPendingCount] = useState<number | null>(null);
  const [activatedNotOnboardedCount, setActivatedNotOnboardedCount] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, a, paymentFilings, onboardedPending, activatedNotOnboarded, allClients] = await Promise.allSettled([
        getSummary(),
        getPartnerAnalytics(),
        listFilings({ status: 'COMPUTATION', page_size: 100 }),
        listClients({ onboarded_pending_filing: true, page: 1, page_size: 1 }),
        listClients({ activated_not_onboarded: true, page: 1, page_size: 1 }),
        listClients({ page: 1, page_size: 100 }),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value || {});
      if (a.status === 'fulfilled') setAnalytics(a.value);
      if (paymentFilings.status === 'fulfilled') {
        const items = paymentFilings.value?.items || paymentFilings.value?.filings || [];
        setAwaitingTaxPayment(items.filter((f: any) => f.is_tax_paid === false));
      }
      if (onboardedPending.status === 'fulfilled') {
        setOnboardedPendingCount(onboardedPending.value?.total ?? 0);
      }
      if (activatedNotOnboarded.status === 'fulfilled') {
        setActivatedNotOnboardedCount(activatedNotOnboarded.value?.total ?? 0);
      }
      if (allClients.status === 'fulfilled') {
        const items = allClients.value?.items || [];
        setUnallottedClients(items.filter((c: any) =>
          c.account_status === 'ACTIVE' && (!c.assigned_manager_id || !c.assigned_executive_id || !c.partner_tag_id)
        ));
      }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    listManagers().then((r) => setManagers(r?.items || r?.managers || r || [])).catch(() => {});
    listExecutives().then((r) => setExecutives(r?.items || r?.executives || r || [])).catch(() => {});
    listTags('PARTNER').then((r) => setPartnerTags((r?.items || r || []).filter((t: any) => t.is_active !== false))).catch(() => {});
  }, []);

  const getCount = (key: string) => {
    if (key === 'AWAITING_TAX_PAYMENT') return awaitingTaxPayment.length;
    const counters = summary?.counters || [];
    const found = counters.find((c: any) => c.status === key);
    return found?.count ?? 0;
  };

  const onAssignUnallotted = async (managerId: string, executiveId?: string, partnerTagId?: string) => {
    if (!assigningClient) return;
    setActing(true);
    try {
      if (managerId && managerId !== assigningClient.assigned_manager_id) await assignClientToManager(managerId, assigningClient.id);
      if (executiveId && executiveId !== assigningClient.assigned_executive_id) await assignExecutive(assigningClient.id, executiveId);
      if (partnerTagId && partnerTagId !== assigningClient.partner_tag_id) await setClientPartnerTag(assigningClient.id, partnerTagId);
      toast.success('Client assigned successfully');
      setAssigningClient(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Assignment failed'); }
    finally { setActing(false); }
  };

  // Analytics data shaping
  const STATUS_LABELS: Record<string, string> = {
    INITIATED: 'Initiated',
    DOCUMENT_UPLOAD: 'Document Upload',
    PROCESSING: 'Processing',
    COMPUTATION: 'Computation',
    FILING: 'Filing',
    PAYMENT: 'Payment',
    COMPLETED: 'Completed',
    HALTED: 'Halted',
  };
  const barData = (analytics?.filing_status_breakdown || []).map?.((x: any) => ({ name: STATUS_LABELS[x.status] || x.status, count: x.count })) || CARDS.slice(0, 7).map(c => ({ name: c.label, count: getCount(c.key) }));
  const lineData = (analytics?.fy_distribution || []).map?.((x: any) => ({ month: x.financial_year, count: x.total_filings })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partner Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Card
            className="rounded-lg border-l-4 border-l-indigo-500 bg-indigo-50 px-3 py-2 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/partner/clients')}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="text-lg font-bold text-indigo-700">{summary?.total_clients ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Total Clients</span>
            </div>
          </Card>
          <Card
            className={`rounded-lg border-l-4 px-3 py-2 cursor-pointer hover:shadow-md transition-all ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'border-l-rose-500 bg-rose-50' : 'border-l-slate-300 bg-slate-50'}`}
            onClick={() => router.push('/partner/clients?status=ACTIVATED_NOT_ONBOARDED')}
          >
            <div className="flex items-center gap-2">
              <UserX className={`h-4 w-4 ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
              <span className={`text-lg font-bold ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{activatedNotOnboardedCount ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Activated — Not Onboarded</span>
            </div>
          </Card>
          <Card
            className={`rounded-lg border-l-4 px-3 py-2 cursor-pointer hover:shadow-md transition-all ${onboardedPendingCount && onboardedPendingCount > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-slate-300 bg-slate-50'}`}
            onClick={() => router.push('/partner/clients?status=ONBOARDED_PENDING_FILING')}
          >
            <div className="flex items-center gap-2">
              <UserCheck className={`h-4 w-4 ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
              <span className={`text-lg font-bold ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{onboardedPendingCount ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Onboarded — Filing Not Initiated</span>
            </div>
          </Card>
          {unallottedClients.length > 0 && (
            <a href="#not-allotted">
              <Card className="rounded-lg border-l-4 border-l-purple-500 bg-purple-50 px-3 py-2 cursor-pointer hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-purple-600" />
                  <span className="text-lg font-bold text-purple-700">{unallottedClients.length}</span>
                  <span className="text-xs font-medium text-slate-600">Not Allotted</span>
                </div>
              </Card>
            </a>
          )}
          <Link href="/partner/audit"><Button variant="outline" className="border-slate-300"><FileText className="h-4 w-4 mr-2" /> Generate Audit Log</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => {
          const cardContent = (
            <Card className={`rounded-xl border-l-4 ${c.color} p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => {
              router.push(`/partner/clients?status=${c.key}`);
            }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-3xl font-bold ${c.text}`}>{loading ? '—' : getCount(c.key)}</div>
                  <div className="text-xs font-medium text-slate-600 mt-1">{c.label}</div>
                </div>
                {c.key === 'AWAITING_TAX_PAYMENT' ? <IndianRupee className="h-4 w-4 text-amber-600" /> : <ArrowRight className="h-4 w-4 text-slate-300" />}
              </div>
            </Card>
          );

          if (c.key === 'COMPUTATION' && (summary?.computation_sub_counters || []).length > 0) {
            return (
              <HoverCard key={c.key} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>{cardContent}</HoverCardTrigger>
                <HoverCardContent className="w-72 p-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900">Computation Breakdown</h4>
                    <div className="space-y-1.5">
                      {(summary.computation_sub_counters || []).map((s: any) => (
                        <div key={s.raw_status} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{s.sub_status}</span>
                          <span className="font-semibold text-slate-900 bg-violet-50 px-2 py-0.5 rounded">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }
          if (c.key === 'FILING' && (summary?.filing_doc_sub_counters || []).length > 0) {
            return (
              <HoverCard key={c.key} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>{cardContent}</HoverCardTrigger>
                <HoverCardContent className="w-72 p-3">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-900">Filing Doc Approval Status</h4>
                    <div className="space-y-1.5">
                      {(summary.filing_doc_sub_counters || []).map((s: any) => (
                        <div key={s.raw_status} className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">{s.sub_status}</span>
                          <span className="font-semibold text-slate-900 bg-orange-50 px-2 py-0.5 rounded">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            );
          }
          return <div key={c.key}>{cardContent}</div>;
        })}
      </div>

      {/* Awaiting Tax Payment Queue */}
      {awaitingTaxPayment.length > 0 && (
        <Card className="rounded-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-amber-700" />
              <h2 className="font-semibold text-slate-900">Awaiting Tax Payment Confirmation</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{awaitingTaxPayment.length}</span>
            </div>
            <span className="text-xs text-slate-500">Computation approved — waiting for client to confirm tax paid</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Financial Year</th>
                  <th className="text-left px-5 py-3 font-semibold">Status</th>
                  <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {awaitingTaxPayment.map((f: any) => (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{f.client_name || f.client?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{f.financial_year}</td>
                    <td className="px-5 py-3"><StatusBadge status="COMPUTATION" /></td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Pending
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/partner/clients/${f.client_id}`}>
                        <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">View <ArrowRight className="h-3 w-3 ml-1" /></Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Not Allotted Clients */}
      <Card id="not-allotted" className="rounded-xl p-0 overflow-hidden scroll-mt-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-purple-50/40">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold text-slate-900">Not Allotted Clients</h2>
            {unallottedClients.length > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">{unallottedClients.length}</span>}
          </div>
        </div>
        {unallottedClients.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">All active clients have been allotted a manager, executive, and partner tag.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Manager</th>
                  <th className="text-left px-5 py-3 font-semibold">Executive</th>
                  <th className="text-left px-5 py-3 font-semibold">Partner Tag</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unallottedClients.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{c.full_name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email}</td>
                    <td className="px-5 py-3 text-slate-600">{c.phone_number || '—'}</td>
                    <td className="px-5 py-3">
                      {c.assigned_manager_name
                        ? <span className="text-slate-700">{c.assigned_manager_name}</span>
                        : <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Not Assigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      {c.assigned_executive_name
                        ? <span className="text-slate-700">{c.assigned_executive_name}</span>
                        : <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Not Assigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      {c.partner_tag_name
                        ? <span className="text-slate-700">{c.partner_tag_name}</span>
                        : <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Not Assigned</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => setAssigningClient(c)} className="bg-indigo-600 hover:bg-indigo-700">
                          <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                        </Button>
                        <Link href={`/partner/clients/${c.id}`}>
                          <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">View <ArrowRight className="h-3 w-3 ml-1" /></Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><Users className="h-4 w-4 text-indigo-600" /><h3 className="font-semibold text-slate-900">Filings by State</h3></div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer><BarChart data={barData} margin={{ bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="hsl(239 84% 60%)" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-emerald-600" /><h3 className="font-semibold text-slate-900">Filings Initiated (Last 12 Months)</h3></div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer><LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Assign Manager/Executive/Partner Tag dialog */}
      <AssignAfterActivationDialog
        client={assigningClient}
        managers={managers}
        executives={executives}
        partnerTags={partnerTags}
        acting={acting}
        onAssign={onAssignUnallotted}
        onSkip={() => setAssigningClient(null)}
      />
    </div>
  );
}

