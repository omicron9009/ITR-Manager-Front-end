import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'INITIATED', label: 'Initiated' },
  { key: 'DOCUMENT_UPLOAD', label: 'Docs Upload' },
  { key: 'PROCESSING', label: 'Processing' },
  { key: 'COMPUTATION', label: 'Computation' },
  { key: 'FILING', label: 'Filing' },
  { key: 'PAYMENT', label: 'Payment' },
  { key: 'COMPLETED', label: 'Completed' },
];

export function FilingProgressBar({ currentState }: { currentState: string }) {
  const idx = STAGES.findIndex((s) => s.key === currentState);
  const halted = currentState === 'HALTED';
  const progressPct = halted ? 0 : Math.round(((idx + 1) / STAGES.length) * 100);

  return (
    <>
      {/* Mobile: compact step label + thin progress bar (no scroll) */}
      <div className="md:hidden space-y-2">
        {halted ? (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
            This filing has been halted by the Partner.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Step {idx + 1} of {STAGES.length}</span>
              <span className="text-sm font-semibold text-indigo-700">{STAGES[idx]?.label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </>
        )}
      </div>

      {/* Desktop: horizontal stepper (unchanged) */}
      <div className="hidden md:block w-full overflow-x-auto">
        <div className="min-w-[480px] px-4">
          <div className="flex items-center">
            {STAGES.map((s, i) => {
              const completed = !halted && i < idx;
              const current = !halted && i === idx;
              return (
                <div key={s.key} className={cn('flex items-center', i < STAGES.length - 1 && 'flex-1')}>
                  <div className="relative flex flex-col items-center">
                    <div className={cn(
                      'flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold transition-all shrink-0',
                      completed && 'bg-indigo-600 text-white',
                      current && 'bg-white border-2 border-indigo-600 text-indigo-600 ring-4 ring-indigo-100',
                      !completed && !current && 'bg-slate-100 text-slate-400 border border-slate-200',
                      halted && 'bg-rose-100 text-rose-600 border border-rose-200'
                    )}>
                      {completed ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span className={cn('absolute top-9 left-1/2 -translate-x-1/2 text-[10px] font-medium leading-tight text-center w-max max-w-[60px]', current ? 'text-indigo-700' : completed ? 'text-slate-700' : 'text-slate-400')}>{s.label}</span>
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1', completed ? 'bg-indigo-600' : 'bg-slate-200')} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Spacer for labels */}
          <div className="h-7" />
        </div>
        {halted && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
            This filing has been halted by the Partner.
          </div>
        )}
      </div>
    </>
  );
}

export default FilingProgressBar;
