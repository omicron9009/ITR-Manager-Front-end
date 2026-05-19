import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'INITIATED', label: 'Initiated' },
  { key: 'ON_BOARDING', label: 'Document Upload' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPUTATION', label: 'Computation' },
  { key: 'FILING', label: 'Filing' },
  { key: 'PAYMENT', label: 'Payment' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function FilingProgressBar({ currentState }: { currentState: string }) {
  const idx = STAGES.findIndex((s) => s.key === currentState);
  const halted = currentState === 'HALTED';
  return (
    <div className="w-full">
      <ol className="flex items-center w-full">
        {STAGES.map((s, i) => {
          const completed = !halted && i < idx;
          const current = !halted && i === idx;
          return (
            <li key={s.key} className={cn('flex items-center', i < STAGES.length - 1 && 'flex-1')}>
              <div className="flex flex-col items-center min-w-[64px]">
                <div className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-all',
                  completed && 'bg-indigo-600 text-white',
                  current && 'bg-white border-2 border-indigo-600 text-indigo-600 ring-4 ring-indigo-100',
                  !completed && !current && 'bg-slate-100 text-slate-400 border border-slate-200',
                  halted && 'bg-rose-100 text-rose-600 border border-rose-200'
                )}>
                  {completed ? <Check className="h-4 w-4" /> : i + 1}
                  {current && <span className="absolute h-2 w-2 rounded-full bg-indigo-500 animate-ping opacity-40" />}
                </div>
                <span className={cn('mt-1.5 text-[10px] font-medium text-center', current ? 'text-indigo-700' : completed ? 'text-slate-700' : 'text-slate-400')}>{s.label}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-1 -mt-5', completed ? 'bg-indigo-600' : 'bg-slate-200')} />
              )}
            </li>
          );
        })}
      </ol>
      {halted && (
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
          This filing has been halted by the Partner.
        </div>
      )}
    </div>
  );
}

export default FilingProgressBar;
