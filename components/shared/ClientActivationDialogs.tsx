'use client';
import { useState, useEffect } from 'react';
import { CheckCircle2, IndianRupee, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getManagerTeam } from '@/lib/api';

export function FeeInputDialog({ client, acting, onSubmit, onCancel }: {
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

export function AssignAfterActivationDialog({ client, managers, executives, partnerTags, acting, onAssign, onSkip }: {
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

  // Pre-populate with existing assignments when client changes
  useEffect(() => {
    if (!client) return;
    setSelectedPartnerTag(client.partner_tag_id || '');
    setSelectedManager(client.assigned_manager_id || '');
    setSelectedExecutive(client.assigned_executive_id || '');
  }, [client?.id]);

  useEffect(() => {
    if (!selectedManager) { setManagerExecs([]); setSelectedExecutive(''); return; }
    // Clear executive when manager changes (old exec may not belong to new manager)
    setSelectedExecutive('');
    getManagerTeam(selectedManager)
      .then((r) => setManagerExecs(r?.executives || r?.items || []))
      .catch(() => setManagerExecs([]));
  }, [selectedManager]);

  if (!client) return null;

  const hasManager = !!client.assigned_manager_id;
  const hasExecutive = !!client.assigned_executive_id;
  const hasPartnerTag = !!client.partner_tag_id;

  return (
    <Dialog open={!!client} onOpenChange={(o) => { if (!o) onSkip(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-indigo-700 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Assign Client
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <div className="text-sm font-semibold text-slate-900">{client.full_name || client.name}</div>
            <div className="text-xs text-slate-500">{client.email}</div>
          </div>
          <p className="text-sm text-slate-600">Assign the missing manager, partner tag, or executive for this client.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">
                Partner Tag <span className="text-rose-500">*</span>
                {hasPartnerTag && <span className="ml-2 text-[10px] font-medium text-emerald-600 normal-case">(already assigned)</span>}
              </label>
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
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">
                Manager <span className="text-rose-500">*</span>
                {hasManager && <span className="ml-2 text-[10px] font-medium text-emerald-600 normal-case">(already assigned)</span>}
              </label>
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
              <label className="text-xs font-semibold text-slate-700 uppercase mb-1.5 block">
                Executive <span className="text-slate-400">(optional)</span>
                {hasExecutive && <span className="ml-2 text-[10px] font-medium text-emerald-600 normal-case">(already assigned)</span>}
              </label>
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
          <Button variant="outline" onClick={onSkip}>Cancel</Button>
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
