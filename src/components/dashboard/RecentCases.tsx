import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User, ArrowLeft, Briefcase } from 'lucide-react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getCases } from '@/lib/dataManager';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  'פעיל':       { bg: '#dbeafe', color: '#1d4ed8' },
  'בטיפול':     { bg: '#dbeafe', color: '#1d4ed8' },
  'active':     { bg: '#dbeafe', color: '#1d4ed8' },
  'ממתין':      { bg: '#fef3c7', color: '#b45309' },
  'pending':    { bg: '#fef3c7', color: '#b45309' },
  'סגור':       { bg: '#d1fae5', color: '#047857' },
  'closed':     { bg: '#d1fae5', color: '#047857' },
  'הושלם':      { bg: '#d1fae5', color: '#047857' },
};

const DEFAULT_STYLE = { bg: '#f3f4f6', color: '#4b5563' };

export function RecentCases() {
  const navigate = useOrgNavigate();

  const recentCases = useMemo(() => {
    const cases = getCases();
    return [...cases]
      .sort((a, b) => {
        const dateA = a.updatedAt || a.openingDate || '';
        const dateB = b.updatedAt || b.openingDate || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5);
  }, []);

  if (recentCases.length === 0) {
    return (
      <Card className="shadow-md border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-foreground">
            תיקים אחרונים
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-3">אין תיקים עדיין</p>
            <Button size="sm" onClick={() => navigate('/cases/new')}>
              צור תיק ראשון
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-foreground">
            תיקים אחרונים
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-sm gap-1.5 font-medium"
            onClick={() => navigate('/cases')}
          >
            צפה בכל התיקים
            <ArrowLeft className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentCases.map((c) => {
            const style = STATUS_STYLES[c.status] || DEFAULT_STYLE;
            const nextDate = c.nextHearingDate
              ? new Date(c.nextHearingDate).toLocaleDateString('he-IL')
              : null;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-4 rounded-xl border border-border/50 hover:shadow-sm hover:border-primary/30 transition-all duration-200 cursor-pointer group"
                style={{ background: 'linear-gradient(to left, transparent, hsl(var(--muted) / 0.3))' }}
                onClick={() => navigate(`/cases/${c.id}/view`)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="p-2.5 rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                    style={{ background: 'hsl(var(--primary) / 0.1)' }}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm truncate">
                      {c.title || `תיק ${c.caseNumber || c.id}`}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                      {c.client && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{c.client}</span>
                        </div>
                      )}
                      {nextDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{nextDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left shrink-0 mr-3">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ background: style.bg, color: style.color }}
                  >
                    {c.status}
                  </span>
                  {c.caseNumber && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">{c.caseNumber}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
