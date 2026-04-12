import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Save, X } from 'lucide-react';
import { getCases, updateCase, getClients, Client } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';
import { toast } from 'sonner';
import { CaseProgressBar } from '@/components/cases/CaseProgressBar';
import { CASE_TYPES, getStatusesForCaseType } from '@/lib/caseTypeConfig';

export default function EditCasePage() {
  const navigate = useOrgNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    caseType: '',
    priority: 'medium',
    description: '',
    estimatedDuration: '',
    budget: '',
    status: '',
    assignedTo: '',
  });
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setClients(getClients());
    const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
    setUsers(mockUsers.filter((u: any) => u.is_active));

    if (caseId) {
      const cases = getCases();
      const found = cases.find(c => c.id === caseId);
      if (found) {
        setFormData({
          title: found.title,
          client: found.client,
          caseType: found.caseType,
          priority: found.priority,
          description: found.description,
          estimatedDuration: found.estimatedDuration,
          budget: found.budget,
          status: found.status,
          assignedTo: found.assignedTo || '',
        });
      } else {
        setNotFound(true);
      }
    }
  }, [caseId]);

  if (notFound) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-muted-foreground">תיק לא נמצא</p>
        <Button variant="outline" onClick={() => navigate('/cases')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          חזרה לתיקים
        </Button>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caseType || !formData.assignedTo) {
      toast.error('סוג תיק ומטפל הם שדות חובה');
      return;
    }
    if (caseId) {
      updateCase(caseId, { ...formData, updatedAt: new Date().toISOString() });
      navigate('/cases');
    }
  };

  const handleCancel = () => navigate('/cases');

  const availableStatuses = getStatusesForCaseType(formData.caseType);

  return (
    <div className="space-y-6">
      <PageHeader
        title="עריכת תיק"
        subtitle={`תיק מספר ${caseId}`}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />

      {/* Progress Bar */}
      {formData.caseType && formData.status && (
        <Card className="max-w-4xl border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">התקדמות התיק</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseProgressBar caseType={formData.caseType} currentStatus={formData.status} />
          </CardContent>
        </Card>
      )}

      <Card className="max-w-3xl border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">פרטי התיק</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">כותרת התיק *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="כותרת התיק"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client" className="text-foreground">שם הלקוח</Label>
                <SearchableSelect
                  value={formData.client}
                  onValueChange={(value) => setFormData({ ...formData, client: value })}
                  options={clients.map((client) => ({
                    value: client.name,
                    label: client.name,
                    subtitle: client.phone,
                  }))}
                  placeholder="בחר לקוח"
                  searchPlaceholder="חיפוש לקוח..."
                  emptyMessage="לא נמצאו לקוחות"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseType" className="text-foreground">סוג התיק *</Label>
                <Select
                  value={formData.caseType}
                  onValueChange={(value) => {
                    const newStatuses = getStatusesForCaseType(value);
                    setFormData({
                      ...formData,
                      caseType: value,
                      status: newStatuses[0],
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג תיק" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((ct) => (
                      <SelectItem key={ct.key} value={ct.key}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="text-foreground">עו"ד מטפל *</Label>
                <SearchableSelect
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}
                  options={users.map((u) => ({
                    value: u.full_name,
                    label: u.full_name,
                  }))}
                  placeholder="בחר מטפל"
                  searchPlaceholder="חיפוש מטפל..."
                  emptyMessage="לא נמצאו משתמשים"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-foreground">סטטוס</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority" className="text-foreground">עדיפות</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">נמוכה</SelectItem>
                    <SelectItem value="medium">בינונית</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="urgent">דחופה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">תיאור התיק</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור מפורט של התיק"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="estimatedDuration" className="text-foreground">משך משוער</Label>
                <Input
                  id="estimatedDuration"
                  value={formData.estimatedDuration}
                  onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                  placeholder="למשל: 3 חודשים"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-foreground">תקציב משוער</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="₪"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4 ml-2" />
                שמור שינויים
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                ביטול
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
