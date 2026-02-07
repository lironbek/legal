import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Target,
  Receipt,
  Percent,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getBudgetItems,
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  type BudgetItem,
} from '@/lib/dataManager';

const CATEGORIES = [
  'משכורות ושכר',
  'שכירות ואחזקה',
  'חשמל ומים',
  'ציוד משרדי',
  'טכנולוגיה ותוכנה',
  'שיווק ופרסום',
  'ביטוחים',
  'הוצאות משפטיות',
  'הכשרות והשתלמויות',
  'אחר',
];

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

type PeriodType = 'monthly' | 'quarterly' | 'yearly';

interface FormData {
  category: string;
  description: string;
  plannedAmount: string;
  actualAmount: string;
  periodType: PeriodType;
  period: string;
  notes: string;
}

const emptyForm: FormData = {
  category: '',
  description: '',
  plannedAmount: '',
  actualAmount: '',
  periodType: 'monthly',
  period: '',
  notes: '',
};

function getCurrentPeriod(periodType: PeriodType): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (periodType) {
    case 'monthly':
      return `${year}-${String(month).padStart(2, '0')}`;
    case 'quarterly': {
      const quarter = Math.ceil(month / 3);
      return `${year}-Q${quarter}`;
    }
    case 'yearly':
      return `${year}`;
  }
}

