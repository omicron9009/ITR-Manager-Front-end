// @ts-nocheck
'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  getSummary, getMyTeam, listFilings, getMyClients, listClients,
  getPendingVerification, activateClient, rejectClient,
  assignClientToManager, assignExecutive, setClientPartnerTag,
  listManagers, listTags,
} from '@/lib/api';
import { getIsElevated } from '@/lib/auth';
import { FeeInputDialog, AssignAfterActivationDialog } from '@/components/shared/ClientActivationDialogs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import {
  Users, ArrowRight, Shield, IndianRupee, AlertTriangle,
  UserCheck, UserX, Hourglass, CheckCircle2, XCircle, Loader2,
} from 'lucide-react';

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

export default function ManagerDashboard() {
  const router = useRouter();

  // Read from localStorage inside useEffect — prevents SSR mismatch where
  // getIsElevated() returns false (no window) and the queue section never renders.
  const [isElevated, setIsElevated] = useState(false);

  const [summary, setSummary] = useState<any>({});
  const [team, setTeam] = useState<any>(null);
  const [awaitingTaxPayment, setAwaitingTaxPayment] = useState<any[]>([]);
  const [myClientIds, setMyClientIds] = useState<Set<string>>(new Set());
  const [onboardedPendingCount, setOnboardedPendingCount] = useState<number | null>(null);
  const [activatedNotOnboardedCount, setActivatedNotOnboardedCount] = useState<number | null>(null);

  // Elevated-manager-only state
  const [pending, setPending] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [partnerTags, setPartnerTags] = useState<any[]>([]);
  const [feeForClient, setFeeForClient] = useState<any>(null);
  const [justActivated, setJustActivated] = useState<any>(null);
  const [rejectFor, setRejectFor] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const loadActivationQueue = () => {
    getPendingVerification().then((r) => setPending(r?.items || [])).catch(() => {});
  };

  useEffect(() => {
    const elevated = getIsElevated();
    setIsElevated(elevated);

    // Standard dashboard data
    getSummary().then(setSummary).catch(() => {});
    getMyTeam().then(setTeam).catch(() => {});
    listFilings({ status: 'COMPUTATION', page_size: 100 }).then((r) => {
      const items = r?.items || r?.filings || [];
      setAwaitingTaxPayment(items.filter((f: any) => f.is_tax_paid === false));
    }).catch(() => {});
    listClients({ onboarded_pending_filing: true, page: 1, page_size: 1 })
      .then((r) => setOnboardedPendingCount(r?.total ?? 0))
      .catch(() => setOnboardedPendingCount(0));
    listClients({ activated_not_onboarded: true, page: 1, page_size: 1 })
      .then((r) => setActivatedNotOnboardedCount(r?.total ?? 0))
      .catch(() => setActivatedNotOnboardedCount(0));

    if (!elevated) {
      getMyClients({ page: 1, page_size: 100 }).then((r) => {
        const ids = new Set<string>((r?.items || []).map((c: any) => c.id));
        setMyClientIds(ids);
      }).catch(() => {});
    }

    // Elevated-only data
    if (elevated) {
      loadActivationQueue();
      listManagers().then((r) => setManagers(r?.items || r?.managers || r || [])).catch(() => {});
      listTags('PARTNER').then((r) => setPartnerTags((r?.items || r || []).filter((t: any) => t.is_active !== false))).catch(() => {});
    }
  }, []);

  // Activation handlers
  const onActivate = (client: any) => setFeeForClient(client);

  const onActivateWithFee = async (fee: number | undefined, noFeesApplicable: boolean) => {
    if (!feeForClient) return;
    setActing(true);
    try {
      await activateClient(feeForClient.id, noFeesApplicable || undefined);
      toast.success('Client activated! Now assign a manager.');
      setJustActivated(feeForClient);
      setFeeForClient(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Activation failed');
    } finally {
      setActing(false);
    }
  };

  const onAssignAfterActivation = async (managerId: string, executiveId?: string, partnerTagId?: string) => {
    if (!justActivated) return;
    setActing(true);
    try {
      await assignClientToManager(managerId, justActivated.id);
      if (executiveId) await assignExecutive(justActivated.id, executiveId);
      if (partnerTagId) await setClientPartnerTag(justActivated.id, partnerTagId);
      toast.success('Manager assigned successfully');
      setJustActivated(null);
      loadActivationQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Assignment failed');
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!rejectFor) return;
    setActing(true);
    try {
      await rejectClient(rejectFor.id, rejectReason || 'Rejected');
      toast.success('Client rejected');
      setRejectFor(null);
      setRejectReason('');
      loadActivationQueue();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Rejection failed');
    } finally {
      setActing(false);
    }
  };

  const filteredAwaitingTax = useMemo(() => {
    if (isElevated || myClientIds.size === 0) return awaitingTaxPayment;
    return awaitingTaxPayment.filter((f: any) => myClientIds.has(f.client_id));
  }, [awaitingTaxPayment, myClientIds, isElevated]);

  const getCount = (k: string) => {
    if (k === 'AWAITING_TAX_PAYMENT') return filteredAwaitingTax.length;
    const counters = summary?.counters || [];
    const found = counters.find((c: any) => c.status === k);
    return found?.count ?? 0;
  };

  const barData = CARDS.filter(c => c.key !== 'AWAITING_TAX_PAYMENT').map(c => ({ name: c.label, count: getCount(c.key) }));
  const teamExecs = team?.executives || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isElevated ? 'Firm-wide view' : 'Your team\'s filings'} &middot; {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            {isElevated && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">Elevated</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Card
            className="rounded-lg border-l-4 border-l-indigo-500 bg-indigo-50 px-3 py-2 cursor-pointer hover:shadow-md transition-all"
            onClick={() => router.push('/manager/clients')}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <span className="text-lg font-bold text-indigo-700">{summary?.total_clients ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Total Clients</span>
            </div>
          </Card>
          <Card
            className={`rounded-lg border-l-4 px-3 py-2 cursor-pointer hover:shadow-md transition-all ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'border-l-rose-500 bg-rose-50' : 'border-l-slate-300 bg-slate-50'}`}
            onClick={() => router.push('/manager/clients?status=ACTIVATED_NOT_ONBOARDED')}
          >
            <div className="flex items-center gap-2">
              <UserX className={`h-4 w-4 ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'text-rose-600' : 'text-slate-500'}`} />
              <span className={`text-lg font-bold ${activatedNotOnboardedCount && activatedNotOnboardedCount > 0 ? 'text-rose-700' : 'text-slate-600'}`}>{activatedNotOnboardedCount ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Activated — Not Onboarded</span>
            </div>
          </Card>
          <Card
            className={`rounded-lg border-l-4 px-3 py-2 cursor-pointer hover:shadow-md transition-all ${onboardedPendingCount && onboardedPendingCount > 0 ? 'border-l-amber-500 bg-amber-50' : 'border-l-slate-300 bg-slate-50'}`}
            onClick={() => router.push('/manager/clients?status=ONBOARDED_PENDING_FILING')}
          >
            <div className="flex items-center gap-2">
              <UserCheck className={`h-4 w-4 ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-600' : 'text-slate-500'}`} />
              <span className={`text-lg font-bold ${onboardedPendingCount && onboardedPendingCount > 0 ? 'text-amber-700' : 'text-slate-600'}`}>{onboardedPendingCount ?? '—'}</span>
              <span className="text-xs font-medium text-slate-600">Onboarded — Filing Not Initiated</span>
            </div>
          </Card>
          {isElevated && pending.length > 0 && (
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
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span className="font-medium">{teamExecs.length} executive{teamExecs.length !== 1 ? 's' : ''} in team</span>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CARDS.map((c) => {
          const cardContent = (
            <Card className={`rounded-xl border-l-4 ${c.color} p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => {
              router.push(`/manager/clients?status=${c.key}`);
            }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className={`text-3xl font-bold ${c.text}`}>{getCount(c.key)}</div>
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
      {filteredAwaitingTax.length > 0 && (
        <Card className="rounded-xl p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-amber-50/60">
            <div className="flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-amber-700" />
              <h2 className="font-semibold text-slate-900">Awaiting Tax Payment Confirmation</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{filteredAwaitingTax.length}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold">Client</th>
                  <th className="text-left px-5 py-3 font-semibold">Financial Year</th>
                  <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAwaitingTax.map((f: any) => (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{f.client_name || f.client?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{f.financial_year}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Pending
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="outline" className="text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={() => router.push(`/manager/clients/${f.client_id}`)}>
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Account Activation Queue — elevated managers only */}
      {isElevated && (
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
                    <th className="text-left px-5 py-3 font-semibold">City</th>
                    <th className="text-left px-5 py-3 font-semibold">Referral</th>
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
                      <td className="px-5 py-3 text-slate-600">{c.city || <span className="text-slate-400">—</span>}</td>
                      <td className="px-5 py-3 text-slate-600 text-xs">
                        {(() => {
                          const labels: Record<string, string> = {
                            WEBSITE: 'Website',
                            FRIEND_RELATIVE: 'Friend / Relative',
                            PROFESSIONAL_REFERRAL: 'Professional Referral',
                            DIRECTED_BY_FIRM: 'Directed by Firm',
                            OTHER: 'Other',
                          };
                          if (!c.referral_source) return <span className="text-slate-400">—</span>;
                          const label = labels[c.referral_source] || c.referral_source;
                          if (c.referral_source === 'OTHER' && c.referral_source_other) {
                            return <span title={c.referral_source_other}>{label}: <span className="text-slate-400 italic">{c.referral_source_other}</span></span>;
                          }
                          return label;
                        })()}
                      </td>
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
                          <Button size="sm" onClick={() => onActivate(c)} disabled={acting} className="bg-emerald-600 hover:bg-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Activate
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectFor(c)} className="text-rose-600 border-rose-200 hover:bg-rose-50">
                            <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Team Overview + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Filings by State</h3>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(239 84% 60%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">My Team</h3>
          </div>
          {teamExecs.length === 0 ? (
            <p className="text-sm text-slate-500">No executives assigned to your team yet.</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {teamExecs.map((exec: any) => (
                <div key={exec.executive_id || exec.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-sm text-slate-900">{exec.executive_name || exec.full_name}</p>
                    <p className="text-xs text-slate-500">{exec.email || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600">{exec.active_filings ?? exec.client_count ?? 0}</p>
                    <p className="text-[10px] text-slate-400">active filings</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectFor} onOpenChange={(o) => !o && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject client registration</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Provide a reason. The client will be notified.</p>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button onClick={onReject} disabled={acting} className="bg-rose-600 hover:bg-rose-700">
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FeeInputDialog
        client={feeForClient}
        acting={acting}
        onSubmit={onActivateWithFee}
        onCancel={() => setFeeForClient(null)}
      />

      <AssignAfterActivationDialog
        client={justActivated}
        managers={managers}
        executives={[]}
        partnerTags={partnerTags}
        acting={acting}
        onAssign={onAssignAfterActivation}
        onSkip={() => { setJustActivated(null); loadActivationQueue(); }}
      />
    </div>
  );
}
