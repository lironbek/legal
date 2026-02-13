import { useState, useRef, useCallback } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scanDocument, type ScanResult } from '@/lib/documentScanService';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';

interface DropZoneUploaderProps {
  onScanComplete?: (result: ScanResult) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function DropZoneUploader({ onScanComplete }: DropZoneUploaderProps) {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [fileName, setFileName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const validTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
    ];
    if (!validTypes.includes(file.type)) {
      setUploadState('error');
      setErrorMessage('סוג קובץ לא נתמך. יש להעלות PDF או תמונה.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadState('error');
      setErrorMessage('הקובץ גדול מדי. גודל מקסימלי: 20MB');
      return;
    }

    setFileName(file.name);
    setUploadState('uploading');
    setErrorMessage('');

    try {
      const result = await scanDocument(file, currentCompany?.id, user?.id);

      if (result.success) {
        setUploadState('success');
        onScanComplete?.(result);
        // Reset after showing success
        setTimeout(() => setUploadState('idle'), 2500);
      } else {
        setUploadState('error');
        setErrorMessage(result.error || 'שגיאה בסריקת המסמך');
      }
    } catch {
      setUploadState('error');
      setErrorMessage('שגיאה בסריקת המסמך');
    }
  }, [currentCompany?.id, user?.id, onScanComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [processFile]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
      className={cn(
        'border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300',
        uploadState === 'idle' && 'cursor-pointer',
        isDragging
          ? 'border-primary bg-accent/50 scale-[1.01]'
          : uploadState === 'uploading'
          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-950/20'
          : uploadState === 'success'
          ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
          : uploadState === 'error'
          ? 'border-red-400 bg-red-50/50 dark:bg-red-950/20 cursor-pointer'
          : 'border-border hover:border-primary/50 hover:bg-accent/20'
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,application/pdf,image/*"
        onChange={handleInputChange}
      />

      {uploadState === 'idle' && (
        <>
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-medium text-sm mb-1">גרור מסמך לסריקה</h3>
          <p className="text-muted-foreground text-xs">PDF, JPG, PNG - עד 20MB</p>
        </>
      )}

      {uploadState === 'uploading' && (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto mb-3" />
          <h3 className="font-medium text-sm mb-1">סורק את המסמך...</h3>
          <p className="text-muted-foreground text-xs flex items-center justify-center gap-1">
            <FileText className="h-3 w-3" />
            {fileName}
          </p>
        </>
      )}

      {uploadState === 'success' && (
        <>
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <h3 className="font-medium text-sm text-emerald-700 dark:text-emerald-400">
            המסמך נסרק בהצלחה!
          </h3>
        </>
      )}

      {uploadState === 'error' && (
        <>
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="font-medium text-sm text-red-700 dark:text-red-400 mb-1">
            {errorMessage}
          </h3>
          <p className="text-muted-foreground text-xs">לחץ לנסות שוב</p>
        </>
      )}
    </div>
  );
}
