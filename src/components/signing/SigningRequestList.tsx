import { Eye, Send, XCircle, Download, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { SigningRequest } from '@/services/signingService';

interface SigningRequestListProps {
  requests: SigningRequest[];
  loading: boolean;
  currentUserId?: string;
  onView: (request: SigningRequest) => void;
  onResend: (request: SigningRequest) => void;
  onCancel: (request: SigningRequest) => void;
  onDownload: (request: SigningRequest) => void;
  onDelete?: (request: SigningRequest) => void;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; border: string }> = {
  draft: { label: 'טיוטה', variant: 'outline', border: 'border-r-muted-foreground' },
  sent: { label: 'נשלח', variant: 'secondary', border: 'border-r-blue-500' },
  opened: { label: 'נפתח', variant: 'secondary', border: 'border-r-orange-500' },
  signed: { label: 'נחתם', variant: 'default', border: 'border-r-green-500' },
  expired: { label: 'פג תוקף', variant: 'destructive', border: 'border-r-destructive' },
  cancelled: { label: 'בוטל', variant: 'destructive', border: 'border-r-destructive' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SigningRequestList({
  requests,
  loading,
  currentUserId,
  onView,
  onResend,
  onCancel,
  onDownload,
  onDelete,
}: SigningRequestListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 sm:mb-4 mx-auto">
          <Send className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-base sm:text-lg mb-1">אין בקשות חתימה עדיין</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">צור בקשה חדשה כדי לשלוח מסמך לחתימה</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {requests.map((req) => {
          const status = STATUS_MAP[req.status] || STATUS_MAP.draft;
          return (
            <div
              key={req.id}
              className={cn("p-4 border rounded-lg hover:bg-muted/50 space-y-2 border-r-4 transition-colors", status.border)}
              onClick={() => onView(req)}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-sm truncate">{req.file_name}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>נמען: {req.recipient_name || req.recipient_phone}</div>
                <div>נשלח: {formatDate(req.created_at)}</div>
                {req.signed_at && <div>נחתם: {formatDate(req.signed_at)}</div>}
              </div>
              <div className="flex gap-2 pt-1">
                {req.status === 'sent' || req.status === 'opened' ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); onResend(req); }}>
                      <RotateCcw className="ml-1 h-3 w-3" />
                      שלח שוב
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={(e) => { e.stopPropagation(); onCancel(req); }}>
                      <XCircle className="ml-1 h-3 w-3" />
                      בטל
                    </Button>
                  </>
                ) : req.status === 'signed' ? (
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={(e) => { e.stopPropagation(); onDownload(req); }}>
                    <Download className="ml-1 h-3 w-3" />
                    הורד מסמך חתום
                  </Button>
                ) : null}
                {onDelete && currentUserId && req.created_by === currentUserId && (
                  <Button variant="outline" size="sm" className="text-xs text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(req); }}>
                    <Trash2 className="ml-1 h-3 w-3" />
                    מחק
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם מסמך</TableHead>
              <TableHead className="text-right">נמען</TableHead>
              <TableHead className="text-right">טלפון</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">נשלח</TableHead>
              <TableHead className="text-right">נחתם</TableHead>
              <TableHead className="text-right">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => {
              const status = STATUS_MAP[req.status] || STATUS_MAP.draft;
              return (
                <TableRow key={req.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(req)}>
                  <TableCell className="font-medium">{req.file_name}</TableCell>
                  <TableCell>{req.recipient_name || '-'}</TableCell>
                  <TableCell dir="ltr" className="text-left">{req.recipient_phone}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>{formatDate(req.signed_at)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => onView(req)}>
                        <Eye className="ml-1 h-4 w-4" />
                        צפה
                      </Button>
                      {(req.status === 'sent' || req.status === 'opened') && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => onResend(req)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onCancel(req)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {req.status === 'signed' && (
                        <Button variant="ghost" size="sm" onClick={() => onDownload(req)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && currentUserId && req.created_by === currentUserId && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(req)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
