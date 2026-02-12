import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Edit, FileText, Upload, Trash2, Calendar, DollarSign, Clock, User } from 'lucide-react';
import { getCases, Case, deleteCase } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function ViewCasePage() {
  const navigate = useOrgNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);

  useEffect(() => {
    if (caseId) {
      const cases = getCases();
      const found = cases.find(c => c.id === caseId);
      setCaseData(found || null);
    }
  }, [caseId]);

  if (!caseData) {
    return (
      <div className="space-y-6 p-6 text-center">
        <p className="text-muted-foreground">תיק לא נמצא</p>
        <Button variant="outline" onClick={() => navigate('/cases')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          חזרה לתיקים
        </Button>
      </div>
    );
  }

  const getCaseTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
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
    const priorityMap: Record<string, string> = {
      'low': 'נמוכה',
      'medium': 'בינונית',
      'high': 'גבוהה',
      'urgent': 'דחופה'
    };
    return priorityMap[priority] || priority;
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'בטיפול': return 'bg-blue-500';
      case 'ממתין לחתימה': return 'bg-blue-500';
      case 'הושלם': return 'bg-green-500';
      case 'בהמתנה': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את התיק "${caseData.title}"?`);
    if (confirmed) {
      deleteCase(caseData.id);
      navigate('/cases');
    }
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={caseData.title}
        subtitle={`תיק מספר ${caseData.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/cases')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה
            </Button>
            <Button variant="outline" onClick={() => navigate(`/cases/${caseId}/edit`)}>
              <Edit className="h-4 w-4 ml-2" />
              עריכה
            </Button>
            <Button variant="outline" onClick={() => navigate(`/cases/${caseId}/documents`, { state: { caseTitle: caseData.title } })}>
              <FileText className="h-4 w-4 ml-2" />
              מסמכים
            </Button>
            <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 ml-2" />
              מחיקה
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">פרטי התיק</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">לקוח</p>
                <p className="font-medium">{caseData.client || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">סוג תיק</p>
                <p className="font-medium">{getCaseTypeText(caseData.caseType)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">עדיפות</p>
                <p className="font-medium">{getPriorityText(caseData.priority)}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">סטטוס</p>
              <Badge className={getStatusClass(caseData.status)}>{caseData.status}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">פרטים נוספים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">משך משוער</p>
                <p className="font-medium">{caseData.estimatedDuration || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">תקציב</p>
                <p className="font-medium">{caseData.budget ? `₪${caseData.budget}` : '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">תאריך יצירה</p>
                <p className="font-medium">{new Date(caseData.createdAt).toLocaleDateString('he-IL')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">עדכון אחרון</p>
                <p className="font-medium">{new Date(caseData.updatedAt).toLocaleDateString('he-IL')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {caseData.description && (
          <Card className="shadow-sm md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">תיאור</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground whitespace-pre-wrap">{caseData.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
