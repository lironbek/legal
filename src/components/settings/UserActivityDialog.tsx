import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Monitor,
  Smartphone,
  Tablet,
  Search,
  LogIn,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Eye,
  XCircle,
} from 'lucide-react'
import { getUserAuditLog, AuditLogEntry, AuditAction } from '@/lib/auditLog'

const actionConfig: Record<string, { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; icon: typeof LogIn }> = {
  login_success: { label: 'התחברות מוצלחת', variant: 'default', icon: LogIn },
  login_failed: { label: 'כניסה נכשלה', variant: 'destructive', icon: XCircle },
  logout: { label: 'התנתקות', variant: 'secondary', icon: LogOut },
  login_2fa_sent: { label: 'קוד 2FA נשלח', variant: 'outline', icon: ShieldCheck },
  login_2fa_verified: { label: '2FA אומת', variant: 'default', icon: ShieldCheck },
  login_2fa_failed: { label: '2FA נכשל', variant: 'destructive', icon: ShieldAlert },
  login_2fa_expired: { label: '2FA פג תוקף', variant: 'secondary', icon: ShieldAlert },
  login_2fa_cancelled: { label: '2FA בוטל', variant: 'secondary', icon: XCircle },
  impersonation_start: { label: 'צפייה כמשתמש', variant: 'outline', icon: Eye },
  impersonation_stop: { label: 'סיום צפייה', variant: 'outline', icon: Eye },
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ts
  }
}

function DeviceIcon({ type }: { type?: string }) {
  if (type === 'mobile') return <Smartphone className="h-4 w-4 text-muted-foreground" />
  if (type === 'tablet') return <Tablet className="h-4 w-4 text-muted-foreground" />
  return <Monitor className="h-4 w-4 text-muted-foreground" />
}

function DeviceLabel({ type }: { type?: string }) {
  if (type === 'mobile') return 'נייד'
  if (type === 'tablet') return 'טאבלט'
  if (type === 'desktop') return 'מחשב'
  return '—'
}

interface UserActivityDialogProps {
  userId: string
  userName: string
  userEmail: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserActivityDialog({ userId, userName, userEmail, open, onOpenChange }: UserActivityDialogProps) {
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const entries = useMemo(() => {
    if (!open) return []
    return getUserAuditLog(userId)
  }, [userId, open])

  const filteredEntries = useMemo(() => {
    let result = entries
    if (filter !== 'all') {
      result = result.filter(e => e.action === filter)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(e =>
        (e.ip_address || '').includes(term) ||
        (e.details || '').toLowerCase().includes(term) ||
        (e.user_agent || '').toLowerCase().includes(term)
      )
    }
    return result
  }, [entries, filter, searchTerm])

  // Summary stats
  const stats = useMemo(() => {
    const totalLogins = entries.filter(e => e.action === 'login_success').length
    const failedLogins = entries.filter(e => e.action === 'login_failed').length
    const lastLogin = entries.find(e => e.action === 'login_success')
    const uniqueIPs = new Set(entries.filter(e => e.ip_address).map(e => e.ip_address)).size
    const devices = new Set(entries.filter(e => e.device_type).map(e => e.device_type))

    return { totalLogins, failedLogins, lastLogin, uniqueIPs, devices: Array.from(devices) }
  }, [entries])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>היסטוריית פעילות — {userName}</DialogTitle>
          <DialogDescription dir="ltr" className="text-right">{userEmail}</DialogDescription>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" dir="rtl">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-2xl font-bold">{stats.totalLogins}</div>
            <div className="text-xs text-muted-foreground">התחברויות מוצלחות</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-2xl font-bold text-destructive">{stats.failedLogins}</div>
            <div className="text-xs text-muted-foreground">ניסיונות כושלים</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-sm font-medium">
              {stats.lastLogin ? formatTimestamp(stats.lastLogin.timestamp) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">התחברות אחרונה</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.uniqueIPs}</span>
              <div className="flex gap-1">
                {stats.devices.map(d => (
                  <DeviceIcon key={d} type={d} />
                ))}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">כתובות IP ייחודיות</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap" dir="rtl">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי IP או פרטים..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="כל הפעולות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפעולות</SelectItem>
              <SelectItem value="login_success">התחברות מוצלחת</SelectItem>
              <SelectItem value="login_failed">כניסה נכשלה</SelectItem>
              <SelectItem value="logout">התנתקות</SelectItem>
              <SelectItem value="login_2fa_sent">2FA נשלח</SelectItem>
              <SelectItem value="login_2fa_verified">2FA אומת</SelectItem>
              <SelectItem value="login_2fa_failed">2FA נכשל</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {filteredEntries.length} רשומות
          </span>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden" dir="rtl">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תאריך ושעה</TableHead>
                <TableHead>פעולה</TableHead>
                <TableHead>כתובת IP</TableHead>
                <TableHead>מכשיר</TableHead>
                <TableHead>פרטים</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <LogIn className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">אין רשומות פעילות</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      {entries.length === 0
                        ? 'לא נרשמה פעילות עבור משתמש זה'
                        : 'אין תוצאות תואמות לסינון'
                      }
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => {
                  const config = actionConfig[entry.action] || { label: entry.action, variant: 'secondary' as const, icon: LogIn }
                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm font-mono whitespace-nowrap">
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono" dir="ltr">
                        {entry.ip_address || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DeviceIcon type={entry.device_type} />
                          <span className="text-sm text-muted-foreground">
                            <DeviceLabel type={entry.device_type} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {entry.details || '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
