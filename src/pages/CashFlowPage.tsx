import { useState, useEffect, useMemo } from 'react';

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Switch } from '@/components/ui/switch';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  Plus,
  Search,
  Pencil,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  getCashFlowEntries,
  addCashFlowEntry,
  updateCashFlowEntry,
  deleteCashFlowEntry,
  getClients,
  getCases,
  getBudgetItems,
  updateBudgetItem,
  type CashFlowEntry,
  type Client,
  type Case,
  type BudgetItem,
} from '@/lib/dataManager';

const statusMap: Record<CashFlowEntry['status'], string> = {
  expected: 'צפוי',
  confirmed: 'מאושר',
  received: 'התקבל',
  paid: 'שולם',
};

const statusColorMap: Record<CashFlowEntry['status'], string> = {
  expected: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  confirmed: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  received: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  paid: 'bg-muted text-muted-foreground',
};

const incomeCategories = ['שכר טרחה', 'ריטיינר', 'פשרה', 'החזר הוצאות', 'אחר'];
const expenseCategories = ['שכירות', 'משכורות', 'חשמל ומים', 'ציוד משרדי', 'ביטוח', 'שיווק', 'טכנולוגיה', 'אחר'];

const emptyForm: Omit<CashFlowEntry, 'id' | 'createdAt' | 'updatedAt'> = {
  type: 'income',
  category: '',
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  isRecurring: false,
  recurringFrequency: undefined,
  client: '',
  caseRef: '',
  budgetItemId: undefined,
  status: 'expected',
  notes: '',
};

