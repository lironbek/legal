import { useState, useEffect } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Plus } from 'lucide-react';
import { addCase, getClients, Client, addClient } from '@/lib/dataManager';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageHeader } from '@/components/layout/PageHeader';
import { CASE_TYPES, getStatusesForCaseType } from '@/lib/caseTypeConfig';
import { toast } from 'sonner';

export default function NewCasePage() {
  const navigate = useOrgNavigate();
  const [formData, setFormData] = useState({
    title: '',
    client: '',
    caseType: '',
    priority: 'medium',
    description: '',
    estimatedDuration: '',
    budget: '',
    assignedTo: '',
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    address: '',
    city: '',
    postalCode: '',
    clientType: 'individual',
    notes: ''
  });

  useEffect(() => {
    setClients(getClients());
    const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
    setUsers(mockUsers.filter((u: any) => u.is_active));
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.caseType) newErrors.caseType = 'סוג תיק הוא שדה חובה';
    if (!formData.assignedTo) newErrors.assignedTo = 'מטפל הוא שדה חובה';
    if (!formData.title) newErrors.title = 'כותרת התיק היא שדה חובה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const statuses = getStatusesForCaseType(formData.caseType);
    const firstStatus = statuses[0] || 'חדש';
    addCase({
      ...formData,
      status: firstStatus,
    });

    navigate('/cases');
  };

  const handleCancel = () => navigate('/cases');

  const handleCreateNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newClient = addClient(newClientData);
      setClients([...clients, newClient]);
      setFormData({ ...formData, client: newClient.name });
      setShowNewClientDialog(false);
      setNewClientData({ name: '', email: '', phone: '', idNumber: '', address: '', city: '', postalCode: '', clientType: 'individual', notes: '' });
    } catch (error) {
      console.error('Error creating client:', error);
      toast.error('שגיאה ביצירת הלקוח');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="תיק חדש"
        subtitle="צור תיק משפטי חדש"
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />

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
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="כותרת התיק"
                  className={errors.title ? 'border-destructive' : ''}
                />
                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client" className="text-foreground">שם הלקוח</Label>
                <div className="flex gap-2">
                  <SearchableSelect
                    value={formData.client}
                    onValueChange={(value) => setFormData({...formData, client: value})}
                    options={clients.map((client) => ({
                      value: client.name,
                      label: client.name,
                      subtitle: client.phone,
                    }))}
                    placeholder="בחר לקוח קיים או צור חדש"
                    searchPlaceholder="חיפוש לקוח..."
                    emptyMessage="לא נמצאו לקוחות"
                    className="flex-1"
                  />

                  <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="צור לקוח חדש">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>לקוח חדש</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateNewClient} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newClientName">שם מלא *</Label>
                            <Input
                              id="newClientName"
                              value={newClientData.name}
                              onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                              placeholder="שם מלא"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newClientPhone">טלפון</Label>
                            <Input
                              id="newClientPhone"
                              value={newClientData.phone}
                              onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                              placeholder="05X-XXXXXXX"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newClientEmail">אימייל</Label>
                            <Input
                              id="newClientEmail"
                              type="email"
                              value={newClientData.email}
                              onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                              placeholder="example@email.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newClientId">ת.ז.</Label>
                            <Input
                              id="newClientId"
                              value={newClientData.idNumber}
                              onChange={(e) => setNewClientData({...newClientData, idNumber: e.target.value})}
                              placeholder="123456789"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newClientAddress">כתובת</Label>
                          <Input
                            id="newClientAddress"
                            value={newClientData.address}
                            onChange={(e) => setNewClientData({...newClientData, address: e.target.value})}
                            placeholder="רחוב ומספר"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="newClientCity">עיר</Label>
                            <Input
                              id="newClientCity"
                              value={newClientData.city}
                              onChange={(e) => setNewClientData({...newClientData, city: e.target.value})}
                              placeholder="עיר"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newClientType">סוג לקוח</Label>
                            <Select value={newClientData.clientType} onValueChange={(value) => setNewClientData({...newClientData, clientType: value})}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">פרטי</SelectItem>
                                <SelectItem value="business">עסקי</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="newClientNotes">הערות</Label>
                          <Textarea
                            id="newClientNotes"
                            value={newClientData.notes}
                            onChange={(e) => setNewClientData({...newClientData, notes: e.target.value})}
                            placeholder="הערות נוספות"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-4 pt-4">
                          <Button type="submit">
                            <Save className="h-4 w-4 ml-2" />
                            שמור לקוח
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setShowNewClientDialog(false)}>
                            ביטול
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="caseType" className="text-foreground">סוג התיק *</Label>
                <Select value={formData.caseType} onValueChange={(value) => setFormData({...formData, caseType: value})}>
                  <SelectTrigger className={errors.caseType ? 'border-destructive' : ''}>
                    <SelectValue placeholder="בחר סוג תיק" />
                  </SelectTrigger>
                  <SelectContent>
                    {CASE_TYPES.map((ct) => (
                      <SelectItem key={ct.key} value={ct.key}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.caseType && <p className="text-xs text-destructive">{errors.caseType}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo" className="text-foreground">עו"ד מטפל *</Label>
                <SearchableSelect
                  value={formData.assignedTo}
                  onValueChange={(value) => setFormData({...formData, assignedTo: value})}
                  options={users.map((u) => ({
                    value: u.full_name,
                    label: u.full_name,
                  }))}
                  placeholder="בחר מטפל"
                  searchPlaceholder="חיפוש מטפל..."
                  emptyMessage="לא נמצאו משתמשים"
                  className={errors.assignedTo ? 'border-destructive' : ''}
                />
                {errors.assignedTo && <p className="text-xs text-destructive">{errors.assignedTo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-foreground">עדיפות</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
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

              <div className="space-y-2">
                <Label htmlFor="budget" className="text-foreground">תקציב משוער</Label>
                <Input
                  id="budget"
                  value={formData.budget}
                  onChange={(e) => setFormData({...formData, budget: e.target.value})}
                  placeholder="₪"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">תיאור התיק</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="תיאור מפורט של התיק"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedDuration" className="text-foreground">משך משוער</Label>
              <Input
                id="estimatedDuration"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({...formData, estimatedDuration: e.target.value})}
                placeholder="למשל: 3 חודשים"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4 ml-2" />
                שמור תיק
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
