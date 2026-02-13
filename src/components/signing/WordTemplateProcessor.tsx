import { useState, useRef, useCallback } from 'react';
import mammoth from 'mammoth';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';
import { FileText, Loader2, Eye, Download, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Common Hebrew variable labels
const VARIABLE_LABELS: Record<string, string> = {
  'שם_פרטי': 'שם פרטי',
  'שם_משפחה': 'שם משפחה',
  'תעודת_זהות': 'תעודת זהות',
  'כתובת': 'כתובת',
  'עיר': 'עיר',
  'טלפון': 'טלפון',
  'אימייל': 'אימייל',
  'תאריך': 'תאריך',
  'מיקוד': 'מיקוד',
  'תפקיד': 'תפקיד',
  'חברה': 'שם חברה',
  'סכום': 'סכום',
};

function getVariableLabel(varName: string): string {
  return VARIABLE_LABELS[varName] || varName.replace(/_/g, ' ');
}

function extractVariables(html: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const vars = new Set<string>();
  let match;
  while ((match = regex.exec(html)) !== null) {
    vars.add(match[1].trim());
  }
  return Array.from(vars);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fillTemplate(html: string, values: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'g');
    // Escape user input to prevent XSS
    result = result.replace(regex, value ? escapeHtml(value) : `{{${key}}}`);
  }
  // Sanitize the final HTML to strip any malicious content from the docx
  return DOMPurify.sanitize(result);
}

interface WordTemplateProcessorProps {
  file: File;
  onDocumentReady: (imageFile: File) => void;
  onBack: () => void;
}

export function WordTemplateProcessor({ file, onDocumentReady, onBack }: WordTemplateProcessorProps) {
  const [parsing, setParsing] = useState(true);
  const [html, setHtml] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Parse the .docx file on mount
  useState(() => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        const rawHtml = result.value;
        setHtml(rawHtml);

        const vars = extractVariables(rawHtml);
        setVariables(vars);

        const initial: Record<string, string> = {};
        vars.forEach(v => { initial[v] = ''; });
        setValues(initial);
      } catch {
        alert('שגיאה בקריאת קובץ Word');
      } finally {
        setParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  });

  const filledHtml = fillTemplate(html, values);
  const allFilled = variables.length === 0 || variables.every(v => values[v]?.trim());

  const handleGenerate = useCallback(async () => {
    if (!previewRef.current) return;
    setGenerating(true);
    try {
      // Make sure we're in preview mode so the content is rendered
      setShowPreview(true);

      // Wait for render
      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          alert('שגיאה ביצירת המסמך');
          setGenerating(false);
          return;
        }
        const baseName = file.name.replace(/\.docx?$/i, '');
        const imageFile = new File([blob], `${baseName}.png`, { type: 'image/png' });
        onDocumentReady(imageFile);
        setGenerating(false);
      }, 'image/png');
    } catch {
      alert('שגיאה ביצירת המסמך');
      setGenerating(false);
    }
  }, [file, onDocumentReady]);

  if (parsing) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">מפרק את מסמך ה-Word...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle className="text-lg">{file.name}</CardTitle>
                <CardDescription>
                  {variables.length > 0
                    ? `נמצאו ${variables.length} משתנים למילוי`
                    : 'לא נמצאו משתנים — המסמך ייוצר כפי שהוא'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowRight className="ml-1 h-4 w-4" />
              חזרה
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Variable Form */}
      {variables.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">מילוי משתנים</CardTitle>
            <CardDescription>
              מלא את הפרטים הבאים עבור המסמך. משתנים מסומנים בתבנית {'{{שם_המשתנה}}'} במסמך המקורי.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {variables.map((varName) => (
                <div key={varName} className="space-y-1.5">
                  <Label htmlFor={`var-${varName}`} className="flex items-center gap-2">
                    {getVariableLabel(varName)}
                    <Badge variant="outline" className="text-xs font-mono">
                      {`{{${varName}}}`}
                    </Badge>
                  </Label>
                  <Input
                    id={`var-${varName}`}
                    value={values[varName] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [varName]: e.target.value }))}
                    placeholder={getVariableLabel(varName)}
                    dir="rtl"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview + Generate */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">תצוגה מקדימה</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="ml-1 h-4 w-4" />
                {showPreview ? 'הסתר' : 'הצג'}
              </Button>
              <Button
                size="sm"
                disabled={!allFilled || generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <Loader2 className="ml-1 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="ml-1 h-4 w-4" />
                )}
                צור מסמך והמשך לשדות חתימה
              </Button>
            </div>
          </div>
        </CardHeader>
        {showPreview && (
          <CardContent>
            <div
              ref={previewRef}
              dir="rtl"
              className="bg-white text-black p-8 border rounded-lg max-h-[600px] overflow-y-auto prose prose-sm max-w-none"
              style={{ fontFamily: 'Arial, sans-serif', lineHeight: 1.8 }}
              dangerouslySetInnerHTML={{ __html: filledHtml }}
            />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
