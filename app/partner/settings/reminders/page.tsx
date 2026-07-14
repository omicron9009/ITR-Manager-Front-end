// @ts-nocheck
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  BellRing,
  Loader2,
  Pencil,
  Play,
  Pause,
  Zap,
  Filter,
  X,
  Mail,
  MessageSquare,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  History,
  Settings2,
} from 'lucide-react';
import {
  listReminderConfigs,
  updateReminderConfig,
  pauseReminderConfig,
  resumeReminderConfig,
  listReminderDispatchLog,
  runRemindersNow,
  apiErr,
} from '@/lib/api';

// ────────────────────────────────────────────────────────────────
// Reminder type catalog (mirrors backend enum ReminderType)
// ────────────────────────────────────────────────────────────────
const REMINDER_TYPES: { value: string; label: string; description: string }[] = [
  {
    value: 'UNASSIGNED_CLIENT',
    label: 'Unassigned Client',
    description: 'Nudge staff when a client has no assigned executive.',
  },
  {
    value: 'FILING_NOT_INITIATED',
    label: 'Filing Not Initiated',
    description: 'Client onboarded but has not started a filing.',
  },
  {
    value: 'TAX_PAYMENT_PENDING',
    label: 'Tax Payment Pending',
    description: 'Computation approved but tax not yet paid.',
  },
  {
    value: 'FILING_STAGNANT_PRE_FILING',
    label: 'Filing Stagnant (Pre-Filing)',
    description: 'Filing has stalled before the FILING stage.',
  },
  {
    value: 'INVOICE_PENDING_POST_FILING',
    label: 'Invoice Pending Post-Filing',
    description: 'ITR filed but invoice not yet uploaded.',
  },
  {
    value: 'CLIENT_DOCS_PENDING_UPLOAD',
    label: 'Client Docs Pending Upload',
    description: 'Documents assigned but not yet uploaded by the client.',
  },
  {
    value: 'TEXT_FIELDS_PENDING_FILL',
    label: 'Text Fields Pending Fill',
    description: 'Text-field placeholders pending client input.',
  },
  {
    value: 'COMPUTATION_AWAITING_MANAGER_APPROVAL',
    label: 'Computation → Manager Approval',
    description: 'Uploaded computation waiting on manager review.',
  },
  {
    value: 'COMPUTATION_AWAITING_PARTNER_APPROVAL',
    label: 'Computation → Partner Approval',
    description: 'Manager-approved computation waiting on partner review.',
  },
  {
    value: 'COMPUTATION_AWAITING_CLIENT_APPROVAL',
    label: 'Computation → Client Approval',
    description: 'Internally-approved computation shared with client.',
  },
  {
    value: 'COMPLETED_DOCS_PENDING',
    label: 'Completed Docs Pending',
    description: 'ITR acknowledgement / invoice uploads pending.',
  },
  {
    value: 'PAYMENT_NOT_MARKED_RECEIVED',
    label: 'Payment Not Marked Received',
    description: 'Filing complete but payment not marked as received.',
  },
  {
    value: 'FEEDBACK_NOT_SUBMITTED',
    label: 'Feedback Not Submitted',
    description: 'Client has not yet submitted feedback for a completed filing.',
  },
];

const REMINDER_LABEL: Record<string, string> = REMINDER_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {} as Record<string, string>);

// ────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────
type Tab = 'CONFIG' | 'LOG';

