// @ts-nocheck
'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminGenerateRecoveryCodes } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, KeyRound, Copy } from 'lucide-react';

export default function RecoveryCodesPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error('Enter a valid email address'); return; }
    setLoading(true);
    setCodes([]);
    try {
      const res = await adminGenerateRecoveryCodes({ email });
      const generated = res?.recovery_codes || res?.codes || [];
      setCodes(generated);
      if (generated.length) toast.success('Recovery codes generated');
      else toast.warning('No codes returned');
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to generate recovery codes.');
    } finally { setLoading(false); }
  };

  const copyAll = () => {
    navigator.clipboard.writeText(codes.join('\n'));
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Recovery Codes</h1>
      <p className="text-sm text-slate-500">Generate recovery codes for a client by entering their email address.</p>

      <Card className="rounded-xl p-6">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-indigo-600" /> Generate Recovery Codes
        </h2>
        <div className="space-y-4 max-w-sm">
          <div>
            <Label htmlFor="client_email" className="text-xs text-slate-500">Client Email</Label>
            <Input
              id="client_email"
              type="email"
              placeholder="Enter client email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            disabled={loading || !email}
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={handleGenerate}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Generate Codes
          </Button>
        </div>
      </Card>

      {codes.length > 0 && (
        <Card className="rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Generated Codes</h2>
            <Button variant="outline" size="sm" onClick={copyAll} className="gap-1">
              <Copy className="h-3.5 w-3.5" /> Copy All
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {codes.map((code, i) => (
              <div key={i} className="font-mono text-sm bg-slate-100 rounded px-3 py-2 text-center text-slate-800">
                {code}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">These codes can be used by the client to reset their password. Store them securely.</p>
        </Card>
      )}
    </div>
  );
}
