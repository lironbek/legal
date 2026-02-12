import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, Trash2, Search, RefreshCw } from 'lucide-react';
import { getAuditLog, clearAuditLog, AuditLogEntry } from '@/lib/auditLog';

const actionConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  login_success: { label: 'התחברות מוצלחת', variant: 'default' },
  login_failed: { label: 'כניסה נכשלה', variant: 'destructive' },
  logout: { label: 'התנתקות', variant: 'secondary' },
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
        (entry.details?.toLowerCase() || '').includes(term)
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
        <CardHeader className="bg-gray-50 border-b border-gray-200">
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
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xs">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="חיפוש לפי אימייל או שם..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  <TableHead className="text-right font-semibold">תאריך ושעה</TableHead>
                  <TableHead className="text-right font-semibold">משתמש</TableHead>
                  <TableHead className="text-right font-semibold">אימייל</TableHead>
                  <TableHead className="text-right font-semibold">פעולה</TableHead>
                  <TableHead className="text-right font-semibold">פרטים</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLog.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
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
                        <TableCell className="text-right text-sm text-muted-foreground max-w-[250px] truncate">
                          {entry.details || '-'}
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