export default function CashFlowPage() {
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CashFlowEntry | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<CashFlowEntry | null>(null);

  const loadData = () => {
    setEntries(getCashFlowEntries());
    setBudgetItems(getBudgetItems());
    setClients(getClients());
    setCases(getCases());
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm.trim() ||
        entry.description.includes(searchTerm) ||
        entry.category.includes(searchTerm) ||
        (entry.client && entry.client.includes(searchTerm));

      const matchesType = typeFilter === 'all' || entry.type === typeFilter;

      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entries, searchTerm, typeFilter, statusFilter]);

  // Summary calculations
  const totalIncome = useMemo(
    () => entries.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const totalExpenses = useMemo(
    () => entries.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0),
    [entries]
  );

  const balance = totalIncome - totalExpenses;

  const currentMonthCount = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    return entries.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [entries]);

  // Dialog handlers
  const openAddDialog = (type: 'income' | 'expense') => {
    setEditingEntry(null);
    setForm({ ...emptyForm, type });
    setDialogOpen(true);
  };

  const openEditDialog = (entry: CashFlowEntry) => {
    setEditingEntry(entry);
    setForm({
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount,
      date: entry.date,
      isRecurring: entry.isRecurring,
      recurringFrequency: entry.recurringFrequency,
      client: entry.client || '',
      caseRef: entry.caseRef || '',
      budgetItemId: entry.budgetItemId,
      status: entry.status,
      notes: entry.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingEntry) {
      // If budget link changed, adjust old budget item
      if (editingEntry.budgetItemId && editingEntry.budgetItemId !== form.budgetItemId) {
        const oldBudget = budgetItems.find(b => b.id === editingEntry.budgetItemId);
        if (oldBudget) {
          updateBudgetItem(oldBudget.id, {
            actualAmount: Math.max(0, oldBudget.actualAmount - editingEntry.amount),
          });
        }
      }
      updateCashFlowEntry(editingEntry.id, form);
    } else {
      addCashFlowEntry(form);
    }

    // Update linked budget item actualAmount
    if (form.budgetItemId && form.type === 'expense') {
      const budget = budgetItems.find(b => b.id === form.budgetItemId);
      if (budget) {
        const prevAmount = editingEntry?.budgetItemId === form.budgetItemId ? editingEntry.amount : 0;
        updateBudgetItem(budget.id, {
          actualAmount: budget.actualAmount - prevAmount + form.amount,
        });
      }
    }

    setDialogOpen(false);
    setEditingEntry(null);
    setForm(emptyForm);
    loadData();
  };

  const openDeleteDialog = (entry: CashFlowEntry) => {
    setDeletingEntry(entry);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deletingEntry) {
      deleteCashFlowEntry(deletingEntry.id);
      setDeleteDialogOpen(false);
      setDeletingEntry(null);
      loadData();
    }
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('he-IL')} ₪`;
  };

  const currentCategories = form.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="תזרים מזומנים"
        subtitle="ניהול הכנסות והוצאות צפויות"
        actions={
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => openAddDialog('income')}>
                <Plus className="h-4 w-4" /> הכנסה צפויה
              </Button>
            <Button variant="outline" className="gap-2" onClick={() => openAddDialog('expense')}>
                <Plus className="h-4 w-4" /> הוצאה צפויה
              </Button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[hsl(var(--accent-emerald-light))] rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[hsl(var(--accent-emerald))]" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{formatAmount(totalIncome)}</p>
                <p className="text-muted-foreground text-sm">הכנסות צפויות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[hsl(var(--accent-rose-light))] rounded-xl flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-[hsl(var(--accent-rose))]" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{formatAmount(totalExpenses)}</p>
                <p className="text-muted-foreground text-sm">הוצאות צפויות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[hsl(var(--accent-blue-light))] rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-[hsl(var(--accent-blue))]" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{formatAmount(balance)}</p>
                <p className="text-muted-foreground text-sm">יתרה צפויה</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[hsl(var(--accent-violet-light))] rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-[hsl(var(--accent-violet))]" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{currentMonthCount}</p>
                <p className="text-muted-foreground text-sm">פעולות החודש</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <div>
        <Card className="border-border">
          {/* Filters */}
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-base font-semibold">רשימת תנועות</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חיפוש לפי תיאור, קטגוריה או לקוח..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pr-9 pl-4 border-border"
                />
              </div>
              <div className="flex gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[130px] border-border">
                    <SelectValue placeholder="סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="income">הכנסות</SelectItem>
                    <SelectItem value="expense">הוצאות</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] border-border">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="expected">צפוי</SelectItem>
                    <SelectItem value="confirmed">מאושר</SelectItem>
                    <SelectItem value="received">התקבל</SelectItem>
                    <SelectItem value="paid">שולם</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {/* Table */}
          <CardContent className="p-0">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>תאריך</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead>קטגוריה</TableHead>
                    <TableHead className="hidden md:table-cell">תיאור</TableHead>
                    <TableHead className="hidden lg:table-cell">לקוח</TableHead>
                    <TableHead>סכום</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        לא נמצאו תנועות
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((entry, index) => (
                      <tr
                        key={entry.id}
                        className="hover:bg-muted/50 border-border transition-colors group"
                      >
                        <TableCell className="text-muted-foreground">{entry.date}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              entry.type === 'income'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
                            }
                          >
                            {entry.type === 'income' ? 'הכנסה' : 'הוצאה'}
                          </Badge>
                          {entry.isRecurring && (
                            <RefreshCw className="inline h-3 w-3 text-muted-foreground mr-1" />
                          )}
                        </TableCell>
                        <TableCell className="text-foreground">
                          <span>{entry.category}</span>
                          {entry.budgetItemId && (
                            <span className="block text-[10px] text-primary/70 mt-0.5" title="משויך לתקציב">תקציב</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {entry.description}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {entry.client || '—'}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              entry.type === 'income'
                                ? 'text-emerald-600 font-bold'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {entry.type === 'income' ? '+' : '-'}
                            {formatAmount(entry.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColorMap[entry.status]}>
                            {statusMap[entry.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary hover:text-primary hover:bg-muted/50"
                              onClick={() => openEditDialog(entry)}
                              title="עריכה"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                              onClick={() => openDeleteDialog(entry)}
                              title="מחיקה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </tr>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'עריכת תנועה' : form.type === 'income' ? 'הוספת הכנסה צפויה' : 'הוספת הוצאה צפויה'}
            </DialogTitle>
            <DialogDescription>
              {editingEntry ? 'ערוך את פרטי התנועה' : 'הזן את פרטי התנועה החדשה'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Type Toggle */}
            <div className="space-y-2">
              <Label>סוג</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.type === 'income' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() =>
                    setForm({ ...form, type: 'income', category: '' })
                  }
                >
                  הכנסה
                </Button>
                <Button
                  type="button"
                  variant={form.type === 'expense' ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() =>
                    setForm({ ...form, type: 'expense', category: '', client: '', caseRef: '' })
                  }
                >
                  הוצאה
                </Button>
              </div>
            </div>

            {/* Budget Link (expense only) */}
            {form.type === 'expense' && budgetItems.length > 0 && (
              <div className="space-y-2">
                <Label>סעיף תקציבי</Label>
                <Select
                  value={form.budgetItemId || '__none__'}
                  onValueChange={(value) => {
                    if (value === '__none__') {
                      setForm({ ...form, budgetItemId: undefined });
                    } else {
                      const bi = budgetItems.find(b => b.id === value);
                      setForm({
                        ...form,
                        budgetItemId: value,
                        category: bi ? bi.category : form.category,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="שייך לסעיף תקציבי" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">ללא שיוך תקציבי</SelectItem>
                    {budgetItems.map((bi) => (
                      <SelectItem key={bi.id} value={bi.id}>
                        {bi.category}{bi.description ? ` - ${bi.description}` : ''} ({bi.plannedAmount.toLocaleString('he-IL')} ₪)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm({ ...form, category: value })}
              >
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  {currentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>תיאור</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="תיאור התנועה"
                className="border-border"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>סכום (₪)</Label>
              <Input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                placeholder="0"
                className="border-border"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>תאריך</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="border-border"
              />
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between">
              <Label>תנועה חוזרת</Label>
              <Switch
                checked={form.isRecurring}
                onCheckedChange={(checked) =>
                  setForm({
                    ...form,
                    isRecurring: checked,
                    recurringFrequency: checked ? 'monthly' : undefined,
                  })
                }
              />
            </div>

            {/* Recurring Frequency */}
            {form.isRecurring && (
              <div className="space-y-2">
                <Label>תדירות</Label>
                <Select
                  value={form.recurringFrequency || 'monthly'}
                  onValueChange={(value) =>
                    setForm({
                      ...form,
                      recurringFrequency: value as 'monthly' | 'quarterly' | 'yearly',
                    })
                  }
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="בחר תדירות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">חודשי</SelectItem>
                    <SelectItem value="quarterly">רבעוני</SelectItem>
                    <SelectItem value="yearly">שנתי</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Client (income only) */}
            {form.type === 'income' && (
              <div className="space-y-2">
                <Label>לקוח</Label>
                <Select
                  value={form.client || ''}
                  onValueChange={(value) => setForm({ ...form, client: value })}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.name}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Case (income only) */}
            {form.type === 'income' && (
              <div className="space-y-2">
                <Label>תיק</Label>
                <Select
                  value={form.caseRef || ''}
                  onValueChange={(value) => setForm({ ...form, caseRef: value })}
                >
                  <SelectTrigger className="border-border">
                    <SelectValue placeholder="בחר תיק" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status */}
            <div className="space-y-2">
              <Label>סטטוס</Label>
              <Select
                value={form.status}
                onValueChange={(value) =>
                  setForm({ ...form, status: value as CashFlowEntry['status'] })
                }
              >
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expected">צפוי</SelectItem>
                  <SelectItem value="confirmed">מאושר</SelectItem>
                  <SelectItem value="received">התקבל</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>הערות</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="הערות נוספות..."
                className="border-border"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleSave}>שמירה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תנועה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התנועה &quot;{deletingEntry?.description}&quot;?
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
