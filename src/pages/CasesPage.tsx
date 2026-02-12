import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  PlusCircle,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Upload
} from 'lucide-react';
import { getCases, Case, deleteCase, fixCaseNumbers } from '@/lib/dataManager';

export default function CasesPage() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);

  const loadCases = () => {
    const cases = getCases();
    setAllCases(cases);
    setFilteredCases(cases);
  };

  useEffect(() => {
    // Load cases from dataManager
    loadCases();
  }, []);

  // Refresh data when returning from forms
  useEffect(() => {
    if (location.pathname === '/cases') {
      loadCases();
    }
  }, [location.pathname]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredCases(allCases);
      return;
    }

    const filtered = allCases.filter(
      (case_) =>
        case_.title.includes(value) ||
        case_.client.includes(value) ||
        case_.id.includes(value)
    );

    setFilteredCases(filtered);
  };

  const handleNewCase = () => {
    navigate('/cases/new');
  };

  const handleNewClient = () => {
    navigate('/clients/new');
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}/view`);
  };

  const handleEditCase = (caseId: string) => {
    navigate(`/cases/${caseId}/edit`);
  };

  const handleDeleteCase = (caseId: string, caseTitle: string) => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את התיק "${caseTitle}"?`);
    if (confirmed) {
      const success = deleteCase(caseId);
      if (success) {
        loadCases(); // Refresh the list
        alert('התיק נמחק בהצלחה');
      } else {
        alert('שגיאה במחיקת התיק');
      }
    }
  };

  const handleFixCaseNumbers = () => {
    const confirmed = window.confirm('האם אתה בטוח שברצונך לתקן את מספרי התיקים כך שיתחילו מ-1000? פעולה זו תשנה מספרי תיקים קיימים.');
    if (confirmed) {
      fixCaseNumbers();
      loadCases(); // Refresh the list
      alert('מספרי התיקים תוקנו בהצלחה!');
    }
  };

  const handleUploadDocuments = (caseId: string, caseTitle: string) => {
    navigate(`/cases/${caseId}/documents/upload`, {
      state: { caseTitle }
    });
  };

  const handleViewDocuments = (caseId: string, caseTitle: string) => {
    navigate(`/cases/${caseId}/documents`, {
      state: { caseTitle }
    });
  };

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'בטיפול': return 'bg-blue-500';
      case 'ממתין לחתימה': return 'bg-blue-500';
      case 'הושלם': return 'bg-green-500';
      case 'בהמתנה': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCaseTypeText = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'civil': 'תביעה אזרחית',
      'real-estate': 'עסקאות מקרקעין',
      'criminal': 'פלילי',
      'tax': 'מיסים',
      'labor': 'דיני עבודה',
      'family': 'דיני משפחה',
      'corporate': 'חברות'
    };
    return typeMap[type] || type;
  };

  const getPriorityText = (priority: string) => {
    const priorityMap: { [key: string]: string } = {
      'low': 'נמוכה',
      'medium': 'בינונית',
      'high': 'גבוהה',
      'urgent': 'דחופה'
    };
    return priorityMap[priority] || priority;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ניהול תיקים"
        subtitle="צפייה, עריכה וניהול של תיקי המשרד"
        actions={
          <>
            <Button className="gap-2" onClick={handleNewCase}>
              <PlusCircle className="h-4 w-4" /> תיק חדש
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleNewClient}>
              <UserPlus className="h-4 w-4" /> הוסף לקוח
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleFixCaseNumbers}>
              <DollarSign className="h-4 w-4" /> תקן מספרי תיקים
            </Button>
          </>
        }
      />

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם תיק, לקוח או מספר..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-9 pr-4"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="סוג תיק" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  <SelectItem value="civil">תביעה אזרחית</SelectItem>
                  <SelectItem value="real-estate">עסקאות מקרקעין</SelectItem>
                  <SelectItem value="criminal">פלילי</SelectItem>
                  <SelectItem value="tax">מיסים</SelectItem>
                  <SelectItem value="labor">דיני עבודה</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="in-progress">בטיפול</SelectItem>
                  <SelectItem value="waiting">ממתין לחתימה</SelectItem>
                  <SelectItem value="completed">הושלם</SelectItem>
                  <SelectItem value="pending">בהמתנה</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-border bg-card shadow-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="w-[100px] text-foreground font-semibold">מספר תיק</TableHead>
                  <TableHead className="text-foreground font-semibold">שם תיק</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold">לקוח</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold">עו"ד מטפל</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground font-semibold">סוג</TableHead>
                  <TableHead className="hidden md:table-cell text-foreground font-semibold">עדיפות</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold">סטטוס</TableHead>
                  <TableHead className="hidden lg:table-cell text-foreground font-semibold">תקציב</TableHead>
                  <TableHead className="text-foreground font-semibold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      אין תיקים להצגה. לחץ על "תיק חדש" כדי להתחיל.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((case_) => (
                    <TableRow key={case_.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{case_.id}</TableCell>
                      <TableCell className="text-foreground">{case_.title}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{case_.client}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">עו"ד מטפל</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{getCaseTypeText(case_.caseType)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{getPriorityText(case_.priority)}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge className={getStatusClass(case_.status)}>
                          {case_.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {case_.budget ? `₪${case_.budget}` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewCase(case_.id)}
                            title="צפייה בתיק"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditCase(case_.id)}
                            title="עריכת תיק"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-purple-600 hover:text-purple-700"
                            onClick={() => handleViewDocuments(case_.id, case_.title)}
                            title="צפייה במסמכים"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            onClick={() => handleUploadDocuments(case_.id, case_.title)}
                            title="תיוק מסמכים"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCase(case_.id, case_.title)}
                            title="מחיקת תיק"
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
