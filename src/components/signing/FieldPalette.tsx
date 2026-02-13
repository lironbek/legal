import { Type, Phone, Mail, Calendar, PenTool, Hash, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FieldType {
  type: 'first_name' | 'last_name' | 'phone' | 'email' | 'signature' | 'date' | 'text' | 'id_number';
  label: string;
  icon: React.ElementType;
  color: string;
}

export const FIELD_TYPES: FieldType[] = [
  { type: 'first_name', label: 'שם פרטי', icon: User, color: '#3b82f6' },
  { type: 'last_name', label: 'שם משפחה', icon: User, color: '#6366f1' },
  { type: 'id_number', label: 'ת.ז.', icon: Hash, color: '#8b5cf6' },
  { type: 'phone', label: 'טלפון', icon: Phone, color: '#22c55e' },
  { type: 'email', label: 'אימייל', icon: Mail, color: '#f97316' },
  { type: 'date', label: 'תאריך', icon: Calendar, color: '#eab308' },
  { type: 'signature', label: 'חתימה', icon: PenTool, color: '#ef4444' },
  { type: 'text', label: 'טקסט חופשי', icon: FileText, color: '#78716c' },
];

interface FieldPaletteProps {
  activeFieldType: string | null;
  onSelectFieldType: (type: string | null) => void;
}

export function FieldPalette({ activeFieldType, onSelectFieldType }: FieldPaletteProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        לחץ על שדה ואז לחץ על המסמך למיקומו
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {FIELD_TYPES.map((field) => {
          const isActive = activeFieldType === field.type;
          return (
            <button
              key={field.type}
              onClick={() => onSelectFieldType(isActive ? null : field.type)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all border",
                isActive
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-background hover:bg-muted/50 text-foreground"
              )}
            >
              <field.icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: field.color }}
              />
              <span className="truncate">{field.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
