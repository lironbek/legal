import { useState } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
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
  Calendar,
  User,
  Download,
  Eye,
  Upload,
  Search,
  FolderOpen,
  File,
  FileImage,
  FileSpreadsheet
} from 'lucide-react';

const mockDocuments = [
  {
    id: 'DOC-001',
    name: 'כתב הגנה - תיק אברהם',
    type: 'pdf',
    client: 'יוסף אברהם',
    case: 'תביעת נזיקין',
    category: 'כתבי טענות',
    uploadDate: '2024-06-15',
    fileSize: '2.5 MB',
    status: 'חתום',
    statusColor: 'bg-green-500',
    lastModified: 'לפני 2 ימים'
  },
  {
    id: 'DOC-002',
    name: 'הסכם מקרקעין - לוי',
    type: 'pdf',
    client: 'משפחת לוי',
    case: 'הסכם מקרקעין',
    category: 'חוזים',
    uploadDate: '2024-06-10',
    fileSize: '1.8 MB',
    status: 'טיוטה',
    statusColor: 'bg-blue-500',
    lastModified: 'לפני 5 ימים'
  },
  {
    id: 'DOC-003',
    name: 'עדות מומחה - כהן',
    type: 'doc',
    client: 'דוד כהן',
    case: 'תיק פלילי',
    category: 'עדויות',
    uploadDate: '2024-06-08',
    fileSize: '890 KB',
    status: 'מוכן',
    statusColor: 'bg-purple-500',
    lastModified: 'לפני שבוע'
  },
  {
    id: 'DOC-004',
    name: 'דוח חקירה - אלפא',
    type: 'pdf',
    client: 'חברת אלפא',
    case: 'ערעור מס',
    category: 'דוחות',
    uploadDate: '2024-06-12',
    fileSize: '3.2 MB',
    status: 'בבדיקה',
    statusColor: 'bg-blue-500',
    lastModified: 'לפני 3 ימים'
  },
  {
    id: 'DOC-005',
    name: 'תצהיר - רונית אברהם',
    type: 'pdf',
    client: 'רונית אברהם',
    case: 'סכסוך עבודה',
    category: 'תצהירים',
    uploadDate: '2024-06-14',
    fileSize: '1.1 MB',
    status: 'חתום',
    statusColor: 'bg-green-500',
    lastModified: 'אתמול'
  }
];

const documentCategories = [
  { name: 'כתבי טענות', count: 12, icon: FileText },
  { name: 'חוזים', count: 8, icon: File },
  { name: 'עדויות', count: 15, icon: FileText },
  { name: 'דוחות', count: 6, icon: FileSpreadsheet },
  { name: 'תצהירים', count: 9, icon: FileText },
  { name: 'תמונות', count: 23, icon: FileImage }
];

export default function DocumentsPage() {
  const navigate = useOrgNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDocuments, setFilteredDocuments] = useState(mockDocuments);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredDocuments(mockDocuments);
      return;
    }

    const filtered = mockDocuments.filter(
      (doc) =>
        doc.name.includes(value) ||
        doc.client.includes(value) ||
        doc.case.includes(value) ||
        doc.category.includes(value)
    );

    setFilteredDocuments(filtered);
  };

  const handleUploadDocument = () => {
    navigate('/documents/upload');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      case 'jpg':
      case 'png':
        return <FileImage className="h-4 w-4 text-purple-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const totalDocuments = mockDocuments.length;
  const totalSize = mockDocuments.reduce((sum, doc) => {
    const size = parseFloat(doc.fileSize.split(' ')[0]);
    return sum + size;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="ניהול מסמכים"
        subtitle="ארגון, אחסון וניהול מסמכים משפטיים"
        actions={
          <Button className="gap-2" onClick={handleUploadDocument}>
              <Upload className="h-4 w-4" /> העלה מסמך
            </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">סה"כ מסמכים</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{totalDocuments}</p>
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
                <p className="text-xs font-medium text-muted-foreground tracking-wide">קטגוריות</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{documentCategories.length}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-violet-light))] flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-[hsl(var(--accent-violet))]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground tracking-wide">נפח כולל</p>
                <p className="text-2xl font-semibold text-foreground mt-1">{totalSize.toFixed(1)} MB</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[hsl(var(--accent-emerald-light))] flex items-center justify-center">
                <Download className="h-5 w-5 text-[hsl(var(--accent-emerald))]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      <div>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">קטגוריות מסמכים</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentCategories.map((category) => (
                <div
                  key={category.name}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} מסמכים</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents Table */}
      <div>
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">מסמכים אחרונים</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש לפי שם מסמך, לקוח או תיק..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pr-9 pl-4 border-border"
                />
              </div>
              <div className="flex gap-2">
                <Select>
                  <SelectTrigger className="w-[140px] border-border">
                    <SelectValue placeholder="קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                    <SelectItem value="contracts">חוזים</SelectItem>
                    <SelectItem value="claims">כתבי טענות</SelectItem>
                    <SelectItem value="evidence">עדויות</SelectItem>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="w-[130px] border-border">
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסטטוסים</SelectItem>
                    <SelectItem value="signed">חתום</SelectItem>
                    <SelectItem value="draft">טיוטה</SelectItem>
                    <SelectItem value="review">בבדיקה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead>מסמך</TableHead>
                    <TableHead>לקוח</TableHead>
                    <TableHead className="hidden md:table-cell">תיק</TableHead>
                    <TableHead className="hidden lg:table-cell">קטגוריה</TableHead>
                    <TableHead className="hidden lg:table-cell">תאריך העלאה</TableHead>
                    <TableHead className="hidden xl:table-cell">גודל</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Search className="h-8 w-8" />
                          <p className="text-sm font-medium">לא נמצאו מסמכים</p>
                          <p className="text-xs">נסה לשנות את מילות החיפוש או הסינון</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((document) => (
                      <tr
                        key={document.id}
                        className="hover:bg-muted/50 border-border transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getFileIcon(document.type)}
                            <div>
                              <span className="text-foreground font-medium">{document.name}</span>
                              <p className="text-xs text-muted-foreground">{document.lastModified}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{document.client}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{document.case}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline" className="border-border text-muted-foreground">
                            {document.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{document.uploadDate}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-muted-foreground">{document.fileSize}</TableCell>
                        <TableCell>
                          <Badge
                            className={`${document.statusColor} text-white`}
                          >
                            {document.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                              <Eye className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                              <Download className="h-4 w-4 text-primary" />
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
    </div>
  );
}
