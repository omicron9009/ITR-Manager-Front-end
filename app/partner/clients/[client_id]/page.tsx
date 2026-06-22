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
import { getClient, listFilings, filingDocs, initiateFiling, transitionFiling, markPayment, moveToComputation, approveDoc, rejectDoc, deleteDoc, listDocTypes, assignDocs, compForFiling, compUploadUrl, compConfirm, compDownloadUrl, completedDocs, completedDocUploadUrl, completedDocConfirm, completedDocManagerApprove, completedDocPartnerApprove, completedDocManagerReject, storageDownloadUrl, docDownloadUrl, getClientOnboardingForm, getOnboardingFiles, managerApproveComp, managerRejectComp, partnerApproveComp, partnerRejectComp, listManagers, listExecutives, assignExecutive, assignClientToManager, getMyTeam, getManagerTeam, getManagerClients, setClientFee, updateFilingFee, otherDocUploadUrl, otherDocConfirm, listOtherDocs, deleteOtherDoc, internalWorkingUploadUrl, internalWorkingConfirm, listInternalWorkings, internalWorkingDownloadUrl, deleteInternalWorking, internalWorkingReplaceUploadUrl, internalWorkingReplaceConfirm, toggleNoFees, listTags, setClientPartnerTag, removeClientPartnerTag, getIncomeHeadsCatalog, listTextFieldTypes, assignTextFields, listFilingTextFields, deleteTextField, approveTextFields, rejectTextFields } from '@/lib/api';
import { getUser, getIsElevated } from '@/lib/auth';
import { toast } from 'sonner';
import { Mail, Phone, MapPin, FileText, FolderUp, Plus, Check, X, Loader2, Send, FileCheck, Upload, Download, Eye, Calculator, RefreshCw, FileArchive, CheckCircle2, ChevronDown, ChevronRight, Clock, IndianRupee, Pencil, Tag, Search, Trash2, Type, Save, Replace, History } from 'lucide-react';
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
  const isElevatedManager = isManager && getIsElevated();
  const [client, setClient] = useState<any>(null);
  const [filings, setFilings] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [docGroups, setDocGroups] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  const [managers, setManagers] = useState<any[]>([]);
  const [executives, setExecutives] = useState<any[]>([]);
  const [clientManagerId, setClientManagerId] = useState<string | null>(null);
  const [partnerTags, setPartnerTags] = useState<any[]>([]);

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
    } else if (isElevatedManager) {
      // Elevated managers can list all managers; use client's assigned_manager_id
      // instead of looping (elevated manager can't access other managers' client lists)
      listManagers().then((r) => setManagers(r?.items || r?.managers || r || [])).catch(() => {});
      listExecutives().then((r) => {
        const execs = r?.items || r?.executives || r || [];
        setExecutives(execs.map((e: any) => ({ ...e, executive_id: e.id || e.executive_id, executive_name: e.full_name || e.executive_name })));
      }).catch(() => {});
    } else if (isManager) {
      getMyTeam().then((r) => setExecutives(r?.executives || [])).catch(() => {});
    }
  }, [isPartner, isManager, isElevatedManager, client_id]);

  // For elevated managers, sync clientManagerId from client data once loaded
  useEffect(() => {
    if (isElevatedManager && client?.assigned_manager_id) {
      setClientManagerId(client.assigned_manager_id);
    }
  }, [isElevatedManager, client]);

  // Load partner tags
  useEffect(() => {
    if (isPartner) listTags('PARTNER').then((r) => setPartnerTags(r?.items || r || [])).catch(() => {});
  }, [isPartner]);

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
            {client.city && <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4" /> {client.city}</div>}
          </div>
          {/* No Fees Badge */}
          {client.no_fees_applicable && (
            <div className="mt-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">No Fees Applicable</span>
            </div>
          )}
          {/* Professional Fee (Partner or Elevated Manager) */}
          {(isPartner || isElevatedManager) && (
            <ProfessionalFeeSection clientId={client_id} currentFee={client.professional_fee} noFeesApplicable={client.no_fees_applicable} onUpdated={load} />
          )}
          <div className="mt-5 pt-5 border-t border-slate-200 space-y-4">
            {(isPartner || isElevatedManager) && (
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
              <div className="text-xs uppercase text-slate-400 font-semibold mb-2 flex items-center gap-1"><Tag className="h-3 w-3" /> Partner Tag</div>
              {isPartner ? (
                <div className="flex items-center gap-2">
                  <Select value={client.partner_tag_id || ''} onValueChange={async (v) => { try { await setClientPartnerTag(client_id, v); toast.success('Partner tag updated'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } }}>
                    <SelectTrigger className="h-9 w-full text-sm border-slate-200">
                      <SelectValue placeholder="Select Tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerTags.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {client.partner_tag_id && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={async () => { try { await removeClientPartnerTag(client_id); toast.success('Partner tag removed'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-sm font-medium text-slate-800">{client.partner_tag_name || 'None'}</div>
              )}
            </div>
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
                <FilingAccordionItem key={f.id} filing={f} docs={docs} docGroups={docGroups} load={load} viewDoc={viewDoc} isExecutive={isExecutive} clientFee={client?.professional_fee} />
              ))}
            </div>
          </Card>
        )}
      </div>

      <FileViewer open={docViewerOpen} onClose={() => setDocViewerOpen(false)} fileUrl={docViewerUrl} fileName={docViewerName} />
    </div>
  );
}

