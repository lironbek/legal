import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { DEFENDANT_TYPE_LABELS } from '@/lib/tortClaimTypes';
import type { TortDefendant } from '@/lib/tortClaimTypes';

interface DefendantFormProps {
  defendants: TortDefendant[];
  onChange: (defendants: TortDefendant[]) => void;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const createEmptyDefendant = (): TortDefendant => ({
  id: generateId(),
  name: '',
  address: '',
  city: '',
  type: 'individual',
});

export function DefendantForm({ defendants, onChange }: DefendantFormProps) {
  const addDefendant = () => {
    onChange([...defendants, createEmptyDefendant()]);
  };

  const removeDefendant = (id: string) => {
    onChange(defendants.filter(d => d.id !== id));
  };

  const updateDefendant = (id: string, field: keyof TortDefendant, value: string) => {
    onChange(defendants.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  return (
    <div className="space-y-4">
      {defendants.map((defendant, index) => (
        <Card key={defendant.id} className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">נתבע {index + 1}</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => removeDefendant(defendant.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">סוג</Label>
                <Select
                  value={defendant.type}
                  onValueChange={v => updateDefendant(defendant.id, 'type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEFENDANT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">שם מלא</Label>
                <Input
                  value={defendant.name}
                  onChange={e => updateDefendant(defendant.id, 'name', e.target.value)}
                  placeholder="שם הנתבע"
                />
              </div>
              <div>
                <Label className="text-xs">ת.ז. / ח.פ.</Label>
                <Input
                  value={defendant.idNumber || ''}
                  onChange={e => updateDefendant(defendant.id, 'idNumber', e.target.value)}
                  placeholder="מספר זיהוי"
                />
              </div>
              <div>
                <Label className="text-xs">תפקיד / יחס</Label>
                <Input
                  value={defendant.role || ''}
                  onChange={e => updateDefendant(defendant.id, 'role', e.target.value)}
                  placeholder='לדוגמה: הנהג, המעביד, הרופא'
                />
              </div>
              <div>
                <Label className="text-xs">כתובת</Label>
                <Input
                  value={defendant.address}
                  onChange={e => updateDefendant(defendant.id, 'address', e.target.value)}
                  placeholder="רחוב ומספר"
                />
              </div>
              <div>
                <Label className="text-xs">עיר</Label>
                <Input
                  value={defendant.city}
                  onChange={e => updateDefendant(defendant.id, 'city', e.target.value)}
                  placeholder="עיר"
                />
              </div>
            </div>

            {(defendant.type === 'insurance' || defendant.type === 'company') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-xs">שם חברת ביטוח</Label>
                  <Input
                    value={defendant.insurerName || ''}
                    onChange={e => updateDefendant(defendant.id, 'insurerName', e.target.value)}
                    placeholder="שם חברת הביטוח"
                  />
                </div>
                <div>
                  <Label className="text-xs">מספר פוליסה</Label>
                  <Input
                    value={defendant.policyNumber || ''}
                    onChange={e => updateDefendant(defendant.id, 'policyNumber', e.target.value)}
                    placeholder="מספר פוליסה"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={addDefendant}
      >
        <Plus className="ml-2 h-4 w-4" />
        הוסף נתבע
      </Button>
    </div>
  );
}
