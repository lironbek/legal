import { useState } from 'react';
import { Loader2, Send, Phone, User, CalendarClock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SendViaWhatsAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (phone: string, name: string, expiryDays: number) => Promise<void>;
  fieldsCount: number;
}

export function SendViaWhatsAppDialog({
  open,
  onOpenChange,
  onSend,
}: SendViaWhatsAppDialogProps) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState('30');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!phone.trim()) return;
    setSending(true);
    try {
      await onSend(phone.trim(), name.trim(), parseInt(expiryDays));
      setPhone('');
      setName('');
      onOpenChange(false);
    } catch {
      // Error handled by caller
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            שליחה בוואטסאפ
          </DialogTitle>
          <DialogDescription>
            הזן את מספר הטלפון של הנמען. הוא יקבל קישור לחתימה בוואטסאפ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="recipient-name" className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              שם הנמען
            </Label>
            <Input
              id="recipient-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="שם מלא"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              מספר טלפון *
            </Label>
            <Input
              id="recipient-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05X-XXXXXXX"
              dir="ltr"
              className="text-left"
              type="tel"
            />
            <p className="text-xs text-muted-foreground">
              ניתן להכניס מספר ישראלי (05X) או בינלאומי (972...)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              תוקף הקישור
            </Label>
            <Select value={expiryDays} onValueChange={setExpiryDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 ימים</SelectItem>
                <SelectItem value="14">14 ימים</SelectItem>
                <SelectItem value="30">30 ימים</SelectItem>
                <SelectItem value="60">60 ימים</SelectItem>
                <SelectItem value="90">90 ימים</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2 sm:gap-0">
          <Button
            onClick={handleSend}
            disabled={!phone.trim() || sending}
            className="bg-green-600 hover:bg-green-700"
          >
            {sending ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="ml-2 h-4 w-4" />
                שלח בוואטסאפ
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
