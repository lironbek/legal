import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Save } from 'lucide-react';
import { addTask, Case } from '@/lib/dataManager';
import { toast } from 'sonner';

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cases?: Case[];
  preselectedCaseId?: string;
  preselectedClientName?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  cases = [],
  preselectedCaseId,
  preselectedClientName,
}: CreateTaskDialogProps) {
  const [users, setUsers] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    caseId: preselectedCaseId || '',
    clientName: preselectedClientName || '',
    assignedTo: '',
    assignedToEmail: '',
    dueDate: '',
  });

  useEffect(() => {
    const mockUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');
    setUsers(mockUsers.filter((u: any) => u.is_active));
  }, [open]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      caseId: preselectedCaseId || '',
      clientName: preselectedClientName || '',
    }));
  }, [preselectedCaseId, preselectedClientName]);

  const handleUserChange = (userName: string) => {
    const user = users.find(u => u.full_name === userName);
    setFormData({
      ...formData,
      assignedTo: userName,
      assignedToEmail: user?.email || '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assignedTo || !formData.dueDate) {
      toast.error('יש למלא כותרת, מוקצה ותאריך יעד');
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem('mock-users') || '[]')[0];
    addTask({
      title: formData.title,
      description: formData.description,
      caseId: formData.caseId || undefined,
      clientName: formData.clientName || undefined,
      assignedTo: formData.assignedTo,
      assignedToEmail: formData.assignedToEmail,
      dueDate: formData.dueDate,
      status: 'pending',
      createdBy: currentUser?.full_name || 'מערכת',
    });

    toast.success(`משימה נוצרה בהצלחה! הודעת מייל תישלח ל-${formData.assignedToEmail}`);
    setFormData({ title: '', description: '', caseId: '', clientName: '', assignedTo: '', assignedToEmail: '', dueDate: '' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>משימה חדשה</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>כותרת המשימה *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="כותרת המשימה"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>תיאור</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="תיאור המשימה"
              rows={3}
            />
          </div>

          {cases.length > 0 && (
            <div className="space-y-2">
              <Label>תיק משויך</Label>
              <SearchableSelect
                value={formData.caseId}
                onValueChange={(v) => setFormData({ ...formData, caseId: v })}
                options={cases.map((c) => ({
                  value: c.id,
                  label: `${c.id} - ${c.title}`,
                }))}
                placeholder="בחר תיק (אופציונלי)"
                searchPlaceholder="חיפוש תיק..."
                emptyMessage="לא נמצאו תיקים"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>מוקצה למשימה *</Label>
              <SearchableSelect
                value={formData.assignedTo}
                onValueChange={handleUserChange}
                options={users.map((u) => ({
                  value: u.full_name,
                  label: u.full_name,
                }))}
                placeholder="בחר משתמש"
                searchPlaceholder="חיפוש משתמש..."
                emptyMessage="לא נמצאו משתמשים"
              />
            </div>

            <div className="space-y-2">
              <Label>תאריך יעד *</Label>
              <Input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.assignedToEmail && (
            <p className="text-sm text-muted-foreground">
              הודעת מייל תישלח ל: {formData.assignedToEmail}
            </p>
          )}

          <div className="flex gap-4 pt-2">
            <Button type="submit">
              <Save className="h-4 w-4 ml-2" />
              צור משימה
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
