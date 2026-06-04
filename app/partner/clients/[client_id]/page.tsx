// @ts-nocheck
'use client';
import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileViewer } from '@/components/shared/FileViewer';
import { getClient, listFilings, filingDocs, initiateFiling, transitionFiling, markPayment, moveToComputation, approveDoc, rejectDoc, deleteDoc, listDocTypes, assignDocs, compForFiling, compUploadUrl, compConfirm, compDownloadUrl, completedDocs, completedDocUploadUrl, completedDocConfirm, storageDownloadUrl, docDownloadUrl, getClientOnboardingForm, getOnboardingFiles, managerApproveComp, managerRejectComp, partnerApproveComp, partnerRejectComp, listManagers, listExecutives, assignExecutive, assignClientToManager, getMyTeam, getManagerTeam, getManagerClients, setClientFee, updateFilingFee, otherDocUploadUrl, otherDocConfirm, listOtherDocs, deleteOtherDoc } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { toast } from 'sonner';
import { Mail, Phone, FileText, FolderUp, Plus, Check, X, Loader2, Send, FileCheck, Upload, Download, Eye, Calculator, RefreshCw, FileArchive, CheckCircle2, ChevronDown, Clock, IndianRupee, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FILING_STAGES = ['INITIATED', 'DOCUMENT_UPLOAD', 'PROCESSING', 'COMPUTATION', 'FILING', 'PAYMENT', 'COMPLETED'];
function getFilingPercent(status: string): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'HALTED') return 0;
  const idx = FILING_STAGES.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / FILING_STAGES.length) * 100);
}

