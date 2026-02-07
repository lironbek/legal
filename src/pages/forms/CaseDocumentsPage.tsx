import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Search,
  Upload,
  FileText,
  Image,
  File,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { getDocumentsByCase, Document, deleteDocument } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function CaseDocumentsPage() {
  const navigate = useNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const location = useLocation();
  const caseTitle = location.state?.caseTitle || '';

  const [searchTerm, setSearchTerm] = useState('');
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);

  const loadDocuments = () => {
    if (caseId) {
      const documents = getDocumentsByCase(caseId);
      setAllDocuments(documents);
      setFilteredDocuments(documents);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [caseId]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredDocuments(allDocuments);
      return;
    }

    const filtered = allDocuments.filter(
      (doc) =>
        doc.title.includes(value) ||
        doc.description.includes(value) ||
        doc.tags.includes(value) ||
        doc.category.includes(value) ||
        doc.fileName.includes(value)
    );

    setFilteredDocuments(filtered);
  };

  const handleBack = () => {
    navigate('/cases');
  };

  const handleUploadNew = () => {
    navigate(`/cases/${caseId}/documents/upload`, {
      state: { caseTitle }
    });
  };

  const handleViewDocument = (documentId: string) => {
    // TODO: Implement document viewer
    alert(`צפייה במסמך ${documentId}`);
  };

  const handleEditDocument = (documentId: string) => {
    // TODO: Implement document editor
    alert(`עריכת מסמך ${documentId}`);
  };

  const handleDeleteDocument = (documentId: string, documentTitle: string) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את המסמך "${documentTitle}"?`);
    if (confirmed) {
      const success = deleteDocument(documentId);
      if (success) {
        loadDocuments(); // Refresh the list
        alert('המסמך נמחק בהצלחה');
      } else {
        alert('שגיאה במחיקת המסמך');
      }
    }
  };

  const handleDownloadDocument = (documentId: string, fileName: string) => {
    // TODO: Implement actual file download
    alert(`הורדת קובץ: ${fileName}`);
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'תמונה': return <Image className="h-5 w-5 text-green-600" />;
      case 'PDF': return <FileText className="h-5 w-5 text-red-600" />;
      case 'Word': return <FileText className="h-5 w-5 text-primary" />;
      default: return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'contract': 'חוזה',
      'court-document': 'מסמך בית משפט',
      'correspondence': 'התכתבות',
      'evidence': 'ראיה',
      'legal-opinion': 'חוות דעת',
      'invoice': 'חשבונית',
      'receipt': 'קבלה',
      'identification': 'זיהוי',
      'other': 'אחר'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            חזרה לתיקים
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">מסמכי התיק</h1>
            <p className="text-muted-foreground mt-1">
              {caseTitle ? `תיק: ${caseTitle}` : 'מסמכי התיק'}
            </p>
            {caseId && (
              <p className="text-sm text-muted-foreground mt-1">מספר תיק: {caseId}</p>
            )}
          </div>
        </div>
        <Button className="gap-2" onClick={handleUploadNew}>
          <Plus className="h-4 w-4" /> הוסף מסמך
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <CardTitle className="text-foreground">
              מסמכים ({filteredDocuments.length})
            </CardTitle>
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש במסמכים..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-9 pr-4"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold">סוג</TableHead>
                  <TableHead className="font-semibold">שם המסמך</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">קטגוריה</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">גודל</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">תאריך העלאה</TableHead>
                  <TableHead className="font-semibold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {allDocuments.length === 0 ?
                        "אין מסמכים בתיק זה. לחץ על 'הוסף מסמך' כדי להתחיל." :
                        "לא נמצאו מסמכים התואמים לחיפוש."
                      }
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center justify-center">
                          {getFileIcon(document.fileType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{document.title}</p>
                          <p className="text-sm text-muted-foreground">{document.fileName}</p>
                          {document.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {document.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {document.category && (
                          <Badge variant="outline" className="text-primary">
                            {getCategoryText(document.category)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {document.fileSize}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {new Date(document.createdAt).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDocument(document.id)}
                            title="צפייה במסמך"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleDownloadDocument(document.id, document.fileName)}
                            title="הורדת מסמך"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditDocument(document.id)}
                            title="עריכת מסמך"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteDocument(document.id, document.title)}
                            title="מחיקת מסמך"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
