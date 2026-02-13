import { X, GripVertical } from 'lucide-react';
import { FIELD_TYPES } from './FieldPalette';
import { cn } from '@/lib/utils';

interface PlacedFieldProps {
  field: {
    id: string;
    type: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
  containerWidth: number;
  containerHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function PlacedField({
  field,
  containerWidth,
  containerHeight,
  isSelected,
  onSelect,
  onDelete,
  onDragStart,
}: PlacedFieldProps) {
  const fieldType = FIELD_TYPES.find((f) => f.type === field.type);
  const color = fieldType?.color || '#888';

  const style: React.CSSProperties = {
    position: 'absolute',
    left: field.x * containerWidth,
    top: field.y * containerHeight,
    width: field.width * containerWidth,
    height: field.height * containerHeight,
    borderColor: color,
    backgroundColor: `${color}15`,
    minWidth: 60,
    minHeight: 24,
  };

  return (
    <div
      style={style}
      className={cn(
        "border-2 rounded cursor-move group flex items-center justify-between px-1 select-none",
        isSelected && "ring-2 ring-primary ring-offset-1"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onDragStart(e);
      }}
    >
      <div className="flex items-center gap-1 min-w-0 overflow-hidden">
        <GripVertical className="h-3 w-3 shrink-0 opacity-50" />
        <span
          className="text-[10px] font-medium truncate"
          style={{ color }}
        >
          {field.label}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="h-4 w-4 rounded-full bg-destructive/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}
