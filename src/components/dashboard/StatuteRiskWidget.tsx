// Dashboard widget showing tort claims at risk of statute of limitations expiry

import { useMemo } from 'react';
import { AlertTriangle, Gavel, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getUrgentStatuteClaims } from '@/lib/nizkin/api';
import { CLAIM_TYPE_LABELS } from '@/lib/tortClaimTypes';

export function StatuteRiskWidget() {
  const navigate = useOrgNavigate();

  const urgentClaims = useMemo(() => {
    try {
      return getUrgentStatuteClaims();
    } catch {
      return [];
    }
  }, []);

  if (urgentClaims.length === 0) return null;

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span>תביעות בסיכון התיישנות</span>
          <Badge variant="destructive" className="mr-auto text-xs">{urgentClaims.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {urgentClaims.slice(0, 5).map(claim => (
          <div
            key={claim.id}
            className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            onClick={() => navigate(`/nizkin/${claim.id}`)}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Gavel className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{claim.plaintiff_name}</p>
                <p className="text-xs text-muted-foreground">{CLAIM_TYPE_LABELS[claim.claim_type]}</p>
              </div>
            </div>
            <div className="text-left shrink-0 mr-2">
              <p className={`text-sm font-bold ${claim.statute.daysRemaining < 30 ? 'text-red-600' : 'text-orange-600'}`}>
                {claim.statute.daysRemaining} ימים
              </p>
              <p className="text-[10px] text-muted-foreground">
                עד {new Date(claim.statute.deadline).toLocaleDateString('he-IL')}
              </p>
            </div>
          </div>
        ))}
        {urgentClaims.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">ועוד {urgentClaims.length - 5} תביעות...</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1 text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => navigate('/nizkin')}
        >
          צפה בכל התביעות <ArrowLeft className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
