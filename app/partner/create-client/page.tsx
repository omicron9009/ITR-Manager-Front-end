// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { createClient, listClients } from '@/lib/api';
import { toast } from 'sonner';
import { UserPlus, Loader2, Users, Copy, Check, Eye, ClipboardList, FileText, RefreshCw, ChevronRight } from 'lucide-react';
import { getUser } from '@/lib/auth';

const INCOME_HEADS = [
  { key: 'salary', label: 'Salary' },
  { key: 'esop', label: 'ESOP' },
  { key: 'rental_income', label: 'Rental Income' },
  { key: 'more_than_2_properties', label: 'More than 2 Properties' },
  { key: 'capital_gain_shares', label: 'Capital Gain (Shares)' },
  { key: 'capital_gain_land', label: 'Capital Gain (Land)' },
  { key: 'business_profession', label: 'Business / Profession' },
  { key: 'interest_dividend', label: 'Interest / Dividend' },
  { key: 'foreign_assets', label: 'Foreign Assets' },
  { key: 'any_other', label: 'Any Other' },
];

export default function CreateClientPage() {
  const router = useRouter();
  const user = typeof window !== 'undefined' ? getUser() : null;
  const role = user?.role?.toLowerCase() || 'partner';

  // Create form state
  const [form, setForm] = useState({
    email: '', full_name: '', phone_number: '', city: '',
    salary: false, esop: false, rental_income: false, more_than_2_properties: false,
    capital_gain_shares: false, capital_gain_land: false, business_profession: false,
    interest_dividend: false, foreign_assets: false, any_other: false, any_other_text: '',
  });
  const [creating, setCreating] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{ email: string; full_name: string; default_password: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Staff clients list
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientPage, setClientPage] = useState(1);
  const [totalClients, setTotalClients] = useState(0);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const r = await listClients({ staff_created: true, page: clientPage, page_size: 20 });
      setClients(r?.items || []);
      setTotalClients(r?.total || 0);
    } catch {} finally { setLoadingClients(false); }
  };

  useEffect(() => { loadClients(); }, [clientPage]);

  const handleCreate = async () => {
    if (!form.email.trim() || !form.full_name.trim()) {
      toast.error('Email and Full Name are required');
      return;
    }
    if (form.any_other && !form.any_other_text.trim()) {
      toast.error('Please specify "Any Other" income head details');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        ...form,
        phone_number: form.phone_number.trim() || null,
        city: form.city.trim() || null,
        any_other_text: form.any_other ? form.any_other_text.trim() : null,
      };
      const res = await createClient(payload);
      setSuccessDialog({
        email: res.email,
        full_name: res.full_name,
        default_password: res.default_password,
        id: res.id,
      });
      // Reset form
      setForm({
        email: '', full_name: '', phone_number: '', city: '',
        salary: false, esop: false, rental_income: false, more_than_2_properties: false,
        capital_gain_shares: false, capital_gain_land: false, business_profession: false,
        interest_dividend: false, foreign_assets: false, any_other: false, any_other_text: '',
      });
      loadClients();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to create client');
    } finally { setCreating(false); }
  };

  const copyPassword = () => {
    if (successDialog?.default_password) {
      navigator.clipboard.writeText(successDialog.default_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-indigo-600" /> Create Client
        </h1>
        <p className="text-sm text-slate-500 mt-1">Create client accounts and manage staff-created clients.</p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Create Client</TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Created Clients {totalClients > 0 && <span className="ml-1 text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">{totalClients}</span>}</TabsTrigger>
        </TabsList>

        {/* CREATE TAB */}
        <TabsContent value="create" className="mt-4">
          <Card className="rounded-xl p-6 max-w-2xl">
            <div className="space-y-5">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Basic Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Full Name <span className="text-rose-500">*</span></Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Rahul Sharma" className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Email <span className="text-rose-500">*</span></Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="client@example.com" className="mt-1.5" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">Phone Number</Label>
                    <Input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} placeholder="9876543210" className="mt-1.5" maxLength={10} />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700">City</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Pune" className="mt-1.5" />
                  </div>
                </div>
              </div>

              {/* Income Heads */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Income Heads</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {INCOME_HEADS.map((h) => (
                    <label key={h.key} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form[h.key]} onCheckedChange={(v) => setForm({ ...form, [h.key]: !!v })} />
                      <span className="text-sm text-slate-700">{h.label}</span>
                    </label>
                  ))}
                </div>
                {form.any_other && (
                  <div className="mt-2">
                    <Label className="text-sm font-medium text-slate-700">Specify "Any Other" <span className="text-rose-500">*</span></Label>
                    <Input value={form.any_other_text} onChange={(e) => setForm({ ...form, any_other_text: e.target.value })} placeholder="Details of other income head" className="mt-1.5" maxLength={255} />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button onClick={handleCreate} disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Create Client Account
                </Button>
                <p className="text-xs text-slate-400 mt-2">Password will be auto-generated as aikar@&lt;firstname&gt;. A welcome email will be sent to the client.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* LIST TAB */}
        <TabsContent value="list" className="mt-4">
          <Card className="rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Staff-Created Clients</h3>
              <Button size="sm" variant="ghost" onClick={loadClients} disabled={loadingClients}>
                <RefreshCw className={`h-3.5 w-3.5 ${loadingClients ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {loadingClients && clients.length === 0 ? (
              <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-600 mx-auto" /></div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No staff-created clients yet.</p>
                <p className="text-xs text-slate-400 mt-1">Create a client from the "Create Client" tab.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clients.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 truncate">{c.full_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${c.account_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.account_status}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{c.email}</div>
                      <div className="flex items-center gap-3 mt-1">
                        {c.form_submitted_at ? (
                          <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><Check className="h-3 w-3" /> Onboarded</span>
                        ) : (
                          <span className="text-[10px] text-amber-600 flex items-center gap-0.5"><ClipboardList className="h-3 w-3" /> Pending Onboarding</span>
                        )}
                        {c.current_state ? (
                          <span className="text-[10px] text-indigo-600 flex items-center gap-0.5"><FileText className="h-3 w-3" /> {c.current_state}</span>
                        ) : c.form_submitted_at ? (
                          <span className="text-[10px] text-slate-400">No filing</span>
                        ) : null}
                        {c.created_by_staff_name && (
                          <span className="text-[10px] text-slate-400">Created by: {c.created_by_staff_name}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="flex-shrink-0" onClick={() => router.push(`/${role}/create-client/${c.id}`)}>
                      <span className="text-xs mr-1">Manage</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {/* Pagination */}
                {totalClients > 20 && (
                  <div className="flex items-center justify-center gap-2 pt-3">
                    <Button size="sm" variant="outline" disabled={clientPage <= 1} onClick={() => setClientPage(clientPage - 1)}>Previous</Button>
                    <span className="text-xs text-slate-500">Page {clientPage} of {Math.ceil(totalClients / 20)}</span>
                    <Button size="sm" variant="outline" disabled={clientPage >= Math.ceil(totalClients / 20)} onClick={() => setClientPage(clientPage + 1)}>Next</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Dialog with Password */}
      <Dialog open={!!successDialog} onOpenChange={(o) => { if (!o) setSuccessDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-700 flex items-center gap-2">
              <Check className="h-5 w-5" /> Client Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div>
                <span className="text-xs text-slate-500">Name</span>
                <p className="text-sm font-medium text-slate-900">{successDialog?.full_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Email</span>
                <p className="text-sm font-medium text-slate-900">{successDialog?.email}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Default Password</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-sm font-mono bg-white border border-slate-200 rounded px-2 py-1 text-slate-900">{successDialog?.default_password}</code>
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={copyPassword}>
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">A welcome email has been sent to the client with their credentials. You can now fill the onboarding form and initiate a filing.</p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSuccessDialog(null)}>Close</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              const id = successDialog?.id;
              setSuccessDialog(null);
              if (id) router.push(`/${role}/create-client/${id}`);
            }}>
              <ClipboardList className="h-4 w-4 mr-1" /> Fill Onboarding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
