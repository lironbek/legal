import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Building2, Plus, Edit, Trash2, Users, MapPin, Phone, Mail, Copy, Link, Upload, X } from 'lucide-react';
import {
  Company,
  getCompanies,
  addCompany,
  updateCompany,
  deleteCompany,
  getCompanyUserAssignments,
} from '@/lib/dataManager';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

const emptyForm = {
  name: '',
  slug: '',
  legal_name: '',
  tax_id: '',
  address: '',
  city: '',
  postal_code: '',
  phone: '',
  email: '',
  logo_url: '',
};

export function CompanyManagement() {
  const { refreshCompanies } = useCompany();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadCompanies = () => {
    setCompanies(getCompanies());
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      slug: company.slug || '',
      legal_name: company.legal_name || '',
      tax_id: company.tax_id || '',
      address: company.address || '',
      city: company.city || '',
      postal_code: company.postal_code || '',
      phone: company.phone || '',
      email: company.email || '',
      logo_url: company.logo_url || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('יש להזין שם משרד');
      return;
    }

    if (editingCompany) {
      updateCompany(editingCompany.id, {
        name: formData.name,
        slug: formData.slug || undefined,
        legal_name: formData.legal_name || undefined,
        tax_id: formData.tax_id || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        postal_code: formData.postal_code || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        logo_url: formData.logo_url || undefined,
      });
      toast.success('המשרד עודכן בהצלחה');
    } else {
      addCompany({
        name: formData.name,
        slug: formData.slug || undefined,
        legal_name: formData.legal_name || undefined,
        tax_id: formData.tax_id || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        postal_code: formData.postal_code || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        logo_url: formData.logo_url || undefined,
        is_active: true,
      });
      toast.success('המשרד נוצר בהצלחה');
    }

    setIsFormOpen(false);
    setFormData(emptyForm);
    setEditingCompany(null);
    loadCompanies();
    refreshCompanies();
  };

  const handleToggleActive = (company: Company) => {
    updateCompany(company.id, { is_active: !company.is_active });
    loadCompanies();
    refreshCompanies();
    toast.success(company.is_active ? 'המשרד הושבת' : 'המשרד הופעל');
  };

  const handleConfirmDelete = () => {
    if (companyToDelete) {
      if (companies.length <= 1) {
        toast.error('לא ניתן למחוק את המשרד האחרון');
        return;
      }
      deleteCompany(companyToDelete.id);
      toast.success('המשרד נמחק בהצלחה');
      setCompanyToDelete(null);
      setIsDeleteOpen(false);
      loadCompanies();
      refreshCompanies();
    }
  };

  const getUserCount = (companyId: string): number => {
    return getCompanyUserAssignments(companyId).length;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              ניהול משרדים
            </div>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              משרד חדש
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">
            צור ונהל משרדי עורכי דין. כל משרד מנהל את הנתונים שלו באופן עצמאי ומבודד.
          </p>
        </CardContent>
      </Card>

      {/* Companies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map((company) => (
          <Card key={company.id} className={!company.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>{company.name}</span>
                  {!company.is_active && (
                    <Badge variant="secondary">מושבת</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleOpenEdit(company)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => {
                      setCompanyToDelete(company);
                      setIsDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {company.legal_name && (
                <p className="text-sm text-muted-foreground">{company.legal_name}</p>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {company.tax_id && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">ע.מ:</span>
                    <span>{company.tax_id}</span>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{company.phone}</span>
                  </div>
                )}
                {company.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{company.email}</span>
                  </div>
                )}
                {(company.address || company.city) && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{[company.address, company.city].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Login URL */}
              {company.slug && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-sm">
                  <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <code className="text-xs flex-1 truncate" dir="ltr">
                    {window.location.origin}/login/{company.slug}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/login/${company.slug}`);
                      toast.success('קישור ההתחברות הועתק');
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{getUserCount(company.id)} משתמשים</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">פעיל</span>
                  <Switch
                    checked={company.is_active}
                    onCheckedChange={() => handleToggleActive(company)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">אין משרדים</h3>
            <p className="text-muted-foreground mb-4">צור את המשרד הראשון שלך כדי להתחיל</p>
            <Button onClick={handleOpenCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              צור משרד
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {editingCompany ? 'עריכת משרד' : 'משרד חדש'}
            </DialogTitle>
            <DialogDescription>
              {editingCompany ? 'ערוך את פרטי המשרד' : 'הזן את פרטי המשרד החדש'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>שם המשרד *</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="למשל: משרד עו״ד כהן ושות׳"
                />
              </div>
              <div className="col-span-2">
                <Label>מזהה כתובת (slug)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="cohen-law"
                  dir="ltr"
                  className="text-left"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  ישמש בכתובת ההתחברות: {window.location.origin}/login/{formData.slug || '...'}
                </p>
              </div>
              <div>
                <Label>שם משפטי</Label>
                <Input
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                />
              </div>
              <div>
                <Label>מספר עוסק / ח.פ</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <Label>אימייל</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {/* Logo Upload */}
              <div className="col-span-2">
                <Label>לוגו המשרד (PNG, JPG - מקסימום 2MB)</Label>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast.error('קובץ הלוגו גדול מדי. מקסימום 2MB');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const result = ev.target?.result as string;
                      setFormData({ ...formData, logo_url: result });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <div className="flex items-center gap-3 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    בחר קובץ
                  </Button>
                  {formData.logo_url && (
                    <div className="relative">
                      <img
                        src={formData.logo_url}
                        alt="Logo preview"
                        className="h-16 w-16 object-contain border rounded-lg"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                        onClick={() => setFormData({ ...formData, logo_url: '' })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="col-span-2">
                <Label>כתובת</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div>
                <Label>עיר</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>מיקוד</Label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                ביטול
              </Button>
              <Button type="submit">
                {editingCompany ? 'עדכן' : 'צור משרד'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת משרד</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את המשרד "{companyToDelete?.name}"?
              פעולה זו תמחק את כל הנתונים השייכים למשרד זה (תיקים, לקוחות, מסמכים וכו׳).
              פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              מחק משרד
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
