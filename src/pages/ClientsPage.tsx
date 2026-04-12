import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  PlusCircle,
  Search,
  Building2,
  User,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  MoreHorizontal,
  X,
  Calendar,
  Hash,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { toast } from 'sonner';
import { getClients, Client, deleteClient, getCases, Case, getDocuments, Document } from '@/lib/dataManager';
import { TablePagination, usePagination } from '@/components/shared/TablePagination';

const CLIENT_TYPE_MAP: Record<string, string> = {
  individual: 'פרטי',
  business: 'עסקי',
  government: 'ממשלתי',
  'non-profit': 'מלכ"ר',
};

function getClientTypeLabel(type: string) {
  return CLIENT_TYPE_MAP[type] || type || 'פרטי';
}

export default function ClientsPage() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const loadClients = () => {
    setAllClients(getClients());
  };

  useEffect(() => {
    loadClients();
    const onSync = () => loadClients();
    window.addEventListener('supabase-sync-complete', onSync);
    return () => window.removeEventListener('supabase-sync-complete', onSync);
  }, []);

  useEffect(() => {
    if (location.pathname.endsWith('/clients')) loadClients();
  }, [location.pathname]);

  const filteredClients = useMemo(() => {
    let result = [...allClients];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.idNumber.includes(q) ||
          c.id.includes(q)
      );
    }

    if (filterType !== 'all') {
      result = result.filter((c) => c.clientType === filterType);
    }

    if (filterStatus !== 'all') {
      result = result.filter((c) =>
        filterStatus === 'active' ? c.status === 'פעיל' : c.status !== 'פעיל'
      );
    }

    return result;
  }, [allClients, searchTerm, filterType, filterStatus]);

  const { paginate, totalPages, totalItems, pageSize } = usePagination(filteredClients, 10);
  const paginatedClients = paginate(currentPage);

  // Client detail data
  const clientCases = useMemo(() => {
    if (!viewClient) return [];
    return getCases().filter((c: Case) => c.client === viewClient.name);
  }, [viewClient]);

  const clientDocuments = useMemo(() => {
    if (!viewClient) return [];
    return getDocuments().filter((d: Document) => d.client === viewClient.name);
  }, [viewClient]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteClient = (clientId: string, clientName: string) => {
    setDeleteTarget({ id: clientId, name: clientName });
  };

  const confirmDeleteClient = () => {
    if (deleteTarget) {
      const success = deleteClient(deleteTarget.id);
      if (success) {
        loadClients();
        toast.success(`לקוח ${deleteTarget.name} נמחק בהצלחה`);
      } else {
        toast.error('שגיאה במחיקת הלקוח');
      }
    }
    setDeleteTarget(null);
  };

  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all' || searchTerm;

  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const statsActive = allClients.filter(c => c.status === 'פעיל').length;
  const statsBusiness = allClients.filter(c => c.clientType === 'business').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול לקוחות"
        subtitle="ניהול מידע לקוחות, מעקב תיקים וקשר עם לקוחות"
        actions={
          <Button className="gap-2" onClick={() => navigate('/clients/new')}>
            <PlusCircle className="h-4 w-4" /> לקוח חדש
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allClients.length}</p>
              <p className="text-xs text-muted-foreground">סה"כ לקוחות</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsActive}</p>
              <p className="text-xs text-muted-foreground">פעילים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{statsBusiness}</p>
              <p className="text-xs text-muted-foreground">עסקיים</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{allClients.length - statsActive}</p>
              <p className="text-xs text-muted-foreground">לא פעילים</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם, אימייל, טלפון או ת.ז..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pr-9 pl-4"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end flex-wrap">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">סוג לקוח</label>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="כל הסוגים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    <SelectItem value="individual">פרטי</SelectItem>
                    <SelectItem value="business">עסקי</SelectItem>
                    <SelectItem value="government">ממשלתי</SelectItem>
                    <SelectItem value="non-profit">מלכ"ר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">סטטוס</label>
                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="כל הסטטוסים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                  נקה פילטרים
                </Button>
              )}

              <div className="sm:mr-auto" />
              <p className="text-sm text-muted-foreground">{filteredClients.length} לקוחות</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="rounded-md border border-border bg-card shadow-md mx-4 mb-4 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>לקוח</TableHead>
                    <TableHead className="hidden lg:table-cell">ת.ז.</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead className="hidden lg:table-cell">טלפון</TableHead>
                    <TableHead className="hidden xl:table-cell">אימייל</TableHead>
                    <TableHead>תיקים</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead className="w-[80px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">אין לקוחות להצגה</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchTerm ? 'נסה לחפש במונחים אחרים' : 'לחץ על "לקוח חדש" כדי להתחיל'}
                            </p>
                          </div>
                          {!searchTerm && (
                            <Button size="sm" className="mt-2 gap-2" onClick={() => navigate('/clients/new')}>
                              <PlusCircle className="h-4 w-4" /> הוסף לקוח ראשון
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedClients.map((client, idx) => (
                      <TableRow
                        key={client.id}
                        className="border-border cursor-pointer transition-colors hover:bg-muted/40"
                        onClick={() => setViewClient(client)}
                      >
                        <TableCell className="text-muted-foreground text-xs">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                              client.status === 'פעיל'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              {client.clientType === 'business' ? (
                                <Building2 className="h-4 w-4" />
                              ) : (
                                <User className="h-4 w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{client.name}</p>
                              <p className="text-xs text-muted-foreground lg:hidden truncate">
                                {client.phone}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-sm">
                          {client.idNumber || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs font-normal">
                            {getClientTypeLabel(client.clientType)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm" dir="ltr">
                          {client.phone || '-'}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground text-sm truncate max-w-[200px]" dir="ltr">
                          {client.email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {client.activeCases || 0}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              client.status === 'פעיל'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-100'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {client.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" dir="rtl">
                              <DropdownMenuItem onClick={() => setViewClient(client)}>
                                <Eye className="ml-2 h-4 w-4" />
                                צפייה בפרטים
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/edit`)}>
                                <Edit className="ml-2 h-4 w-4" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteClient(client.id, client.name)}
                              >
                                <Trash2 className="ml-2 h-4 w-4" />
                                מחיקה
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-border">
            {paginatedClients.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">אין לקוחות להצגה</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchTerm ? 'נסה לחפש במונחים אחרים' : 'לחץ על "לקוח חדש" כדי להתחיל'}
                </p>
              </div>
            ) : (
              paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="p-4 space-y-2 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setViewClient(client)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        client.status === 'פעיל' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        {client.clientType === 'business' ? (
                          <Building2 className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{getClientTypeLabel(client.clientType)}</p>
                      </div>
                    </div>
                    <Badge className={`text-xs ${
                      client.status === 'פעיל'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                    }`}>
                      {client.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pr-12">
                    {client.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {client.phone}
                      </span>
                    )}
                    {client.activeCases > 0 && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {client.activeCases} תיקים
                      </span>
                    )}
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

      {/* Client Detail Sheet */}
      <Sheet open={!!viewClient} onOpenChange={(open) => !open && setViewClient(null)}>
        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
          {viewClient && (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    viewClient.status === 'פעיל' ? 'bg-primary/10' : 'bg-muted'
                  }`}>
                    {viewClient.clientType === 'business' ? (
                      <Building2 className="h-6 w-6 text-primary" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{viewClient.name}</SheetTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {getClientTypeLabel(viewClient.clientType)}
                      </Badge>
                      <Badge className={`text-xs ${
                        viewClient.status === 'פעיל'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-100'
                      }`}>
                        {viewClient.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Contact Info */}
              <div className="space-y-3 py-4">
                <h4 className="text-sm font-medium text-foreground">פרטי קשר</h4>
                <div className="grid gap-3">
                  {viewClient.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span dir="ltr">{viewClient.phone}</span>
                    </div>
                  )}
                  {viewClient.secondaryPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span dir="ltr">{viewClient.secondaryPhone}</span>
                      <span className="text-xs text-muted-foreground">(משני)</span>
                    </div>
                  )}
                  {viewClient.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span dir="ltr">{viewClient.email}</span>
                    </div>
                  )}
                  {(viewClient.address || viewClient.city) && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>
                        {[viewClient.address, viewClient.city, viewClient.postalCode].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {viewClient.idNumber && (
                    <div className="flex items-center gap-3 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>ת.ז. {viewClient.idNumber}</span>
                    </div>
                  )}
                  {viewClient.createdAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>לקוח מ-{new Date(viewClient.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra Info */}
              {(viewClient.religion || viewClient.familyStatus || viewClient.healthFund) && (
                <>
                  <Separator />
                  <div className="space-y-3 py-4">
                    <h4 className="text-sm font-medium text-foreground">מידע נוסף</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {viewClient.religion && (
                        <div>
                          <span className="text-muted-foreground">דת: </span>
                          <span>{viewClient.religion}</span>
                        </div>
                      )}
                      {viewClient.familyStatus && (
                        <div>
                          <span className="text-muted-foreground">מצב משפחתי: </span>
                          <span>{viewClient.familyStatus}</span>
                        </div>
                      )}
                      {viewClient.healthFund && (
                        <div>
                          <span className="text-muted-foreground">קופ"ח: </span>
                          <span>{viewClient.healthFund}</span>
                        </div>
                      )}
                      {viewClient.childrenUnder18 != null && viewClient.childrenUnder18 > 0 && (
                        <div>
                          <span className="text-muted-foreground">ילדים מתחת ל-18: </span>
                          <span>{viewClient.childrenUnder18}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {viewClient.notes && (
                <>
                  <Separator />
                  <div className="space-y-2 py-4">
                    <h4 className="text-sm font-medium text-foreground">הערות</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewClient.notes}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Cases */}
              <div className="space-y-3 py-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  תיקים ({clientCases.length})
                </h4>
                {clientCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין תיקים משויכים ללקוח זה</p>
                ) : (
                  <div className="space-y-2">
                    {clientCases.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => { setViewClient(null); navigate(`/cases/${c.id}/view`); }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.caseNumber || c.id}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0 mr-2">
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Documents */}
              <div className="space-y-3 py-4">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  מסמכים ({clientDocuments.length})
                </h4>
                {clientDocuments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">אין מסמכים משויכים ללקוח זה</p>
                ) : (
                  <div className="space-y-2">
                    {clientDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border"
                      >
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileType && `${doc.fileType} · `}
                            {doc.fileSize && `${doc.fileSize} · `}
                            {new Date(doc.createdAt).toLocaleDateString('he-IL')}
                          </p>
                        </div>
                        {doc.category && (
                          <Badge variant="outline" className="text-xs shrink-0">{doc.category}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex gap-2 py-4">
                <Button className="flex-1 gap-2" onClick={() => { setViewClient(null); navigate(`/clients/${viewClient.id}/edit`); }}>
                  <Edit className="h-4 w-4" />
                  עריכת לקוח
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => setViewClient(null)}>
                  סגור
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת לקוח</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את הלקוח "{deleteTarget?.name}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteClient}
            >
              מחק לקוח
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
