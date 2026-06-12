'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { getSummary, getPendingVerification, getPartnerAnalytics, activateClient, rejectClient, listFilings, listManagers, listExecutives, assignClientToManager, assignExecutive, listTags, setClientPartnerTag, getManagerTeam, listClients } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import { ArrowRight, Hourglass, CheckCircle2, XCircle, TrendingUp, Users, Loader2, FileText, IndianRupee, AlertTriangle, UserCheck } from 'lucide-react';

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
  const [pending, setPending] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);
  const [awaitingTaxPayment, setAwaitingTaxPayment] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [partnerTags, setPartnerTags] = useState<any[]>([]);
  const [justActivated, setJustActivated] = useState<any>(null); // client that was just activated, needs assignment
  const [feeForClient, setFeeForClient] = useState<any>(null); // client pending fee input before activation
  const [onboardedPendingCount, setOnboardedPendingCount] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, a, paymentFilings, onboardedPending] = await Promise.allSettled([
        getSummary(),
        getPendingVerification(),
        getPartnerAnalytics(),
        listFilings({ status: 'COMPUTATION', page_size: 100 }),
        listClients({ onboarded_pending_filing: true, page: 1, page_size: 1 }),
      ]);
      if (s.status === 'fulfilled') setSummary(s.value || {});
      if (p.status === 'fulfilled') setPending(p.value?.items || []);
      if (a.status === 'fulfilled') setAnalytics(a.value);
      if (paymentFilings.status === 'fulfilled') {
        const items = paymentFilings.value?.items || paymentFilings.value?.filings || [];
        setAwaitingTaxPayment(items.filter((f: any) => f.is_tax_paid === false));
      }
      if (onboardedPending.status === 'fulfilled') {
        setOnboardedPendingCount(onboardedPending.value?.total ?? 0);
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

  const onActivate = async (client: any) => {
    // Step 1: Show fee input dialog first
    setFeeForClient(client);
  };

  const onActivateWithFee = async (fee: number | undefined, noFeesApplicable: boolean) => {
    if (!feeForClient) return;
    setActing(true);
    try {
      await activateClient(feeForClient.id, noFeesApplicable || undefined);
      toast.success('Client activated! Now assign a manager.');
      setJustActivated(feeForClient);
      setFeeForClient(null);
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Activation failed'); }
    finally { setActing(false); }
  };

  const onAssignAfterActivation = async (managerId: string, executiveId?: string, partnerTagId?: string) => {
    if (!justActivated) return;
    setActing(true);
    try {
      await assignClientToManager(managerId, justActivated.id);
      if (executiveId) {
        await assignExecutive(justActivated.id, executiveId);
      }
      if (partnerTagId) {
        await setClientPartnerTag(justActivated.id, partnerTagId);
      }
      toast.success('Manager assigned successfully');
      setJustActivated(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Assignment failed'); }
    finally { setActing(false); }
  };
  const onReject = async () => {
    if (!rejectFor) return;
    setActing(true);
    try { await rejectClient(rejectFor.id, rejectReason || 'Rejected'); toast.success('Client rejected'); setRejectFor(null); setRejectReason(''); load(); }
    catch (e: any) { toast.error(e?.response?.data?.detail || 'Rejection failed'); }
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
            className={`rounded-lg border-l-4 px-3 py-2 cursor-pointer hover:shadow-md transition-all ${onboardedPendingCount && onboardedPendingCount > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-slate-300 bg-slate-50'}`}
            onClick={() => router.push('/partner/clients?status=ONBOARDED_PENDING_FILING')}
          >
            <div className="flex items-center gap-2">
              <UserCheck className={`h-4 w-4 ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
              <span className={`text-lg font-bold ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{onboardedPendingCount ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Onboarded — Filing Not Initiated</span>
            </div>
          </Card>
          {pending.length > 0 && (
            <a href="#activation-queue">
              <Card className="rounded-lg border-l-4 border-l-amber-500 bg-amber-50 px-3 py-2 cursor-pointer hover:shadow-md transition-all">
                <div className="flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-amber-600" />
                  <span className="text-lg font-bold text-amber-700">{pending.length}</span>
                  <span className="text-xs font-medium text-slate-600">Pending Activations</span>
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

      {/* Account Activation Queue */}
      <Card id="activation-queue" className="rounded-xl p-0 overflow-hidden scroll-mt-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-amber-50/40">
          <div className="flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-slate-900">Account Activation Queue</h2>
            {pending.length > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{pending.length}</span>}
          </div>
        </div>
        {pending.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-500">No pending verifications — all registered clients are activated.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client Name</th>
                  <th className="text-left px-5 py-3 font-semibold">Email</th>
                  <th className="text-left px-5 py-3 font-semibold">Phone</th>
                  <th className="text-left px-5 py-3 font-semibold">Registered</th>
                  <th className="text-left px-5 py-3 font-semibold">Waiting</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c: any) => (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{c.full_name || c.name}</td>
                    <td className="px-5 py-3 text-slate-600">{c.email}</td>
                    <td className="px-5 py-3 text-slate-600">{c.phone_number || '—'}</td>
                    <td className="px-5 py-3 text-slate-500 text-xs">{c.registered_at ? new Date(c.registered_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-xs">{(() => {
                      if (!c.registered_at) return '—';
                      const diff = Date.now() - new Date(c.registered_at).getTime();
                      const hours = Math.floor(diff / (1000 * 60 * 60));
                      const days = Math.floor(hours / 24);
                      if (days > 0) return <span className={`font-semibold ${days > 3 ? 'text-red-600' : days > 1 ? 'text-amber-600' : 'text-slate-600'}`}>{days}d {hours % 24}h</span>;
                      return <span className="text-slate-600">{hours}h</span>;
                    })()}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => onActivate(c)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectFor(c)} className="text-rose-600 border-rose-200 hover:bg-rose-50"><XCircle className="h-3.5 w-3.5 mr-1" /> Reject</Button>
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

      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject client registration</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Provide a reason. The client will be notified.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button onClick={onReject} disabled={acting} className="bg-rose-600 hover:bg-rose-700">{acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fee input before activation */}
      <FeeInputDialog
        client={feeForClient}
        acting={acting}
        onSubmit={onActivateWithFee}
        onCancel={() => setFeeForClient(null)}
      />

      {/* Assign Manager/Executive after activation */}
      <AssignAfterActivationDialog
        client={justActivated}
        managers={managers}
        executives={executives}
        partnerTags={partnerTags}
        acting={acting}
        onAssign={onAssignAfterActivation}
        onSkip={() => { setJustActivated(null); load(); }}
      />
    </div>
  );
}

function AssignAfterActivationDialog({ client, managers, executives, partnerTags, acting, onAssign, onSkip }: {
  client: any;
  managers: any[];
  executives: any[];
  partnerTags: any[];
  acting: boolean;
  onAssign: (managerId: string, executiveId?: string, partnerTagId?: string) => void;
  onSkip: () => void;
}) {
  const [selectedManager, setSelectedManager] = useState('');
  const [selectedExecutive, setSelectedExecutive] = useState('');
  const [selectedPartnerTag, setSelectedPartnerTag] = useState('');
  const [managerExecs, setManagerExecs] = useState<any[]>([]);

  // When manager changes, load that manager's team executives
  useEffect(() => {
    if (!selectedManager) { setManagerExecs([]); setSelectedExecutive(''); return; }
    setSelectedExecutive('');
    getManagerTeam(selectedManager)
      .then((r) => setManagerExecs(r?.executives || r?.items || []))
      .catch(() => setManagerExecs([]));
  }, [selectedManager]);

  if (!client) return null;

  return (
    <Dialog open={!!client} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Client Activated
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-sm font-semibold text-slate-900">{client.full_name || client.name}</div>
            <div className="text-xs text-slate-500">{client.email}</div>
          </div>
          <p className="text-sm text-slate-600">Assign a manager, partner tag, and optionally an executive to this client.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Partner Tag <span className="text-rose-500">*</span></label>
              <Select value={selectedPartnerTag} onValueChange={setSelectedPartnerTag}>
                <SelectTrigger className={`w-full ${selectedPartnerTag ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                  <SelectValue placeholder="Select Partner Tag" />
                </SelectTrigger>
                <SelectContent>
                  {partnerTags.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Manager <span className="text-rose-500">*</span></label>
              <Select value={selectedManager} onValueChange={setSelectedManager}>
                <SelectTrigger className={`w-full ${selectedManager ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                  <SelectValue placeholder="Select Manager" />
                </SelectTrigger>
                <SelectContent>
                  {managers.filter((m) => m.is_active !== false).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.full_name || m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">Executive <span className="text-slate-400">(optional)</span></label>
              <Select value={selectedExecutive} onValueChange={setSelectedExecutive} disabled={!selectedManager}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={selectedManager ? 'Select Executive (optional)' : 'Select a manager first'} />
                </SelectTrigger>
                <SelectContent>
                  {managerExecs.filter((e) => e.is_active !== false).map((e) => (
                    <SelectItem key={e.executive_id || e.id} value={e.executive_id || e.id}>{e.executive_name || e.full_name || e.name}</SelectItem>
                  ))}
                  {managerExecs.length === 0 && selectedManager && (
                    <div className="px-3 py-2 text-xs text-slate-400">No executives under this manager</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onSkip}>Skip for now</Button>
          <Button
            disabled={!selectedManager || !selectedPartnerTag || acting}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onAssign(selectedManager, selectedExecutive || undefined, selectedPartnerTag || undefined)}
          >
            {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Assign & Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeeInputDialog({ client, acting, onSubmit, onCancel }: {
  client: any;
  acting: boolean;
  onSubmit: (fee: number | undefined, noFeesApplicable: boolean) => void;
  onCancel: () => void;
}) {
  const [noFees, setNoFees] = useState(false);

  if (!client) return null;

  return (
    <Dialog open={!!client} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-indigo-600" /> Activate Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">{client.full_name || client.name}</div>
            <div className="text-xs text-slate-500">{client.email}</div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="no-fees" checked={noFees} onCheckedChange={(checked) => setNoFees(checked === true)} />
            <Label htmlFor="no-fees" className="text-sm font-medium text-slate-700 cursor-pointer">No Fees Applicable</Label>
          </div>
          {noFees && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
              <p className="text-xs text-teal-700">This client will not be charged any professional fee. The engagement letter will not include fee/payment sections.</p>
            </div>
          )}
          {!noFees && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-600">Professional fees will be mutually decided after computation is approved. The engagement letter will state: &ldquo;Professional fees shall be mutually decided depending upon the scope, volume and complexity of work.&rdquo;</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            disabled={acting}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => onSubmit(undefined, noFees)}
          >
            {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Activate Client
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
