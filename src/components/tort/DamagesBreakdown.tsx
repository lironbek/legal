import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface DamagesData {
  painAndSuffering?: number;
  medicalExpenses?: number;
  lostWages?: number;
  lostFutureWages?: number;
  travelExpenses?: number;
  assistanceExpenses?: number;
  otherDamages?: number;
}

interface DamagesBreakdownProps {
  data: DamagesData;
  onChange: (data: DamagesData) => void;
}

const damageFields: { key: keyof DamagesData; label: string; placeholder: string }[] = [
  { key: 'painAndSuffering', label: 'כאב וסבל', placeholder: '0' },
  { key: 'medicalExpenses', label: 'הוצאות רפואיות', placeholder: '0' },
  { key: 'lostWages', label: 'הפסד שכר (עבר)', placeholder: '0' },
  { key: 'lostFutureWages', label: 'הפסד שכר (עתיד)', placeholder: '0' },
  { key: 'travelExpenses', label: 'הוצאות נסיעה', placeholder: '0' },
  { key: 'assistanceExpenses', label: 'עזרת צד ג׳', placeholder: '0' },
  { key: 'otherDamages', label: 'נזקים נוספים', placeholder: '0' },
];

export function DamagesBreakdown({ data, onChange }: DamagesBreakdownProps) {
  const total = damageFields.reduce((sum, f) => sum + (data[f.key] || 0), 0);

  const handleChange = (key: keyof DamagesData, value: string) => {
    const num = value === '' ? undefined : Number(value);
    onChange({ ...data, [key]: num });
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">פירוט ראשי נזק</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {damageFields.map(field => (
          <div key={field.key} className="flex items-center gap-3">
            <Label className="text-sm w-36 shrink-0">{field.label}</Label>
            <div className="relative flex-1">
              <Input
                type="number"
                value={data[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="pr-8"
                min={0}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₪</span>
            </div>
          </div>
        ))}

        <Separator />

        <div className="flex items-center justify-between font-bold text-lg">
          <span>סה״כ סכום התביעה</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
