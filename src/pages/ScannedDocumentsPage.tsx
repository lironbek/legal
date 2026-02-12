import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Upload,
  FileText,
  Eye,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  MessageSquare,
  Globe,
  Save,
  Filter,
  Scan,
  Link as LinkIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  ScannedDocument,
  getScannedDocumentsAsync,
  getScannedDocuments,
  updateScannedDocument,
  deleteScannedDocument,
  getDocumentTypeLabel,
} from '@/lib/documentScanService';
import { getCases, getClients } from '@/lib/dataManager';
export default function ScannedDocumentsPage() {
  const navigate = useOrgNavigate();
  const [documents, setDocuments] = useState<ScannedDocument[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<ScannedDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [loading, setLoading] = useState(true);
  const [reviewDoc, setReviewDoc] = useState<ScannedDocument | null>(null);
  const [linkCase, setLinkCase] = useState('');
  const [linkClient, setLinkClient] = useState('');

  const cases = getCases();
  const clients = getClients();

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await getScannedDocumentsAsync();
      setDocuments(docs);
    } catch {
      // Fallback to sync local version
      setDocuments(getScannedDocuments());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    let result = [...documents];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d =>
        (d.title || '').toLowerCase().includes(term) ||
        (d.summary || '').toLowerCase().includes(term) ||
        (d.file_name || '').toLowerCase().includes(term) ||
        (d.case_number || '').toLowerCase().includes(term) ||
        (d.raw_text_excerpt || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'all') {
      result = result.filter(d => d.document_type === filterType);
    }

    if (filterStatus !== 'all') {
      result = result.filter(d => d.status === filterStatus);
    }

    if (filterSource !== 'all') {
      result = result.filter(d => d.source === filterSource);
    }

    setFilteredDocs(result);
  }, [documents, searchTerm, filterType, filterStatus, filterSource]);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`האם למחוק את המסמך "${title || 'ללא כותרת'}"?`)) return;
    const success = await deleteScannedDocument(id);
    if (success) {
      await loadDocuments();
    }
  };

  const openReview = (doc: ScannedDocument) => {
    setReviewDoc(doc);
    setLinkCase(doc.linked_case_id || '');
    setLinkClient(doc.linked_client_id || '');
  };

  const handleSaveReview = async () => {
    if (!reviewDoc) return;
    await updateScannedDocument(reviewDoc.id, {
      status: 'verified',
      linked_case_id: linkCase || null,
      linked_client_id: linkClient || null,
    });
    setReviewDoc(null);
    await loadDocuments();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="h-3 w-3 ml-1 animate-spin" />
            בעיבוד
          </Badge>
        );
      case 'needs_verification':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Clock className="h-3 w-3 ml-1" />
            לאימות
          </Badge>
        );
      case 'verified':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 ml-1" />
            מאומת
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 ml-1" />
            שגיאה
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    return source === 'whatsapp' ? (
      <Badge variant="outline" className="text-green-600 border-green-300">
        <MessageSquare className="h-3 w-3 ml-1" />
        WhatsApp
      </Badge>
    ) : (
      <Badge variant="outline" className="text-blue-600 border-blue-300">
        <Globe className="h-3 w-3 ml-1" />
        אתר
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="מסמכים סרוקים"
        subtitle="ניהול מסמכים שנסרקו באמצעות AI"
        actions={
          <Button onClick={() => navigate('/documents/upload')}>
            <Upload className="h-4 w-4 ml-2" />
            סרוק מסמך חדש
          </Button>
        }
      />

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש במסמכים..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 ml-2" />
                <SelectValue placeholder="סוג מסמך" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסוגים</SelectItem>
                <SelectItem value="contract">חוזה/הסכם</SelectItem>
                <SelectItem value="pleading">כתב טענות</SelectItem>
                <SelectItem value="court_decision">פסק דין</SelectItem>
                <SelectItem value="testimony">עדות/תצהיר</SelectItem>
                <SelectItem value="invoice">חשבונית</SelectItem>
                <SelectItem value="correspondence">התכתבות</SelectItem>
                <SelectItem value="power_of_attorney">ייפוי כוח</SelectItem>
                <SelectItem value="id_document">מסמך זיהוי</SelectItem>
                <SelectItem value="other">אחר</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                <SelectItem value="needs_verification">לאימות</SelectItem>
                <SelectItem value="verified">מאומת</SelectItem>
                <SelectItem value="processing">בעיבוד</SelectItem>
                <SelectItem value="error">שגיאה</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="מקור" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל המקורות</SelectItem>
                <SelectItem value="web">אתר</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Scan className="h-5 w-5" />
            מסמכים ({filteredDocs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="mr-2 text-muted-foreground">טוען מסמכים...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {documents.length === 0
                  ? 'אין מסמכים סרוקים. העלה מסמך חדש לסריקה.'
                  : 'לא נמצאו מסמכים התואמים לסינון.'}
              </p>
              {documents.length === 0 && (
                <Button
                  className="mt-4"
                  onClick={() => navigate('/documents/upload')}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  סרוק מסמך ראשון
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">סוג</TableHead>
                    <TableHead className="font-semibold">כותרת</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">תאריך</TableHead>
                    <TableHead className="hidden md:table-cell font-semibold">מקור</TableHead>
                    <TableHead className="font-semibold">סטטוס</TableHead>
                    <TableHead className="font-semibold">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Badge variant="outline" className="text-primary whitespace-nowrap">
                          {getDocumentTypeLabel(doc.document_type || 'other')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {doc.title || doc.file_name}
                          </p>
                          {doc.summary && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {doc.summary}
                            </p>
                          )}
                          {doc.case_number && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              תיק: {doc.case_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {doc.document_date
                          ? new Date(doc.document_date).toLocaleDateString('he-IL')
                          : new Date(doc.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getSourceBadge(doc.source)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doc.status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openReview(doc)}
                            title="צפייה"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(doc.id, doc.title || doc.file_name)}
                            title="מחיקה"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              פרטי מסמך סרוק
            </DialogTitle>
          </DialogHeader>

          {reviewDoc && (
            <div className="space-y-4">
              {/* Type + Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-primary">
                  {getDocumentTypeLabel(reviewDoc.document_type || 'other')}
                </Badge>
                {getStatusBadge(reviewDoc.status)}
                {getSourceBadge(reviewDoc.source)}
                {reviewDoc.confidence && (
                  <Badge
                    variant="outline"
                    className={
                      reviewDoc.confidence === 'high'
                        ? 'border-emerald-500 text-emerald-700'
                        : reviewDoc.confidence === 'medium'
                        ? 'border-amber-500 text-amber-700'
                        : 'border-red-500 text-red-700'
                    }
                  >
                    ביטחון: {reviewDoc.confidence === 'high' ? 'גבוה' :
                             reviewDoc.confidence === 'medium' ? 'בינוני' : 'נמוך'}
                  </Badge>
                )}
              </div>

              {/* Title & Summary */}
              <div className="space-y-2">
                <Label className="font-semibold">כותרת</Label>
                <p className="text-sm">{reviewDoc.title || reviewDoc.file_name}</p>
              </div>

              {reviewDoc.summary && (
                <div className="space-y-2">
                  <Label className="font-semibold">סיכום</Label>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {reviewDoc.summary}
                  </p>
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                {reviewDoc.document_date && (
                  <div>
                    <Label className="font-semibold text-xs text-muted-foreground">תאריך מסמך</Label>
                    <p className="text-sm">{new Date(reviewDoc.document_date).toLocaleDateString('he-IL')}</p>
                  </div>
                )}
                {reviewDoc.case_number && (
                  <div>
                    <Label className="font-semibold text-xs text-muted-foreground">מספר תיק</Label>
                    <p className="text-sm">{reviewDoc.case_number}</p>
                  </div>
                )}
                {reviewDoc.court_name && (
                  <div>
                    <Label className="font-semibold text-xs text-muted-foreground">בית משפט</Label>
                    <p className="text-sm">{reviewDoc.court_name}</p>
                  </div>
                )}
              </div>

              {/* Parties */}
              {reviewDoc.parties && reviewDoc.parties.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold">צדדים</Label>
                  <div className="border border-border rounded-lg p-3 space-y-1.5">
                    {reviewDoc.parties.map((party: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0 text-xs">{party.role}</Badge>
                        <span>{party.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts */}
              {reviewDoc.amounts && reviewDoc.amounts.length > 0 && (
                <div className="space-y-2">
                  <Label className="font-semibold">סכומים</Label>
                  <div className="border border-border rounded-lg p-3 space-y-1.5">
                    {reviewDoc.amounts.map((amount: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{amount.label}</span>
                        <span className="font-medium">
                          {amount.currency === 'ILS' ? '₪' : amount.currency === 'USD' ? '$' : '€'}
                          {amount.amount?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to Case/Client */}
              <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5" />
                    קישור לתיק
                  </Label>
                  <Select value={linkCase} onValueChange={setLinkCase}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תיק" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <LinkIcon className="h-3.5 w-3.5" />
                    קישור ללקוח
                  </Label>
                  <Select value={linkClient} onValueChange={setLinkClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Info */}
              <div className="text-xs text-muted-foreground border-t pt-3 flex items-center gap-4">
                <span>קובץ: {reviewDoc.file_name}</span>
                {reviewDoc.file_size && (
                  <span>{(reviewDoc.file_size / 1024 / 1024).toFixed(2)} MB</span>
                )}
                <span>נוצר: {new Date(reviewDoc.created_at).toLocaleDateString('he-IL')}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDoc(null)}>
              סגור
            </Button>
            {reviewDoc?.status !== 'verified' && (
              <Button onClick={handleSaveReview}>
                <Save className="h-4 w-4 ml-2" />
                אשר מסמך
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
