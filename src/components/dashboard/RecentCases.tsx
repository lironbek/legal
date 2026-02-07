
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const recentCases = [
  {
    id: '2024-001',
    title: 'תביעת נזיקין - אברהם נגד החברה הכלכלית',
    client: 'יוסף אברהם',
    status: 'בטיפול',
    statusColor: 'bg-blue-500',
    lastActivity: 'לפני 2 שעות',
    nextDeadline: '15/06/2024',
  },
  {
    id: '2024-002',
    title: 'הסכם מקרקעין - רכישת דירה',
    client: 'משפחת לוי',
    status: 'ממתין לחתימה',
    statusColor: 'bg-amber-500',
    lastActivity: 'לפני יום',
    nextDeadline: '20/06/2024',
  },
  {
    id: '2024-003',
    title: 'תיק פלילי - הגנה על נהג',
    client: 'דוד כהן',
    status: 'הושלם',
    statusColor: 'bg-emerald-500',
    lastActivity: 'לפני 3 ימים',
    nextDeadline: '-',
  },
];

export function RecentCases() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display font-semibold text-foreground">
            תיקים אחרונים
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary text-sm"
            onClick={() => navigate('/cases')}
          >
            צפה בכל התיקים
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentCases.map((case_) => (
            <div
              key={case_.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {case_.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{case_.client}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{case_.nextDeadline}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-left shrink-0 mr-3">
                <Badge className={`${case_.statusColor} text-white text-xs`}>
                  {case_.status}
                </Badge>
                <p className="text-[11px] text-muted-foreground mt-1">{case_.lastActivity}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