function FilingAccordionItem({ filing: f, docs, docGroups, load, viewDoc, isExecutive = false, clientFee }: { filing: any; docs: Record<string, any[]>; docGroups: Record<string, any[]>; load: () => void; viewDoc: (id: string, name?: string) => void; isExecutive?: boolean; clientFee?: string | number | null }) {
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
  const [rejectFieldFor, setRejectFieldFor] = useState<any>(null);
  const [rejectFieldReason, setRejectFieldReason] = useState('');
  const [acting, setActing] = useState(false);
  const [textFields, setTextFields] = useState<any[]>([]);
  const [textFieldGroups, setTextFieldGroups] = useState<any[]>([]);
  const status = f.status || f.current_state;
  const percent = getFilingPercent(status);

  const loadTextFields = async () => {
    try {
      const r = await listFilingTextFields(f.id);
      setTextFields(r?.items || []);
      setTextFieldGroups(r?.groups || []);
    } catch {
      setTextFields([]);
      setTextFieldGroups([]);
    }
  };

  // Fetch text fields when accordion opens (and after parent reloads)
  useEffect(() => {
    if (open) loadTextFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, f.id]);

  // Refresh text fields when parent reloads
  const reloadAll = () => {
    load();
    loadTextFields();
  };

  // Placeholder delete (Manager / Executive / Partner only, PENDING_UPLOAD only,
  // and only while filing is in DOCUMENT_UPLOAD / PROCESSING / HALTED)
  const canDeletePlaceholder = ['DOCUMENT_UPLOAD', 'PROCESSING', 'HALTED'].includes(status);
  const onDeletePlaceholder = async (d: any) => {
    if (d.status !== 'PENDING_UPLOAD') return;
    if (!canDeletePlaceholder) return;
    if (!confirm(`Remove the "${d.document_type_name || 'document'}" placeholder from this filing? The client will no longer be asked to upload it.`)) return;
    try {
      await deleteDoc(d.id);
      toast.success('Placeholder removed');
      reloadAll();
    } catch (e: any) {
      const msg = e?.response?.data?.detail;
      if (e?.response?.status === 409) toast.error(msg || 'Cannot remove this placeholder.');
      else toast.error(msg || 'Failed to remove');
    }
  };

  const onDeleteTextField = async (tf: any) => {
    if (tf.status !== 'PENDING') return;
    if (!canDeletePlaceholder) return;
    if (!confirm(`Remove the "${tf.field_type_name || 'text field'}" placeholder from this filing? The client will no longer be asked to fill it.`)) return;
    try {
      await deleteTextField(tf.id);
      toast.success('Text-field placeholder removed');
      reloadAll();
    } catch (e: any) {
      const msg = e?.response?.data?.detail;
      if (e?.response?.status === 409) toast.error(msg || 'Cannot remove this placeholder.');
      else toast.error(msg || 'Failed to remove');
    }
  };

  const statusColor = status === 'COMPLETED' ? 'bg-emerald-500' : status === 'HALTED' ? 'bg-rose-500' : 'bg-indigo-500';

  // Existing assigned text-field type IDs (so we don't duplicate when sending checklist)
  const existingTextFieldTypeIds = Array.from(new Set(textFields.map((tf) => tf.field_type_id)));

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
                <div className="flex items-center gap-2 flex-wrap">
                  {['COMPUTATION', 'FILING', 'PAYMENT'].includes(status) && !isExecutive && !f.no_fees_applicable && (
                    <SetFilingFeeButton filing={f} onUpdated={load} />
                  )}
                  {status === 'PAYMENT' && !isExecutive && !f.no_fees_applicable && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={async () => { try { await markPayment(f.id); toast.success('Payment received — filing completed!'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } }}
                    >
                      Mark Payment Received
                    </Button>
                  )}
                </div>
              </div>
              <TabsContent value="docs" className="mt-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Documents</span>
                    {f.status !== 'COMPLETED' && f.status !== 'HALTED' && (
                      <AssignChecklistButton filingId={f.id} existingDocTypeNames={(docs[f.id] || []).map((d: any) => d.document_type_name)} existingTextFieldTypeIds={existingTextFieldTypeIds} onAssigned={reloadAll} />
                    )}
                  </div>
                  {(docs[f.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No documents assigned yet. Send a checklist to the client.</p>
                  ) : (docGroups[f.id] || []).length > 0 ? (
                    <div className="space-y-3">
                      {(docGroups[f.id]).map((group: any) => {
                        const groupDescription = group.document_type_description || (group.files || []).find((x: any) => x?.document_type_description)?.document_type_description || null;
                        return (
                        <div key={group.document_type_id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                          <div className="flex items-start gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                            <FileText className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-700">{group.document_type_name}</span>
                                <span className="text-[10px] text-slate-400">({group.files.length} file{group.files.length !== 1 ? 's' : ''})</span>
                              </div>
                              {groupDescription && (
                                <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{groupDescription}</div>
                              )}
                            </div>
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
                                  {d.status === 'PENDING_UPLOAD' && canDeletePlaceholder && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                                      onClick={() => onDeletePlaceholder(d)}
                                      title="Remove this placeholder"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  ) : (docs[f.id] || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="flex items-start gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{d.document_type_name || d.original_filename}</div>
                          {d.original_filename && <div className="text-xs text-slate-500 truncate">{d.original_filename}</div>}
                          {d.document_type_description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{d.document_type_description}</div>
                          )}
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
                        {d.status === 'PENDING_UPLOAD' && canDeletePlaceholder && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                            onClick={() => onDeletePlaceholder(d)}
                            title="Remove this placeholder"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* Text Fields section */}
                  {textFields.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                        <Type className="h-3.5 w-3.5 text-amber-500" /> Text Fields
                      </div>
                      <div className="space-y-3">
                        {(textFieldGroups.length > 0 ? textFieldGroups : [{ field_type_id: '__all__', field_type_name: '', fields: textFields }]).map((g: any) => {
                          const description = g.fields?.[0]?.field_type_description;
                          return (
                            <div key={g.field_type_id} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                              {g.field_type_name && (
                                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50/40 border-b border-slate-100">
                                  <Type className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-semibold text-slate-700">{g.field_type_name}</span>
                                      <span className="text-[10px] text-slate-400">({g.fields.length} value{g.fields.length !== 1 ? 's' : ''})</span>
                                    </div>
                                    {description && (
                                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{description}</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              <div className="divide-y divide-slate-100">
                                {g.fields.map((tf: any) => (
                                  <div key={tf.id} className="flex items-start justify-between gap-3 p-3">
                                    <div className="flex-1 min-w-0">
                                      {tf.value ? (
                                        <div className="text-sm text-slate-800 whitespace-pre-wrap break-words">{tf.value}</div>
                                      ) : (
                                        <div className="text-sm italic text-slate-400">— not yet filled —</div>
                                      )}
                                      {tf.status === 'REJECTED' && tf.rejection_reason && (
                                        <div className="text-[11px] text-rose-600 mt-1">Rejection: {tf.rejection_reason}</div>
                                      )}
                                      {tf.filled_at && (
                                        <div className="text-[10px] text-slate-400 mt-1">Filled {new Date(tf.filled_at).toLocaleDateString()}</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <StatusBadge status={tf.status} size="sm" />
                                      {tf.status === 'FILLED' && (
                                        <>
                                          <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={async () => { try { await approveTextFields([tf.id]); toast.success('Approved'); reloadAll(); } catch { toast.error('Failed'); } }}><Check className="h-3 w-3" /></Button>
                                          <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-200" onClick={() => { setRejectFieldFor(tf); setRejectFieldReason(''); }}><X className="h-3 w-3" /></Button>
                                        </>
                                      )}
                                      {tf.status === 'PENDING' && canDeletePlaceholder && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 px-2 text-rose-700 border-rose-200 hover:bg-rose-50"
                                          onClick={() => onDeleteTextField(tf)}
                                          title="Remove this placeholder"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {/* Move to Computation — shown when all docs are uploaded/approved */}
                  {(docs[f.id] || []).length > 0 && (docs[f.id] || []).every((d: any) => d.status === 'APPROVED') && (status === 'PROCESSING' || status === 'DOCUMENT_UPLOAD') && (
                    <MoveToComputationButton filingId={f.id} onMoved={load} />
                  )}
                </div>
              </TabsContent>
              <TabsContent value="computations" className="mt-3">
                <ComputationPanel filingId={f.id} filingStatus={status} filing={f} />
                <InternalWorkingsSection filingId={f.id} filingStatus={status} />
              </TabsContent>
              <TabsContent value="filed-docs" className="mt-3">
                <FiledDocsPanel filingId={f.id} filingStatus={status} noFeesApplicable={f.no_fees_applicable} onMoveToPayment={status === 'FILING' ? async () => { try { await transitionFiling(f.id, { to_status: 'PAYMENT' }); toast.success('Moved to Payment'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } } : undefined} />
              </TabsContent>
            </Tabs>

            {/* State actions + Fee — always visible below tabs */}
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
              <StateActions filing={f} onChange={load} isExecutive={isExecutive} />
              <FilingFeeUpdate filing={f} clientFee={clientFee} onUpdated={load} />
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

      {/* Reject Text Field Dialog */}
      <Dialog open={!!rejectFieldFor} onOpenChange={(o) => { if (!o) { setRejectFieldFor(null); setRejectFieldReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-rose-700">Reject Text Field</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Text Field</div>
              <div className="text-sm font-medium text-slate-900 mt-0.5">{rejectFieldFor?.field_type_name || 'Text Field'}</div>
              {rejectFieldFor?.value && <div className="text-xs text-slate-600 mt-1 italic break-words">"{rejectFieldFor.value}"</div>}
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700">Reason for rejection <span className="text-rose-500">*</span></Label>
              <Textarea value={rejectFieldReason} onChange={(e) => setRejectFieldReason(e.target.value)} placeholder="Describe why this value is being rejected…" rows={4} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectFieldFor(null); setRejectFieldReason(''); }}>Cancel</Button>
            <Button
              disabled={acting || !rejectFieldReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={async () => {
                setActing(true);
                try {
                  await rejectTextFields([{ field_id: rejectFieldFor.id, reason: rejectFieldReason.trim() }]);
                  toast.success('Text field rejected');
                  setRejectFieldFor(null); setRejectFieldReason(''); reloadAll();
                } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
                finally { setActing(false); }
              }}
            >
              {acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Reject Text Field
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
  if (state === 'PAYMENT' && !isExecutive && !filing.no_fees_applicable) items.push({ label: 'Mark Payment Received', target: 'COMPLETED', cls: 'bg-emerald-600 hover:bg-emerald-700', action: doMarkPayment });

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

function AssignChecklistButton({ filingId, existingDocTypeNames, existingTextFieldTypeIds, onAssigned }: { filingId: string; existingDocTypeNames: string[]; existingTextFieldTypeIds: string[]; onAssigned: () => void }) {
  const [open, setOpen] = useState(false);
  const [docTypes, setDocTypes] = useState<any[]>([]);
  const [textFieldTypes, setTextFieldTypes] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<{ value: string; label: string }[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sending, setSending] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    setSearch('');
    setCollapsed({});
    try {
      const [r, tf, cat] = await Promise.all([
        listDocTypes(false),
        listTextFieldTypes(false).catch(() => ({ items: [] })),
        catalog.length ? Promise.resolve({ items: catalog }) : getIncomeHeadsCatalog().catch(() => ({ items: [] })),
      ]);
      const types = r?.items ?? r ?? [];
      setDocTypes(types);
      setTextFieldTypes(tf?.items ?? tf ?? []);
      if (cat?.items?.length) setCatalog(cat.items);
      setSelectedDocs([]);
      setSelectedFields([]);
    } catch { toast.error('Failed to load checklist items'); }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleField = (id: string) => {
    setSelectedFields((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const send = async () => {
    if (selectedDocs.length === 0 && selectedFields.length === 0) { toast.error('Select at least one item'); return; }
    setSending(true);
    try {
      if (selectedDocs.length > 0) await assignDocs(filingId, selectedDocs);
      if (selectedFields.length > 0) await assignTextFields(filingId, selectedFields);
      toast.success('Checklist sent to client');
      setOpen(false);
      setSelectedDocs([]);
      setSelectedFields([]);
      onAssigned();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to assign'); }
    finally { setSending(false); }
  };

  // Build a label map and grouped structure
  const labelFor = (() => {
    const m: Record<string, string> = {};
    catalog.forEach((c) => { m[c.value] = c.label; });
    m.OTHERS = 'Others';
    return m;
  })();

  // Filter by search
  const q = search.trim().toLowerCase();
  const matchesSearch = (t: any) =>
    !q ||
    (t.name || '').toLowerCase().includes(q) ||
    (t.description || '').toLowerCase().includes(q);

  // Group docs and text fields by income head. Items with multiple mappings appear in multiple groups.
  // Items with no mappings go under OTHERS.
  type Row =
    | { kind: 'DOC'; doc: any; sub_category: 'BASE' | 'INCREMENTAL' | null }
    | { kind: 'TEXT'; field: any; sub_category: 'BASE' | 'INCREMENTAL' | null };
  const groups: { head: string; label: string; rows: Row[] }[] = [];
  const groupIndex: Record<string, number> = {};

  const ensureGroup = (head: string) => {
    if (groupIndex[head] == null) {
      groupIndex[head] = groups.length;
      groups.push({ head, label: labelFor[head] || head, rows: [] });
    }
    return groups[groupIndex[head]];
  };

  // Seed the order from the catalog (so Salary, ESOP, … show in the canonical order)
  catalog.forEach((c) => { if (c.value !== 'OTHERS') ensureGroup(c.value); });

  docTypes.filter(matchesSearch).forEach((t: any) => {
    const mappings = Array.isArray(t.income_head_mappings) ? t.income_head_mappings : [];
    if (mappings.length === 0) {
      ensureGroup('OTHERS').rows.push({ kind: 'DOC', doc: t, sub_category: null });
    } else {
      mappings.forEach((m: any) => {
        ensureGroup(m.income_head).rows.push({ kind: 'DOC', doc: t, sub_category: (m.sub_category as any) || 'INCREMENTAL' });
      });
    }
  });

  // Text fields participate in income-head groups just like docs.
  textFieldTypes.filter(matchesSearch).forEach((tf: any) => {
    const mappings = Array.isArray(tf.income_head_mappings) ? tf.income_head_mappings : [];
    if (mappings.length === 0) {
      ensureGroup('OTHERS').rows.push({ kind: 'TEXT', field: tf, sub_category: null });
    } else {
      mappings.forEach((m: any) => {
        ensureGroup(m.income_head).rows.push({ kind: 'TEXT', field: tf, sub_category: (m.sub_category as any) || 'INCREMENTAL' });
      });
    }
  });

  // Drop empty groups
  const visibleGroups = groups.filter((g) => g.rows.length > 0);

  // Build set of selectable doc/field IDs in a group (i.e. not already-assigned)
  const selectableInGroup = (g: typeof visibleGroups[number]) => {
    const docIds = new Set<string>();
    const fieldIds = new Set<string>();
    g.rows.forEach((r) => {
      if (r.kind === 'DOC') {
        if (!existingDocTypeNames.includes(r.doc.name)) docIds.add(r.doc.id);
      } else {
        if (!existingTextFieldTypeIds.includes(r.field.id)) fieldIds.add(r.field.id);
      }
    });
    return { docIds: Array.from(docIds), fieldIds: Array.from(fieldIds) };
  };

  const groupAllSelected = (g: typeof visibleGroups[number]) => {
    const { docIds, fieldIds } = selectableInGroup(g);
    if (docIds.length === 0 && fieldIds.length === 0) return false;
    return (
      docIds.every((id) => selectedDocs.includes(id)) &&
      fieldIds.every((id) => selectedFields.includes(id))
    );
  };

  const toggleGroup = (g: typeof visibleGroups[number]) => {
    const { docIds, fieldIds } = selectableInGroup(g);
    if (docIds.length === 0 && fieldIds.length === 0) return;
    const allSelected = groupAllSelected(g);
    if (allSelected) {
      setSelectedDocs((prev) => prev.filter((id) => !docIds.includes(id)));
      setSelectedFields((prev) => prev.filter((id) => !fieldIds.includes(id)));
    } else {
      setSelectedDocs((prev) => Array.from(new Set([...prev, ...docIds])));
      setSelectedFields((prev) => Array.from(new Set([...prev, ...fieldIds])));
    }
  };

  const totalSelected = selectedDocs.length + selectedFields.length;

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog} className="text-indigo-700 border-indigo-200 hover:bg-indigo-50">
        <Send className="h-3.5 w-3.5 mr-1" /> Send Checklist
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-indigo-600" /> Send Checklist</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">Select documents and text fields to assign to this filing. The client will be notified.</p>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents and text fields…"
              className="pl-9 h-9 text-sm"
            />
          </div>

          {docTypes.length === 0 && textFieldTypes.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No items available. Create them in Checklist Master first.</p>
          ) : visibleGroups.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">No items match your search.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {visibleGroups.map((g) => {
                const { docIds, fieldIds } = selectableInGroup(g);
                const selectableCount = docIds.length + fieldIds.length;
                const allSelected = groupAllSelected(g);
                const isCollapsed = !!collapsed[g.head];
                return (
                  <div key={g.head} className="rounded-lg border border-slate-200">
                    {/* Group header */}
                    <div className={`flex items-center gap-3 p-2.5 ${selectableCount === 0 ? 'bg-slate-50' : 'bg-slate-50/60'} rounded-t-lg`}>
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleGroup(g)}
                        disabled={selectableCount === 0}
                      />
                      <button
                        type="button"
                        onClick={() => setCollapsed((p) => ({ ...p, [g.head]: !p[g.head] }))}
                        className="flex items-center gap-1 flex-1 min-w-0 text-left"
                      >
                        {isCollapsed ? <ChevronRight className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        <span className="text-sm font-semibold text-slate-800 break-words">{g.label}</span>
                        <span className="text-[11px] text-slate-500 ml-1">({g.rows.length})</span>
                      </button>
                    </div>
                    {/* Group rows */}
                    {!isCollapsed && (
                      <div className="p-2 space-y-1.5">
                        {g.rows.map((row, idx) => {
                          if (row.kind === 'DOC') {
                            const t = row.doc;
                            const alreadyAssigned = existingDocTypeNames.includes(t.name);
                            const isSelected = selectedDocs.includes(t.id);
                            return (
                              <label
                                key={`${g.head}-doc-${t.id}-${idx}`}
                                className={`flex items-center gap-3 pl-7 pr-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                  alreadyAssigned
                                    ? 'border-slate-100 bg-slate-50 opacity-50'
                                    : isSelected
                                    ? 'border-indigo-300 bg-indigo-50/50'
                                    : 'border-slate-100 hover:bg-slate-50'
                                }`}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleDoc(t.id)}
                                  disabled={alreadyAssigned}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-slate-900 break-words">{t.name}</div>
                                  {t.description && <div className="text-xs text-slate-500 mt-0.5 break-words">{t.description}</div>}
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {row.sub_category && (
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        row.sub_category === 'BASE'
                                          ? 'bg-indigo-100 text-indigo-700'
                                          : 'bg-white text-indigo-700 border border-indigo-200'
                                      }`}
                                    >
                                      {row.sub_category === 'BASE' ? 'Base' : 'Incr.'}
                                    </span>
                                  )}
                                  {alreadyAssigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">ASSIGNED</span>}
                                </div>
                              </label>
                            );
                          }
                          // TEXT field row
                          const tf = row.field;
                          const alreadyAssigned = existingTextFieldTypeIds.includes(tf.id);
                          const isSelected = selectedFields.includes(tf.id);
                          return (
                            <label
                              key={`${g.head}-text-${tf.id}-${idx}`}
                              className={`flex items-center gap-3 pl-7 pr-3 py-2 rounded-md border cursor-pointer transition-colors ${
                                alreadyAssigned
                                  ? 'border-slate-100 bg-slate-50 opacity-50'
                                  : isSelected
                                  ? 'border-amber-300 bg-amber-50/50'
                                  : 'border-slate-100 hover:bg-slate-50'
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleField(tf.id)}
                                disabled={alreadyAssigned}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 break-words flex items-start gap-1.5">
                                  <Type className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                  <span className="break-words">{tf.name}</span>
                                </div>
                                {tf.description && <div className="text-xs text-slate-500 mt-0.5 break-words">{tf.description}</div>}
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-700">
                                  Text
                                </span>
                                {row.sub_category && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                      row.sub_category === 'BASE'
                                        ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-white text-indigo-700 border border-indigo-200'
                                    }`}
                                  >
                                    {row.sub_category === 'BASE' ? 'Base' : 'Incr.'}
                                  </span>
                                )}
                                {alreadyAssigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold">ASSIGNED</span>}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={send} disabled={sending || totalSelected === 0} className="bg-indigo-600 hover:bg-indigo-700">
              {sending && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Send {totalSelected > 0 ? `(${totalSelected})` : ''}
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

function FiledDocsPanel({ filingId, filingStatus, noFeesApplicable, onMoveToPayment }: { filingId: string; filingStatus: string; noFeesApplicable?: boolean; onMoveToPayment?: () => Promise<void> }) {
  const pathname = usePathname();
  const isPartner = pathname.startsWith('/partner');
  const isManager = pathname.startsWith('/manager');
  const isExecutive = pathname.startsWith('/executive');
  const isElevatedManager = isManager && getIsElevated();

  // Filter out INVOICE only for no-fee filings; backend enforces role-based upload permissions
  const applicableDocTypes = noFeesApplicable
    ? COMPLETED_DOC_TYPES.filter(d => d.key !== 'INVOICE')
    : COMPLETED_DOC_TYPES;

  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});
  const [rejectingDoc, setRejectingDoc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

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

  const handleManagerApprove = async (docId: string) => {
    setActing(true);
    try {
      await completedDocManagerApprove(docId);
      toast.success('Document approved');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Approval failed'); }
    finally { setActing(false); }
  };

  const handlePartnerApprove = async (docId: string) => {
    setActing(true);
    try {
      await completedDocPartnerApprove(docId);
      toast.success('Document approved');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Approval failed'); }
    finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectingDoc) return;
    setActing(true);
    try {
      await completedDocManagerReject(rejectingDoc.id, rejectReason || 'Rejected');
      toast.success('Document rejected');
      setRejectingDoc(null);
      setRejectReason('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Rejection failed'); }
    finally { setActing(false); }
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

  // Gate Move to Payment: all required docs must be PARTNER_APPROVED
  const allRequiredApproved = applicableDocTypes.filter(d => d.required).every(dt => {
    const doc = getUploadedDoc(dt.key);
    return doc && doc.status === 'PARTNER_APPROVED';
  });

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case 'PARTNER_APPROVED': return 'border-emerald-200 bg-emerald-50/40';
      case 'MANAGER_APPROVED': return 'border-teal-200 bg-teal-50/40';
      case 'MANAGER_REJECTED': return 'border-rose-200 bg-rose-50/40';
      default: return 'border-emerald-200 bg-emerald-50/40';
    }
  };

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
          {applicableDocTypes.map((dt) => {
            const uploaded = getUploadedDoc(dt.key);
            const isUploading = uploading === dt.key;

            if (uploaded) {
              const pending = pendingFiles[dt.key];
              const docStatus = uploaded.status || 'UPLOADED';
              const canReUpload = (isExecutive || isManager || isPartner) && (docStatus === 'UPLOADED' || docStatus === 'MANAGER_REJECTED');
              const showManagerApprove = (isManager || isPartner) && docStatus === 'UPLOADED';
              const showPartnerApprove = isPartner && (docStatus === 'UPLOADED' || docStatus === 'MANAGER_APPROVED');
              const showReject = (isManager || isPartner) && docStatus === 'UPLOADED';

              return (
                <div key={dt.key} className={`p-3 rounded-lg border ${getStatusBorderColor(docStatus)}`}>
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
                      <StatusBadge status={docStatus} size="sm" />
                      <Button size="sm" variant="ghost" onClick={() => download(uploaded.id)}><Eye className="h-3.5 w-3.5" /></Button>
                      {canReUpload && (
                        <>
                          <Button size="sm" variant="ghost" className="text-slate-500" onClick={() => document.getElementById(`filed-${filingId}-${dt.key}`)?.click()}>
                            <Upload className="h-3.5 w-3.5" />
                          </Button>
                          <input id={`filed-${filingId}-${dt.key}`} type="file" hidden accept=".pdf,.json,.xlsx,.xls,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFiles(prev => ({ ...prev, [dt.key]: f })); e.target.value = ''; }} />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Rejection reason display */}
                  {docStatus === 'MANAGER_REJECTED' && uploaded.rejection_reason && (
                    <div className="mt-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded px-2 py-1">
                      <span className="font-semibold">Rejection reason:</span> {uploaded.rejection_reason}
                    </div>
                  )}

                  {/* Approve / Reject action buttons */}
                  {(showManagerApprove || showPartnerApprove || showReject) && (
                    <div className="mt-2 flex items-center gap-2">
                      {showPartnerApprove ? (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7" disabled={acting} onClick={() => handlePartnerApprove(uploaded.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      ) : showManagerApprove ? (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7" disabled={acting} onClick={() => handleManagerApprove(uploaded.id)}>
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                        </Button>
                      ) : null}
                      {showReject && (
                        <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-7" disabled={acting} onClick={() => setRejectingDoc(uploaded)}>
                          <X className="h-3 w-3 mr-1" /> Reject
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Pending re-upload confirmation */}
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

          {allRequiredApproved && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 text-center">
              ✅ All required filed documents approved. You can now mark payment and complete the filing.
            </div>
          )}

          {/* Other Documents Section */}
          <OtherDocsSection filingId={filingId} filingStatus={filingStatus} viewDoc={(url: string) => { setViewerUrl(url); setViewerOpen(true); }} />

          {/* Move to Payment button at the end of filed docs */}
          {onMoveToPayment && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <Button onClick={onMoveToPayment} className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={!allRequiredApproved}>
                Move to Payment
              </Button>
              {!allRequiredApproved && (
                <p className="text-xs text-slate-500 text-center mt-1">All required documents must be Partner Approved before moving to payment.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Rejection Reason Dialog */}
      <Dialog open={!!rejectingDoc} onOpenChange={(open) => { if (!open) { setRejectingDoc(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Provide a reason for rejecting this document. The executive will need to re-upload.</p>
            <Textarea placeholder="Reason for rejection (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectingDoc(null); setRejectReason(''); }}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handleReject} disabled={acting}>
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FileViewer open={viewerOpen} onClose={() => setViewerOpen(false)} fileUrl={viewerUrl} fileName={undefined} />
    </div>
  );
}

function InternalWorkingsSection({ filingId, filingStatus }: { filingId: string; filingStatus: string }) {
  const pathname = usePathname();
  const isClient = pathname.startsWith('/client');
  // Only show to Partner/Manager/Executive
  if (isClient) return null;

  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState('');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const canUpload = ['COMPUTATION', 'FILING'].includes(filingStatus);

  const load = async (history?: boolean) => {
    setLoading(true);
    try {
      const r = await listInternalWorkings(filingId, history ?? showHistory);
      setDocs(r?.items || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(showHistory); }, [filingId]);

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (!next) setExpandedHistory({});
    await load(next);
  };

  const activeDocs = docs.filter((d: any) => !d.superseded_at);
  const supersededById = (() => {
    const map = new Map<string, any>();
    for (const d of docs) map.set(d.id, d);
    return map;
  })();

  const getHistoryChain = (active: any): any[] => {
    const chain: any[] = [];
    let cur = active.replaces_id ? supersededById.get(active.replaces_id) : null;
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      chain.push(cur);
      cur = cur.replaces_id ? supersededById.get(cur.replaces_id) : null;
    }
    return chain;
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    if (pendingFile.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    setUploading(true);
    try {
      const params: any = { filing_id: filingId, filename: pendingFile.name, content_type: pendingFile.type };
      if (pendingLabel.trim()) params.label = pendingLabel.trim();
      const urlRes = await internalWorkingUploadUrl(params);
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, pendingFile, { headers: { 'Content-Type': pendingFile.type } });
      await internalWorkingConfirm({ filing_id: filingId, object_key: urlRes.object_key, filename: pendingFile.name, content_type: pendingFile.type, file_size: pendingFile.size, ...(pendingLabel.trim() ? { label: pendingLabel.trim() } : {}) });
      toast.success('Internal working document uploaded');
      setPendingFile(null);
      setPendingLabel('');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleReplacePick = (docId: string) => {
    document.getElementById(`iw-replace-${filingId}-${docId}`)?.click();
  };

  const handleReplaceFile = async (docId: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be less than 10 MB'); return; }
    setReplacingId(docId);
    try {
      const urlRes = await internalWorkingReplaceUploadUrl(docId, { filename: file.name, content_type: file.type });
      const axios = (await import('axios')).default;
      await axios.put(urlRes.upload_url, file, { headers: { 'Content-Type': file.type } });
      await internalWorkingReplaceConfirm(docId, { object_key: urlRes.object_key, filename: file.name, content_type: file.type, file_size: file.size });
      toast.success('Document replaced');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Replace failed'); }
    finally { setReplacingId(null); }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteInternalWorking(docId);
      toast.success('Document removed');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to delete'); }
  };

  const handleView = async (docId: string) => {
    try {
      const r = await internalWorkingDownloadUrl(docId);
      setViewerUrl(r.download_url || r.url);
      setViewerOpen(true);
    } catch { toast.error('Could not load file'); }
  };

  const renderDocRow = (doc: any, opts: { active: boolean }) => {
    const isLastActive = opts.active && activeDocs.length === 1;
    const blockDelete = isLastActive && filingStatus === 'COMPUTATION';
    const isReplacing = replacingId === doc.id;
    return (
      <div
        key={doc.id}
        className={`flex items-center gap-3 p-3 rounded-lg border ${opts.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/60 opacity-75'}`}
      >
        <FileArchive className={`h-4 w-4 flex-shrink-0 ${opts.active ? 'text-violet-500' : 'text-slate-400'}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate ${opts.active ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
            {doc.original_filename || doc.filename || doc.label || 'Document'}
          </div>
          {doc.label && (doc.original_filename || doc.filename) && <div className="text-xs text-slate-400 truncate">{doc.label}</div>}
          <div className="text-[10px] text-slate-400">
            {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString('en-IN') : ''}
            {doc.uploaded_by_name ? ` · ${doc.uploaded_by_name}` : ''}
            {!opts.active && doc.superseded_at ? ` · replaced ${new Date(doc.superseded_at).toLocaleDateString('en-IN')}` : ''}
          </div>
        </div>
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleView(doc.id)} title="View">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        {opts.active && canUpload && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-violet-600 hover:text-violet-700"
              onClick={() => handleReplacePick(doc.id)}
              disabled={isReplacing}
              title="Replace with a new version"
            >
              {isReplacing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Replace className="h-3.5 w-3.5" />}
            </Button>
            <input
              id={`iw-replace-${filingId}-${doc.id}`}
              type="file"
              hidden
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleReplaceFile(doc.id, f);
                e.target.value = '';
              }}
            />
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-rose-500 hover:text-rose-700 disabled:opacity-40"
          onClick={() => !blockDelete && handleDelete(doc.id)}
          disabled={blockDelete}
          title={blockDelete ? 'At least one internal working document is required while in COMPUTATION' : 'Remove'}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <div className="mt-6 pt-5 border-t border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">Internal Working Documents</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={toggleHistory}
            disabled={loading}
            className={showHistory ? 'text-violet-600' : ''}
            title={showHistory ? 'Hide previous versions' : 'Show previous versions'}
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => load()} disabled={loading} title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Warning if no active docs and in COMPUTATION state */}
      {activeDocs.length === 0 && filingStatus === 'COMPUTATION' && !loading && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 flex items-center gap-2">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>At least one internal working document must be uploaded before the filing can advance to FILING state.</span>
        </div>
      )}

      {/* List active docs (with optional history chain underneath) */}
      {activeDocs.length > 0 && (
        <div className="space-y-2">
          {activeDocs.map((doc: any) => {
            const chain = showHistory ? getHistoryChain(doc) : [];
            const expanded = !!expandedHistory[doc.id];
            return (
              <div key={doc.id} className="space-y-1">
                {renderDocRow(doc, { active: true })}
                {chain.length > 0 && (
                  <div className="ml-6 space-y-1">
                    <button
                      type="button"
                      className="text-[11px] text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
                      onClick={() => setExpandedHistory((s) => ({ ...s, [doc.id]: !s[doc.id] }))}
                    >
                      {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      {chain.length} previous version{chain.length === 1 ? '' : 's'}
                    </button>
                    {expanded && (
                      <div className="space-y-1">
                        {chain.map((old: any) => renderDocRow(old, { active: false }))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeDocs.length === 0 && !loading && filingStatus !== 'COMPUTATION' && (
        <p className="text-xs text-slate-400 italic">No internal working documents uploaded yet.</p>
      )}

      {/* Upload area */}
      {canUpload && (
        <div className="p-3 rounded-lg border-2 border-dashed border-slate-300 hover:border-violet-400 transition-colors space-y-2">
          {!pendingFile ? (
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => document.getElementById(`iw-upload-${filingId}`)?.click()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> {activeDocs.length > 0 ? 'Add another internal working' : 'Add Internal Working'}
              </Button>
              <span className="text-xs text-slate-400">PDF, Word, Excel, Images (max 10 MB)</span>
              <input id={`iw-upload-${filingId}`} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-violet-500 flex-shrink-0" />
                <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
                <Button size="sm" variant="ghost" className="h-6 px-1 text-rose-500" onClick={() => { setPendingFile(null); setPendingLabel(''); }}>✕</Button>
              </div>
              <Input placeholder="Label (optional)" value={pendingLabel} onChange={(e) => setPendingLabel(e.target.value)} className="h-8 text-sm" />
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700" disabled={uploading} onClick={handleUpload}>
                {uploading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
                Upload
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

function ProfessionalFeeSection({ clientId, currentFee, noFeesApplicable, onUpdated }: { clientId: string; currentFee?: string | number | null; noFeesApplicable?: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedFee, setSavedFee] = useState<string | number | null>(null);
  const [togglingNoFees, setTogglingNoFees] = useState(false);

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

  const doToggleNoFees = async () => {
    setTogglingNoFees(true);
    try {
      await toggleNoFees(clientId, !noFeesApplicable);
      toast.success(noFeesApplicable ? 'No-fees flag removed' : 'Marked as no fees applicable');
      onUpdated();
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to toggle no-fees'); }
    finally { setTogglingNoFees(false); }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase text-slate-400 font-semibold">Professional Fee</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className={`h-6 px-2 text-xs ${noFeesApplicable ? 'text-teal-700' : 'text-slate-500'}`} onClick={doToggleNoFees} disabled={togglingNoFees}>
            {togglingNoFees ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {noFeesApplicable ? 'Remove No-Fee' : 'Mark No-Fee'}
          </Button>
          {!editing && !noFeesApplicable && (
            <Button size="sm" variant="ghost" className="h-6 px-2 text-indigo-600" onClick={() => { setEditing(true); setFee(displayFee ? String(displayFee) : ''); }}>
              <Pencil className="h-3 w-3 mr-1" /> {displayFee ? 'Edit' : 'Set'}
            </Button>
          )}
        </div>
      </div>
      {noFeesApplicable ? (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-medium text-teal-700">No fees applicable for this client</span>
        </div>
      ) : editing ? (
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

function SetFilingFeeButton({ filing, onUpdated }: { filing: any; onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  const doSave = async () => {
    if (!fee || Number(fee) <= 0) return;
    setSaving(true);
    try {
      await updateFilingFee(filing.id, Number(fee));
      toast.success('Professional fee set. Revised engagement letter emailed to client.');
      setOpen(false);
      setFee('');
      onUpdated();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to set fee');
    }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-700"
        onClick={() => { setOpen(true); setFee(filing.professional_fee ? String(filing.professional_fee) : ''); }}
      >
        <IndianRupee className="h-4 w-4 mr-1" />
        {filing.professional_fee ? 'Update Fee & Send Letter' : 'Set Professional Fee & Send Revised Letter'}
      </Button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFee(''); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-indigo-600" /> Set Professional Fee
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Set the professional fee for this filing. A revised engagement letter with this fee will be emailed to the client.</p>
            {filing.professional_fee && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Current Fee</div>
                <div className="text-sm font-semibold text-slate-900">₹{Number(filing.professional_fee).toLocaleString('en-IN')}</div>
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">New Fee (₹) <span className="text-rose-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                <Input type="number" min="1" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="5000" className="pl-7" />
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">The revised engagement letter with the specified fee will be generated and emailed to the client automatically.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!fee || Number(fee) <= 0 || saving}
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={doSave}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Set Fee & Send Letter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FilingFeeUpdate({ filing, clientFee, onUpdated }: { filing: any; clientFee?: string | number | null; onUpdated: () => void }) {
  const pathname = usePathname();
  const isPartner = pathname.startsWith('/partner');
  const isManager = pathname.startsWith('/manager');
  const isElevatedManager = isManager && getIsElevated();
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isPartner && !isElevatedManager) return null;
  if (filing.no_fees_applicable) return null;

  const filingFee = filing.professional_fee;
  const effectiveFee = filingFee ?? clientFee;
  const isInherited = !filingFee && !!clientFee;

  const doSave = async () => {
    if (!fee || Number(fee) <= 0) return;
    setSaving(true);
    try {
      await updateFilingFee(filing.id, Number(fee));
      toast.success('Professional fee set. Revised engagement letter emailed to client.');
      setEditing(false);
      setFee('');
      onUpdated();
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed');
    }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-4 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase">Filing Fee</span>
        </div>
        {!editing && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-indigo-600" onClick={() => { setEditing(true); setFee(effectiveFee ? String(effectiveFee) : ''); }}>
            <Pencil className="h-3 w-3 mr-1" /> {effectiveFee ? 'Change' : 'Set'}
          </Button>
        )}
      </div>
      {!editing && effectiveFee && (
        <div className="mt-1 ml-6 flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-slate-900">₹{Number(effectiveFee).toLocaleString('en-IN')}</span>
          {isInherited && <span className="text-xs text-slate-400">(client default)</span>}
        </div>
      )}
      {!editing && !effectiveFee && (
        <div className="text-xs text-amber-600 mt-1 ml-6">To be decided</div>
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
      {editing && <p className="text-[10px] text-slate-400 mt-1 ml-6">Fee will be applied immediately and a revised engagement letter will be emailed to the client.</p>}
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

function IncomeHeadsDisplay({ incomeHeads }: { incomeHeads: Record<string, any> }) {
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
            {key === 'any_other' && val && incomeHeads.any_other_text && (
              <span className="text-xs text-slate-500 ml-1">— {incomeHeads.any_other_text}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
