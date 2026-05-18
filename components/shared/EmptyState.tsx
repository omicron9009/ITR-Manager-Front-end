import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({ icon: Icon = Inbox, title, subtitle, action }: { icon?: LucideIcon; title: string; subtitle?: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-16 w-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{subtitle}</p>}
      {action && (
        <Button onClick={action.onClick} className="mt-5 bg-indigo-600 hover:bg-indigo-700">{action.label}</Button>
      )}
    </div>
  );
}

export default EmptyState;
