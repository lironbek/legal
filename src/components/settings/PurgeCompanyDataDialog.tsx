import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Company,
  type DataCategory,
  DATA_CATEGORY_LABELS,
  getCompanyDataCounts,
  purgeCompanyData,
} from '@/lib/dataManager';

interface PurgeCompanyDataDialogProps {
  company: Company | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPurgeComplete?: () => void;
}

const ALL_CATEGORIES: DataCategory[] = [
  'cases', 'clients', 'invoices', 'events', 'documents', 'cashFlowEntries', 'budgetItems',
];

export function PurgeCompanyDataDialog({ company, open, onOpenChange, onPurgeComplete }: PurgeCompanyDataDialogProps) {
  const [counts, setCounts] = useState<Record<DataCategory, number>>({} as Record<DataCategory, number>);
  const [selected, setSelected] = useState<Set<DataCategory>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (open && company) {
      const dataCounts = getCompanyDataCounts(company.id);
      setCounts(dataCounts);
      setSelected(new Set());
    }
  }, [open, company]);

  const nonEmptyCategories = ALL_CATEGORIES.filter(cat => (counts[cat] || 0) > 0);
  const allNonEmptySelected = nonEmptyCategories.length > 0 && nonEmptyCategories.every(cat => selected.has(cat));
  const totalSelected = ALL_CATEGORIES.reduce((sum, cat) => sum + (selected.has(cat) ? (counts[cat] || 0) : 0), 0);

  const toggleCategory = (cat: DataCategory) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleAll = () => {
    if (allNonEmptySelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(nonEmptyCategories));
    }
  };

  const handlePurge = () => {
    if (!company) return;
    const deleted = purgeCompanyData(company.id, Array.from(selected));
    const summary = Object.entries(deleted)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => `${DATA_CATEGORY_LABELS[key as DataCategory]}: ${count}`)
      .join(', ');
    toast.success(`נמחקו בהצלחה: ${summary}`);
    setConfirmOpen(false);
    onOpenChange(false);
    onPurgeComplete?.();
  };

  if (!company) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              מחיקת נתונים — {company.name}
            </DialogTitle>
            <DialogDescription>
              בחר את סוגי הנתונים למחיקה. הארגון עצמו לא יימחק.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Select All */}
            <div className="flex items-center gap-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={allNonEmptySelected}
                onCheckedChange={toggleAll}
                disabled={nonEmptyCategories.length === 0}
              />
              <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                בחר הכל
              </Label>
            </div>

            {/* Category checkboxes */}
            {ALL_CATEGORIES.map(cat => {
              const count = counts[cat] || 0;
              const disabled = count === 0;
              return (
                <div key={cat} className="flex items-center gap-2">
                  <Checkbox
                    id={`cat-${cat}`}
                    checked={selected.has(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                    disabled={disabled}
                  />
                  <Label
                    htmlFor={`cat-${cat}`}
                    className={`cursor-pointer flex items-center gap-2 ${disabled ? 'text-muted-foreground' : ''}`}
                  >
                    {DATA_CATEGORY_LABELS[cat]}
                    <Badge variant={disabled ? 'outline' : 'secondary'} className="text-xs">
                      {count}
                    </Badge>
                  </Label>
                </div>
              );
            })}
          </div>

          <Button
            variant="destructive"
            className="w-full gap-2"
            disabled={selected.size === 0}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            מחיקה ({totalSelected} פריטים)
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
            <AlertDialogDescription>
              האם למחוק {totalSelected} פריטים מהארגון "{company.name}"?
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurge}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק סופית
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