function formatPeriodDisplay(period: string, periodType: PeriodType): string {
  switch (periodType) {
    case 'monthly': {
      const [year, monthStr] = period.split('-');
      const monthIndex = parseInt(monthStr, 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${HEBREW_MONTHS[monthIndex]} ${year}`;
      }
      return period;
    }
    case 'quarterly':
      return period.replace('-', ' ');
    case 'yearly':
      return period;
  }
}

function navigatePeriod(period: string, periodType: PeriodType, direction: 1 | -1): string {
  switch (periodType) {
    case 'monthly': {
      const [yearStr, monthStr] = period.split('-');
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) + direction;
      if (month < 1) { month = 12; year--; }
      if (month > 12) { month = 1; year++; }
      return `${year}-${String(month).padStart(2, '0')}`;
    }
    case 'quarterly': {
      const [yearStr, qStr] = period.split('-Q');
      let year = parseInt(yearStr, 10);
      let quarter = parseInt(qStr, 10) + direction;
      if (quarter < 1) { quarter = 4; year--; }
      if (quarter > 4) { quarter = 1; year++; }
      return `${year}-Q${quarter}`;
    }
    case 'yearly': {
      const year = parseInt(period, 10) + direction;
      return `${year}`;
    }
  }
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('he-IL')} \u20AA`;
}

export default function BudgetPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [currentPeriod, setCurrentPeriod] = useState(() => getCurrentPeriod('monthly'));
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BudgetItem | null>(null);

  const loadItems = () => {
    setItems(getBudgetItems());
  };

  useEffect(() => {
    loadItems();
  }, []);

  // When periodType changes, reset currentPeriod to current
  const handlePeriodTypeChange = (newType: PeriodType) => {
    setPeriodType(newType);
    setCurrentPeriod(getCurrentPeriod(newType));
  };

  // Filtered items by period type, period, and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesPeriod = item.periodType === periodType && item.period === currentPeriod;
      if (!searchTerm.trim()) return matchesPeriod;
      return (
        matchesPeriod &&
        (item.category.includes(searchTerm) || item.description.includes(searchTerm))
      );
    });
  }, [items, periodType, currentPeriod, searchTerm]);

  // Summary calculations
  const plannedTotal = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.plannedAmount, 0),
    [filteredItems]
  );
  const actualTotal = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.actualAmount, 0),
    [filteredItems]
  );
  const utilizationPercent = plannedTotal > 0 ? Math.round((actualTotal / plannedTotal) * 100) : 0;
  const isOverBudget = actualTotal > plannedTotal;

  // Open add dialog
  const handleAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm, periodType, period: currentPeriod });
    setDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      description: item.description,
      plannedAmount: String(item.plannedAmount),
      actualAmount: String(item.actualAmount),
      periodType: item.periodType,
      period: item.period,
      notes: item.notes,
    });
    setDialogOpen(true);
  };

  // Save (add or update)
  const handleSave = () => {
    const payload = {
      category: formData.category,
      description: formData.description,
      plannedAmount: parseFloat(formData.plannedAmount) || 0,
      actualAmount: parseFloat(formData.actualAmount) || 0,
      periodType: formData.periodType,
      period: formData.period,
      notes: formData.notes,
    };

    if (editingItem) {
      updateBudgetItem(editingItem.id, payload);
    } else {
      addBudgetItem(payload);
    }

    setDialogOpen(false);
    setEditingItem(null);
    setFormData(emptyForm);
    loadItems();
  };

  // Delete
  const handleDeleteConfirm = () => {
    if (deletingItem) {
      deleteBudgetItem(deletingItem.id);
      setDeleteDialogOpen(false);
      setDeletingItem(null);
      loadItems();
    }
  };

  const handleDeleteClick = (item: BudgetItem) => {
    setDeletingItem(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="תקציב"
        subtitle="תכנון ומעקב תקציבי"
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2" onClick={handleAdd}>
              <Plus className="h-4 w-4" /> + סעיף תקציב
            </Button>
          </motion.div>
        }
      />

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Total Budget */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(plannedTotal)}</p>
                <p className="text-muted-foreground text-sm">תקציב כולל</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actual Spending */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isOverBudget ? 'bg-rose-100' : 'bg-emerald-100'}`}>
                <Receipt className={`h-6 w-6 ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`} />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(actualTotal)}</p>
                <p className="text-muted-foreground text-sm">ביצוע בפועל</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Utilization Percent */}
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                utilizationPercent > 100 ? 'bg-rose-100' : utilizationPercent > 80 ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <Percent className={`h-6 w-6 ${
                  utilizationPercent > 100 ? 'text-rose-600' : utilizationPercent > 80 ? 'text-amber-600' : 'text-emerald-600'
                }`} />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{utilizationPercent}%</p>
                <p className="text-muted-foreground text-sm">אחוז ניצול</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Period Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Period Type Tabs */}
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {([
                  { value: 'monthly' as PeriodType, label: 'חודשי' },
                  { value: 'quarterly' as PeriodType, label: 'רבעוני' },
                  { value: 'yearly' as PeriodType, label: 'שנתי' },
                ]).map((tab) => (
                  <Button
                    key={tab.value}
                    variant="ghost"
                    size="sm"
                    className={`px-4 ${
                      periodType === tab.value
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => handlePeriodTypeChange(tab.value)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>

              {/* Period Navigation */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentPeriod(navigatePeriod(currentPeriod, periodType, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="text-foreground font-semibold min-w-[120px] text-center">
                  {formatPeriodDisplay(currentPeriod, periodType)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setCurrentPeriod(navigatePeriod(currentPeriod, periodType, -1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Budget Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">סעיפי תקציב</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש לפי קטגוריה או תיאור..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 border-border"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="text-foreground font-semibold">קטגוריה</TableHead>
                    <TableHead className="text-foreground font-semibold">תיאור</TableHead>
                    <TableHead className="text-foreground font-semibold">תקציב מתוכנן</TableHead>
                    <TableHead className="text-foreground font-semibold">ביצוע בפועל</TableHead>
                    <TableHead className="text-foreground font-semibold">הפרש</TableHead>
                    <TableHead className="text-foreground font-semibold">ניצול %</TableHead>
                    <TableHead className="text-foreground font-semibold">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        לא נמצאו סעיפי תקציב לתקופה זו
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item, index) => {
                      const diff = item.plannedAmount - item.actualAmount;
                      const pct = item.plannedAmount > 0
                        ? Math.round((item.actualAmount / item.plannedAmount) * 100)
                        : 0;
                      const barWidth = Math.min(pct, 100);
                      const isItemOver = pct > 100;

                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-muted/50 border-border transition-colors group"
                        >
                          <TableCell>
                            <Badge variant="outline" className="text-foreground border-border">
                              {item.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground">{item.description}</TableCell>
                          <TableCell className="text-foreground font-medium">
                            {formatCurrency(item.plannedAmount)}
                          </TableCell>
                          <TableCell className="text-foreground font-medium">
                            {formatCurrency(item.actualAmount)}
                          </TableCell>
                          <TableCell>
                            <span className={diff >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
                              {diff >= 0 ? '+' : ''}{formatCurrency(diff)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${isItemOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${barWidth}%` }}
                                />
                              </div>
                              <span className={`text-sm font-medium ${isItemOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {pct}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-muted/50"
                                onClick={() => handleEdit(item)}
                                title="עריכה"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                                onClick={() => handleDeleteClick(item)}
                                title="מחיקה"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingItem ? 'עריכת סעיף תקציב' : 'הוספת סעיף תקציב'}
            </DialogTitle>
            <DialogDescription>
              {editingItem ? 'ערוך את פרטי סעיף התקציב' : 'מלא את הפרטים להוספת סעיף תקציב חדש'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Category */}
            <div className="grid gap-2">
              <Label htmlFor="category" className="text-foreground">קטגוריה</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description" className="text-foreground">תיאור</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-border"
                placeholder="תיאור הסעיף"
              />
            </div>

            {/* Planned Amount */}
            <div className="grid gap-2">
              <Label htmlFor="plannedAmount" className="text-foreground">תקציב מתוכנן (₪)</Label>
              <Input
                id="plannedAmount"
                type="number"
                value={formData.plannedAmount}
                onChange={(e) => setFormData({ ...formData, plannedAmount: e.target.value })}
                className="border-border"
                placeholder="0"
              />
            </div>

            {/* Actual Amount */}
            <div className="grid gap-2">
              <Label htmlFor="actualAmount" className="text-foreground">ביצוע בפועל (₪)</Label>
              <Input
                id="actualAmount"
                type="number"
                value={formData.actualAmount}
                onChange={(e) => setFormData({ ...formData, actualAmount: e.target.value })}
                className="border-border"
                placeholder="0"
              />
            </div>

            {/* Period Type */}
            <div className="grid gap-2">
              <Label htmlFor="periodType" className="text-foreground">סוג תקופה</Label>
              <Select
                value={formData.periodType}
                onValueChange={(value: PeriodType) =>
                  setFormData({
                    ...formData,
                    periodType: value,
                    period: getCurrentPeriod(value),
                  })
                }
              >
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="בחר סוג תקופה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">חודשי</SelectItem>
                  <SelectItem value="quarterly">רבעוני</SelectItem>
                  <SelectItem value="yearly">שנתי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="grid gap-2">
              <Label htmlFor="period" className="text-foreground">תקופה</Label>
              <Input
                id="period"
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                className="border-border"
                placeholder="לדוגמה: 2024-07, 2024-Q1, 2024"
              />
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-foreground">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="border-border"
                placeholder="הערות נוספות..."
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={!formData.category || !formData.period}>
              {editingItem ? 'עדכון' : 'שמירה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">מחיקת סעיף תקציב</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הסעיף &quot;{deletingItem?.description}&quot;?
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
