import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: 'blue' | 'emerald' | 'amber' | 'violet' | 'cyan' | 'rose';
}

const accentMap: Record<string, { gradient: string; iconBg: string; iconColor: string; borderColor: string }> = {
  blue:    { gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#4338ca' },
  emerald: { gradient: 'linear-gradient(135deg, #0ca678 0%, #20c997 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#0ca678' },
  amber:   { gradient: 'linear-gradient(135deg, #f59f00 0%, #fcc419 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#f59f00' },
  violet:  { gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#7c3aed' },
  cyan:    { gradient: 'linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#0891b2' },
  rose:    { gradient: 'linear-gradient(135deg, #e11d48 0%, #fb7185 100%)', iconBg: 'rgba(255,255,255,0.2)',  iconColor: '#fff', borderColor: '#e11d48' },
};

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  trend = 'neutral',
  accentColor = 'blue',
}: StatsCardProps) {
  const accent = accentMap[accentColor] || accentMap.blue;

  return (
    <Card
      className="relative overflow-hidden border-0 text-white hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
      style={{ background: accent.gradient }}
    >
      {/* Decorative circle */}
      <div
        className="absolute -top-6 -left-6 w-24 h-24 rounded-full"
        style={{ background: 'rgba(255,255,255,0.1)' }}
      />
      <div
        className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />

      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">
              {title}
            </p>
            <p className="text-3xl font-bold text-white tabular-nums mt-2 leading-none">
              {value}
            </p>
            {change && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {change}
                </span>
              </div>
            )}
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: accent.iconBg }}
          >
            <Icon className="h-6 w-6" style={{ color: accent.iconColor }} />
          </div>
        </div>
      </div>
    </Card>
  );
}