export default function RemindersSettingsPage() {
  const [tab, setTab] = useState<Tab>('CONFIG');

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BellRing className="h-6 w-6 text-indigo-600" />
            Reminders
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure automated nudges sent to clients and staff, and audit past dispatches.
          </p>
        </div>
        <RunNowButton />
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setTab('CONFIG')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'CONFIG'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings2 className="h-4 w-4" /> Configurations
        </button>
        <button
          type="button"
          onClick={() => setTab('LOG')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === 'LOG' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="h-4 w-4" /> Dispatch Log
        </button>
      </div>

      {tab === 'CONFIG' ? <ConfigurationsTab /> : <DispatchLogTab />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Run Now
// ────────────────────────────────────────────────────────────────
function RunNowButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await runRemindersNow();
      setResult(r);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  const totalDispatched = useMemo(
    () =>
      result?.dispatched
        ? Object.values(result.dispatched).reduce((a: number, b: any) => a + Number(b || 0), 0)
        : 0,
    [result],
  );
  const totalSkipped = useMemo(
    () =>
      result?.skipped
        ? Object.values(result.skipped).reduce((a: number, b: any) => a + Number(b || 0), 0)
        : 0,
    [result],
  );

  return (
    <>
      <Button onClick={run} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Run Reminders Now
      </Button>

      <Dialog open={!!result} onOpenChange={(o) => !o && setResult(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-600" /> Reminder Run Complete
            </DialogTitle>
            <DialogDescription>
              Started at {result?.started_at && new Date(result.started_at).toLocaleString()}, finished
              at {result?.finished_at && new Date(result.finished_at).toLocaleString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="text-xs uppercase font-semibold text-emerald-700">Dispatched</div>
              <div className="text-2xl font-bold text-emerald-800">{totalDispatched}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs uppercase font-semibold text-slate-600">Skipped</div>
              <div className="text-2xl font-bold text-slate-800">{totalSkipped}</div>
            </div>
          </div>
          {(result?.dispatched && Object.keys(result.dispatched).length > 0) ||
          (result?.skipped && Object.keys(result.skipped).length > 0) ? (
            <div className="mt-2 max-h-64 overflow-y-auto text-sm border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">Reminder</th>
                    <th className="text-right px-3 py-2">Dispatched</th>
                    <th className="text-right px-3 py-2">Skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(
                    new Set([
                      ...Object.keys(result?.dispatched || {}),
                      ...Object.keys(result?.skipped || {}),
                    ]),
                  ).map((k) => (
                    <tr key={k} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{REMINDER_LABEL[k] || k}</td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium">
                        {result?.dispatched?.[k] ?? 0}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500">
                        {result?.skipped?.[k] ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResult(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
// Configurations tab
// ────────────────────────────────────────────────────────────────
function ConfigurationsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await listReminderConfigs();
      const arr: any[] = Array.isArray(r) ? r : r?.items || [];
      setItems(arr);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Merge server configs with catalog so unknown/missing types still surface
  const merged = useMemo(() => {
    const byType: Record<string, any> = {};
    for (const it of items) byType[it.reminder_type] = it;
    return REMINDER_TYPES.map((t) => ({
      catalog: t,
      config: byType[t.value] || null,
    }));
  }, [items]);

  const togglePause = async (cfg: any) => {
    try {
      if (cfg.is_enabled) await pauseReminderConfig(cfg.reminder_type);
      else await resumeReminderConfig(cfg.reminder_type);
      toast.success(cfg.is_enabled ? 'Reminder paused' : 'Reminder resumed');
      fetchAll();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading reminder configurations…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {merged.map(({ catalog, config }) => (
            <Card key={catalog.value} className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="truncate">{catalog.label}</span>
                      {config ? (
                        config.is_enabled ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-0">
                            Paused
                          </Badge>
                        )
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
                          Not configured
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">{catalog.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500 uppercase tracking-wide">Threshold</div>
                    <div className="text-slate-900 font-semibold text-sm">
                      {config?.threshold_days ?? '—'}
                      <span className="text-[10px] text-slate-500 font-normal ml-0.5">d</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500 uppercase tracking-wide">Repeat</div>
                    <div className="text-slate-900 font-semibold text-sm">
                      {config?.repeat_interval_days ?? '—'}
                      <span className="text-[10px] text-slate-500 font-normal ml-0.5">d</span>
                    </div>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <div className="text-slate-500 uppercase tracking-wide">Max Sends</div>
                    <div className="text-slate-900 font-semibold text-sm">
                      {config?.max_sends ?? '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <ChannelChip
                    active={!!config?.channels?.in_app}
                    label="In-App"
                    icon={<Smartphone className="h-3 w-3" />}
                  />
                  <ChannelChip
                    active={!!config?.channels?.email}
                    label="Email"
                    icon={<Mail className="h-3 w-3" />}
                  />
                  <ChannelChip
                    active={!!config?.channels?.whatsapp}
                    label="WhatsApp"
                    icon={<MessageSquare className="h-3 w-3" />}
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={!config}
                    onClick={() => setEditing({ catalog, config })}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {config && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => togglePause(config)}
                    >
                      {config.is_enabled ? (
                        <>
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" /> Resume
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditReminderDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        catalog={editing?.catalog}
        config={editing?.config}
        onSaved={() => {
          setEditing(null);
          fetchAll();
        }}
      />
    </>
  );
}

function ChannelChip({ active, label, icon }: { active: boolean; label: string; icon: any }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
        active
          ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
          : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
      }`}
    >
      {icon}
      {label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────
// Edit dialog
// ────────────────────────────────────────────────────────────────
function EditReminderDialog({
  open,
  onOpenChange,
  catalog,
  config,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  catalog: any;
  config: any;
  onSaved: () => void;
}) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [threshold, setThreshold] = useState<string>('0');
  const [repeat, setRepeat] = useState<string>('0');
  const [maxSends, setMaxSends] = useState<string>('0');
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !config) return;
    setIsEnabled(!!config.is_enabled);
    setThreshold(String(config.threshold_days ?? 0));
    setRepeat(String(config.repeat_interval_days ?? 0));
    setMaxSends(String(config.max_sends ?? 0));
    setInApp(!!config.channels?.in_app);
    setEmail(!!config.channels?.email);
    setWhatsapp(!!config.channels?.whatsapp);
    setCustomTitle(config.custom_title || '');
    setCustomMessage(config.custom_message || '');
  }, [open, config]);

  const parseInt255 = (s: string, max: number) => {
    const n = parseInt(s, 10);
    if (isNaN(n) || n < 0) return null;
    if (n > max) return null;
    return n;
  };

  const save = async () => {
    const t = parseInt255(threshold, 365);
    const r = parseInt255(repeat, 365);
    const m = parseInt255(maxSends, 100);
    if (t === null) return toast.error('Threshold must be between 0 and 365');
    if (r === null) return toast.error('Repeat interval must be between 0 and 365');
    if (m === null) return toast.error('Max sends must be between 0 and 100');
    if (customTitle.length > 255) return toast.error('Title must be ≤ 255 characters');
    if (customMessage.length > 2000) return toast.error('Message must be ≤ 2000 characters');

    const body: any = {
      is_enabled: isEnabled,
      threshold_days: t,
      repeat_interval_days: r,
      max_sends: m,
      channels: { in_app: inApp, email, whatsapp },
      custom_title: customTitle.trim() ? customTitle.trim() : null,
      custom_message: customMessage.trim() ? customMessage.trim() : null,
    };

    setSaving(true);
    try {
      await updateReminderConfig(config.reminder_type, body);
      toast.success('Reminder updated');
      onSaved();
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reminder</DialogTitle>
          <DialogDescription>{catalog?.label}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <div>
              <Label className="text-sm font-medium">Enabled</Label>
              <p className="text-xs text-slate-500 mt-0.5">Turn this reminder on or off.</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Threshold (days)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Repeat (days)</Label>
              <Input
                type="number"
                min={0}
                max={365}
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Max sends</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={maxSends}
                onChange={(e) => setMaxSends(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Channels</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <Checkbox checked={inApp} onCheckedChange={(v) => setInApp(!!v)} />
                <Smartphone className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm">In-App</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <Checkbox checked={email} onCheckedChange={(v) => setEmail(!!v)} />
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm">Email</span>
              </label>
              <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 cursor-pointer hover:bg-slate-50">
                <Checkbox checked={whatsapp} onCheckedChange={(v) => setWhatsapp(!!v)} />
                <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-sm">WhatsApp</span>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">Custom Title (optional)</Label>
            <Input
              value={customTitle}
              maxLength={255}
              placeholder="Overrides the default reminder title"
              onChange={(e) => setCustomTitle(e.target.value)}
            />
            <div className="text-[11px] text-slate-400 mt-0.5 text-right">
              {customTitle.length}/255
            </div>
          </div>
          <div>
            <Label className="text-xs">Custom Message (optional)</Label>
            <Textarea
              rows={4}
              maxLength={2000}
              value={customMessage}
              placeholder="Overrides the default reminder body"
              onChange={(e) => setCustomMessage(e.target.value)}
            />
            <div className="text-[11px] text-slate-400 mt-0.5 text-right">
              {customMessage.length}/2000
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────
// Dispatch Log tab
// ────────────────────────────────────────────────────────────────
const ALL = '__ALL__';

function DispatchLogTab() {
  const [reminderType, setReminderType] = useState<string>(ALL);
  const [clientId, setClientId] = useState('');
  const [filingId, setFilingId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1, page_size: 20 });
  const [loading, setLoading] = useState(false);

  const fetchLogs = async (pg = page) => {
    setLoading(true);
    try {
      const params: any = { page: pg, page_size: pageSize };
      if (reminderType && reminderType !== ALL) params.reminder_type = reminderType;
      if (clientId.trim()) params.client_id = clientId.trim();
      if (filingId.trim()) params.filing_id = filingId.trim();
      const r = await listReminderDispatchLog(params);
      setData(r);
      setPage(pg);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => fetchLogs(1);
  const clearFilters = () => {
    setReminderType(ALL);
    setClientId('');
    setFilingId('');
    setTimeout(() => fetchLogs(1), 0);
  };

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4" /> Filters
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Reminder Type</Label>
              <Select value={reminderType} onValueChange={setReminderType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {REMINDER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Client ID</Label>
              <Input
                placeholder="UUID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Filing ID</Label>
              <Input
                placeholder="UUID"
                value={filingId}
                onChange={(e) => setFilingId(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={applyFilters} disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                Apply
              </Button>
              <Button variant="outline" onClick={clearFilters} disabled={loading} className="gap-1.5">
                <X className="h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5">Sent At</th>
                  <th className="text-left px-4 py-2.5">Reminder</th>
                  <th className="text-left px-4 py-2.5">Subject User</th>
                  <th className="text-left px-4 py-2.5">Client</th>
                  <th className="text-left px-4 py-2.5">Filing</th>
                  <th className="text-left px-4 py-2.5">Dedup Key</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…
                    </td>
                  </tr>
                ) : data.items?.length ? (
                  data.items.map((it: any) => (
                    <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">
                        {it.sent_at ? new Date(it.sent_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-800">
                        {REMINDER_LABEL[it.reminder_type] || it.reminder_type}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {it.subject_user_id}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {it.related_client_id || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {it.related_filing_id || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                        {it.dedup_key}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No dispatches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm">
            <div className="text-slate-500">
              {data.total ?? 0} total • Page {data.page ?? page} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={loading || (data.page ?? page) <= 1}
                onClick={() => fetchLogs((data.page ?? page) - 1)}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading || (data.page ?? page) >= totalPages}
                onClick={() => fetchLogs((data.page ?? page) + 1)}
                className="gap-1"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
