import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, FileText, FolderUp, Calculator, Send, IndianRupee, Pause, Hourglass } from 'lucide-react';

export type StatusKey =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'REJECTED'
  | 'DEACTIVATED'
  | 'INITIATED'
  | 'DOCUMENT_UPLOAD'
  | 'PROCESSING'
  | 'COMPUTATION'
  | 'FILING'
  | 'PAYMENT'
  | 'COMPLETED'
  | 'HALTED'
  | 'PENDING_UPLOAD'
  | 'UPLOADED'
  | 'APPROVED'
  | string;

const CONFIG: Record<string, { bg: string; text: string; ring: string; icon?: any; label?: string }> = {
  PENDING_VERIFICATION: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', icon: Hourglass, label: 'Pending Verification' },
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', icon: CheckCircle2, label: 'Active' },
  REJECTED: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', label: 'Rejected' },
  DEACTIVATED: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', label: 'Deactivated' },
  INITIATED: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200', icon: FileText, label: 'Initiated' },
  DOCUMENT_UPLOAD: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', icon: FolderUp, label: 'Document Upload' },
  PROCESSING: { bg: 'bg-indigo-50', text: 'text-indigo-700', ring: 'ring-indigo-200', icon: Clock, label: 'Processing' },
  COMPUTATION: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', icon: Calculator, label: 'Computation' },
  FILING: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', icon: Send, label: 'Filing' },
  PAYMENT: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-200', icon: IndianRupee, label: 'Payment' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', icon: CheckCircle2, label: 'Completed' },
  HALTED: { bg: 'bg-rose-50', text: 'text-rose-700', ring: 'ring-rose-200', icon: Pause, label: 'Halted' },
  PENDING_UPLOAD: { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', label: 'Pending Upload' },
  UPLOADED: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-200', label: 'Uploaded' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Approved' },
};

export function StatusBadge({ status, size = 'md' }: { status: StatusKey; size?: 'sm' | 'md' }) {
  const c = CONFIG[status] || { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200', label: status };
  const Icon = c.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset', c.bg, c.text, c.ring, size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs')}>
      {Icon && <Icon className="h-3 w-3" />} {c.label || status}
    </span>
  );
}

export default StatusBadge;
