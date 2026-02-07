
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'נזיקין', value: 47, color: '#3b82f6' },
  { name: 'מקרקעין', value: 32, color: '#06b6d4' },
  { name: 'משפחה', value: 29, color: '#10b981' },
  { name: 'פלילי', value: 21, color: '#8b5cf6' },
];

const total = data.reduce((sum, item) => sum + item.value, 0);

export function EmailChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-display font-semibold text-foreground">
          התפלגות תיקים
        </CardTitle>
        <p className="text-sm text-muted-foreground">חלוקה לפי תחום משפטי</p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          {/* Chart */}
          <div className="w-44 h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [`${value} תיקים`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(0, 0%, 100%)',
                    border: '1px solid hsl(214.3, 31.8%, 91.4%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    fontSize: '13px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground tabular-nums">{item.value}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-8 text-left">
                    {Math.round((item.value / total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
