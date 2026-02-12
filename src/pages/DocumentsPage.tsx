import { useState } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
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
    <div className="space-y-8 p-6">
      {/* Header */}
      <PageHeader
        title="ניהול מסמכים"
        subtitle="ארגון, אחסון וניהול מסמכים משפטיים"
        actions={
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="gap-2" onClick={handleUploadDocument}>
              <Upload className="h-4 w-4" /> העלה מסמך
            </Button>
          </motion.div>
        }
      />

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{totalDocuments}</p>
                <p className="text-muted-foreground text-sm">סה"כ מסמכים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FolderOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{documentCategories.length}</p>
                <p className="text-muted-foreground text-sm">קטגוריות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Download className="h-6 w-6 text-green-600" />
              </div>
              <div className="mr-4">
                <p className="text-2xl font-bold text-foreground">{totalSize.toFixed(1)} MB</p>
                <p className="text-muted-foreground text-sm">נפח כולל</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Document Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">קטגוריות מסמכים</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentCategories.map((category, index) => (
                <motion.div
                  key={category.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <category.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.count} מסמכים</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Documents Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-foreground font-display">מסמכים אחרונים</CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mt-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש לפי שם מסמך, לקוח או תיק..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full pl-9 pr-4 border-border"
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
                    <TableHead className="text-foreground font-semibold">מסמך</TableHead>
                    <TableHead className="text-foreground font-semibold">לקוח</TableHead>
                    <TableHead className="hidden md:table-cell text-foreground font-semibold">תיק</TableHead>
                    <TableHead className="hidden lg:table-cell text-foreground font-semibold">קטגוריה</TableHead>
                    <TableHead className="hidden lg:table-cell text-foreground font-semibold">תאריך העלאה</TableHead>
                    <TableHead className="hidden xl:table-cell text-foreground font-semibold">גודל</TableHead>
                    <TableHead className="text-foreground font-semibold">סטטוס</TableHead>
                    <TableHead className="text-right text-foreground font-semibold">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document, index) => (
                    <motion.tr
                      key={document.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-muted/50 border-border transition-colors group"
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
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <Download className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
