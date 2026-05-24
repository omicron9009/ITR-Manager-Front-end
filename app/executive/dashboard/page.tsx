'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getSummary, getExecutiveAnalytics, getFilingsByStatus } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Users, ArrowRight, IndianRupee, AlertTriangle } from 'lucide-react';

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

export default function ExecutiveDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<any>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [awaitingTaxPayment, setAwaitingTaxPayment] = useState<any[]>([]);

  useEffect(() => {
    getSummary().then(setSummary).catch(() => {});
    getExecutiveAnalytics().then(setAnalytics).catch(() => {});
    getFilingsByStatus('COMPUTATION', 1, 100).then((r) => {
      const items = r?.items || r?.filings || [];
      setAwaitingTaxPayment(items.filter((f: any) => f.is_tax_paid === false));
    }).catch(() => {});
  }, []);

  const getCount = (k: string) => {
    if (k === 'AWAITING_TAX_PAYMENT') return awaitingTaxPayment.length;
    const counters = summary?.counters || [];
    const found = counters.find((c: any) => c.status === k);
    return found?.count ?? 0;
  };
  const barData = (analytics?.filing_status_breakdown || []).map?.((x: any) => ({ name: x.status, count: x.count })) || CARDS.filter(c => c.key !== 'AWAITING_TAX_PAYMENT').map(c => ({ name: c.label, count: getCount(c.key) }));
  const lineData = (analytics?.fy_distribution || []).map?.((x: any) => ({ month: x.financial_year, count: x.total_filings })) || [];
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-900">Executive Dashboard</h1><p className="text-sm text-slate-500 mt-1">Your assigned clients &middot; {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {CARDS.map((c) => (
          <Card key={c.key} className={`rounded-xl border-l-4 ${c.color} p-4 cursor-pointer hover:shadow-md transition-all`} onClick={() => {
            router.push(`/executive/clients?status=${c.key}`);
          }}>
            <div className="flex items-start justify-between">
              <div>
                <div className={`text-3xl font-bold ${c.text}`}>{getCount(c.key)}</div>
                <div className="text-xs font-medium text-slate-600 mt-1">{c.label}</div>
              </div>
              {c.key === 'AWAITING_TAX_PAYMENT' ? <IndianRupee className="h-4 w-4 text-amber-600" /> : <ArrowRight className="h-4 w-4 text-slate-300" />}
            </div>
          </Card>
        ))}
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
                  <th className="text-left px-5 py-3 font-semibold">Tax Payment</th>
                  <th className="text-right px-5 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {awaitingTaxPayment.map((f: any) => (
                  <tr key={f.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900">{f.client_name || f.client?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-slate-600">{f.financial_year}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <AlertTriangle className="h-3 w-3" /> Pending
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/executive/clients/${f.client_id}`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-xl p-5"><div className="flex items-center gap-2 mb-4"><Users className="h-4 w-4 text-indigo-600" /><h3 className="font-semibold text-slate-900">Filings by State</h3></div><div style={{ width: '100%', height: 260 }}><ResponsiveContainer><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="count" fill="hsl(239 84% 60%)" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card className="rounded-xl p-5"><div className="flex items-center gap-2 mb-4"><TrendingUp className="h-4 w-4 text-emerald-600" /><h3 className="font-semibold text-slate-900">Filings Over Time</h3></div><div style={{ width: '100%', height: 260 }}><ResponsiveContainer><LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div></Card>
      </div>
    </div>
  );
}
