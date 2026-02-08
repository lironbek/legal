import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Save,
  Scan,
  File,
  ImageIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { scanDocument, ScanResult, ScannedDocumentData, getDocumentTypeLabel, updateScannedDocument } from '@/lib/documentScanService';
import { getCases, getClients } from '@/lib/dataManager';
import { useAuth } from '@/contexts/AuthContext';

interface FileWithStatus {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: ScanResult;
}

export default function UploadDocumentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [reviewDoc, setReviewDoc] = useState<FileWithStatus | null>(null);
  const [reviewEdits, setReviewEdits] = useState<Partial<ScannedDocumentData>>({});
  const [linkCase, setLinkCase] = useState('');
  const [linkClient, setLinkClient] = useState('');

  const cases = getCases();
  const clients = getClients();

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(f => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.pdf') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
             ext.endsWith('.png') || ext.endsWith('.webp') || ext.endsWith('.heic');
    });

    const fileItems: FileWithStatus[] = validFiles.map(file => ({
      file,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      status: 'pending',
      progress: 0,
    }));

    setFiles(prev => [...prev, ...fileItems]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFile = async (fileItem: FileWithStatus) => {
    setFiles(prev => prev.map(f =>
      f.id === fileItem.id ? { ...f, status: 'processing', progress: 50 } : f
    ));

    const result = await scanDocument(fileItem.file, undefined, user?.id);

    setFiles(prev => prev.map(f =>
      f.id === fileItem.id
        ? {
            ...f,
            status: result.success ? 'completed' : 'error',
            progress: 100,
            result,
          }
        : f
    ));
  };

  const processAllFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    for (const fileItem of pendingFiles) {
      await processFile(fileItem);
    }
  };

  const openReview = (fileItem: FileWithStatus) => {
    setReviewDoc(fileItem);
    setReviewEdits(fileItem.result?.data || {});
    setLinkCase('');
    setLinkClient('');
  };

  const handleSaveReview = async () => {
    if (!reviewDoc?.result?.documentId) return;

    await updateScannedDocument(reviewDoc.result.documentId, {
      ...reviewEdits as any,
      status: 'verified',
      linked_case_id: linkCase || null,
      linked_client_id: linkClient || null,
    });

    setReviewDoc(null);
  };

  const getFileIcon = (file: File) => {
    if (file.type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (file.type.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: FileWithStatus['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-muted-foreground">ממתין</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">מעלה</Badge>;
      case 'processing':
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <Loader2 className="h-3 w-3 ml-1 animate-spin" />
            מעבד
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3 ml-1" />
            הושלם
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 ml-1" />
            שגיאה
          </Badge>
        );
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const completedCount = files.filter(f => f.status === 'completed').length;
  const processingCount = files.filter(f => f.status === 'processing').length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="סריקת מסמכים"
        subtitle="העלה מסמכים לסריקה אוטומטית באמצעות בינה מלאכותית"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/documents')}>
              חזרה למסמכים
            </Button>
            {files.length > 0 && (
              <Button variant="outline" onClick={() => navigate('/scanned-documents')}>
                מסמכים סרוקים ({completedCount})
              </Button>
            )}
          </div>
        }
      />

      {/* Drop Zone */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 cursor-pointer
              ${isDragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
              }
            `}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                isDragging ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <Upload className={`h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isDragging ? 'שחרר כאן להעלאה' : 'גרור קבצים לכאן או לחץ לבחירה'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  תמיכה בקבצי PDF, JPG, PNG, WebP, HEIC
                </p>
              </div>
            </div>
            <input
              id="fileInput"
              type="file"
              className="hidden"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,image/*,application/pdf"
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Scan className="h-5 w-5" />
                קבצים ({files.length})
                {completedCount > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    • {completedCount} הושלמו
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {pendingCount > 0 && (
                  <Button
                    onClick={processAllFiles}
                    disabled={processingCount > 0}
                  >
                    {processingCount > 0 ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        מעבד...
                      </>
                    ) : (
                      <>
                        <Scan className="h-4 w-4 ml-2" />
                        סרוק הכל ({pendingCount})
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map((fileItem) => (
                <div
                  key={fileItem.id}
                  className="flex items-center gap-3 p-3 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {getFileIcon(fileItem.file)}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{fileItem.file.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      {fileItem.result?.data && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-primary font-medium">
                            {getDocumentTypeLabel(fileItem.result.data.document_type)}
                          </span>
                          {fileItem.result.data.title && (
                            <>
                              <span className="text-xs text-muted-foreground">•</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {fileItem.result.data.title}
                              </span>
                            </>
                          )}
                        </>
                      )}
                      {fileItem.result?.error && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-destructive">{fileItem.result.error}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(fileItem.status)}

                    {fileItem.status === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openReview(fileItem)}
                        className="h-8"
                      >
                        <Eye className="h-3.5 w-3.5 ml-1" />
                        סקירה
                      </Button>
                    )}

                    {fileItem.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => processFile(fileItem)}
                        disabled={processingCount > 0}
                        className="h-8"
                      >
                        <Scan className="h-3.5 w-3.5 ml-1" />
                        סרוק
                      </Button>
                    )}

                    {(fileItem.status === 'pending' || fileItem.status === 'error') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(fileItem.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDoc} onOpenChange={() => setReviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              סקירת מסמך סרוק
            </DialogTitle>
          </DialogHeader>

          {reviewDoc?.result?.data && (
            <div className="space-y-4">
              {/* Document Type & Confidence */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>סוג מסמך</Label>
                  <Select
                    value={reviewEdits.document_type || ''}
                    onValueChange={(v) => setReviewEdits(prev => ({ ...prev, document_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contract">חוזה/הסכם</SelectItem>
                      <SelectItem value="pleading">כתב טענות</SelectItem>
                      <SelectItem value="court_decision">פסק דין/החלטה</SelectItem>
                      <SelectItem value="testimony">עדות/תצהיר</SelectItem>
                      <SelectItem value="invoice">חשבונית</SelectItem>
                      <SelectItem value="correspondence">התכתבות</SelectItem>
                      <SelectItem value="power_of_attorney">ייפוי כוח</SelectItem>
                      <SelectItem value="id_document">מסמך זיהוי</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>רמת ביטחון</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Badge
                      variant="outline"
                      className={
                        reviewDoc.result.data.confidence === 'high'
                          ? 'border-emerald-500 text-emerald-700'
                          : reviewDoc.result.data.confidence === 'medium'
                          ? 'border-amber-500 text-amber-700'
                          : 'border-red-500 text-red-700'
                      }
                    >
                      {reviewDoc.result.data.confidence === 'high' ? 'גבוהה' :
                       reviewDoc.result.data.confidence === 'medium' ? 'בינונית' : 'נמוכה'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>כותרת</Label>
                <Input
                  value={reviewEdits.title || ''}
                  onChange={(e) => setReviewEdits(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <Label>סיכום</Label>
                <Textarea
                  value={reviewEdits.summary || ''}
                  onChange={(e) => setReviewEdits(prev => ({ ...prev, summary: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Date & Case Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תאריך מסמך</Label>
                  <Input
                    type="date"
                    value={reviewEdits.document_date || ''}
                    onChange={(e) => setReviewEdits(prev => ({ ...prev, document_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>מספר תיק</Label>
                  <Input
                    value={reviewEdits.case_number || ''}
                    onChange={(e) => setReviewEdits(prev => ({ ...prev, case_number: e.target.value }))}
                  />
                </div>
              </div>

              {/* Parties */}
              {reviewEdits.parties && reviewEdits.parties.length > 0 && (
                <div className="space-y-2">
                  <Label>צדדים</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    {reviewEdits.parties.map((party, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="shrink-0">{party.role}</Badge>
                        <span className="text-foreground">{party.name}</span>
                        {party.id_number && (
                          <span className="text-muted-foreground text-xs">({party.id_number})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Amounts */}
              {reviewEdits.amounts && reviewEdits.amounts.length > 0 && (
                <div className="space-y-2">
                  <Label>סכומים</Label>
                  <div className="border border-border rounded-lg p-3 space-y-2">
                    {reviewEdits.amounts.map((amount, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{amount.label}</span>
                        <span className="font-medium">
                          {amount.currency === 'ILS' ? '₪' : amount.currency === 'USD' ? '$' : '€'}
                          {amount.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Link to Case/Client */}
              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label>קישור לתיק</Label>
                  <Select value={linkCase} onValueChange={setLinkCase}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תיק (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>קישור ללקוח</Label>
                  <Select value={linkClient} onValueChange={setLinkClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר לקוח (אופציונלי)" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              {reviewEdits.notes && (
                <div className="space-y-2">
                  <Label>הערות</Label>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {reviewEdits.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDoc(null)}>
              סגור
            </Button>
            <Button onClick={handleSaveReview}>
              <Save className="h-4 w-4 ml-2" />
              אשר ושמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
