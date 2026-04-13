import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Upload,
  FolderOpen,
  File,
  Image,
  Download,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getClients, Client, deleteClient, getCases, Case, getDocuments, Document, addDocument, deleteDocument } from '@/lib/dataManager';
import { storeDocumentFile, getDocumentFileUrl, getDocumentFileUrlAsync, readFileAsDataUrl, deleteDocumentFile } from '@/lib/documentFileStore';
import { TablePagination, usePagination } from '@/components/shared/TablePagination';

const CLIENT_TYPE_MAP: Record<string, string> = {
  individual: 'פרטי',
  business: 'עסקי',
  government: 'ממשלתי',
  'non-profit': 'מלכ"ר',
};

const DOC_CATEGORY_LABELS: Record<string, string> = {
  contract: 'חוזה',
  'court-document': 'מסמך בית משפט',
  correspondence: 'התכתבות',
  evidence: 'ראיה',
  'legal-opinion': 'חוות דעת',
  invoice: 'חשבונית',
  receipt: 'קבלה',
  identification: 'זיהוי',
  medical: 'רפואי',
  other: 'אחר',
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
  const [uploadClient, setUploadClient] = useState<Client | null>(null);
  const [docRefreshKey, setDocRefreshKey] = useState(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewClient, docRefreshKey]);

  // Load file URLs from IndexedDB asynchronously
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (clientDocuments.length === 0) { setFileUrls({}); return; }
    let cancelled = false;
    (async () => {
      const urls: Record<string, string> = {};
      for (const doc of clientDocuments) {
        // Try sync first (memory), then async (IndexedDB)
        const sync = getDocumentFileUrl(doc.id);
        if (sync) {
          urls[doc.id] = sync;
        } else {
          const async_ = await getDocumentFileUrlAsync(doc.id);
          if (async_) urls[doc.id] = async_;
        }
      }
      if (!cancelled) setFileUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [clientDocuments]);

  const handleDeleteDocument = (docId: string, docTitle: string) => {
    const success = deleteDocument(docId);
    if (success) {
      deleteDocumentFile(docId); // clean up file data from IndexedDB
      setDocRefreshKey(k => k + 1);
      toast.success(`המסמך "${docTitle}" הוסר מהתיק`);
    }
  };

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
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => setViewClient(client)}>
                                <Eye className="ml-2 h-4 w-4" />
                                צפייה בפרטים
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}/edit`)}>
                                <Edit className="ml-2 h-4 w-4" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setUploadClient(client)}>
                                <Upload className="ml-2 h-4 w-4" />
                                תיוק מסמך
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    מסמכים ({clientDocuments.length})
                  </h4>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => {
                      const c = viewClient;
                      setViewClient(null);
                      setTimeout(() => setUploadClient(c), 250);
                    }}
                  >
                    <Upload className="h-3 w-3" />
                    תייק מסמך
                  </Button>
                </div>
                {clientDocuments.length === 0 ? (
                  <div className="text-center py-6">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">אין מסמכים מתוייקים</p>
                    <p className="text-xs text-muted-foreground mt-1">לחץ על "תייק מסמך" להוספת מסמך ראשון</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientDocuments.map((doc) => {
                      const fileUrl = fileUrls[doc.id] || null;
                      const displayTitle = doc.title && doc.title.length < 40 ? doc.title : doc.fileName || doc.title;
                      const categoryLabel = DOC_CATEGORY_LABELS[doc.category] || doc.category;
                      const isImage = doc.fileType === 'תמונה' || ['jpg','jpeg','png','gif'].some(ext => doc.fileName?.toLowerCase().endsWith(ext));
                      const isPdf = doc.fileType === 'PDF' || doc.fileName?.toLowerCase().endsWith('.pdf');

                      return (
                        <div key={doc.id} className="rounded-lg border border-border overflow-hidden">
                          {/* Image preview */}
                          {isImage && fileUrl && (
                            <div
                              className="h-32 bg-muted/30 flex items-center justify-center cursor-pointer overflow-hidden"
                              onClick={() => window.open(fileUrl, '_blank')}
                            >
                              <img src={fileUrl} alt={displayTitle} className="max-h-full max-w-full object-contain" />
                            </div>
                          )}
                          {/* PDF preview indicator */}
                          {isPdf && fileUrl && !isImage && (
                            <div
                              className="h-20 bg-red-50 dark:bg-red-950/20 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                              onClick={() => window.open(fileUrl, '_blank')}
                            >
                              <FileText className="h-8 w-8 text-red-500" />
                              <div>
                                <p className="text-sm font-medium text-red-700 dark:text-red-400">מסמך PDF</p>
                                <p className="text-xs text-red-500/70">לחץ לפתיחה</p>
                              </div>
                            </div>
                          )}
                          {/* Document info row */}
                          <div className="flex items-center gap-3 p-3">
                            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isPdf ? 'bg-red-100 dark:bg-red-900/30' :
                              isImage ? 'bg-emerald-100 dark:bg-emerald-900/30' :
                              'bg-muted'
                            }`}>
                              {isPdf ? <FileText className="h-4 w-4 text-red-600 dark:text-red-400" /> :
                               isImage ? <Image className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> :
                               <File className="h-4 w-4 text-muted-foreground" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{displayTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.fileSize && `${doc.fileSize} · `}
                                {new Date(doc.createdAt).toLocaleDateString('he-IL')}
                                {categoryLabel && ` · ${categoryLabel}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {fileUrl ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="צפייה במסמך"
                                    onClick={() => window.open(fileUrl, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="הורדה"
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = fileUrl;
                                      a.download = doc.fileName || doc.title;
                                      a.click();
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-40"
                                  title="הקובץ לא זמין לצפייה"
                                  onClick={() => toast.info('הקובץ לא זמין לצפייה — יש להעלות אותו מחדש')}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="הסר מהתיק"
                                onClick={() => handleDeleteDocument(doc.id, displayTitle)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <Separator />
              <div className="flex gap-2 py-4 flex-wrap">
                <Button className="flex-1 gap-2" onClick={() => { setViewClient(null); navigate(`/clients/${viewClient.id}/edit`); }}>
                  <Edit className="h-4 w-4" />
                  עריכת לקוח
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => {
                  const c = viewClient;
                  setViewClient(null);
                  setTimeout(() => setUploadClient(c), 250);
                }}>
                  <Upload className="h-4 w-4" />
                  תיוק מסמך
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

      {/* Upload Document Dialog */}
      {uploadClient && (
        <ClientDocumentUploadDialog
          client={uploadClient}
          onClose={() => setUploadClient(null)}
          onUploaded={() => {
            loadClients();
            setDocRefreshKey(k => k + 1);
          }}
        />
      )}
    </div>
  );
}

// ── Upload Document Dialog ──────────────────────────────────────────

interface ClientDocumentUploadDialogProps {
  client: Client;
  onClose: () => void;
  onUploaded: () => void;
}

function ClientDocumentUploadDialog({ client, onClose, onUploaded }: ClientDocumentUploadDialogProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [caseId, setCaseId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clientCases = useMemo(() => {
    return getCases().filter(c => c.client === client.name || c.clientId === client.id);
  }, [client]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
      if (!title && files[0]) setTitle(files[0].name.replace(/\.[^/.]+$/, ''));
    }
  }, [title]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
      if (!title && files[0]) setTitle(files[0].name.replace(/\.[^/.]+$/, ''));
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (['doc', 'docx'].includes(ext || '')) return 'Word';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'תמונה';
    if (['xlsx', 'xls'].includes(ext || '')) return 'Excel';
    return 'אחר';
  };

  const getFileIcon = (fileName: string) => {
    const type = getFileType(fileName);
    if (type === 'תמונה') return <Image className="h-4 w-4 text-emerald-600" />;
    if (type === 'PDF') return <FileText className="h-4 w-4 text-red-600" />;
    if (type === 'Word') return <FileText className="h-4 w-4 text-blue-600" />;
    return <File className="h-4 w-4 text-muted-foreground" />;
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      toast.error('יש לבחור לפחות קובץ אחד');
      return;
    }
    if (!title.trim()) {
      toast.error('יש להזין כותרת למסמך');
      return;
    }

    setSaving(true);
    for (const file of selectedFiles) {
      const doc = addDocument({
        title: selectedFiles.length === 1 ? title : `${title} - ${file.name}`,
        category: category || 'other',
        client: client.name,
        case: caseId === '__none' ? '' : caseId,
        description,
        tags: '',
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: getFileType(file.name),
        status: 'פעיל',
      });
      // Store file content for viewing/downloading (await so it's ready before closing)
      const dataUrl = await readFileAsDataUrl(file);
      await storeDocumentFile(doc.id, dataUrl);
    }
    setSaving(false);

    toast.success(
      selectedFiles.length === 1
        ? `המסמך "${title}" תוייק בהצלחה`
        : `${selectedFiles.length} מסמכים תוייקו בהצלחה`
    );
    onUploaded();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            תיוק מסמך — {client.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            <Upload className={`h-8 w-8 mx-auto mb-2 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className="text-sm font-medium">{dragActive ? 'שחרר כאן' : 'גרור קבצים לכאן או לחץ לבחירה'}</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, Word, Excel, תמונות ועוד</p>
          </div>

          {/* Selected files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
              {selectedFiles.map((file, i) => (
                <div key={i} className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm">
                  {getFileIcon(file.name)}
                  <span className="flex-1 truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-sm">כותרת *</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="כותרת המסמך"
            />
          </div>

          {/* Category + Case */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">קטגוריה</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר קטגוריה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">חוזה</SelectItem>
                  <SelectItem value="court-document">מסמך בית משפט</SelectItem>
                  <SelectItem value="correspondence">התכתבות</SelectItem>
                  <SelectItem value="evidence">ראיה</SelectItem>
                  <SelectItem value="legal-opinion">חוות דעת</SelectItem>
                  <SelectItem value="invoice">חשבונית</SelectItem>
                  <SelectItem value="receipt">קבלה</SelectItem>
                  <SelectItem value="identification">זיהוי</SelectItem>
                  <SelectItem value="medical">רפואי</SelectItem>
                  <SelectItem value="other">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">שייך לתיק</Label>
              <Select value={caseId} onValueChange={setCaseId}>
                <SelectTrigger>
                  <SelectValue placeholder="כללי (ללא תיק)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">כללי (ללא תיק)</SelectItem>
                  {clientCases.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-sm">תיאור</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="תיאור המסמך (אופציונלי)"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 gap-2"
              onClick={handleSubmit}
              disabled={selectedFiles.length === 0 || !title.trim() || saving}
            >
              <Upload className="h-4 w-4" />
              {saving ? 'שומר...' : selectedFiles.length > 1 ? `תייק ${selectedFiles.length} מסמכים` : 'תייק מסמך'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>ביטול</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
