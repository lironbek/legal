import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";
import { CaseProgressBar } from "@/components/cases/CaseProgressBar";
import { CreateTaskDialog } from "@/components/cases/CreateTaskDialog";
import { CASE_TYPES, getCaseTypeLabel } from '@/lib/caseTypeConfig';
import {
  PlusCircle,
  UserPlus,
  Search,
  MoreHorizontal,
  MessageSquare,
  ListTodo,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { getCases, Case, deleteCase, fixCaseNumbers } from '@/lib/dataManager';

export default function CasesPage() {
  const navigate = useOrgNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [filterCaseType, setFilterCaseType] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [showFixConfirm, setShowFixConfirm] = useState(false);

  const loadCases = () => {
    const cases = getCases();
    setAllCases(cases);
  };

  useEffect(() => {
    loadCases();
    const onSync = () => loadCases();
    window.addEventListener('supabase-sync-complete', onSync);
    return () => window.removeEventListener('supabase-sync-complete', onSync);
  }, []);

  useEffect(() => {
    if (location.pathname.endsWith('/cases')) {
      loadCases();
    }
  }, [location.pathname]);

  // Apply all filters
  useEffect(() => {
    let result = [...allCases];

    if (searchTerm.trim()) {
      result = result.filter(
        (c) =>
          c.title.includes(searchTerm) ||
          c.client.includes(searchTerm) ||
          c.id.includes(searchTerm)
      );
    }

    if (filterCaseType !== 'all') {
      result = result.filter((c) => c.caseType === filterCaseType);
    }

    if (filterDateFrom) {
      result = result.filter((c) => c.createdAt >= filterDateFrom);
    }

    if (filterDateTo) {
      const toDateEnd = filterDateTo + 'T23:59:59.999Z';
      result = result.filter((c) => c.createdAt <= toDateEnd);
    }

    setFilteredCases(result);
  }, [allCases, searchTerm, filterCaseType, filterDateFrom, filterDateTo]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleNewCase = () => navigate('/cases/new');
  const handleNewClient = () => navigate('/clients/new');
  const handleViewCase = (caseId: string) => navigate(`/cases/${caseId}/view`);
  const handleEditCase = (caseId: string) => navigate(`/cases/${caseId}/edit`);

  const handleDeleteCase = (caseId: string, caseTitle: string) => {
    setDeleteTarget({ id: caseId, title: caseTitle });
  };

  const confirmDeleteCase = () => {
    if (deleteTarget && deleteCase(deleteTarget.id)) {
      toast.success(`התיק "${deleteTarget.title}" נמחק בהצלחה`);
      loadCases();
    }
    setDeleteTarget(null);
  };

  const handleFixCaseNumbers = () => {
    setShowFixConfirm(true);
  };

  const confirmFixCaseNumbers = () => {
    fixCaseNumbers();
    toast.success('מספרי התיקים תוקנו בהצלחה');
    loadCases();
    setShowFixConfirm(false);
  };

  const handleUploadDocuments = (caseId: string, caseTitle: string) => {
    navigate(`/cases/${caseId}/documents/upload`, { state: { caseTitle } });
  };

  const handleViewDocuments = (caseId: string, caseTitle: string) => {
    navigate(`/cases/${caseId}/documents`, { state: { caseTitle } });
  };

  // Selection
  const toggleSelectCase = (caseId: string) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCaseIds.size === filteredCases.length) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(filteredCases.map((c) => c.id)));
    }
  };

  const selectedCases = filteredCases.filter((c) => selectedCaseIds.has(c.id));

  // Bulk send message
  const handleBulkMessage = () => {
    if (selectedCases.length === 0) {
      toast.error('יש לבחור תיקים לשליחת הודעה');
      return;
    }
    const clientNames = [...new Set(selectedCases.map((c) => c.client).filter(Boolean))];
    const message = prompt(
      `שליחת הודעה ללקוחות (${clientNames.length}):\n${clientNames.join(', ')}\n\nהקלד את ההודעה:`
    );
    if (message) {
      toast.success(`הודעה נשלחה בהצלחה ל-${clientNames.length} לקוחות`);
      setSelectedCaseIds(new Set());
    }
  };

  const clearFilters = () => {
    setFilterCaseType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearchTerm('');
  };

  const hasActiveFilters = filterCaseType !== 'all' || filterDateFrom || filterDateTo || searchTerm;

  const getPriorityText = (priority: string) => {
    const map: Record<string, string> = { low: 'נמוכה', medium: 'בינונית', high: 'גבוהה', urgent: 'דחופה' };
    return map[priority] || priority;
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
          </>
        }
      />

      {/* Bulk Actions Bar */}
      {selectedCaseIds.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 flex items-center gap-4 flex-wrap">
            <span className="text-sm font-medium">
              {selectedCaseIds.size} תיקים נבחרו
            </span>
            <Button size="sm" variant="outline" className="gap-2" onClick={handleBulkMessage}>
              <MessageSquare className="h-4 w-4" />
              שלח הודעה ללקוחות
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowTaskDialog(true)}>
              <ListTodo className="h-4 w-4" />
              צור משימה
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedCaseIds(new Set())}>
              בטל בחירה
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חפש לפי שם תיק, לקוח או מספר..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pr-9 pl-4"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end flex-wrap">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">סוג תיק</label>
                <Select value={filterCaseType} onValueChange={setFilterCaseType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="כל הסוגים" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">כל הסוגים</SelectItem>
                    {CASE_TYPES.map((ct) => (
                      <SelectItem key={ct.key} value={ct.key}>
                        {ct.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">מתאריך</label>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-[160px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">עד תאריך</label>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-[160px]"
                />
              </div>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                  נקה פילטרים
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border border-border bg-card shadow-md">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="border-border">
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={filteredCases.length > 0 && selectedCaseIds.size === filteredCases.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-[80px]">מס' תיק</TableHead>
                  <TableHead>שם תיק</TableHead>
                  <TableHead className="hidden lg:table-cell">לקוח</TableHead>
                  <TableHead className="hidden lg:table-cell">מטפל</TableHead>
                  <TableHead className="hidden md:table-cell">סוג</TableHead>
                  <TableHead className="hidden md:table-cell">עדיפות</TableHead>
                  <TableHead className="hidden lg:table-cell min-w-[180px]">התקדמות</TableHead>
                  <TableHead className="hidden lg:table-cell">סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      אין תיקים להצגה. לחץ על "תיק חדש" כדי להתחיל.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCases.map((case_) => (
                    <TableRow key={case_.id} className="border-border">
                      <TableCell>
                        <Checkbox
                          checked={selectedCaseIds.has(case_.id)}
                          onCheckedChange={() => toggleSelectCase(case_.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{case_.caseNumber || case_.id}</TableCell>
                      <TableCell className="text-foreground">{case_.title}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{case_.client}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {case_.assignedTo || '-'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {getCaseTypeLabel(case_.caseType)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {getPriorityText(case_.priority)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {case_.caseType ? (
                          <CaseProgressBar caseType={case_.caseType} currentStatus={case_.status} compact />
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="secondary" className="text-xs">
                          {case_.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewCase(case_.id)}>
                            צפייה
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" dir="rtl">
                              <DropdownMenuItem onClick={() => handleEditCase(case_.id)}>
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleViewDocuments(case_.id, case_.title)}>
                                מסמכים
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUploadDocuments(case_.id, case_.title)}>
                                תיוק מסמכים
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteCase(case_.id, case_.title)}
                              >
                                מחיקה
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
        </CardContent>
      </Card>

      {/* Task Dialog */}
      <CreateTaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        cases={selectedCases}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תיק</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התיק "{deleteTarget?.title}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteCase}
            >
              מחק תיק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Fix Case Numbers Confirmation */}
      <AlertDialog open={showFixConfirm} onOpenChange={setShowFixConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>תיקון מספרי תיקים</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לתקן את מספרי התיקים?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFixCaseNumbers}>
              תקן מספרים
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
