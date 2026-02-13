import { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FieldPalette, FIELD_TYPES } from './FieldPalette';
import { PlacedField } from './PlacedField';
import type { SigningField } from '@/services/signingService';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

interface DocumentFieldEditorProps {
  fileUrl: string | null;
  fileType: string | null;
  fields: SigningField[];
  onFieldsChange: (fields: SigningField[]) => void;
}

export function DocumentFieldEditor({
  fileUrl,
  fileType,
  fields,
  onFieldsChange,
}: DocumentFieldEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [activeFieldType, setActiveFieldType] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Load document (PDF or image)
  useEffect(() => {
    if (!fileUrl) return;
    setImageLoaded(false);

    const isPdf = fileType?.includes('pdf') || fileUrl.toLowerCase().includes('.pdf');

    if (isPdf) {
      (async () => {
        try {
          const pdf = await pdfjsLib.getDocument(fileUrl).promise;
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
      img.onerror = () => console.error('Failed to load image');
      img.src = fileUrl;
    }
  }, [fileUrl, fileType]);

  const fitToWidth = useCallback(() => {
    if (!image || !containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 32;
    const newZoom = containerWidth / image.width;
    setZoom(Math.min(Math.max(newZoom, 0.2), 3));
  }, [image]);

  useEffect(() => {
    if (imageLoaded && image) {
      setTimeout(fitToWidth, 100);
    }
  }, [imageLoaded, image, fitToWidth]);

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

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeFieldType || !image) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / canvasSize.width;
    const clickY = (e.clientY - rect.top) / canvasSize.height;

    const fieldTypeInfo = FIELD_TYPES.find((f) => f.type === activeFieldType);
    if (!fieldTypeInfo) return;

    const isSignature = activeFieldType === 'signature';
    const fieldWidth = isSignature ? 0.2 : 0.15;
    const fieldHeight = isSignature ? 0.06 : 0.03;

    const newField: SigningField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      type: activeFieldType as SigningField['type'],
      label: fieldTypeInfo.label,
      x: Math.max(0, Math.min(1 - fieldWidth, clickX - fieldWidth / 2)),
      y: Math.max(0, Math.min(1 - fieldHeight, clickY - fieldHeight / 2)),
      width: fieldWidth,
      height: fieldHeight,
      page: 1,
      required: true,
    };

    onFieldsChange([...fields, newField]);
    setSelectedFieldId(newField.id);
    setActiveFieldType(null);
  };

  const handleFieldDragStart = (fieldId: string, e: React.MouseEvent) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    setDraggingFieldId(fieldId);
    setSelectedFieldId(fieldId);

    const rect = containerRef.current?.querySelector('[data-canvas-container]')?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = (e.clientX - rect.left) / canvasSize.width;
    const mouseY = (e.clientY - rect.top) / canvasSize.height;

    setDragOffset({
      x: mouseX - field.x,
      y: mouseY - field.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingFieldId) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / canvasSize.width;
    const mouseY = (e.clientY - rect.top) / canvasSize.height;

    const field = fields.find((f) => f.id === draggingFieldId);
    if (!field) return;

    const newX = Math.max(0, Math.min(1 - field.width, mouseX - dragOffset.x));
    const newY = Math.max(0, Math.min(1 - field.height, mouseY - dragOffset.y));

    onFieldsChange(
      fields.map((f) =>
        f.id === draggingFieldId ? { ...f, x: newX, y: newY } : f
      )
    );
  };

  const handleMouseUp = () => {
    setDraggingFieldId(null);
  };

  const deleteField = (fieldId: string) => {
    onFieldsChange(fields.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Field Palette - sidebar */}
      <div className="lg:w-48 shrink-0">
        <FieldPalette
          activeFieldType={activeFieldType}
          onSelectFieldType={setActiveFieldType}
        />
        {fields.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            {fields.length} שדות מוגדרים
          </div>
        )}
      </div>

      {/* Document Canvas */}
      <div className="flex-1 min-w-0">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 mb-2">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs min-w-[36px] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(3, z + 0.15))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          {activeFieldType && (
            <span className="text-xs text-primary font-medium mr-2">
              לחץ על המסמך למקם את השדה
            </span>
          )}
        </div>

        <div
          ref={containerRef}
          className="border rounded-lg bg-muted/20 overflow-auto"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          {!imageLoaded ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              data-canvas-container
              className="relative inline-block"
              style={{ cursor: activeFieldType ? 'crosshair' : 'default' }}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <canvas
                ref={canvasRef}
                style={{ display: 'block', maxWidth: 'none' }}
              />
              {/* Placed fields overlay */}
              {fields.map((field) => (
                <PlacedField
                  key={field.id}
                  field={field}
                  containerWidth={canvasSize.width}
                  containerHeight={canvasSize.height}
                  isSelected={selectedFieldId === field.id}
                  onSelect={() => setSelectedFieldId(field.id)}
                  onDelete={() => deleteField(field.id)}
                  onDragStart={(e) => handleFieldDragStart(field.id, e)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
