// DamageHeadsBuilder - Add/remove/edit damage heads with auto-sum and court suggestion

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DAMAGE_TYPE_LABELS } from '@/lib/tortClaimTypes';
import type { DamageHead, TortDamageType, TortClaimType } from '@/lib/tortClaimTypes';
import {
  createEmptyDamageHead,
  getDefaultDamageHeads,
  calculateTotalDamages,
  suggestCourtType,
} from '@/lib/nizkin/questionnaire-engine';

interface DamageHeadsBuilderProps {
  damageHeads: DamageHead[];
  onChange: (heads: DamageHead[]) => void;
  claimType: TortClaimType;
  currentCourtType?: 'magistrate' | 'district';
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

export function DamageHeadsBuilder({ damageHeads, onChange, claimType, currentCourtType }: DamageHeadsBuilderProps) {
  const [addType, setAddType] = useState<string>('');
  const total = calculateTotalDamages(damageHeads);
  const suggestedCourt = suggestCourtType(total);
  const courtMismatch = currentCourtType && total > 0 && suggestedCourt !== currentCourtType;

  const addHead = (type: TortDamageType) => {
    onChange([...damageHeads, createEmptyDamageHead(type)]);
    setAddType('');
  };

  const updateHead = (index: number, updates: Partial<DamageHead>) => {
    const updated = [...damageHeads];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeHead = (index: number) => {
    onChange(damageHeads.filter((_, i) => i !== index));
  };

  const initDefaults = () => {
    const defaults = getDefaultDamageHeads(claimType);
    const existing = new Set(damageHeads.map(h => h.type));
    const newHeads = defaults.filter(t => !existing.has(t)).map(t => createEmptyDamageHead(t));
    onChange([...damageHeads, ...newHeads]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">ראשי נזק ({damageHeads.length})</span>
        </div>
        {damageHeads.length === 0 && (
          <Button variant="outline" size="sm" onClick={initDefaults} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            הוסף ראשי נזק מומלצים
          </Button>
        )}
      </div>

      {/* Damage head items */}
      {damageHeads.map((head, i) => (
        <Card key={i} className="border-dashed">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{DAMAGE_TYPE_LABELS[head.type]}</Badge>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 gap-1"
                onClick={() => removeHead(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                הסר
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">סכום משוער (₪)</Label>
                <Input
                  type="number"
                  value={head.amount_estimated || ''}
                  onChange={e => updateHead(i, { amount_estimated: Number(e.target.value) || 0 })}
                  min={0}
                  placeholder="0"
                />
              </div>
              <div>
                <Label className="text-xs">אסמכתא / ראיה</Label>
                <Input
                  value={head.evidence_reference}
                  onChange={e => updateHead(i, { evidence_reference: e.target.value })}
                  placeholder="מספר מסמך, חוות דעת..."
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">תיאור</Label>
              <Textarea
                value={head.description}
                onChange={e => updateHead(i, { description: e.target.value })}
                rows={2}
                placeholder="תיאור הנזק..."
              />
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add new damage head */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">הוסף ראש נזק</Label>
          <Select value={addType} onValueChange={setAddType}>
            <SelectTrigger>
              <SelectValue placeholder="בחר סוג נזק..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DAMAGE_TYPE_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          disabled={!addType}
          onClick={() => addType && addHead(addType as TortDamageType)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      {/* Total */}
      <div className="flex items-center justify-between font-bold text-lg">
        <span>סה״כ סכום התביעה</span>
        <span className="text-primary">{formatCurrency(total)}</span>
      </div>

      {/* Court warning */}
      {total > 2_500_000 && (
        <div className="flex items-center gap-2 text-sm bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-primary shrink-0" />
          <span className="text-primary">
            סכום התביעה מעל 2,500,000 ₪ - יש להגיש לבית המשפט המחוזי
          </span>
        </div>
      )}

      {courtMismatch && (
        <div className="flex items-center gap-2 text-sm bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
          <span className="text-orange-700 dark:text-orange-300">
            סוג בית המשפט שנבחר ({currentCourtType === 'magistrate' ? 'שלום' : 'מחוזי'}) לא תואם את סכום התביעה.
            מומלץ: {suggestedCourt === 'district' ? 'מחוזי' : 'שלום'}
          </span>
        </div>
      )}

      {total > 0 && !courtMismatch && (
        <p className="text-xs text-muted-foreground">
          בית משפט מומלץ: {suggestedCourt === 'district' ? 'מחוזי (מעל 2.5 מיליון ₪)' : 'שלום (עד 2.5 מיליון ₪)'}
        </p>
      )}
    </div>
  );
}
