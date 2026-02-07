import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Upload, FileText, FolderOpen, User } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

export default function UploadDocumentPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    client: '',
    case: '',
    description: '',
    tags: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('אנא בחר קובץ להעלאה');
      return;
    }
    // כאן יהיה הלוגיקה להעלאת המסמך
    console.log('Uploading document:', { ...formData, file: selectedFile });
    navigate('/documents');
  };

  const handleCancel = () => {
    navigate('/documents');
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="העלאת מסמך"
        subtitle="העלה מסמך חדש למערכת"
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />

      <Card className="max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5" />
            פרטי המסמך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">כותרת המסמך</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="כותרת המסמך"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">קטגוריה</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pleadings">כתבי טענות</SelectItem>
                    <SelectItem value="contracts">חוזים</SelectItem>
                    <SelectItem value="testimonies">עדויות</SelectItem>
                    <SelectItem value="reports">דוחות</SelectItem>
                    <SelectItem value="affidavits">תצהירים</SelectItem>
                    <SelectItem value="photos">תמונות</SelectItem>
                    <SelectItem value="correspondence">התכתבויות</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client" className="text-foreground">לקוח</Label>
                <Select value={formData.client} onValueChange={(value) => setFormData({...formData, client: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client1">יוסף אברהם</SelectItem>
                    <SelectItem value="client2">משפחת לוי</SelectItem>
                    <SelectItem value="client3">דוד כהן</SelectItem>
                    <SelectItem value="none">ללא לקוח</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="case" className="text-foreground">תיק קשור</Label>
              <Select value={formData.case} onValueChange={(value) => setFormData({...formData, case: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תיק (אופציונלי)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="case1">תביעת נזיקין - יוסף אברהם</SelectItem>
                  <SelectItem value="case2">הסכם מקרקעין - משפחת לוי</SelectItem>
                  <SelectItem value="case3">תיק פלילי - דוד כהן</SelectItem>
                  <SelectItem value="none">ללא תיק</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">תיאור</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="תיאור המסמך ותכולתו"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-foreground">תגיות</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="תגיות להקלה בחיפוש (מופרדות בפסיקים)"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-foreground text-lg font-semibold">בחירת קובץ</Label>

              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-muted-foreground">גרור קובץ לכאן או לחץ לבחירה</p>
                  <p className="text-sm text-muted-foreground">תמיכה בקבצי PDF, DOC, DOCX, XLS, XLSX, JPG, PNG</p>
                  <Button type="button" variant="outline" onClick={() => document.getElementById('fileInput')?.click()}>
                    בחר קובץ
                  </Button>
                </div>
                <input
                  id="fileInput"
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-primary/5 border border-border rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={!selectedFile}>
                <Save className="h-4 w-4 ml-2" />
                העלה מסמך
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
