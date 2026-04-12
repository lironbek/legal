// StatuteWarning - Statute of limitations warning banner
// Shows red alert if <60 days, yellow if <90 days, info if >90 days

import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';
import type { StatuteResult } from '@/lib/nizkin/questionnaire-engine';

interface StatuteWarningProps {
  statute: StatuteResult | null;
  compact?: boolean;
}

export function StatuteWarning({ statute, compact }: StatuteWarningProps) {
  if (!statute) return null;

  const { isExpired, daysRemaining, label, deadline } = statute;
  const isUrgent = daysRemaining >= 0 && daysRemaining < 60;
  const isWarning = daysRemaining >= 60 && daysRemaining < 90;
  const deadlineStr = new Date(deadline).toLocaleDateString('he-IL');

  if (!isExpired && !isUrgent && !isWarning) {
    if (compact) return null;
    return (
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        <span>התיישנות: {label} | מועד אחרון: {deadlineStr} ({daysRemaining} ימים)</span>
      </div>
    );
  }

  if (compact) {
    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
          <ShieldAlert className="h-3.5 w-3.5" />
          חלף
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${isUrgent ? 'text-destructive' : 'text-yellow-700'}`}>
        <AlertTriangle className="h-3.5 w-3.5" />
        {daysRemaining}י'
      </span>
    );
  }

  if (isExpired) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-destructive">תקופת ההתיישנות חלפה!</p>
          <p className="text-sm text-destructive/80 mt-1">
            {label} - מועד אחרון היה {deadlineStr}.
            יש לבדוק האם ישנן נסיבות מיוחדות המצדיקות את האיחור.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 flex items-start gap-3 ${
      isUrgent
        ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
        : 'border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30'
    }`}>
      <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
        isUrgent ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
      }`} />
      <div>
        <p className={`text-sm font-bold ${
          isUrgent ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'
        }`}>
          {isUrgent ? 'דחוף! ' : 'תשומת לב: '}
          נותרו {daysRemaining} ימים להגשת התביעה
        </p>
        <p className={`text-sm mt-1 ${
          isUrgent ? 'text-red-600/80 dark:text-red-400/80' : 'text-yellow-600/80 dark:text-yellow-400/80'
        }`}>
          {label} - מועד אחרון: {deadlineStr}
        </p>
      </div>
    </div>
  );
}
