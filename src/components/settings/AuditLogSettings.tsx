import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, Trash2, Search, RefreshCw, Monitor, Smartphone, Tablet } from 'lucide-react';
import { getAuditLog, clearAuditLog, AuditLogEntry } from '@/lib/auditLog';

const actionConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  login_success: { label: 'התחברות מוצלחת', variant: 'default' },
  login_failed: { label: 'כניסה נכשלה', variant: 'destructive' },
  logout: { label: 'התנתקות', variant: 'secondary' },
  login_2fa_sent: { label: 'קוד 2FA נשלח', variant: 'outline' },
  login_2fa_verified: { label: '2FA אומת', variant: 'default' },
  login_2fa_failed: { label: '2FA נכשל', variant: 'destructive' },
  login_2fa_expired: { label: '2FA פג תוקף', variant: 'secondary' },
  login_2fa_cancelled: { label: '2FA בוטל', variant: 'secondary' },
  impersonation_start: { label: 'צפייה כמשתמש', variant: 'outline' },
  impersonation_stop: { label: 'סיום צפייה', variant: 'outline' },
};

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return ts;
  }
}

function DeviceIcon({ type }: { type?: string }) {
  if (type === 'mobile') return <Smartphone className="h-3.5 w-3.5" />;
  if (type === 'tablet') return <Tablet className="h-3.5 w-3.5" />;
  if (type === 'desktop') return <Monitor className="h-3.5 w-3.5" />;
  return null;
}

export function AuditLogSettings() {
  const [log, setLog] = useState<AuditLogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadLog = () => setLog(getAuditLog());

  useEffect(() => {
    loadLog();
  }, []);

  const filteredLog = useMemo(() => {
    let result = log;
    if (filter !== 'all') {
      result = result.filter(entry => entry.action === filter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(entry =>
        entry.user_email.toLowerCase().includes(term) ||
        entry.user_name.toLowerCase().includes(term) ||
        (entry.details?.toLowerCase() || '').includes(term) ||
        (entry.ip_address || '').includes(term)
      );
    }
    return result;
  }, [log, filter, searchTerm]);

  const handleClear = () => {
    if (confirm('האם אתה בטוח שברצונך לנקות את כל יומן הפעילות?')) {
      clearAuditLog();
      setLog([]);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader className="bg-muted/50 border-b border-border">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={loadLog}>
                <RefreshCw className="h-3.5 w-3.5" />
                רענן
              </Button>
              <Button variant="destructive" size="sm" className="gap-1" onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5" />
                נקה יומן
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              יומן פעילות
              <Badge variant="secondary" className="text-xs">{filteredLog.length} רשומות</Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Filters */}
          <div className="flex gap-3 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי אימייל, שם או IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="סנן לפי פעולה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הפעולות</SelectItem>
                <SelectItem value="login_success">התחברות מוצלחת</SelectItem>
                <SelectItem value="login_failed">כניסה נכשלה</SelectItem>
                <SelectItem value="logout">התנתקות</SelectItem>
                <SelectItem value="login_2fa_sent">2FA נשלח</SelectItem>
                <SelectItem value="login_2fa_verified">2FA אומת</SelectItem>
                <SelectItem value="login_2fa_failed">2FA נכשל</SelectItem>
                <SelectItem value="impersonation_start">צפייה כמשתמש</SelectItem>
                <SelectItem value="impersonation_stop">סיום צפייה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>תאריך ושעה</TableHead>
                  <TableHead>משתמש</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>פעולה</TableHead>
                  <TableHead>כתובת IP</TableHead>
                  <TableHead>מכשיר</TableHead>
                  <TableHead>פרטים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <ScrollText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">אין רשומות ביומן הפעילות</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">פעולות התחברות, התנתקות וצפייה כמשתמש יופיעו כאן</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLog.map((entry) => {
                    const config = actionConfig[entry.action] || { label: entry.action, variant: 'secondary' as const };
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-right text-sm font-mono whitespace-nowrap">
                          {formatTimestamp(entry.timestamp)}
                        </TableCell>
                        <TableCell className="text-right font-medium">{entry.user_name}</TableCell>
                        <TableCell className="text-right text-sm" dir="ltr">{entry.user_email}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={config.variant}>{config.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono" dir="ltr">
                          {entry.ip_address || '—'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DeviceIcon type={entry.device_type} />
                            <span className="text-xs">
                              {entry.device_type === 'mobile' ? 'נייד' :
                               entry.device_type === 'tablet' ? 'טאבלט' :
                               entry.device_type === 'desktop' ? 'מחשב' : '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground max-w-[200px] truncate">
                          {entry.details || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
