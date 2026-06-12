// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getClientDashboard, initiateFiling, getOnboardingForm, getActionItems, getClient, me, getMyFeedbackStats, confirmIncomeHeads, listDocTypesByIncomeHeads } from '@/lib/api';
import { getUser, setUser as persistUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Plus, FolderOpen, AlertTriangle, Loader2, ClipboardList, CheckCircle2, Upload, ArrowRight, FileText, IndianRupee, Star, ListChecks } from 'lucide-react';

const INCOME_HEAD_LABELS: Record<string, string> = {
  salary: 'Salary / Pension',
  esop: 'ESOP / RSU',
  rental_income: 'Rental Income',
  more_than_2_properties: 'More than 2 Properties',
  capital_gain_shares: 'Capital Gain – Shares / MF',
  capital_gain_land: 'Capital Gain – Land / Property',
  business_profession: 'Business / Profession',
  interest_dividend: 'Interest / Dividend',
  foreign_assets: 'Foreign Assets / Income',
  any_other: 'Any Other Income',
};

const INCOME_HEAD_ENUM: Record<string, string> = {
  salary: 'SALARY',
  esop: 'ESOP',
  rental_income: 'RENTAL_INCOME',
  more_than_2_properties: 'MORE_THAN_2_PROPERTIES',
  capital_gain_shares: 'CAPITAL_GAIN_SHARES',
  capital_gain_land: 'CAPITAL_GAIN_LAND',
  business_profession: 'BUSINESS_PROFESSION',
  interest_dividend: 'INTEREST_DIVIDEND',
  foreign_assets: 'FOREIGN_ASSETS',
  any_other: 'ANY_OTHER',
};

const INCOME_HEAD_GROUPS: { title: string; keys: string[] }[] = [
  { title: 'Salary', keys: ['salary', 'esop'] },
  { title: 'House Property', keys: ['rental_income', 'more_than_2_properties'] },
  { title: 'Capital Gains', keys: ['capital_gain_shares', 'capital_gain_land'] },
  { title: 'Business / Profession', keys: ['business_profession'] },
  { title: 'Other Sources', keys: ['interest_dividend', 'foreign_assets', 'any_other'] },
];

function getFYOptions() {
  const d = new Date();
  // Only show FYs that have ended (FY Y-(Y+1) ends on March 31 of Y+1)
  const cur = d.getMonth() >= 3 ? d.getFullYear() - 1 : d.getFullYear() - 2;
  const arr: string[] = [];
  for (let y = cur; y >= 2000; y--) arr.push(`${y}-${y + 1}`);
  return arr;
}

