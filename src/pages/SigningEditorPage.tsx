import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Upload, Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DocumentFieldEditor } from '@/components/signing/DocumentFieldEditor';
import { SendViaWhatsAppDialog } from '@/components/signing/SendViaWhatsAppDialog';
import { WordTemplateProcessor } from '@/components/signing/WordTemplateProcessor';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useSigningRequest } from '@/hooks/useSigningRequest';
import {
  createSigningRequest,
  updateSigningRequest,
  sendSigningRequest,
  getDocumentSignedUrl,
} from '@/services/signingService';
import type { SigningField } from '@/services/signingService';
import { useQueryClient } from '@tanstack/react-query';

function isDocxFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

export default function SigningEditorPage() {
  const navigate = useOrgNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: existingRequest } = useSigningRequest(id);

  const [file, setFile] = useState<File | null>(null);
  const [wordFile, setWordFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [fields, setFields] = useState<SigningField[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(id || null);
  const [isSending, setIsSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing request data
  useEffect(() => {
    if (existingRequest) {
      setFields((existingRequest.fields || []) as SigningField[]);
      setFileType(existingRequest.file_type);
      setRequestId(existingRequest.id);

      getDocumentSignedUrl(existingRequest.file_url)
        .then((url) => setFileUrl(url))
        .catch(() => alert('שגיאה בטעינת המסמך'));
    }
  }, [existingRequest]);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile.size > MAX_FILE_SIZE) {
      alert('הקובץ גדול מדי. הגודל המקסימלי הוא 20MB.');
      return;
    }

    // If it's a .docx file, enter Word template flow
    if (isDocxFile(selectedFile)) {
      setWordFile(selectedFile);
      setFile(null);
      setFileUrl(null);
      setFields([]);
      setRequestId(null);
      return;
    }

    setWordFile(null);
    setFile(selectedFile);
    setFileType(selectedFile.type);

    const url = URL.createObjectURL(selectedFile);
    setFileUrl(url);
    setFields([]);
    setRequestId(null);
  };

  // When Word template generates an image, continue to signing flow
  const handleWordDocumentReady = (imageFile: File) => {
    setWordFile(null);
    setFile(imageFile);
    setFileType(imageFile.type);

    const url = URL.createObjectURL(imageFile);
    setFileUrl(url);
    setFields([]);
    setRequestId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  };

  const handleReset = () => {
    setFile(null);
    setWordFile(null);
    setFileUrl(null);
    setFields([]);
    setRequestId(null);
  };

  const handleSend = async (phone: string, name: string, expiryDays: number = 30) => {
    if (!currentCompany?.id || !user?.id) {
      alert('נא להתחבר מחדש');
      return;
    }

    if (fields.length === 0) {
      alert('יש להוסיף לפחות שדה אחד למסמך');
      return;
    }

    setIsSending(true);
    try {
      let currentRequestId = requestId;

      if (!currentRequestId && file) {
        const request = await createSigningRequest({
          companyId: currentCompany.id,
          userId: user.id,
          file,
          fields,
          recipientName: name,
          recipientPhone: phone,
          expiryDays,
        });
        currentRequestId = request.id;
        setRequestId(request.id);
      } else if (currentRequestId) {
        await updateSigningRequest(currentRequestId, {
          fields,
          recipientName: name,
          recipientPhone: phone,
          expiryDays,
        });
      }

      if (!currentRequestId) {
        alert('שגיאה ביצירת הבקשה');
        return;
      }

      await sendSigningRequest(currentRequestId);

      alert('המסמך נשלח לחתימה בוואטסאפ!');
      queryClient.invalidateQueries({ queryKey: ['signing-requests'] });
      navigate('/signing');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'שגיאה בשליחה');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/signing')}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {id ? 'עריכת בקשת חתימה' : 'בקשת חתימה חדשה'}
          </h1>
          <p className="text-muted-foreground text-sm">
            העלה מסמך, סמן שדות למילוי ושלח לחתימה
          </p>
        </div>
      </div>

      {/* Word Template Processing Step */}
      {wordFile && (
        <WordTemplateProcessor
          file={wordFile}
          onDocumentReady={handleWordDocumentReady}
          onBack={handleReset}
        />
      )}

      {/* Upload Area (only if no file yet and not in Word flow) */}
      {!fileUrl && !wordFile && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>העלאת מסמך</CardTitle>
            <CardDescription>
              העלה את המסמך שברצונך לשלוח לחתימה (PDF, תמונה או Word)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer",
                isDragging
                  ? "border-primary bg-accent/50 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-accent/20"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx,application/pdf,image/*,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleInputChange}
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-lg mb-2">גרור מסמך לכאן</h3>
              <p className="text-muted-foreground text-sm">PDF, JPG, PNG, Word (.docx)</p>
              <p className="text-muted-foreground text-xs mt-1">
                {'קבצי Word עם {{משתנים}} יזוהו אוטומטית'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Editor */}
      {fileUrl && (
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>הגדרת שדות למילוי</CardTitle>
                <CardDescription>
                  בחר שדה מהרשימה ולחץ על המסמך כדי למקם אותו
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  החלף מסמך
                </Button>
                <Button
                  onClick={() => setShowSendDialog(true)}
                  disabled={fields.length === 0}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="ml-2 h-4 w-4" />
                  שלח לחתימה
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentFieldEditor
              fileUrl={fileUrl}
              fileType={fileType}
              fields={fields}
              onFieldsChange={setFields}
            />
          </CardContent>
        </Card>
      )}

      {/* Send Dialog */}
      <SendViaWhatsAppDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        onSend={handleSend}
        fieldsCount={fields.length}
      />
    </div>
  );
}
