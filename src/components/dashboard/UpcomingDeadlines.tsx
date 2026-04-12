import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, Calendar, CalendarCheck } from 'lucide-react';
import { getEvents, getCases } from '@/lib/dataManager';

const priorityConfig: Record<string, { text: string; bg: string; color: string; dotColor: string }> = {
  high:   { text: 'דחוף',  bg: '#fee2e2', color: '#b91c1c', dotColor: '#ef4444' },
  גבוהה:  { text: 'דחוף',  bg: '#fee2e2', color: '#b91c1c', dotColor: '#ef4444' },
  medium: { text: 'בינוני', bg: '#fef3c7', color: '#b45309', dotColor: '#f59e0b' },
  בינונית: { text: 'בינוני', bg: '#fef3c7', color: '#b45309', dotColor: '#f59e0b' },
  low:    { text: 'נמוך',  bg: '#d1fae5', color: '#047857', dotColor: '#10b981' },
  נמוכה:   { text: 'נמוך',  bg: '#d1fae5', color: '#047857', dotColor: '#10b981' },
};

interface Deadline {
  id: string;
  title: string;
  date: string;
  time: string;
  priority: string;
  daysLeft: number;
}

export function UpcomingDeadlines() {
  const deadlines = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result: Deadline[] = [];

    // Get upcoming events (next 30 days)
    const events = getEvents();
    for (const ev of events) {
      if (!ev.date) continue;
      const evDate = new Date(ev.date);
      if (evDate < today) continue;
      const diffMs = evDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft > 30) continue;
      result.push({
        id: `ev-${ev.id}`,
        title: ev.title,
        date: evDate.toLocaleDateString('he-IL'),
        time: ev.startTime || '',
        priority: ev.priority || 'medium',
        daysLeft,
      });
    }

    // Get upcoming hearing dates from cases
    const cases = getCases();
    for (const c of cases) {
      if (!c.nextHearingDate) continue;
      const hearingDate = new Date(c.nextHearingDate);
      if (hearingDate < today) continue;
      const diffMs = hearingDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysLeft > 30) continue;
      result.push({
        id: `case-${c.id}`,
        title: `דיון: ${c.title || c.caseNumber || c.id}`,
        date: hearingDate.toLocaleDateString('he-IL'),
        time: '',
        priority: daysLeft <= 3 ? 'high' : daysLeft <= 7 ? 'medium' : 'low',
        daysLeft,
      });
    }

    // Sort by date (soonest first), deduplicate by title+date
    const seen = new Set<string>();
    return result
      .sort((a, b) => a.daysLeft - b.daysLeft)
      .filter((d) => {
        const key = `${d.title}|${d.date}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, []);

  if (deadlines.length === 0) {
    return (
      <Card className="shadow-md border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-primary" />
            מועדים קרובים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CalendarCheck className="h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">אין מועדים קרובים</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          מועדים קרובים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {deadlines.map((deadline) => {
            const config = priorityConfig[deadline.priority] || priorityConfig.medium;
            return (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 hover:shadow-sm hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: config.dotColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">
                      {deadline.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{deadline.date}</span>
                      </div>
                      {deadline.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{deadline.time}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left shrink-0 mr-3">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: config.bg, color: config.color }}
                  >
                    {config.text}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    {deadline.daysLeft === 0 ? 'היום' : `בעוד ${deadline.daysLeft} ימים`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