export default function ClientDetailPage() {
  const { client_id } = useParams<{ client_id: string }>();
  const pathname = usePathname();
  const isPartner = pathname.startsWith('/partner');
  const isManager = pathname.startsWith('/manager');
  const isExecutive = pathname.startsWith('/executive');
  const [client, setClient] = useState<any>(null);
  const [filings, setFilings] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [docGroups, setDocGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const [managers, setManagers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [clientManagerId, setClientManagerId] = useState<string | null>(null);

  const [onboardingFields, setOnboardingFields] = useState<any[]>([]);
  const [onboardingValues, setOnboardingValues] = useState<Record<string, any>>({});
  const [onboardingFiles, setOnboardingFiles] = useState<any[]>([]);
  const [docViewerOpen, setDocViewerOpen] = useState(false);
  const [docViewerUrl, setDocViewerUrl] = useState<string | null>(null);
  const [docViewerName, setDocViewerName] = useState<string | undefined>(undefined);

  const viewDoc = async (docId: string, filename?: string) => {
    try {
      const r = await docDownloadUrl(docId);
      setDocViewerUrl(r.download_url || r.url);
      setDocViewerName(filename || undefined);
      setDocViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const c = await getClient(client_id);
      setClient(c);
      const f = await listFilings({ client_id });
      const list = f?.items || f?.filings || f || [];
      setFilings(list);
      // load onboarding form
      try {
        const form = await getClientOnboardingForm(client_id);
        setOnboardingFields(form?.fields || []);
        if (form?.submitted_data) setOnboardingValues(form.submitted_data);
      } catch {}
      // load onboarding files
      try {
        const files = await getOnboardingFiles(client_id);
        setOnboardingFiles(files || []);
      } catch {}
      // load docs for each
      for (const fi of list) {
        try {
          const d = await filingDocs(fi.id);
          setDocs((prev) => ({ ...prev, [fi.id]: d?.items || d?.documents || d || [] }));
          setDocGroups((prev) => ({ ...prev, [fi.id]: d?.groups || [] }));
        } catch {}
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [client_id]);

  // Load managers/executives for assignment dropdowns
  useEffect(() => {
    if (isPartner) {
      listManagers().then(async (r) => {
        const mgrList = r?.items || r?.managers || r || [];
        setManagers(mgrList);
        // Find which manager owns this client and load that manager's team
        for (const m of mgrList) {
          try {
            const res = await getManagerClients(m.id, { page: 1, page_size: 100 });
            const items = res?.items || [];
            if (items.some((c: any) => c.id === client_id)) {
              setClientManagerId(m.id);
              // Load executives from this manager's team only
              const team = await getManagerTeam(m.id).catch(() => null);
              if (team?.executives) setExecutives(team.executives);
              break;
            }
          } catch {}
        }
      }).catch(() => {});
    } else if (isManager) {
      getMyTeam().then((r) => setExecutives(r?.executives || [])).catch(() => {});
    }
  }, [isPartner, isManager, client_id]);

  const onAssignManager = async (manager_id: string) => {
    try {
      await assignClientToManager(manager_id, client_id);
      setClientManagerId(manager_id);
      // Refresh executives list to match new manager's team
      const team = await getManagerTeam(manager_id).catch(() => null);
      if (team?.executives) setExecutives(team.executives);
      else setExecutives([]);
      toast.success('Manager assigned');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to assign manager'); }
  };

  const onAssignExecutive = async (executive_id: string) => {
    try {
      await assignExecutive(client_id, executive_id);
      toast.success('Executive assigned');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to assign executive'); }
  };

  const initials = (client?.full_name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  const doInitiate = async () => {
    try { await initiateFiling({ financial_year: getCurrentFY() }); toast.success('Filing initiated'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };



  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!client) return <EmptyState title="Client not found" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left */}
      <div className="lg:col-span-2 space-y-5">
        <Card className="rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-lg font-bold">{initials}</div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">{client.full_name}</h2>
              <StatusBadge status={client.account_status} />
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4" /> {client.email}</div>
            {client.phone_number && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4" /> {client.phone_number}</div>}
          </div>
          {/* Professional Fee (Partner only) */}
          {isPartner && (
            <ProfessionalFeeSection clientId={client_id} currentFee={client.professional_fee} onUpdated={load} />
          )}
          <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
            {isPartner && (
              <div>
                <div className="text-xs uppercase text-slate-400 font-semibold mb-2">Assigned Manager</div>
                <Select value={clientManagerId || ''} onValueChange={(v) => onAssignManager(v)}>
                  <SelectTrigger className={`h-9 w-full text-sm ${clientManagerId ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.filter((m) => m.is_active !== false).map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name || m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <div className="text-xs uppercase text-slate-400 font-semibold mb-2">Assigned Executive</div>
              {(isPartner || isManager) ? (
                <Select value={client.assigned_executive_id || ''} onValueChange={(v) => onAssignExecutive(v)}>
                  <SelectTrigger className={`h-9 w-full text-sm ${client.assigned_executive_id ? 'border-slate-200' : 'border-amber-300 bg-amber-50 text-amber-700'}`}>
                    <SelectValue placeholder="Select Executive" />
                  </SelectTrigger>
                  <SelectContent>
                    {executives.filter((e) => e.is_active !== false).map((e) => (
                      <SelectItem key={e.executive_id || e.id} value={e.executive_id || e.id}>{e.executive_name || e.full_name || e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="text-sm font-medium text-slate-800">{client.assigned_executive_name || client.executive_name || 'Unassigned'}</div>
              )}
            </div>
          </div>
          {client.pan_document_url && (
            <Button variant="outline" className="mt-5 w-full" onClick={() => window.open(client.pan_document_url, '_blank')}><FileText className="h-4 w-4 mr-2" /> View PAN Document</Button>
          )}
        </Card>

        {/* Onboarding Profile Section */}
        {onboardingFields.length > 0 && (
          <Card className="rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4">Onboarding Profile</h3>
            <div className="space-y-3">
              {onboardingFields.map((f: any) => {
                const val = onboardingValues[f.field_key];
                const fileInfo = f.field_type === 'FILE' ? onboardingFiles.find((of: any) => of.field_key === f.field_key) : null;
                const resolvedFileId = fileInfo ? (fileInfo.id || fileInfo.file_id || fileInfo.stored_file_id) : val;
                const resolvedFileName = fileInfo ? (fileInfo.original_filename || fileInfo.filename) : onboardingValues[`${f.field_key}__filename`];
                return (
                  <div key={f.id}>
                    <div className="text-xs text-slate-500 font-medium">{f.field_label}</div>
                    {f.field_type === 'FILE' ? (
                      <OnboardingFileDisplay fileId={resolvedFileId} fileName={resolvedFileName} />
                    ) : (
                      <div className="text-sm text-slate-900 mt-0.5">{val || <span className="text-slate-400 italic">Not provided</span>}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Income Heads Section */}
        {client.income_heads && (
          <Card className="rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-4">Income Sources</h3>
            <IncomeHeadsDisplay incomeHeads={client.income_heads} />
          </Card>
        )}
      </div>

      {/* Right */}
      <div className="lg:col-span-3 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Filings &amp; Documents</h2>
          {client.account_status === 'ACTIVE' && <Button onClick={doInitiate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate New Filing</Button>}
        </div>
        {filings.length === 0 ? (
          <Card className="rounded-xl"><EmptyState icon={FolderUp} title="No filings yet" subtitle="Initiate the first filing for this client." /></Card>
        ) : (
          <Card className="rounded-xl overflow-hidden">
            <div className="max-h-[calc(100vh-140px)] overflow-y-auto divide-y divide-slate-100">
              {filings.map((f: any) => (
                <FilingAccordionItem key={f.id} filing={f} docs={docs} docGroups={docGroups} load={load} viewDoc={viewDoc} isExecutive={isExecutive} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <FileViewer open={docViewerOpen} onClose={() => setDocViewerOpen(false)} fileUrl={docViewerUrl} fileName={docViewerName} />
    </div>
  );
}

function FilingAccordionItem({ filing: f, docs, docGroups, load, viewDoc, isExecutive = false }: { filing: any; docs: Record<string, any[]>; docGroups: Record<string, any[]>; load: () => void; viewDoc: (id: string, name?: string) => void; isExecutive?: boolean }) {
  const storageKey = `filing-accordion-${f.id}`;
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(storageKey) === '1';
  });
  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) localStorage.setItem(storageKey, '1');
    else localStorage.removeItem(storageKey);
  };
  const [rejectDocFor, setRejectDocFor] = useState<any>(null);
  const [rejectDocReason, setRejectDocReason] = useState('');
  const [acting, setActing] = useState(false);
  const status = f.status || f.current_state;
  const percent = getFilingPercent(status);

  const statusColor = status === 'COMPLETED' ? 'bg-emerald-500' : status === 'HALTED' ? 'bg-rose-500' : 'bg-indigo-500';

  return (
    <>
      <div className="group">
        {/* Collapsed Header */}
        <button
          onClick={toggleOpen}
          className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50/80 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-slate-900 text-sm">FY {f.financial_year}</h3>
              <StatusBadge status={status} size="sm" />
            </div>
            {/* Progress bar or completed indicator */}
            {status === 'COMPLETED' ? (
              <div className="mt-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Filing completed</span>
                {f.completed_at && <span className="text-[10px] text-slate-400 ml-auto">{new Date(f.completed_at).toLocaleDateString()}</span>}
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-3">
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${statusColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-slate-500 w-9 text-right">{percent}%</span>
              </div>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Expanded Content */}
        {open && (
          <div className="px-5 pb-5 pt-1 border-t border-slate-100 bg-slate-50/30">
            {status === 'COMPLETED' ? (
              <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-emerald-800">Filing Completed</div>
                  <div className="text-xs text-emerald-600 mt-0.5">All stages finished{f.completed_at ? ` on ${new Date(f.completed_at).toLocaleDateString()}` : ''}</div>
                </div>
              </div>
            ) : (
              <div className="mt-3"><FilingProgressBar currentState={status} /></div>
            )}
            <Tabs defaultValue="docs" className="mt-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <TabsList>
                  <TabsTrigger value="docs">Documents</TabsTrigger>
                  <TabsTrigger value="computations">Computations</TabsTrigger>
                  <TabsTrigger value="filed-docs">Filed Docs</TabsTrigger>
                </TabsList>
                {status === 'PAYMENT' && !isExecutive && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={async () => { try { await markPayment(f.id); toast.success('Payment received — filing completed!'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } }}
                  >
                    Mark Payment Received
                  </Button>
                )}
              </div>
              <TabsContent value="docs" className="mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Documents</span>
                    {f.status !== 'COMPLETED' && f.status !== 'HALTED' && (
                      <AssignChecklistButton filingId={f.id} existingDocTypeNames={(docs[f.id] || []).map((d: any) => d.document_type_name)} onAssigned={load} />
                    )}
                  </div>
                  {(docs[f.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No documents assigned yet. Send a checklist to the client.</p>
                  ) : (docGroups[f.id] || []).length > 0 ? (
                    <div className="space-y-3">
                      {(docGroups[f.id]).map((group: any) => (
                        <div key={group.document_type_id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                            <FileText className="h-3.5 w-3.5 text-indigo-500" />
                            <span className="text-xs font-semibold text-slate-700">{group.document_type_name}</span>
                            <span className="text-[10px] text-slate-400">({group.files.length} file{group.files.length !== 1 ? 's' : ''})</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {group.files.map((d: any) => (
                              <div key={d.id} className="flex items-center justify-between gap-3 p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-800 truncate">{d.original_filename || group.document_type_name}</div>
                                    {d.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(d.uploaded_at).toLocaleDateString()}</div>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={d.status} size="sm" />
                                  {d.status !== 'PENDING_UPLOAD' && (
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={() => viewDoc(d.id, d.original_filename)}>
                                      <Eye className="h-3 w-3 mr-1" /> View
                                    </Button>
                                  )}
                                  {d.status === 'UPLOADED' && (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={async () => { try { await approveDoc([d.id]); toast.success('Approved'); load(); } catch { toast.error('Failed'); } }}><Check className="h-3 w-3" /></Button>
                                      <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-200" onClick={() => { setRejectDocFor(d); setRejectDocReason(''); }}><X className="h-3 w-3" /></Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (docs[f.id] || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{d.document_type_name || d.original_filename}</div>
                          {d.original_filename && <div className="text-xs text-slate-500 truncate">{d.original_filename}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} size="sm" />
                        {d.status !== 'PENDING_UPLOAD' && (
                          <Button size="sm" variant="outline" className="h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={() => viewDoc(d.id, d.original_filename)}>
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                        )}
                        {d.status === 'UPLOADED' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={async () => { try { await approveDoc([d.id]); toast.success('Approved'); load(); } catch { toast.error('Failed'); } }}><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-200" onClick={() => { setRejectDocFor(d); setRejectDocReason(''); }}><X className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Move to Computation — shown when all docs are uploaded/approved */}
                  {(docs[f.id] || []).length > 0 && (docs[f.id] || []).every((d: any) => d.status === 'APPROVED') && (status === 'PROCESSING' || status === 'DOCUMENT_UPLOAD') && (
                    <MoveToComputationButton filingId={f.id} onMoved={load} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="computations" className="mt-3">
                <ComputationPanel filingId={f.id} filingStatus={status} filing={f} />
              </TabsContent>
              <TabsContent value="filed-docs" className="mt-3">
                <FiledDocsPanel filingId={f.id} filingStatus={status} onMoveToPayment={status === 'FILING' ? async () => { try { await transitionFiling(f.id, { to_status: 'PAYMENT' }); toast.success('Moved to Payment'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } } : undefined} />
              </TabsContent>
            </Tabs>

            {/* State actions + Fee — always visible below tabs */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <StateActions filing={f} onChange={load} isExecutive={isExecutive} />
              <FilingFeeUpdate filing={f} onUpdated={load} />
            </div>
          </div>
        )}
      </div>

      {/* Reject Document Dialog (scoped to this accordion item) */}
      <Dialog open={!!rejectDocFor} onOpenChange={(o) => { if (!o) { setRejectDocFor(null); setRejectDocReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-rose-700">Reject Document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Document</div>
              <div className="text-sm font-medium text-slate-900 mt-0.5">{rejectDocFor?.document_type_name || rejectDocFor?.original_filename || 'Document'}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Reason for rejection <span className="text-rose-500">*</span></Label>
              <Textarea value={rejectDocReason} onChange={(e) => setRejectDocReason(e.target.value)} placeholder="Describe why this document is being rejected…" rows={4} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDocFor(null); setRejectDocReason(''); }}>Cancel</Button>
            <Button
              disabled={acting || !rejectDocReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                setActing(true);
                try {
                  await rejectDoc([{ document_id: rejectDocFor.id, reason: rejectDocReason.trim() }]);
                  toast.success('Document rejected');
                  setRejectDocFor(null); setRejectDocReason(''); load();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
                finally { setActing(false); }
              }}
            >
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MoveToComputationButton({ filingId, onMoved }: { filingId: string; onMoved: () => void }) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moving, setMoving] = useState(false);

  const doMoveToComputation = async () => {
    setMoving(true);
    try {
      await moveToComputation(filingId);
      toast.success('Moved to Computation stage');
      setShowMoveDialog(false);
      onMoved();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to move to computation'); }
    finally { setMoving(false); }
  };

  return (
    <>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mt-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">All documents approved</span>
        </div>
        <p className="text-xs text-emerald-700 mb-3">You can proceed to the Computation stage. You may still assign new documents before moving.</p>
        <Button onClick={() => setShowMoveDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Calculator className="h-4 w-4 mr-2" /> Move to Computation
        </Button>
      </div>

      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-indigo-600" /> Move to Computation</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">All documents have been approved. Are you sure you want to move this filing to the Computation stage?</p>
          <p className="text-xs text-slate-500 mt-1">The client will be notified that the documents phase is complete and computation will be prepared.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>Cancel</Button>
            <Button onClick={doMoveToComputation} disabled={moving} className="bg-indigo-600 hover:bg-indigo-700">
              {moving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Confirm Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StateActions({ filing, onChange, isExecutive = false }: { filing: any; onChange: () => void; isExecutive?: boolean }) {
  const state = filing.status || filing.current_state;

  const tx = async (target: string) => {
    try { await transitionFiling(filing.id, { to_status: target }); toast.success(`Moved to ${target}`); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const doMarkPayment = async () => {
    try { await markPayment(filing.id); toast.success('Payment received — filing completed!'); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const items: { label: string; target: string; cls?: string; action?: () => void; disabled?: boolean; tooltip?: string }[] = [];
  if (state === 'INITIATED') items.push({ label: 'Move to Document Upload', target: 'DOCUMENT_UPLOAD' });
  if (state === 'COMPUTATION') items.push({ label: 'Send back to Processing', target: 'PROCESSING', cls: 'bg-amber-600 hover:bg-amber-700' });
  if (state === 'COMPUTATION') {
    const canMoveToFiling = filing.is_tax_paid === true;
    items.push({
      label: canMoveToFiling ? 'Move to Filing' : 'Move to Filing (Tax Payment Pending)',
      target: 'FILING',
      disabled: !canMoveToFiling,
      tooltip: !canMoveToFiling ? 'Client must confirm tax payment before transitioning to Filing' : undefined,
    });
  }
  if (state === 'PAYMENT' && !isExecutive) items.push({ label: 'Mark Payment Received', target: 'COMPLETED', cls: 'bg-emerald-600 hover:bg-emerald-700', action: doMarkPayment });

  return (
    <div className="space-y-3">
      {/* Tax Payment Status indicator in COMPUTATION state */}
      {state === 'COMPUTATION' && (
        <div className={`rounded-lg p-3 flex items-center gap-3 ${filing.is_tax_paid ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'}`}>
          {filing.is_tax_paid ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-emerald-800">Tax Payment Confirmed</div>
                {filing.tax_paid_at && <div className="text-xs text-emerald-600">Confirmed on {new Date(filing.tax_paid_at).toLocaleDateString('en-IN')}</div>}
              </div>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-amber-800">Awaiting Tax Payment Confirmation</div>
                <div className="text-xs text-amber-600">Client has not yet confirmed tax payment. Cannot advance to Filing.</div>
              </div>
            </>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && <p className="text-sm text-slate-500">No state actions available.</p>}
        {items.map((it) => (
          <div key={it.target} className="relative group">
            <Button
              onClick={() => it.action ? it.action() : tx(it.target)}
              className={it.cls || 'bg-indigo-600 hover:bg-indigo-700'}
              disabled={it.disabled}
            >
              {it.label}
            </Button>
            {it.tooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg z-10">
                {it.tooltip}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AssignChecklistButton({ filingId, existingDocTypeNames, onAssigned }: { filingId: string; existingDocTypeNames: string[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    try {
      const r = await listDocTypes(false);
      const types = r?.items ?? r ?? [];
      setDocTypes(types);
      // Pre-select mandatory ones that aren't already assigned
      const mandatory = types.filter((t: any) => t.is_mandatory && !existingDocTypeNames.includes(t.name)).map((t: any) => t.id);
      setSelected(mandatory);
    } catch { toast.error('Failed to load document types'); }
  };

  const toggle = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const send = async () => {
    if (selected.length === 0) { toast.error('Select at least one document type'); return; }
    setSending(true);
    try {
      await assignDocs(filingId, selected);
      toast.success('Document checklist sent to client');
      setOpen(false);
      setSelected([]);
      onAssigned();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to assign'); }
    finally { setSending(false); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog} className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">
        <Send className="h-3.5 w-3.5 mr-1" /> Send Checklist
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-indigo-600" /> Send Document Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Select document types to assign to this filing. The client will be notified to upload these.</p>
          {docTypes.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No document types available. Create them in Document Checklist page first.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {docTypes.map((t: any) => {
                const alreadyAssigned = existingDocTypeNames.includes(t.name);
                return (
                  <label key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${alreadyAssigned ? 'border-slate-100 bg-slate-50 opacity-50' : selected.includes(t.id) ? 'border-indigo-300 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <Checkbox
                      checked={selected.includes(t.id)}
                      onCheckedChange={() => toggle(t.id)}
                      disabled={alreadyAssigned}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900">{t.name}</div>
                      {t.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</div>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {t.is_mandatory && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">REQUIRED</span>}
                      {alreadyAssigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">ASSIGNED</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending || selected.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send {selected.length > 0 ? `(${selected.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComputationPanel({ filingId, filingStatus, filing }: { filingId: string; filingStatus: string; filing?: any }) {
  const [computations, setComputations] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [rejectingComp, setRejectingComp] = useState<any>(null);
  const [rejectCompReason, setRejectCompReason] = useState('');
  const userRole = typeof window !== 'undefined' ? getUser()?.role?.toUpperCase() : '';

  const load = async () => {
    setLoading(true);
    try {
      const r = await compForFiling(filingId);
      setComputations(r?.items || []);
      setCurrentVersion(r?.current_version || null);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filingId]);

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'].includes(ext)) { toast.error('Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(true);
    try {
      const urlRes = await compUploadUrl({ filing_id: filingId, filename: file.name, content_type: file.type });
      // Upload to presigned URL
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, file, { headers: { 'Content-Type': file.type } });
      // Confirm upload
      await compConfirm({ filing_id: filingId, object_key: urlRes.object_key, filename: file.name, content_type: file.type, file_size: file.size, version: urlRes.version });
      toast.success(`Computation v${urlRes.version} uploaded successfully`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const download = async (compId: string) => {
    try {
      const r = await compDownloadUrl(compId);
      setViewerUrl(r.download_url || r.url);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const canUpload = ['COMPUTATION', 'PROCESSING'].includes(filingStatus);
  const latestRejected = currentVersion?.status === 'REJECTED';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">Tax Computations</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
          {canUpload && !pendingFile && (
            <>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700" onClick={() => document.getElementById(`comp-upload-${filingId}`)?.click()}>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {latestRejected ? 'Choose New Version' : 'Choose File'}
              </Button>
              <input id={`comp-upload-${filingId}`} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} />
              <p className="text-xs text-slate-400 mt-1">Allowed file types: PDF, Word, Excel, CSV, PNG, JPG</p>
            </>
          )}
          {pendingFile && (
            <>
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 truncate max-w-[160px]">{pendingFile.name}</span>
              <Button size="sm" variant="ghost" className="h-7 px-1 text-rose-500" onClick={() => setPendingFile(null)}>✕</Button>
              <Button size="sm" className="relative overflow-visible bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md" disabled={uploading} onClick={() => { handleUpload(pendingFile); setPendingFile(null); }}>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg animate-bounce pointer-events-none">
                  Click to confirm your upload
                  <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
                </span>
                {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                Confirm Upload
              </Button>
            </>
          )}
        </div>
      </div>

      {computations.length === 0 ? (
        <div className="text-center py-6">
          <Calculator className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No computations uploaded yet.</p>
          {canUpload && <p className="text-xs text-slate-400 mt-1">Upload the tax computation for client review.</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {computations.sort((a: any, b: any) => b.version - a.version).map((c: any) => (
            <div key={c.id} className={`p-3 rounded-lg border ${c.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50/40' : c.status === 'REJECTED' ? 'border-rose-200 bg-rose-50/40' : c.status === 'SUPERSEDED' ? 'border-slate-200 bg-slate-50/60 opacity-60' : 'border-indigo-200 bg-indigo-50/40'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calculator className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      Version {c.version}
                      {currentVersion?.id === c.id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">CURRENT</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.original_filename || 'computation.pdf'} · uploaded by {c.uploaded_by_name || 'Unknown'}
                    </div>
                    {c.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(c.uploaded_at).toLocaleDateString()} {new Date(c.uploaded_at).toLocaleTimeString()}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={c.status} size="sm" />
                  <Button size="sm" variant="ghost" onClick={() => download(c.id)}><Eye className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {c.status === 'REJECTED' && c.rejection_reason && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-100 rounded px-2 py-1.5">
                  <span className="font-semibold">Rejection reason:</span> {c.rejection_reason}
                </div>
              )}
              {c.status === 'MANAGER_REJECTED' && c.rejection_reason && (
                <div className="mt-2 text-xs text-rose-700 bg-rose-100 rounded px-2 py-1.5">
                  <span className="font-semibold">Manager rejected:</span> {c.rejection_reason}
                </div>
              )}
              {c.status === 'MANAGER_APPROVED' && (
                <div className="mt-1 text-[10px] text-violet-700">Manager approved{c.manager_approved_at ? ` on ${new Date(c.manager_approved_at).toLocaleDateString()}` : ''}</div>
              )}
              {c.status === 'PARTNER_APPROVED' && (
                <div className="mt-1 text-[10px] text-indigo-700">Partner approved{c.partner_approved_at ? ` on ${new Date(c.partner_approved_at).toLocaleDateString()}` : ''}</div>
              )}
              {c.status === 'APPROVED' && c.approved_at && (
                <div className="mt-1 text-[10px] text-emerald-700">Approved on {new Date(c.approved_at).toLocaleDateString()}</div>
              )}
              {/* Multi-step approval buttons */}
              {c.status === 'UPLOADED' && userRole === 'MANAGER' && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-xs h-7" disabled={approving === c.id} onClick={async () => {
                    setApproving(c.id);
                    try { await managerApproveComp(c.id); toast.success('Computation approved (Manager)'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setApproving(null); }
                  }}>
                    {approving === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />} Manager Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 text-xs h-7" onClick={() => { setRejectingComp(c); setRejectCompReason(''); }}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
              {(c.status === 'UPLOADED' || c.status === 'MANAGER_APPROVED') && userRole === 'PARTNER' && (
                <div className="mt-2 flex items-center gap-2">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" disabled={approving === c.id} onClick={async () => {
                    setApproving(c.id);
                    try { await partnerApproveComp(c.id); toast.success('Computation approved (Partner)'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setApproving(null); }
                  }}>
                    {approving === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />} Partner Approve
                  </Button>
                  <Button size="sm" variant="outline" className="text-rose-700 border-rose-200 text-xs h-7" onClick={() => { setRejectingComp(c); setRejectCompReason(''); }}>
                    <X className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}



      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={undefined} />

      {/* Manager Reject Computation Dialog */}
      <Dialog open={!!rejectingComp} onOpenChange={(o) => { if (!o) { setRejectingComp(null); setRejectCompReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-rose-700">Reject Computation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Computation</div>
              <div className="text-sm font-medium text-slate-900 mt-0.5">Version {rejectingComp?.version} — {rejectingComp?.original_filename || 'computation'}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Reason for rejection <span className="text-rose-500">*</span></Label>
              <Textarea value={rejectCompReason} onChange={(e) => setRejectCompReason(e.target.value)} placeholder="Describe why this computation is being rejected…" rows={4} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingComp(null); setRejectCompReason(''); }}>Cancel</Button>
            <Button
              disabled={approving === rejectingComp?.id || !rejectCompReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                setApproving(rejectingComp?.id);
                try {
                  if (userRole === 'PARTNER') {
                    await partnerRejectComp(rejectingComp.id, rejectCompReason.trim());
                  } else {
                    await managerRejectComp(rejectingComp.id, rejectCompReason.trim());
                  }
                  toast.success('Computation rejected');
                  setRejectingComp(null); setRejectCompReason(''); load();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
                finally { setApproving(null); }
              }}
            >
              {approving === rejectingComp?.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Reject Computation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const COMPLETED_DOC_TYPES = [
  { key: 'ITR_ACKNOWLEDGEMENT', label: 'ITR Acknowledgement', description: 'PDF acknowledgement from ITR portal', required: true },
  { key: 'INVOICE', label: 'Invoice', description: 'Service invoice for the client', required: true },
  { key: 'ITR_JSON', label: 'ITR JSON', description: 'ITR JSON file submitted to portal', required: true },
  { key: 'ITR_FORM', label: 'ITR Form', description: 'ITR form filed with the department', required: true },
  { key: 'TAX_PAID_COMPUTATION', label: 'Tax Paid Computation', description: 'Computation document with tax payment proof', required: true },
  { key: 'FINANCIAL_STATEMENT', label: 'Financial Statement', description: 'Financial statement document (optional)', required: false },
];

function FiledDocsPanel({ filingId, filingStatus, onMoveToPayment }: { filingId: string; filingStatus: string; onMoveToPayment?: () => Promise<void> }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const load = async () => {
    setLoading(true);
    try {
      const r = await completedDocs(filingId);
      setDocs(r || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filingId]);

  const canUpload = ['FILING', 'PAYMENT', 'COMPLETED'].includes(filingStatus);

  const handleUpload = async (docType: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    const allowedExts = docType === 'ITR_JSON' ? ['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg','json'] : ['pdf','doc','docx','xls','xlsx','csv','png','jpg','jpeg'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowedExts.includes(ext)) { toast.error(docType === 'ITR_JSON' ? 'Allowed types: PDF, Word, Excel, CSV, PNG, JPG, JSON' : 'Allowed types: PDF, Word, Excel, CSV, PNG, JPG'); return; }
    setUploading(docType);
    try {
      const urlRes = await completedDocUploadUrl({ filing_id: filingId, doc_type: docType, filename: file.name, content_type: file.type });
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, file, { headers: { 'Content-Type': file.type } });
      await completedDocConfirm({ filing_id: filingId, doc_type: docType, object_key: urlRes.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success(`${COMPLETED_DOC_TYPES.find(d => d.key === docType)?.label} uploaded`);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(null); }
  };

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const download = async (fileId: string) => {
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.url || r.download_url);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const getUploadedDoc = (docType: string) => docs.find((d: any) => d.doc_type === docType);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">ITR Filed Documents</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>

      {!canUpload ? (
        <div className="text-center py-6">
          <FileArchive className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Filing documents can be uploaded once the filing reaches the FILING stage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {COMPLETED_DOC_TYPES.map((dt) => {
            const uploaded = getUploadedDoc(dt.key);
            const isUploading = uploading === dt.key;

            if (uploaded) {
              const pending = pendingFiles[dt.key];
              return (
                <div key={dt.key} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileArchive className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900">{dt.label} {!dt.required && <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>}</div>
                        <div className="text-xs text-slate-500 truncate">{uploaded.original_filename || uploaded.filename}</div>
                        {uploaded.uploaded_at && <div className="text-[10px] text-slate-400">{new Date(uploaded.uploaded_at).toLocaleDateString()}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">UPLOADED</span>
                      <Button size="sm" variant="ghost" onClick={() => download(uploaded.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      {/* Allow re-upload */}
                      <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => document.getElementById(`filed-${filingId}-${dt.key}`)?.click()}>
                        <Upload className="h-3.5 w-3.5" />
                      </Button>
                      <input id={`filed-${filingId}-${dt.key}`} type="file" hidden accept=".pdf,.json,.xlsx,.xls,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFiles(prev => ({ ...prev, [dt.key]: f })); e.target.value = ''; }} />
                    </div>
                  </div>
                  {pending && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 truncate flex-1">{pending.name}</span>
                      <Button size="sm" variant="ghost" className="h-6 px-1 text-rose-500" onClick={() => setPendingFiles(prev => { const n = { ...prev }; delete n[dt.key]; return n; })}>✕</Button>
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" disabled={isUploading} onClick={() => { handleUpload(dt.key, pending); setPendingFiles(prev => { const n = { ...prev }; delete n[dt.key]; return n; }); }}>
                        {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                        Confirm
                      </Button>
                    </div>
                  )}
                </div>
              );
            }

            const pending = pendingFiles[dt.key];
            return (
              <div key={dt.key} className="p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileArchive className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900">{dt.label} {!dt.required && <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>}</div>
                      <div className="text-xs text-slate-400">{dt.description}</div>
                    </div>
                  </div>
                  {!pending && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => document.getElementById(`filed-${filingId}-${dt.key}`)?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1" />
                        Choose File
                      </Button>
                      <input id={`filed-${filingId}-${dt.key}`} type="file" hidden accept=".pdf,.json,.xlsx,.xls,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFiles(prev => ({ ...prev, [dt.key]: f })); e.target.value = ''; }} />
                      <p className="text-xs text-slate-400 mt-1">Allowed file types: PDF, JSON, Word, Excel</p>
                    </>
                  )}
                </div>
                {pending && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 truncate flex-1">{pending.name}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-1 text-rose-500" onClick={() => setPendingFiles(prev => { const n = { ...prev }; delete n[dt.key]; return n; })}>✕</Button>
                    <Button size="sm" className="relative overflow-visible bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md text-xs h-7" disabled={isUploading} onClick={() => { handleUpload(dt.key, pending); setPendingFiles(prev => { const n = { ...prev }; delete n[dt.key]; return n; }); }}>
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg animate-bounce pointer-events-none">
                        Click to confirm your upload
                        <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
                      </span>
                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                      Confirm Upload
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {docs.length >= COMPLETED_DOC_TYPES.filter(d => d.required).length && COMPLETED_DOC_TYPES.filter(d => d.required).every(dt => docs.some((d: any) => d.doc_type === dt.key)) && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 text-center">
              ✅ All required filed documents uploaded. You can now mark payment and complete the filing.
            </div>
          )}

          {/* Other Documents Section */}
          <OtherDocsSection filingId={filingId} filingStatus={filingStatus} viewDoc={(url: string) => { setViewerUrl(url); setViewerOpen(true); }} />

          {/* Move to Payment button at the end of filed docs */}
          {onMoveToPayment && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button onClick={onMoveToPayment} className="w-full bg-indigo-600 hover:bg-indigo-700">
                Move to Payment
              </Button>
            </div>
          )}
        </div>
      )}

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={undefined} />
    </div>
  );
}

function OtherDocsSection({ filingId, filingStatus, viewDoc }: { filingId: string; filingStatus: string; viewDoc: (url: string) => void }) {
  const pathname = usePathname();
  const isClient = pathname.startsWith('/client');
  const canManage = !isClient; // Executive, Manager, Partner can upload/delete

  const [otherDocs, setOtherDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');

  // Client can only see other docs after COMPLETED
  const clientCanView = filingStatus === 'COMPLETED';
  if (isClient && !clientCanView) return null;

  const load = async () => {
    setLoading(true);
    try {
      const r = await listOtherDocs(filingId);
      setOtherDocs(r || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filingId]);

  const handleUpload = async () => {
    if (!pendingFile) return;
    if (pendingFile.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    setUploading(true);
    try {
      const params: any = { filing_id: filingId, filename: pendingFile.name, content_type: pendingFile.type };
      if (pendingLabel.trim()) params.label = pendingLabel.trim();
      const urlRes = await otherDocUploadUrl(params);
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, pendingFile, { headers: { 'Content-Type': pendingFile.type } });
      await otherDocConfirm({ filing_id: filingId, object_key: urlRes.object_key, filename: pendingFile.name, content_type: pendingFile.type, file_size: pendingFile.size, ...(pendingLabel.trim() ? { label: pendingLabel.trim() } : {}) });
      toast.success('Document uploaded');
      setPendingFile(null);
      setPendingLabel('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteOtherDoc(docId);
      toast.success('Document removed');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  const handleView = async (fileId: string) => {
    try {
      const r = await storageDownloadUrl(fileId);
      viewDoc(r.url || r.download_url);
    } catch { toast.error('Could not load file'); }
  };

  return (
    <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">Other Documents</span>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /></Button>
      </div>

      {/* List existing other docs */}
      {otherDocs.length > 0 && (
        <div className="space-y-2">
          {otherDocs.map((doc: any) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white">
              <FileText className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{doc.filename || doc.label || 'Document'}</div>
                {doc.label && doc.filename && <div className="text-xs text-slate-400 truncate">{doc.label}</div>}
                <div className="text-[10px] text-slate-400">{doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN') : ''}</div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleView(doc.file_id || doc.id)}>
                <Eye className="h-3.5 w-3.5" />
              </Button>
              {canManage && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-rose-500 hover:text-rose-700" onClick={() => handleDelete(doc.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {otherDocs.length === 0 && !loading && (
        <p className="text-xs text-slate-400 italic">No other documents uploaded yet.</p>
      )}

      {/* Upload area — only for Executive/Manager/Partner */}
      {canManage && ['FILING', 'PAYMENT', 'COMPLETED'].includes(filingStatus) && (
        <div className="p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors space-y-2">
          {!pendingFile ? (
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => document.getElementById(`other-doc-input-${filingId}`)?.click()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Document
              </Button>
              <span className="text-xs text-slate-400">PDF, Word, Excel, Images (max 10 MB)</span>
              <input id={`other-doc-input-${filingId}`} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
                <Button size="sm" variant="ghost" className="h-6 px-1 text-rose-500" onClick={() => { setPendingFile(null); setPendingLabel(''); }}>✕</Button>
              </div>
              <Input placeholder="Label (optional)" value={pendingLabel} onChange={(e) => setPendingLabel(e.target.value)} className="h-8 text-sm" />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={uploading} onClick={handleUpload}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                Upload
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getCurrentFY() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

function OnboardingFileDisplay({ fileId, fileName }: { fileId: any; fileName?: string }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const hasFile = !!fileId && typeof fileId === 'string' && fileId.length > 0;
  const isUuid = hasFile && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(fileId);

  const handleView = async () => {
    try {
      const r = await storageDownloadUrl(fileId);
      setViewerUrl(r.download_url || r.url);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  if (!hasFile) return <div className="mt-0.5 text-sm text-slate-400 italic">No file uploaded</div>;

  return (
    <>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50/50 px-3 py-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
        <span className="text-sm text-slate-700 truncate flex-1">{fileName || (isUuid ? 'File uploaded' : fileId)}</span>
        {isUuid && (
          <Button size="sm" variant="outline" className="h-7 px-2 text-indigo-700 border-indigo-200 hover:bg-indigo-50" onClick={handleView}>
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Button>
        )}
      </div>
      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={fileName} />
    </>
  );
}

function ProfessionalFeeSection({ clientId, currentFee, onUpdated }: { clientId: string; currentFee?: string | number | null; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFee, setSavedFee] = useState<string | number | null>(null);

  const displayFee = savedFee || currentFee;

  const doSave = async () => {
    if (!fee || Number(fee) <= 0) return;
    setSaving(true);
    try {
      await setClientFee(clientId, Number(fee));
      toast.success('Professional fee updated');
      setSavedFee(Number(fee));
      setEditing(false);
      setFee('');
      onUpdated();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to update fee'); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-slate-400 font-semibold">Professional Fee</div>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-indigo-600" onClick={() => { setEditing(true); setFee(displayFee ? String(displayFee) : ''); }}>
            <Pencil className="h-3 w-3 mr-1" /> {displayFee ? 'Edit' : 'Set'}
          </Button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <Input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} className="pl-6 h-8 text-sm" placeholder="5000" />
          </div>
          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={doSave} disabled={saving || !fee || Number(fee) <= 0}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-1">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-900">
            {displayFee ? `₹${Number(displayFee).toLocaleString('en-IN')}` : <span className="text-amber-600 font-medium">Not set</span>}
          </span>
        </div>
      )}
    </div>
  );
}

function FilingFeeUpdate({ filing, onUpdated }: { filing: any; onUpdated: () => void }) {
  const pathname = usePathname();
  const isPartner = pathname.startsWith('/partner');
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isPartner) return null;

  const doSave = async () => {
    if (!fee || Number(fee) <= 0) return;
    setSaving(true);
    try {
      await updateFilingFee(filing.id, Number(fee));
      toast.success('Fee change proposed — awaiting client approval');
      setEditing(false);
      setFee('');
      onUpdated();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 409) {
        toast.error('A fee change is already pending client approval');
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Failed');
      }
    }
    finally { setSaving(false); }
  };

  const hasPending = !!filing.proposed_fee;

  return (
    <div className="mt-4 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase">Filing Fee</span>
        </div>
        {!editing && !hasPending && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-indigo-600" onClick={() => { setEditing(true); setFee(filing.professional_fee ? String(filing.professional_fee) : ''); }}>
            <Pencil className="h-3 w-3 mr-1" /> {filing.professional_fee ? 'Change' : 'Set'}
          </Button>
        )}
      </div>
      {!editing && filing.professional_fee && (
        <div className="text-sm font-semibold text-slate-900 mt-1 ml-6">₹{Number(filing.professional_fee).toLocaleString('en-IN')}</div>
      )}
      {!editing && !filing.professional_fee && !hasPending && (
        <div className="text-xs text-amber-600 mt-1 ml-6">Not set for this filing</div>
      )}
      {/* Pending fee proposal indicator */}
      {hasPending && !editing && (
        <div className="mt-2 ml-6 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <div className="text-xs font-semibold text-amber-800">Proposed: ₹{Number(filing.proposed_fee).toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Awaiting client approval</div>
          {filing.fee_proposed_at && <div className="text-[10px] text-amber-500">Proposed {new Date(filing.fee_proposed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
        </div>
      )}
      {editing && (
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
            <Input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} className="pl-6 h-8 text-sm" placeholder="5000" />
          </div>
          <Button size="sm" className="h-8 bg-indigo-600 hover:bg-indigo-700" onClick={doSave} disabled={saving || !fee || Number(fee) <= 0}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}><X className="h-3 w-3" /></Button>
        </div>
      )}
      {editing && <p className="text-[10px] text-slate-400 mt-1 ml-6">Fee change requires client approval before taking effect.</p>}
    </div>
  );
}

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

function IncomeHeadsDisplay({ incomeHeads }: { incomeHeads: Record<string, boolean> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {Object.entries(INCOME_HEAD_LABELS).map(([key, label]) => {
        const val = incomeHeads[key];
        return (
          <div key={key} className="flex items-center gap-2 rounded-md border border-slate-100 px-3 py-2">
            <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
              {val ? '✓' : '✗'}
            </span>
            <span className="text-sm text-slate-700">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
