import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import {
  ArrowRight,
  Edit,
  FileText,
  Trash2,
  MoreHorizontal,
  ListTodo,
  CheckCircle2,
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
import { getCases, Case, deleteCase, getTasksByCase, Task, updateTask } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';
import { CaseProgressBar } from '@/components/cases/CaseProgressBar';
import { CreateTaskDialog } from '@/components/cases/CreateTaskDialog';
import { getCaseTypeLabel } from '@/lib/caseTypeConfig';

const priorityLabels: Record<string, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  urgent: 'דחופה',
};

const taskStatusVariants: Record<string, string> = {
  'pending': 'bg-muted text-muted-foreground',
  'in-progress': 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  'completed': 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  'cancelled': 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
};

const taskStatusLabels: Record<string, string> = {
  'pending': 'ממתין',
  'in-progress': 'בביצוע',
  'completed': 'הושלם',
  'cancelled': 'בוטל',
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-border last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default function ViewCasePage() {
  const navigate = useOrgNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadData = () => {
    if (caseId) {
      const cases = getCases();
      const found = cases.find(c => c.id === caseId);
      setCaseData(found || null);
      setTasks(getTasksByCase(caseId));
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  if (!caseData) {
    return (
      <div className="space-y-6 text-center py-12">
        <p className="text-muted-foreground">תיק לא נמצא</p>
        <Button variant="outline" onClick={() => navigate('/cases')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          חזרה לתיקים
        </Button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteCase(caseData.id);
    toast.success(`התיק "${caseData.title}" נמחק בהצלחה`);
    navigate('/cases');
  };

  const handleTaskStatusChange = (taskId: string, newStatus: Task['status']) => {
    updateTask(taskId, { status: newStatus });
    loadData();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={caseData.title}
        subtitle={`תיק מספר ${caseData.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/cases')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Button onClick={() => navigate(`/cases/${caseId}/edit`)}>
              <Edit className="h-4 w-4 ml-2" />
              עריכה
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" dir="rtl">
                <DropdownMenuItem onClick={() => navigate(`/cases/${caseId}/documents`, { state: { caseTitle: caseData.title } })}>
                  <FileText className="h-4 w-4 ml-2" />
                  מסמכים
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  מחיקה
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Progress Bar */}
      {caseData.caseType && (
        <Card className="border-border max-w-4xl">
          <CardHeader>
            <CardTitle className="text-base font-semibold">התקדמות התיק</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseProgressBar caseType={caseData.caseType} currentStatus={caseData.status} />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">פרטי התיק</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="לקוח" value={caseData.client || '-'} />
              <DetailRow label='עו"ד מטפל' value={caseData.assignedTo || '-'} />
              <DetailRow label="סוג תיק" value={getCaseTypeLabel(caseData.caseType)} />
              <DetailRow label="עדיפות" value={priorityLabels[caseData.priority] || caseData.priority} />
              <div className="flex justify-between py-2.5">
                <dt className="text-sm text-muted-foreground">סטטוס</dt>
                <dd><Badge variant="secondary">{caseData.status}</Badge></dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">פרטים נוספים</CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <DetailRow label="משך משוער" value={caseData.estimatedDuration || '-'} />
              <DetailRow label="תקציב" value={caseData.budget ? `₪${caseData.budget}` : '-'} />
              <DetailRow label="תאריך יצירה" value={new Date(caseData.createdAt).toLocaleDateString('he-IL')} />
              <DetailRow label="עדכון אחרון" value={new Date(caseData.updatedAt).toLocaleDateString('he-IL')} />
            </dl>
          </CardContent>
        </Card>

        {caseData.description && (
          <Card className="border-border md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">תיאור</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-wrap">{caseData.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        <Card className="border-border md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              משימות
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowTaskDialog(true)}>
              צור משימה
            </Button>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">אין משימות לתיק זה</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded-md border border-border">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>מוקצה: {task.assignedTo}</span>
                        <span>יעד: {new Date(task.dueDate).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={taskStatusVariants[task.status] || ''}>
                        {taskStatusLabels[task.status] || task.status}
                      </Badge>
                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleTaskStatusChange(task.id, task.status === 'pending' ? 'in-progress' : 'completed')}
                          title={task.status === 'pending' ? 'התחל' : 'סיים'}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateTaskDialog
        open={showTaskDialog}
        onOpenChange={(open) => { setShowTaskDialog(open); if (!open) loadData(); }}
        cases={caseData ? [caseData] : []}
        preselectedCaseId={caseData?.id}
        preselectedClientName={caseData?.client}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תיק</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התיק "{caseData.title}"? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              מחק תיק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