export default function ClientDashboard() {
  const router = useRouter();
  const [filings, setFilings] = useState<any[]>([]);
  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openInit, setOpenInit] = useState(false);
  const [fy, setFy] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [engagementAccepted, setEngagementAccepted] = useState(false);
  const [clientProfile, setClientProfile] = useState<any>(null);

  // Confirm-income-heads (post-initiation) state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFilingId, setConfirmFilingId] = useState<string | null>(null);
  const [incomeHeads, setIncomeHeads] = useState<Record<string, boolean>>({});
  const [anyOtherText, setAnyOtherText] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showInitiateReminder, setShowInitiateReminder] = useState(false);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getClientDashboard();
      setDashData(r);
      const items = (r?.active_filings || []).map((f: any) => ({ ...f, id: f.filing_id || f.id }));
      setFilings(items);
      // Fallback: if clientProfile fee isn't loaded yet, grab from latest filing
      if (!clientProfile?.professional_fee) {
        const feeFromFiling = items.find((f: any) => f.professional_fee)?.professional_fee;
        if (feeFromFiling) setClientProfile((prev: any) => prev ? { ...prev, professional_fee: prev.professional_fee || feeFromFiling } : { professional_fee: feeFromFiling });
      }
    } catch {
      setFilings([]);
    } finally { setLoading(false); }
  };

  const checkOnboarding = async () => {
    try {
      // Don't show onboarding popup until client is activated
      const user = await me();
      if (user?.account_status !== 'ACTIVE') return;

      const r = await getOnboardingForm();
      const fields = r?.fields || [];
      if (fields.length > 0 && !r?.submitted) {
        setOnboardingComplete(false);
        setShowOnboarding(true);
      } else {
        setOnboardingComplete(true);
      }
    } catch { setOnboardingComplete(true); }
  };

  // Always refresh identity from backend (overwrites stale localStorage user).
  // Used on mount, on tab focus/visibility, and after a 403 to detect activation.
  const refreshIdentity = async () => {
    try {
      const fresh = await me();
      if (fresh) {
        const stored = getUser() || {};
        const merged = { ...stored, ...fresh };
        persistUser(merged);
        setClientUser(merged);
      }
      return fresh;
    } catch {
      return null;
    }
  };

  const loadActionItems = async () => {
    try {
      const r = await getActionItems();
      setActionItems(r?.items || []);
    } catch { setActionItems([]); }
  };

  const loadFeedbackStats = async () => {
    try {
      const r = await getMyFeedbackStats();
      setFeedbackStats(r);
    } catch { /* endpoint may not exist yet — silently ignore */ }
  };

  useEffect(() => { load(); checkOnboarding(); loadActionItems(); loadFeedbackStats(); refreshIdentity(); }, []);

  // Refresh on tab focus / visibility so activation done in another tab/window
  // is reflected immediately without a manual reload.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshIdentity();
        load();
        loadActionItems();
      }
    };
    const onFocus = () => { refreshIdentity(); load(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const [clientUser, setClientUser] = useState<any>(null);
  useEffect(() => {
    const u = getUser();
    setClientUser(u);
    me().then((p) => {
      const userId = p?.id || p?.user_id || u?.user_id;
      if (userId) getClient(userId).then((r) => setClientProfile(r)).catch(() => {});
    }).catch(() => {
      // Fallback to localStorage user_id
      if (u?.user_id) getClient(u.user_id).then((r) => setClientProfile(r)).catch(() => {});
    });
  }, []);

  const accountStatus = dashData?.account_status || clientUser?.account_status || '';
  const pendingVerification = accountStatus === 'PENDING_VERIFICATION';

  // Show "Initiate Filing" reminder on every reload once onboarding is complete
  // and the user has not yet initiated a filing for the latest FY.
  useEffect(() => {
    if (loading) return;
    if (pendingVerification) return;
    if (!onboardingComplete) return;
    const latestFY = getFYOptions()[0];
    const hasFilingForLatestFY = (filings || []).some((f: any) => f.financial_year === latestFY);
    if (!hasFilingForLatestFY) setShowInitiateReminder(true);
  }, [loading, pendingVerification, onboardingComplete, filings]);

  const doInitiate = async () => {
    if (!fy || !engagementAccepted) return;
    setSubmitting(true);
    try {
      const filing = await initiateFiling({ financial_year: fy, engagement_accepted: true });
      toast.success('Filing initiated');
      setOpenInit(false); setFy(''); setEngagementAccepted(false);
      // Pre-fill income heads from client profile, then open confirm dialog
      const baseHeads: Record<string, boolean> = {};
      Object.keys(INCOME_HEAD_LABELS).forEach((k) => {
        baseHeads[k] = !!(clientProfile?.income_heads?.[k]);
      });
      setIncomeHeads(baseHeads);
      setAnyOtherText(clientProfile?.income_heads?.any_other_text || '');
      setPreviewCount(null);
      setConfirmFilingId(filing?.id || filing?.filing_id || null);
      setConfirmOpen(true);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  // Live BASE-doc preview — debounced
  useEffect(() => {
    if (!confirmOpen) return;
    const selectedHeads = Object.keys(incomeHeads)
      .filter((k) => incomeHeads[k] && INCOME_HEAD_ENUM[k])
      .map((k) => INCOME_HEAD_ENUM[k]);
    if (selectedHeads.length === 0) { setPreviewCount(0); return; }
    const t = setTimeout(() => {
      listDocTypesByIncomeHeads(selectedHeads, 'BASE')
        .then((r) => setPreviewCount((r?.items || []).length))
        .catch(() => setPreviewCount(null));
    }, 350);
    return () => clearTimeout(t);
  }, [incomeHeads, confirmOpen]);

  const submitIncomeHeads = async () => {
    if (!confirmFilingId) return;
    setConfirmSaving(true);
    try {
      const payload: Record<string, any> = { ...incomeHeads };
      payload.any_other_text = incomeHeads.any_other ? (anyOtherText.trim() || null) : null;
      const res = await confirmIncomeHeads(confirmFilingId, payload);
      const assigned = res?.base_documents_assigned ?? 0;
      const transitioned = res?.transitioned_to;
      if (transitioned === 'DOCUMENT_UPLOAD') {
        toast.success(`Confirmed. ${assigned} document${assigned === 1 ? '' : 's'} requested — you can start uploading.`);
        setConfirmOpen(false);
        router.push(`/client/filings/${confirmFilingId}`);
      } else {
        toast.success(`Confirmed. ${assigned} document${assigned === 1 ? '' : 's'} queued. Awaiting team assignment before uploads can start.`);
        setConfirmOpen(false);
        load();
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 409) {
        toast.error('Income heads can only be confirmed before document upload starts.');
        setConfirmOpen(false);
      } else if (status === 403) {
        // Possible stale account_status / token. Refresh identity + dashboard,
        // then guide the user based on the freshly-fetched status.
        const fresh = await refreshIdentity();
        await load();
        if (fresh?.account_status === 'ACTIVE') {
          toast.error('Your session looks out of date. Please sign out and sign back in to refresh permissions, then try again.');
        } else {
          toast.error(e?.response?.data?.detail || 'Access denied. Your account may not be active yet.');
        }
      } else {
        toast.error(e?.response?.data?.detail || 'Failed to confirm income heads');
      }
    } finally { setConfirmSaving(false); }
  };



  return (
    <div className="space-y-6">
      {pendingVerification && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">Your account is under verification.</p>
            <p className="text-sm text-amber-800">You&rsquo;ll receive an email once activated.</p>
          </div>
        </div>
      )}

      {!pendingVerification && !onboardingComplete && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-blue-900">Complete your onboarding form</p>
            <p className="text-sm text-blue-800 mt-0.5">Fill in your details before initiating a filing.</p>
            <Button size="sm" className="mt-2 bg-blue-600 hover:bg-blue-700" onClick={() => setShowOnboarding(true)}>Fill Onboarding Form</Button>
          </div>
        </div>
      )}

      {/* Action Items — What to do next */}
      {!pendingVerification && actionItems.length > 0 && (
        <Card className="rounded-xl p-5 border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-white">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-900">What to do next</h2>
          </div>
          <div className="space-y-2">
            {actionItems.map((item: any, idx: number) => {
              const priorityColors: Record<string, string> = {
                HIGH: 'border-red-200 bg-red-50/50',
                MEDIUM: 'border-amber-200 bg-amber-50/50',
                LOW: 'border-slate-200 bg-slate-50/50',
              };
              const href = item.related_filing_id
                ? `/client/filings/${item.related_filing_id}`
                : item.type === 'COMPLETE_ONBOARDING'
                ? '#'
                : '/client/filings';
              return (
                <div
                  key={idx}
                  className={`rounded-lg border ${priorityColors[item.priority] || 'border-slate-200 bg-white'} p-3 flex items-center justify-between gap-3 cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => {
                    if (item.type === 'COMPLETE_ONBOARDING') { router.push('/client/onboarding'); return; }
                    if (item.related_filing_id) router.push(`/client/filings/${item.related_filing_id}`);
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">{idx + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{item.description}</p>
                      {item.financial_year && <p className="text-[10px] text-slate-400 mt-0.5">FY {item.financial_year}</p>}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Average Feedback Rating */}
      {feedbackStats && feedbackStats.average_rating != null && (
        <Card className="rounded-xl p-4 border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-50/60 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Your Average Satisfaction Rating</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl font-bold text-slate-900">{Number(feedbackStats.average_rating).toFixed(1)}</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-4 w-4 ${s <= Math.round(feedbackStats.average_rating) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} />
                  ))}
                </div>
                <span className="text-xs text-slate-400">({feedbackStats.total || feedbackStats.total_feedbacks || 0} rating{(feedbackStats.total || feedbackStats.total_feedbacks || 0) !== 1 ? 's' : ''})</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {dashData?.full_name ? `Welcome, ${dashData.full_name}` : 'My Filings'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Click a filing to view documents and details.</p>
        </div>
        <Button onClick={() => { if (!onboardingComplete) { setShowOnboarding(true); return; } setEngagementAccepted(false); setOpenInit(true); }} disabled={pendingVerification} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-1" /> Initiate ITR Filing
        </Button>
      </div>

      {/* Filing Directory Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : filings.length === 0 ? (
        <Card className="rounded-xl p-10 text-center">
          <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mb-3"><FolderOpen className="h-7 w-7" /></div>
          <h3 className="font-bold text-slate-900">No filings yet</h3>
          <p className="text-sm text-slate-500 mt-1">Start by initiating your first ITR filing.</p>
          <Button onClick={() => { if (!onboardingComplete) { setShowOnboarding(true); return; } setEngagementAccepted(false); setOpenInit(true); }} disabled={pendingVerification} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> Initiate Filing
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filings.map((f: any) => (
            <FilingCard key={f.id} filing={f} onClick={() => router.push(`/client/filings/${f.id}`)} />
          ))}
        </div>
      )}

      {/* Initiate Filing Dialog with Engagement Letter */}
      <Dialog open={openInit} onOpenChange={(o) => { setOpenInit(o); if (!o) { setEngagementAccepted(false); setFy(''); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Initiate ITR Filing</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Financial Year</label>
              <Select value={fy} onValueChange={setFy}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select FY" /></SelectTrigger>
                <SelectContent>{getFYOptions().map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {fy && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-600" /> Engagement Letter</h3>

                {clientProfile?.no_fees_applicable && (
                <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-teal-200 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-teal-700" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-teal-500 tracking-wide">Fee Status for FY {fy}</div>
                      <div className="text-sm font-bold text-teal-800">No Fees Applicable</div>
                      <div className="text-xs text-teal-600">No professional fees will be charged for this filing</div>
                    </div>
                  </div>
                </div>
                )}

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3 text-xs text-slate-600 leading-relaxed bg-slate-50">
                  <p className="font-semibold text-slate-800 mb-2">Engagement Letter for Income Tax Return Filing Services</p>
                  <p className="mb-2">This Engagement Letter sets out the terms and conditions governing the professional services to be provided by the Firm to the Client for Income Tax Return (&ldquo;ITR&rdquo;) filing and related tax compliance services.</p>
                  <p className="font-semibold text-slate-700 mb-1">1. Scope of Services</p>
                  <p className="mb-2">The Firm shall provide professional services including preparation and filing of Income Tax Return(s), computation of taxable income and tax liability, assistance in tax filing compliance, and related procedural matters.</p>
                  <p className="font-semibold text-slate-700 mb-1">2. Client Responsibilities</p>
                  <p className="mb-2">The Client shall provide complete, accurate, and timely information, records, and supporting documents. The Firm shall rely upon the information provided and shall not be responsible for consequences arising from incomplete or incorrect information.</p>
                  <p className="font-semibold text-slate-700 mb-1">3. Confidentiality &amp; Data Protection</p>
                  <p className="mb-2">The Firm shall maintain confidentiality of all information and documents shared by the Client. Client data shall be stored securely within the Firm&rsquo;s controlled internal infrastructure.</p>
                  <p className="font-semibold text-slate-700 mb-1">4. Limitation of Responsibility</p>
                  <p className="mb-2">The Firm shall not be responsible for errors, penalties, or consequences arising from incorrect information provided by the Client, or delays caused by technical issues or events beyond reasonable control.</p>
                  {!clientProfile?.no_fees_applicable && (
                    <>
                      <p className="font-semibold text-slate-700 mb-1">5. Professional Fees</p>
                      <p className="mb-2 font-semibold text-slate-800 bg-slate-100 rounded px-2 py-1 border border-slate-200">Professional fees shall be mutually decided depending upon the scope, volume and complexity of work.</p>
                    </>
                  )}
                  <p className="font-semibold text-slate-700 mb-1">{!clientProfile?.no_fees_applicable ? '6' : '5'}. Acceptance &amp; Consent</p>
                  <p>By proceeding, the Client confirms that the information provided is true and complete, consents to data processing for the agreed services, and agrees to the terms of this Engagement Letter.</p>
                </div>

                {/* Clear agreement checkbox with highlighted box */}
                <div className={`rounded-lg border-2 p-3 transition-colors ${engagementAccepted ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={engagementAccepted} onChange={(e) => setEngagementAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    <div>
                      <span className="text-xs font-semibold text-slate-800 leading-snug block">I have read and understood the Engagement Letter and agree to appoint the Firm for ITR filing services for FY {fy}.</span>
                      {engagementAccepted && <span className="text-[10px] text-emerald-700 font-medium mt-1 block">✓ Agreement accepted</span>}
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenInit(false)}>Cancel</Button>
            <Button onClick={doInitiate} disabled={submitting || !fy || !engagementAccepted} className="bg-indigo-600 hover:bg-indigo-700">
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Accept &amp; Initiate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Initiate Filing Reminder — shows on every reload until a filing exists for the latest FY */}
      <Dialog open={showInitiateReminder} onOpenChange={(o) => setShowInitiateReminder(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-600" /> Time to start your ITR filing</DialogTitle></DialogHeader>
          <div className="py-4 text-center space-y-3">
            <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mx-auto">
              <FileText className="h-7 w-7" />
            </div>
            <p className="text-sm text-slate-600">
              Your onboarding is complete. Initiate your filing for FY {getFYOptions()[0]} to begin sharing documents.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowInitiateReminder(false)}>Later</Button>
            <Button
              onClick={() => {
                setShowInitiateReminder(false);
                setEngagementAccepted(false);
                setFy(getFYOptions()[0]);
                setOpenInit(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Initiate Filing <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Onboarding Dialog */}
      <Dialog open={showOnboarding} onOpenChange={(o) => setShowOnboarding(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-indigo-600" /> Complete Your Onboarding</DialogTitle></DialogHeader>
          <div className="py-4 text-center space-y-3">
            <div className="inline-flex h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 items-center justify-center mx-auto">
              <ClipboardList className="h-7 w-7" />
            </div>
            <p className="text-sm text-slate-600">Please fill in the onboarding form to complete your profile before initiating a filing.</p>
          </div>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setShowOnboarding(false)}>Later</Button>
            <Button onClick={() => { setShowOnboarding(false); router.push('/client/onboarding'); }} className="bg-indigo-600 hover:bg-indigo-700">
              Fill Onboarding Form <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Income Heads Dialog (post-initiation) — mandatory: cannot be dismissed without confirming */}
      <Dialog open={confirmOpen} onOpenChange={() => { /* dismissal locked until Confirm */ }}>
        <DialogContent
          className="sm:max-w-lg max-h-[85vh] overflow-y-auto [&>button]:hidden"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-indigo-600" /> Confirm Your Income Heads
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Tell us which sources of income apply to you for this filing. We&rsquo;ll pre-load the documents you&rsquo;ll need.
            </p>

            {INCOME_HEAD_GROUPS.map((group) => (
              <div key={group.title} className="rounded-xl border border-slate-100 p-3">
                <div className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 mb-2">{group.title}</div>
                <div className="space-y-1.5">
                  {group.keys.map((key) => (
                    <label key={key} className={`flex items-center gap-3 rounded-md px-2.5 py-2 cursor-pointer transition-colors ${incomeHeads[key] ? 'bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        checked={!!incomeHeads[key]}
                        onChange={(e) => setIncomeHeads((prev) => ({ ...prev, [key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-700 flex-1">{INCOME_HEAD_LABELS[key]}</span>
                    </label>
                  ))}
                  {group.keys.includes('any_other') && incomeHeads.any_other && (
                    <Input
                      value={anyOtherText}
                      onChange={(e) => setAnyOtherText(e.target.value)}
                      placeholder="Describe the other income source"
                      className="mt-1.5 text-sm"
                    />
                  )}
                </div>
              </div>
            ))}

            {previewCount !== null && (
              <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 flex items-center gap-2 text-sm text-indigo-800">
                <FileText className="h-4 w-4 text-indigo-600" />
                {previewCount === 0 ? (
                  <span>Select at least one head to see required documents.</span>
                ) : (
                  <span><strong>{previewCount}</strong> document{previewCount === 1 ? '' : 's'} will be requested based on your selection.</span>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={submitIncomeHeads}
              disabled={confirmSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {confirmSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilingCard({ filing, onClick }: { filing: any; onClick: () => void }) {
  const state = filing.status || filing.current_state;
  const progress = filing.progress_percentage || 0;
  const docsApproved = filing.documents_approved || 0;
  const docsTotal = filing.documents_total || 0;
  const lastUpdated = filing.last_updated ? new Date(filing.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const stateColors: Record<string, string> = {
    INITIATED: 'border-slate-200 bg-slate-50/80',
    DOCUMENT_UPLOAD: 'border-blue-200 bg-blue-50/50',
    PROCESSING: 'border-indigo-200 bg-indigo-50/50',
    COMPUTATION: 'border-violet-200 bg-violet-50/50',
    FILING: 'border-orange-200 bg-orange-50/50',
    PAYMENT: 'border-amber-200 bg-amber-50/50',
    COMPLETED: 'border-emerald-200 bg-emerald-50/50',
    HALTED: 'border-rose-200 bg-rose-50/50',
  };

  return (
    <div
      className={`rounded-xl border-2 ${stateColors[state] || 'border-slate-200 bg-white'} p-5 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all group`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">ITR {filing.financial_year}</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">{lastUpdated}</p>
          </div>
        </div>
        <StatusBadge status={state} size="sm" />
      </div>

      <div className="mt-4">
        {state === 'COMPLETED' ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Filing completed</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
              <span>{progress}% complete</span>
              {docsTotal > 0 && <span>{docsApproved}/{docsTotal} docs</span>}
            </div>
            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${state === 'HALTED' ? 'bg-rose-400' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>

      <div className="mt-3 text-[11px] text-slate-500">
        {state === 'HALTED' && <span className="text-rose-600 font-medium">Filing halted by CA</span>}
        {state === 'COMPUTATION' && <span className="text-violet-600 font-medium">Review computation</span>}
        {state === 'DOCUMENT_UPLOAD' && <span className="text-blue-600 font-medium">Upload documents</span>}
        {state === 'COMPLETED' && <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 className="h-3 w-3" /> Filed</span>}
        {state === 'PROCESSING' && <span className="text-indigo-600 font-medium">CA reviewing</span>}
        {state === 'INITIATED' && <span className="text-slate-600 font-medium">Awaiting checklist</span>}
      </div>
    </div>
  );
}


