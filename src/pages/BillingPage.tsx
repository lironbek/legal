import { useState } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { toast } from 'sonner';
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
  TableRow
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  DollarSign,
  Search,
  TrendingUp,
  AlertCircle,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TablePagination, usePagination } from '@/components/shared/TablePagination';

const statusVariants: Record<string, string> = {
  'שולם': 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'ממתין לתשלום': 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  'נשלח': 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  'טיוטה': 'bg-muted text-muted-foreground border border-border',
  'באיחור': 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
};

const mockInvoices = [
  {
    id: 'INV-001',
    invoiceNumber: '2024-001',
    client: 'יוסף אברהם',
    case: 'תביעת נזיקין',
    issueDate: '2024-06-01',
    dueDate: '2024-06-30',
    amount: 12500,
    status: 'שולם',
    hours: 25,
    rate: 500
  },
  {
    id: 'INV-002',
    invoiceNumber: '2024-002',
    client: 'משפחת לוי',
    case: 'הסכם מקרקעין',
    issueDate: '2024-06-05',
    dueDate: '2024-07-05',
    amount: 8000,
    status: 'ממתין לתשלום',
    hours: 20,
    rate: 400
  },
  {
    id: 'INV-003',
    invoiceNumber: '2024-003',
    client: 'דוד כהן',
    case: 'תיק פלילי',
    issueDate: '2024-06-10',
    dueDate: '2024-07-10',
    amount: 15000,
    status: 'נשלח',
    hours: 30,
    rate: 500
  },
  {
    id: 'INV-004',
    invoiceNumber: '2024-004',
    client: 'חברת אלפא בע"מ',
    case: 'ערעור מס הכנסה',
    issueDate: '2024-06-12',
    dueDate: '2024-07-12',
    amount: 24000,
    status: 'טיוטה',
    hours: 40,
    rate: 600
  },
  {
    id: 'INV-005',
    invoiceNumber: '2024-005',
    client: 'רונית אברהם',
    case: 'סכסוך עבודה',
    issueDate: '2024-06-15',
    dueDate: '2024-06-20',
    amount: 6000,
    status: 'באיחור',
    hours: 15,
    rate: 400
  }
];

export default function BillingPage() {
  const navigate = useOrgNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredInvoices = searchTerm.trim()
    ? mockInvoices.filter(
        (invoice) =>
          invoice.client.includes(searchTerm) ||
          invoice.case.includes(searchTerm) ||
          invoice.invoiceNumber.includes(searchTerm)
      )
    : mockInvoices;

  const { paginate, totalPages, totalItems, pageSize } = usePagination(filteredInvoices, 10);
  const paginatedInvoices = paginate(currentPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleNewInvoice = () => {
    navigate('/billing/new');
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/billing/${invoiceId}`);
  };

  const handleDownloadInvoice = (invoiceId: string) => {
    const invoice = mockInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      toast.success(`מוריד חשבונית ${invoice.invoiceNumber}`);
    }
  };

  const handleSendInvoice = (invoiceId: string) => {
    const invoice = mockInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      toast.success(`חשבונית ${invoice.invoiceNumber} נשלחה ללקוח ${invoice.client}`);
    }
  };

  const totalInvoices = mockInvoices.length;
  const totalRevenue = mockInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = mockInvoices.filter(inv => inv.status === 'שולם').length;
  const overdue = mockInvoices.filter(inv => inv.status === 'באיחור').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="חיובים וחשבוניות"
        subtitle="ניהול חשבוניות, מעקב תשלומים וחיובים ללקוחות"
        actions={
          <Button className="gap-2" onClick={handleNewInvoice}>
            <Plus className="h-4 w-4" /> חשבונית חדשה
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">סה"כ חשבוניות</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">{totalInvoices}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-blue-light))] flex items-center justify-center">
                <FileText className="h-5 w-5 text-[hsl(var(--accent-blue))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">סה"כ הכנסות</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">₪{totalRevenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-emerald-light))] flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-[hsl(var(--accent-emerald))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">שולמו</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums mt-1">{paidInvoices}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-cyan-light))] flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[hsl(var(--accent-cyan))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">באיחור</p>
                <p className="text-2xl font-semibold text-destructive tabular-nums mt-1">{overdue}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-rose-light))] flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-[hsl(var(--accent-rose))]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">חשבוניות ותשלומים</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי לקוח, תיק או מספר חשבונית..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pr-9 pl-4"
              />
            </div>
            <div className="flex gap-2">
              <Select>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="overdue">באיחור</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="תקופה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">החודש</SelectItem>
                  <SelectItem value="quarter">הרבעון</SelectItem>
                  <SelectItem value="year">השנה</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>מספר חשבונית</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>תיק</TableHead>
                  <TableHead className="hidden lg:table-cell">תאריך הנפקה</TableHead>
                  <TableHead className="hidden lg:table-cell">פירעון</TableHead>
                  <TableHead>סכום</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      אין חשבוניות להצגה
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell className="text-muted-foreground">{invoice.case}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{invoice.issueDate}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{invoice.dueDate}</TableCell>
                      <TableCell className="font-semibold tabular-nums">₪{invoice.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusVariants[invoice.status] || 'bg-muted text-muted-foreground'}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice.id)}>
                            צפייה
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" dir="rtl">
                              <DropdownMenuItem onClick={() => handleDownloadInvoice(invoice.id)}>
                                הורדה
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                שליחה ללקוח
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {paginatedInvoices.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">אין חשבוניות להצגה</p>
            ) : (
              paginatedInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 space-y-2" onClick={() => handleViewInvoice(invoice.id)}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{invoice.client}</span>
                    <Badge variant="secondary" className={statusVariants[invoice.status] || 'bg-muted text-muted-foreground'}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{invoice.invoiceNumber} · {invoice.case}</span>
                    <span className="font-semibold tabular-nums">₪{invoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    פירעון: {invoice.dueDate}
                  </div>
                </div>
              ))
            )}
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
