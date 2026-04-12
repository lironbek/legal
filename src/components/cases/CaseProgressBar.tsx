import { getStatusesForCaseType, getStatusIndex } from '@/lib/caseTypeConfig';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface CaseProgressBarProps {
  caseType: string;
  currentStatus: string;
  compact?: boolean;
}

export function CaseProgressBar({ caseType, currentStatus, compact = false }: CaseProgressBarProps) {
  const statuses = getStatusesForCaseType(caseType);
  const currentIndex = getStatusIndex(caseType, currentStatus);

  if (compact) {
    const percent = currentIndex === -1 ? 0 : Math.round(((currentIndex + 1) / statuses.length) * 100);
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              percent === 100 ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {currentIndex + 1}/{statuses.length}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {statuses.map((status, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div key={status} className="flex items-center">
              <div className="flex flex-col items-center min-w-[80px]">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all',
                    isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                    isCurrent && 'bg-primary border-primary text-primary-foreground',
                    isFuture && 'bg-background border-muted-foreground/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] mt-1 text-center leading-tight max-w-[80px]',
                    isCurrent && 'font-semibold text-foreground',
                    isFuture && 'text-muted-foreground',
                    isCompleted && 'text-emerald-600'
                  )}
                >
                  {status}
                </span>
              </div>
              {index < statuses.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-6 mt-[-16px]',
                    index < currentIndex ? 'bg-emerald-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
