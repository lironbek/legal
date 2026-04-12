// AttachmentAnalyzer - Drag-drop file upload + Claude AI analysis for legal documents

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, Loader2, X, Eye, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { analyzeAttachment } from '@/lib/nizkin/claim-generator';
import type { AttachmentAnalysis } from '@/lib/nizkin/claim-generator';
import type { TortAttachment } from '@/lib/tortClaimTypes';

interface AttachmentAnalyzerProps {
  attachments: TortAttachment[];
  onAttachmentsChange: (attachments: TortAttachment[]) => void;
  onAnalysisComplete?: (analysis: AttachmentAnalysis) => void;
  analyses: AttachmentAnalysis[];
  onAnalysesChange: (analyses: AttachmentAnalysis[]) => void;
}

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  medical_opinion: 'חוות דעת רפואית',
  police_report: 'דו"ח משטרה',
  receipt: 'קבלה / חשבונית',
  other: 'אחר',
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface FileEntry {
  file: File;
  type: AttachmentAnalysis['type'];
  analyzing: boolean;
  error?: string;
  retryCount?: number;
}

export function AttachmentAnalyzer({
  attachments,
  onAttachmentsChange,
  onAnalysisComplete,
  analyses,
  onAnalysesChange,
}: AttachmentAnalyzerProps) {
  const [dragActive, setDragActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const processFiles = (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/'));

    const newEntries: FileEntry[] = [];
    for (const file of validFiles) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        newEntries.push({
          file,
          type: 'other',
          analyzing: false,
          error: `הקובץ גדול מדי (${(file.size / 1024 / 1024).toFixed(1)} MB). מקסימום ${MAX_FILE_SIZE_MB} MB`,
        });
      } else {
        newEntries.push({ file, type: 'other', analyzing: false });
      }
    }
    setPendingFiles(prev => [...prev, ...newEntries]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const updatePendingType = (index: number, type: AttachmentAnalysis['type']) => {
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, type } : f));
  };

  const removePending = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const analyzeFile = async (index: number) => {
    const entry = pendingFiles[index];
    if (entry.file.size > MAX_FILE_SIZE_BYTES) return;

    const retryCount = (entry.retryCount || 0) + 1;
    setPendingFiles(prev => prev.map((f, i) => i === index ? { ...f, analyzing: true, error: undefined, retryCount } : f));

    try {
      const result = await analyzeAttachment(entry.file, entry.type);

      if (result.success && result.analysis) {
        onAnalysesChange([...analyses, result.analysis]);
        onAnalysisComplete?.(result.analysis);

        const attachment: TortAttachment = {
          type: entry.type,
          filename: entry.file.name,
          url: URL.createObjectURL(entry.file),
          description: result.analysis.summary,
          uploaded_at: new Date().toISOString(),
        };
        onAttachmentsChange([...attachments, attachment]);
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
      } else {
        const canRetry = retryCount < 3;
        setPendingFiles(prev => prev.map((f, i) =>
          i === index ? {
            ...f,
            analyzing: false,
            retryCount,
            error: (result.error || 'שגיאה בניתוח') + (canRetry ? ' — לחץ לנסות שוב' : ' — ניסיונות הסתיימו, הוסף ללא ניתוח'),
          } : f
        ));
      }
    } catch {
      const canRetry = retryCount < 3;
      setPendingFiles(prev => prev.map((f, i) =>
        i === index ? {
          ...f,
          analyzing: false,
          retryCount,
          error: 'שגיאה בלתי צפויה' + (canRetry ? ' — לחץ לנסות שוב' : ''),
        } : f
      ));
    }
  };

  const addWithoutAnalysis = (index: number) => {
    const entry = pendingFiles[index];
    const attachment: TortAttachment = {
      type: entry.type,
      filename: entry.file.name,
      url: URL.createObjectURL(entry.file),
      description: '',
      uploaded_at: new Date().toISOString(),
    };
    onAttachmentsChange([...attachments, attachment]);
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttachment = (index: number) => {
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const removeAnalysis = (index: number) => {
    onAnalysesChange(analyses.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/*"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className={`h-8 w-8 mx-auto mb-3 ${dragActive ? 'text-primary' : 'text-muted-foreground'}`} />
        <p className="text-sm font-medium">{dragActive ? 'שחרר כאן' : 'גרור קבצים לכאן או לחץ לבחירה'}</p>
        <p className="text-xs text-muted-foreground mt-1">PDF, תמונות (חוות דעת, קבלות, דו"חות) — עד {MAX_FILE_SIZE_MB} MB לקובץ</p>
      </div>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">קבצים ממתינים ({pendingFiles.length})</p>
          {pendingFiles.map((entry, i) => (
            <Card key={i}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium flex-1 min-w-[120px] truncate">{entry.file.name}</span>
                  <Select
                    value={entry.type}
                    onValueChange={v => updatePendingType(i, v as AttachmentAnalysis['type'])}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ATTACHMENT_TYPE_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1"
                      disabled={entry.analyzing}
                      onClick={() => analyzeFile(i)}
                    >
                      {entry.analyzing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                      {entry.analyzing ? 'מנתח...' : 'נתח עם AI'}
                      {!entry.analyzing && <Sparkles className="h-3 w-3" style={{ color: '#a855f7' }} />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={entry.analyzing}
                      onClick={() => addWithoutAnalysis(i)}
                    >
                      הוסף ללא ניתוח
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={entry.analyzing}
                      onClick={() => removePending(i)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {entry.error && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {entry.error}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">מצורפים ({attachments.length})</p>
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-3 border rounded-md px-3 py-2 bg-muted/30">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{att.filename}</p>
                {att.description && <p className="text-xs text-muted-foreground truncate">{att.description}</p>}
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {ATTACHMENT_TYPE_LABELS[att.type] || att.type}
              </Badge>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => removeAttachment(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Analysis results */}
      {analyses.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">תוצאות ניתוח AI ({analyses.length}) <Sparkles className="h-3.5 w-3.5" style={{ color: '#a855f7' }} /></p>
          {analyses.map((a, i) => (
            <Card key={i} className="bg-primary/5 border-primary/20">
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{a.filename}</span>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeAnalysis(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{a.summary}</p>
                {a.extractedData && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {a.extractedData.disabilityPercentage != null && (
                      <Badge variant="outline">נכות: {a.extractedData.disabilityPercentage}%</Badge>
                    )}
                    {a.extractedData.diagnosis && (
                      <Badge variant="outline">אבחנה: {a.extractedData.diagnosis}</Badge>
                    )}
                    {a.extractedData.functionalLimitations && (
                      <Badge variant="outline">הגבלות: {a.extractedData.functionalLimitations}</Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
