
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

type AccentColor = 'blue' | 'emerald' | 'cyan' | 'amber' | 'purple' | 'rose';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: AccentColor;
}

const gradients: Record<AccentColor, string> = {
  blue: 'from-blue-500 to-blue-600',
  emerald: 'from-emerald-500 to-emerald-600',
  cyan: 'from-cyan-500 to-cyan-600',
  amber: 'from-amber-500 to-amber-600',
  purple: 'from-purple-500 to-purple-600',
  rose: 'from-rose-500 to-rose-600',
};

const trendBadges = {
  up: { bg: 'bg-emerald-50 text-emerald-700', symbol: '↑' },
  down: { bg: 'bg-rose-50 text-rose-700', symbol: '↓' },
  neutral: { bg: 'bg-slate-50 text-slate-600', symbol: '→' },
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  accentColor = 'blue',
}: StatsCardProps) {
  const badge = trendBadges[trend];

  return (
    <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2.5 bg-gradient-to-br ${gradients[accentColor]} rounded-xl shadow-sm`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-display text-foreground tabular-nums mb-1">
          {value}
        </div>
        {change && (
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-md ${badge.bg}`}>
              {badge.symbol} {change}
            </span>
            <span className="text-xs text-muted-foreground">מהחודש הקודם</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
