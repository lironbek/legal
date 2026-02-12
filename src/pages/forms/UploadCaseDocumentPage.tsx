import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Save, X, Upload, FileText, Image, File, Scan } from 'lucide-react';
import { addDocument } from '@/lib/dataManager';
import { PageHeader } from '@/components/layout/PageHeader';

export default function UploadCaseDocumentPage() {
  const navigate = useOrgNavigate();
  const { caseId } = useParams<{ caseId: string }>();
  const location = useLocation();
  const caseTitle = location.state?.caseTitle || '';

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    description: '',
    tags: '',
    fileName: '',
    fileSize: '',
    fileType: ''
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<'upload' | 'scan'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setFormData({
        ...formData,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: getFileType(file.name)
      });

      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(prev => ({
          ...prev,
          title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
        }));
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'PDF';
      case 'doc':
      case 'docx': return 'Word';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'תמונה';
      case 'xlsx':
      case 'xls': return 'Excel';
      case 'ppt':
      case 'pptx': return 'PowerPoint';
      case 'txt': return 'טקסט';
      default: return 'אחר';
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'תמונה': return <Image className="h-8 w-8 text-green-600" />;
      case 'PDF': return <FileText className="h-8 w-8 text-red-600" />;
      case 'Word': return <FileText className="h-8 w-8 text-primary" />;
      default: return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const handleStartScan = async () => {
    setIsScanning(true);
    setScanMode('scan');

    try {
      // Get scanner settings from localStorage
      const scannerConfig = localStorage.getItem('scannerConfig');
      const config = scannerConfig ? JSON.parse(scannerConfig) : {
        scannerPath: 'C:\\Windows\\System32\\WiaAcmgr.exe',
        resolution: '300',
        colorMode: 'color',
        fileFormat: 'pdf'
      };

      // In a real implementation, this would execute the scanner command
      // For example: exec(config.scannerPath + ' /scan')
      console.log('Starting scan with config:', config);

      // Simulate scanning process with realistic timing
      const scanDuration = parseInt(config.resolution) > 300 ? 5000 : 3000;
      await new Promise(resolve => setTimeout(resolve, scanDuration));

      // Create a mock scanned file based on settings
      const timestamp = Date.now();
      const extension = config.fileFormat === 'jpg' ? 'jpg' :
                      config.fileFormat === 'png' ? 'png' :
                      config.fileFormat === 'tiff' ? 'tiff' : 'pdf';

      const scannedFileName = `scanned_document_${timestamp}.${extension}`;
      const mockScannedFile = new File(
        [new Blob(['mock scanned content'])],
        scannedFileName,
        { type: extension === 'pdf' ? 'application/pdf' : `image/${extension}` }
      );

      // Calculate file size based on resolution and color mode
      const baseSize = parseInt(config.resolution) / 100; // Base size factor
      const colorFactor = config.colorMode === 'color' ? 3 :
                         config.colorMode === 'grayscale' ? 1.5 : 1;
      const estimatedSize = (baseSize * colorFactor).toFixed(1);

      setSelectedFile(mockScannedFile);
      setFormData({
        ...formData,
        fileName: scannedFileName,
        fileSize: `${estimatedSize} MB`,
        fileType: extension === 'pdf' ? 'PDF' : 'תמונה',
        title: formData.title || `מסמך סרוק ${new Date().toLocaleDateString('he-IL')}`
      });

      alert(`הסריקה הושלמה בהצלחה!\nרזולוציה: ${config.resolution} DPI\nמצב: ${config.colorMode}\nפורמט: ${extension.toUpperCase()}`);

    } catch (error) {
      console.error('Scanning error:', error);
      alert('שגיאה בסריקה. אנא בדוק את הגדרות הסורק בדף ההגדרות.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCancelScan = () => {
    setIsScanning(false);
    setScanMode('upload');
    setSelectedFile(null);
    setFormData({
      ...formData,
      fileName: '',
      fileSize: '',
      fileType: '',
      title: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('אנא בחר קובץ להעלאה');
      return;
    }

    if (!caseId) {
      alert('מזהה תיק לא נמצא');
      return;
    }

    // Save the document using dataManager
    const newDocument = addDocument({
      ...formData,
      case: caseId,
      client: caseTitle, // We'll use case title as client for now
      status: 'פעיל'
    });

    console.log('Document saved:', newDocument);
    alert(`המסמך "${formData.title}" נוסף בהצלחה לתיק!`);

    // Navigate back to cases page
    navigate('/cases');
  };

  const handleCancel = () => {
    navigate('/cases');
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="תיוק מסמך חדש"
        subtitle={caseTitle ? `העלה מסמך לתיק: ${caseTitle}` : 'העלה מסמך לתיק'}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 ml-2" />
            ביטול
          </Button>
        }
      />
      {caseId && (
        <p className="text-sm text-muted-foreground -mt-4">מספר תיק: {caseId}</p>
      )}

      <Card className="max-w-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Upload className="h-5 w-5" />
            פרטי המסמך
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload or Scan */}
            <div className="space-y-4">
              <Label className="text-foreground">בחר אופן הוספת המסמך *</Label>

              {/* Mode Selection Buttons */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={scanMode === 'upload' ? 'default' : 'outline'}
                  onClick={() => {
                    setScanMode('upload');
                    handleCancelScan();
                  }}
                  className="flex-1"
                  disabled={isScanning}
                >
                  <Upload className="h-4 w-4 ml-2" />
                  העלה קובץ
                </Button>
                <Button
                  type="button"
                  variant={scanMode === 'scan' ? 'default' : 'outline'}
                  onClick={() => setScanMode('scan')}
                  className="flex-1"
                  disabled={isScanning}
                >
                  <Scan className="h-4 w-4 ml-2" />
                  סרוק מסמך
                </Button>
              </div>

              {/* Upload Mode */}
              {scanMode === 'upload' && (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.xlsx,.xls,.ppt,.pptx,.txt"
                    className="hidden"
                    required={scanMode === 'upload' && !selectedFile}
                  />
                  <label htmlFor="file" className="cursor-pointer">
                    {selectedFile && scanMode === 'upload' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center">
                          {getFileIcon(formData.fileType)}
                        </div>
                        <p className="text-foreground font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">{formData.fileSize}</p>
                        <p className="text-xs text-primary">לחץ לבחירת קובץ אחר</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-foreground">לחץ לבחירת קובץ או גרור לכאן</p>
                        <p className="text-sm text-muted-foreground">PDF, Word, Excel, תמונות ועוד</p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Scan Mode */}
              {scanMode === 'scan' && (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center">
                  {isScanning ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                      </div>
                      <p className="text-green-900 font-medium">סורק מסמך...</p>
                      <p className="text-sm text-muted-foreground">אנא המתן עד לסיום הסריקה</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancelScan}
                        className="mt-2"
                      >
                        ביטול סריקה
                      </Button>
                    </div>
                  ) : selectedFile && scanMode === 'scan' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center">
                        {getFileIcon(formData.fileType)}
                      </div>
                      <p className="text-green-900 font-medium">מסמך סרוק בהצלחה!</p>
                      <p className="text-sm text-muted-foreground">{formData.fileName}</p>
                      <p className="text-sm text-muted-foreground">{formData.fileSize}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleStartScan}
                        className="mt-2"
                      >
                        <Scan className="h-4 w-4 ml-2" />
                        סרוק שוב
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Scan className="h-12 w-12 text-green-400 mx-auto" />
                      <p className="text-green-900">לחץ להתחלת סריקה</p>
                      <p className="text-sm text-muted-foreground">וודא שהמסמך ממוקם בסורק</p>
                      <Button
                        type="button"
                        onClick={handleStartScan}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Scan className="h-4 w-4 ml-2" />
                        התחל סריקה
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">כותרת המסמך *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="כותרת המסמך"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-foreground">קטגוריה</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">חוזה</SelectItem>
                    <SelectItem value="court-document">מסמך בית משפט</SelectItem>
                    <SelectItem value="correspondence">התכתבות</SelectItem>
                    <SelectItem value="evidence">ראיה</SelectItem>
                    <SelectItem value="legal-opinion">חוות דעת</SelectItem>
                    <SelectItem value="invoice">חשבונית</SelectItem>
                    <SelectItem value="receipt">קבלה</SelectItem>
                    <SelectItem value="identification">זיהוי</SelectItem>
                    <SelectItem value="other">אחר</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">תיאור המסמך</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="תיאור מפורט של המסמך ותוכנו"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-foreground">תגיות</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                placeholder="תגיות מופרדות בפסיק (למשל: חוזה, דחוף, 2024)"
              />
              <p className="text-xs text-muted-foreground">תגיות עוזרות למצוא את המסמך בחיפוש</p>
            </div>

            {selectedFile && (
              <div className="bg-primary/5 p-4 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">פרטי הקובץ:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">שם קובץ:</span> {formData.fileName}</div>
                  <div><span className="font-medium">סוג:</span> {formData.fileType}</div>
                  <div><span className="font-medium">גודל:</span> {formData.fileSize}</div>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit">
                <Save className="h-4 w-4 ml-2" />
                שמור מסמך
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
