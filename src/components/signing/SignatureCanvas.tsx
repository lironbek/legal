import { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvasLib from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  height?: number;
}

export function SignatureCanvas({
  onSave,
  onCancel,
  height = 200,
}: SignatureCanvasProps) {
  const sigRef = useRef<SignatureCanvasLib>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [canvasWidth, setCanvasWidth] = useState(400);

  const updateCanvasSize = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.offsetWidth;
      if (w > 0 && w !== canvasWidth) {
        setCanvasWidth(w);
      }
    }
  }, [canvasWidth]);

  useEffect(() => {
    updateCanvasSize();

    const observer = new ResizeObserver(() => updateCanvasSize());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateCanvasSize]);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="border-2 border-dashed border-primary/30 rounded-lg bg-white overflow-hidden"
      >
        <SignatureCanvasLib
          ref={sigRef}
          penColor="black"
          canvasProps={{
            width: canvasWidth,
            height,
            className: 'touch-none',
            style: { width: `${canvasWidth}px`, height: `${height}px` },
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <p className="text-xs text-muted-foreground text-center">
        חתום באמצעות העכבר או האצבע
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="ml-1 h-3.5 w-3.5" />
          נקה
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isEmpty}>
          <Check className="ml-1 h-3.5 w-3.5" />
          אשר חתימה
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  );
}
