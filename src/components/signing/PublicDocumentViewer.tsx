import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { SignatureCanvas } from './SignatureCanvas';
import { FIELD_TYPES } from './FieldPalette';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface SigningFieldDef {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
  required: boolean;
}

interface PublicDocumentViewerProps {
  documentUrl: string;
  fileType: string | null;
  fields: SigningFieldDef[];
  fieldValues: Record<string, string>;
  onFieldChange: (fieldId: string, value: string) => void;
}

export function PublicDocumentViewer({
  documentUrl,
  fileType,
  fields,
  fieldValues,
  onFieldChange,
}: PublicDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [signingFieldId, setSigningFieldId] = useState<string | null>(null);

  // Load document
  useEffect(() => {
    if (!documentUrl) return;
    setImageLoaded(false);

    const isPdf = fileType?.includes('pdf') || documentUrl.toLowerCase().includes('.pdf');

    if (isPdf) {
      (async () => {
        try {
          const pdf = await pdfjsLib.getDocument(documentUrl).promise;
          const scale = 2;
          const pageCanvases: HTMLCanvasElement[] = [];
          let totalHeight = 0;
          let maxWidth = 0;

          for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const viewport = page.getViewport({ scale });
            const offscreen = document.createElement('canvas');
            offscreen.width = viewport.width;
            offscreen.height = viewport.height;
            const ctx = offscreen.getContext('2d')!;
            await page.render({ canvasContext: ctx, viewport }).promise;
            pageCanvases.push(offscreen);
            totalHeight += viewport.height;
            maxWidth = Math.max(maxWidth, viewport.width);
          }

          const combined = document.createElement('canvas');
          combined.width = maxWidth;
          combined.height = totalHeight;
          const ctx = combined.getContext('2d')!;
          let yOffset = 0;
          for (const pc of pageCanvases) {
            ctx.drawImage(pc, 0, yOffset);
            yOffset += pc.height;
          }

          const dataUrl = combined.toDataURL('image/png');
          const img = new Image();
          img.onload = () => { setImage(img); setImageLoaded(true); };
          img.src = dataUrl;
        } catch (err) {
          console.error('Failed to render PDF:', err);
        }
      })();
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { setImage(img); setImageLoaded(true); };
      img.src = documentUrl;
    }
  }, [documentUrl, fileType]);

  const fitToWidth = useCallback(() => {
    if (!image || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 16;
    const newZoom = containerWidth / image.width;
    setZoom(Math.min(Math.max(newZoom, 0.2), 3));
  }, [image]);

  useEffect(() => {
    if (imageLoaded && image) {
      setTimeout(fitToWidth, 100);
    }
  }, [imageLoaded, image, fitToWidth]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !image) return;
    const observer = new ResizeObserver(() => fitToWidth());
    observer.observe(container);
    return () => observer.disconnect();
  }, [image, fitToWidth]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    canvas.width = image.width * zoom;
    canvas.height = image.height * zoom;
    setCanvasSize({ width: canvas.width, height: canvas.height });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }, [image, zoom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getInputType = (fieldType: string) => {
    switch (fieldType) {
      case 'phone': return 'tel';
      case 'email': return 'email';
      case 'date': return 'date';
      default: return 'text';
    }
  };

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Document canvas */}
      <div className="relative inline-block w-full overflow-auto">
        <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block', maxWidth: 'none' }}
          />
          {/* Overlaid field inputs */}
          {fields.map((field) => {
            const fieldType = FIELD_TYPES.find((f) => f.type === field.type);
            const color = fieldType?.color || '#888';
            const isSignature = field.type === 'signature';
            const hasValue = !!fieldValues[field.id];

            const style: React.CSSProperties = {
              position: 'absolute',
              left: field.x * canvasSize.width,
              top: field.y * canvasSize.height,
              width: field.width * canvasSize.width,
              height: isSignature ? field.height * canvasSize.height : undefined,
              minWidth: 100,
            };

            if (isSignature) {
              return (
                <div key={field.id} style={style} className="z-10">
                  {signingFieldId === field.id ? (
                    <SignatureCanvas
                      height={Math.max(150, field.height * canvasSize.height)}
                      onSave={(dataUrl) => {
                        onFieldChange(field.id, dataUrl);
                        setSigningFieldId(null);
                      }}
                      onCancel={() => setSigningFieldId(null)}
                    />
                  ) : hasValue ? (
                    <div
                      className="border-2 rounded cursor-pointer hover:opacity-80 bg-white"
                      style={{ borderColor: color }}
                      onClick={() => setSigningFieldId(field.id)}
                    >
                      <img
                        src={fieldValues[field.id]}
                        alt="חתימה"
                        className="w-full h-full object-contain"
                      />
                      <p className="text-[10px] text-center text-muted-foreground">לחץ לחתימה מחדש</p>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-full border-2 border-dashed"
                      style={{ borderColor: color, color }}
                      onClick={() => setSigningFieldId(field.id)}
                    >
                      לחץ כאן לחתימה
                    </Button>
                  )}
                </div>
              );
            }

            return (
              <div key={field.id} style={style} className="z-10">
                <Input
                  type={getInputType(field.type)}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.label}
                  className="h-8 text-sm bg-white/90 border-2"
                  style={{ borderColor: color }}
                  dir={field.type === 'phone' || field.type === 'email' ? 'ltr' : 'rtl'}
                  required={field.required}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Field summary for mobile (below document) */}
      <div className="mt-6 space-y-3 lg:hidden">
        <h3 className="font-medium text-sm">שדות למילוי:</h3>
        {fields.map((field) => {
          const fieldType = FIELD_TYPES.find((f) => f.type === field.type);
          const isSignature = field.type === 'signature';
          const hasValue = !!fieldValues[field.id];

          return (
            <div key={`mobile-${field.id}`} className="space-y-1">
              <Label className="text-xs flex items-center gap-1.5">
                {fieldType && <fieldType.icon className="h-3 w-3" style={{ color: fieldType.color }} />}
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              {isSignature ? (
                signingFieldId === field.id ? (
                  <SignatureCanvas
                    height={150}
                    onSave={(dataUrl) => {
                      onFieldChange(field.id, dataUrl);
                      setSigningFieldId(null);
                    }}
                    onCancel={() => setSigningFieldId(null)}
                  />
                ) : hasValue ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-2 cursor-pointer"
                    onClick={() => setSigningFieldId(field.id)}
                  >
                    <img src={fieldValues[field.id]} alt="חתימה" className="h-16 object-contain" />
                    <p className="text-xs text-center text-muted-foreground mt-1">לחץ לחתימה מחדש</p>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-16 border-2 border-dashed"
                    onClick={() => setSigningFieldId(field.id)}
                  >
                    לחץ כאן לחתימה
                  </Button>
                )
              ) : (
                <Input
                  type={getInputType(field.type)}
                  value={fieldValues[field.id] || ''}
                  onChange={(e) => onFieldChange(field.id, e.target.value)}
                  placeholder={field.label}
                  dir={field.type === 'phone' || field.type === 'email' ? 'ltr' : 'rtl'}
                  required={field.required}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
