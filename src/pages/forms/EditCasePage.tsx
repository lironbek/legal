import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, Save, X } from 'lucide-react';
import { getCases, updateCase, getClients, Client } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function EditCasePage() {
  const navigate = useOrgNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const [clients, setClients] = useState<Client[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    caseType: '',
    priority: 'medium',
    description: '',
    estimatedDuration: '',
    budget: '',
    status: ''
  });
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setClients(getClients());
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
          status: found.status
        });
      } else {
        setNotFound(true);
      }
    }
  }, [caseId]);

  if (notFound) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (caseId) {
      updateCase(caseId, { ...formData, updatedAt: new Date().toISOString() });
      navigate('/cases');
    }
  };

  const handleCancel = () => {
    navigate('/cases');
  };

  return (
    <div className="space-y-6 p-6">
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

      <Card className="max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground">פרטי התיק</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">כותרת התיק</Label>
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
                <Select value={formData.client} onValueChange={(value) => setFormData({ ...formData, client: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.name}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseType" className="text-foreground">סוג התיק</Label>
                <Select value={formData.caseType} onValueChange={(value) => setFormData({ ...formData, caseType: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סוג תיק" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="civil">תביעה אזרחית</SelectItem>
                    <SelectItem value="real-estate">עסקאות מקרקעין</SelectItem>
                    <SelectItem value="criminal">פלילי</SelectItem>
                    <SelectItem value="tax">מיסים</SelectItem>
                    <SelectItem value="labor">דיני עבודה</SelectItem>
                    <SelectItem value="family">דיני משפחה</SelectItem>
                    <SelectItem value="corporate">חברות</SelectItem>
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
              <Label htmlFor="status" className="text-foreground">סטטוס</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="בטיפול">בטיפול</SelectItem>
                  <SelectItem value="ממתין לחתימה">ממתין לחתימה</SelectItem>
                  <SelectItem value="בהמתנה">בהמתנה</SelectItem>
                  <SelectItem value="הושלם">הושלם</SelectItem>
                </SelectContent>
              </Select>
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
