
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { month: 'ינו', revenue: 185000, clients: 32 },
  { month: 'פבר', revenue: 210000, clients: 38 },
  { month: 'מרץ', revenue: 195000, clients: 45 },
  { month: 'אפר', revenue: 245000, clients: 41 },
  { month: 'מאי', revenue: 230000, clients: 52 },
  { month: 'יונ', revenue: 278000, clients: 48 },
  { month: 'יול', revenue: 290000, clients: 55 },
];

const formatCurrency = (value: number) => `₪${(value / 1000).toFixed(0)}K`;

export function ProjectStats() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-display font-semibold text-foreground">מגמת הכנסות</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">סקירה חודשית של הכנסות המשרד</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
              <span className="text-muted-foreground">הכנסות</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214.3, 31.8%, 91.4%)" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: 'hsl(215.4, 16.3%, 46.9%)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(215.4, 16.3%, 46.9%)', fontSize: 12 }}
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={(value: number) => [`₪${value.toLocaleString()}`, 'הכנסות']}
                contentStyle={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  border: '1px solid hsl(214.3, 31.8%, 91.4%)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  fontSize: '13px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
