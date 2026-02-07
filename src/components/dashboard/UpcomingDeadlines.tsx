
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock, Calendar } from 'lucide-react';

const upcomingDeadlines = [
  {
    id: 1,
    title: 'הגשת כתב הגנה - תיק אברהם',
    date: '15/06/2024',
    time: '17:00',
    priority: 'high',
    daysLeft: 2,
  },
  {
    id: 2,
    title: 'פגישה עם לקוח - משפחת לוי',
    date: '16/06/2024',
    time: '10:00',
    priority: 'medium',
    daysLeft: 3,
  },
  {
    id: 3,
    title: 'דיון בבית משפט - תיק כהן',
    date: '18/06/2024',
    time: '09:30',
    priority: 'high',
    daysLeft: 5,
  },
  {
    id: 4,
    title: 'סיום הכנת הסכם',
    date: '20/06/2024',
    time: '16:00',
    priority: 'low',
    daysLeft: 7,
  },
];

const priorityConfig = {
  high: { color: 'bg-rose-500', text: 'דחוף', badge: 'text-rose-700 bg-rose-50' },
  medium: { color: 'bg-amber-500', text: 'בינוני', badge: 'text-amber-700 bg-amber-50' },
  low: { color: 'bg-emerald-500', text: 'נמוך', badge: 'text-emerald-700 bg-emerald-50' },
};

export function UpcomingDeadlines() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary" />
          מועדים קרובים
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingDeadlines.map((deadline) => {
            const config = priorityConfig[deadline.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            return (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {deadline.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{deadline.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{deadline.time}</span>
                    </div>
                  </div>
                </div>
                <div className="text-left shrink-0 mr-3">
                  <Badge className={`${config.color} text-white text-xs`}>
                    {config.text}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    בעוד {deadline.daysLeft} ימים
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
