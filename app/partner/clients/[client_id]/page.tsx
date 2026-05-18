'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FilingProgressBar } from '@/components/shared/FilingProgressBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { getClient, listFilings, filingDocs, initiateFiling, transitionFiling, haltFiling, approveDoc, rejectDoc } from '@/lib/api';
import { toast } from 'sonner';
import { Mail, Phone, Pause, FileText, FolderUp, Plus, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ClientDetailPage() {
  const { client_id } = useParams<{ client_id: string }>();
  const [client, setClient] = useState<any>(null);
  const [filings, setFilings] = useState<any[]>([]);
  const [docs, setDocs] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [haltFor, setHaltFor] = useState<any>(null);
  const [haltReason, setHaltReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getClient(client_id);
      setClient(c);
      const f = await listFilings({ client_id });
      const list = f?.items || f?.filings || f || [];
      setFilings(list);
      // load docs for each
      for (const fi of list) {
        try { const d = await filingDocs(fi.id); setDocs((prev) => ({ ...prev, [fi.id]: d?.items || d?.documents || d || [] })); } catch {}
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [client_id]);

  const initials = (client?.full_name || 'C').split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();

  const doInitiate = async () => {
    try { await initiateFiling({ client_id, financial_year: getCurrentFY() }); toast.success('Filing initiated'); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };

  const onHalt = async () => {
    if (!haltFor) return;
    setActing(true);
    try { await haltFiling(haltFor.id, haltReason || 'Halted by partner'); toast.success('Filing halted'); setHaltFor(null); setHaltReason(''); load(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); } finally { setActing(false); }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading…</div>;
  if (!client) return <EmptyState title="Client not found" />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      {/* Left */}
      <Card className="lg:col-span-2 rounded-xl p-6 h-fit">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-lg font-bold">{initials}</div>
          <div>
            <h2 className="font-bold text-lg text-slate-900">{client.full_name}</h2>
            <StatusBadge status={client.account_status} />
          </div>
        </div>
        <div className="mt-5 space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4" /> {client.email}</div>
          {client.phone && <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4" /> {client.phone}</div>}
        </div>
        <div className="mt-5 pt-5 border-t border-slate-200">
          <div className="text-xs uppercase text-slate-400 font-semibold mb-2">Assigned Executive</div>
          <div className="text-sm font-medium text-slate-800">{client.assigned_executive_name || client.executive_name || 'Unassigned'}</div>
        </div>
        {client.pan_document_url && (
          <Button variant="outline" className="mt-5 w-full" onClick={() => window.open(client.pan_document_url, '_blank')}><FileText className="h-4 w-4 mr-2" /> View PAN Document</Button>
        )}
      </Card>

      {/* Right */}
      <div className="lg:col-span-3 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-slate-900">Filings &amp; Documents</h2>
          {client.account_status === 'ACTIVE' && <Button onClick={doInitiate} className="bg-indigo-600 hover:bg-indigo-700"><Plus className="h-4 w-4 mr-1" /> Initiate New Filing</Button>}
        </div>
        {filings.length === 0 ? (
          <Card className="rounded-xl"><EmptyState icon={FolderUp} title="No filings yet" subtitle="Initiate the first filing for this client." /></Card>
        ) : filings.map((f: any) => (
          <Card key={f.id} className="rounded-xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-xs uppercase font-bold text-slate-400">{f.financial_year}</div>
                <h3 className="font-bold text-lg text-slate-900 mt-0.5">Filing &middot; {f.financial_year}</h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={f.status || f.current_state} />
                {f.status !== 'COMPLETED' && f.status !== 'HALTED' && <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setHaltFor(f)}><Pause className="h-3.5 w-3.5 mr-1" /> Halt</Button>}
              </div>
            </div>
            <div className="mt-5"><FilingProgressBar currentState={f.status || f.current_state} /></div>
            <Tabs defaultValue="docs" className="mt-5">
              <TabsList>
                <TabsTrigger value="docs">Documents</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="docs" className="mt-3">
                <div className="space-y-2">
                  {(docs[f.id] || []).length === 0 ? (
                    <p className="text-sm text-slate-500 py-4 text-center">No documents assigned yet.</p>
                  ) : (docs[f.id] || []).map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate">{d.doc_type_name || d.placeholder_name || d.filename}</div>
                          {d.filename && <div className="text-xs text-slate-500 truncate">{d.filename}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.status} size="sm" />
                        {d.status === 'UPLOADED' && (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-emerald-700 border-emerald-200" onClick={async () => { try { await approveDoc(d.id); toast.success('Approved'); load(); } catch { toast.error('Failed'); } }}><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" className="h-7 text-rose-700 border-rose-200" onClick={async () => { const r = window.prompt('Rejection reason?'); if (r) { try { await rejectDoc(d.id, r); toast.success('Rejected'); load(); } catch { toast.error('Failed'); } } }}><X className="h-3 w-3" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="actions" className="mt-3">
                <StateActions filing={f} onChange={load} />
              </TabsContent>
            </Tabs>
          </Card>
        ))}
      </div>

      <Dialog open={!!haltFor} onOpenChange={(o) => !o && setHaltFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Halt this filing?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500">Provide a reason. The client will see this banner.</p>
          <Textarea value={haltReason} onChange={(e) => setHaltReason(e.target.value)} placeholder="Reason…" rows={3} />
          <DialogFooter><Button variant="outline" onClick={() => setHaltFor(null)}>Cancel</Button><Button onClick={onHalt} disabled={acting} className="bg-rose-600 hover:bg-rose-700">{acting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Halt</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StateActions({ filing, onChange }: { filing: any; onChange: () => void }) {
  const state = filing.status || filing.current_state;
  const tx = async (target: string) => {
    try { await transitionFiling(filing.id, { target_state: target }); toast.success(`Moved to ${target}`); onChange(); } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed'); }
  };
  const items: { label: string; target: string; cls?: string }[] = [];
  if (state === 'INITIATED') items.push({ label: 'Move to On Boarding', target: 'ON_BOARDING' });
  if (state === 'ON_BOARDING') items.push({ label: 'Move to Processing', target: 'PROCESSING' });
  if (state === 'PROCESSING') items.push({ label: 'Move to Computation', target: 'COMPUTATION' });
  if (state === 'COMPUTATION') items.push({ label: 'Move to Filing', target: 'FILING' });
  if (state === 'FILING') items.push({ label: 'Move to Payment', target: 'PAYMENT' });
  if (state === 'PAYMENT') items.push({ label: 'Mark Completed', target: 'COMPLETED', cls: 'bg-emerald-600 hover:bg-emerald-700' });
  return (
    <div className="flex flex-wrap gap-2">
      {items.length === 0 && <p className="text-sm text-slate-500">No state actions available.</p>}
      {items.map((it) => <Button key={it.target} onClick={() => tx(it.target)} className={it.cls || 'bg-indigo-600 hover:bg-indigo-700'}>{it.label}</Button>)}
    </div>
  );
}

function getCurrentFY() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY ${y}-${(y + 1).toString().slice(-2)}`;
}
