import { useState } from 'react';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, User, Loader2 } from 'lucide-react';
import { addClient } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function NewClientPage() {
  const navigate = useOrgNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    idNumber: '',
    address: '',
    city: '',
    postalCode: '',
    clientType: '',
    religion: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'שם מלא הוא שדה חובה';
    if (!formData.email.trim()) newErrors.email = 'אימייל הוא שדה חובה';
    if (!formData.phone.trim()) newErrors.phone = 'טלפון הוא שדה חובה';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || saving) return;

    setSaving(true);
    try {
      addClient({
        ...formData,
        status: 'פעיל'
      });
      navigate('/clients');
    } catch {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/clients');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="לקוח חדש"
        subtitle="הוסף לקוח חדש למערכת"
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />

      <Card className="max-w-3xl border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-5 w-5" />
            פרטי הלקוח
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">שם מלא *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => { setFormData({...formData, name: e.target.value}); setErrors(prev => ({...prev, name: ''})); }}
                  placeholder="שם מלא"
                  required
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">אימייל *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => { setFormData({...formData, email: e.target.value}); setErrors(prev => ({...prev, email: ''})); }}
                  placeholder="example@email.com"
                  required
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">טלפון *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => { setFormData({...formData, phone: e.target.value}); setErrors(prev => ({...prev, phone: ''})); }}
                  placeholder="050-1234567"
                  required
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="idNumber" className="text-foreground">מספר תעודת זהות</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                  placeholder="123456789"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-foreground">כתובת</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="רחוב ומספר בית"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-foreground">עיר</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="עיר"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-foreground">מיקוד</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                  placeholder="12345"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientType" className="text-foreground">סוג לקוח</Label>
              <Select value={formData.clientType} onValueChange={(value) => setFormData({...formData, clientType: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר סוג לקוח" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">פרטי</SelectItem>
                  <SelectItem value="business">עסקי</SelectItem>
                  <SelectItem value="government">ממשלתי</SelectItem>
                  <SelectItem value="non-profit">ארגון ללא מטרות רווח</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="religion" className="text-foreground">דת</Label>
              <Select value={formData.religion} onValueChange={(value) => setFormData({...formData, religion: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר דת" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="יהודי">יהודי</SelectItem>
                  <SelectItem value="מוסלמי">מוסלמי</SelectItem>
                  <SelectItem value="נוצרי">נוצרי</SelectItem>
                  <SelectItem value="דרוזי">דרוזי</SelectItem>
                  <SelectItem value="אחר">אחר</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="הערות נוספות על הלקוח"
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Save className="h-4 w-4 ml-2" />}
                {saving ? 'שומר...' : 'שמור לקוח'}
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
