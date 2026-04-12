// NizkinDashboard - /nizkin - Tort claims dashboard with table, filters, search, statute indicator

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Filter, Gavel, FileText, AlertTriangle, Eye, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { listClaims, removeClaim, getOpenClaimsCount } from '@/lib/nizkin/api';
import { calculateStatuteOfLimitations } from '@/lib/nizkin/questionnaire-engine';
import { StatuteWarning } from '@/components/nizkin/StatuteWarning';
import {
  CLAIM_TYPE_LABELS,
  CLAIM_STATUS_LABELS,
  COURT_TYPE_LABELS,
} from '@/lib/tortClaimTypes';
import type { TortClaim, TortClaimType, TortClaimStatus } from '@/lib/tortClaimTypes';

const STATUS_COLORS: Record<TortClaimStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  filed: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
};

const formatCurrency = (n: number) =>
  n > 0 ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n) : '-';

export default function NizkinDashboard() {
  const navigate = useOrgNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [claims, setClaims] = useState<TortClaim[]>([]);

  useEffect(() => {
    listClaims().then(result => {
      if (result.success) setClaims(result.data);
    });
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return claims.filter(c => {
      if (filterType !== 'all' && c.claim_type !== filterType) return false;
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        const match =
          c.plaintiff_name.toLowerCase().includes(s) ||
          c.court_name.toLowerCase().includes(s) ||
          c.defendants.some(d => d.name.toLowerCase().includes(s)) ||
          (CLAIM_TYPE_LABELS[c.claim_type] || '').includes(s);
        if (!match) return false;
      }
      return true;
    });
  }, [claims, filterType, filterStatus, search]);

  // Stats
  const stats = useMemo(() => {
    const total = claims.length;
    const drafts = claims.filter(c => c.status === 'draft').length;
    const urgent = claims.filter(c => {
      const s = calculateStatuteOfLimitations(c.claim_type, c.incident_date);
      return s && !s.isExpired && s.daysRemaining < 60;
    }).length;
    const totalAmount = claims.reduce((sum, c) => sum + (c.total_claim_amount || 0), 0);
    return { total, drafts, urgent, totalAmount };
  }, [claims]);

  const handleDelete = async () => {
    if (deleteId) {
      await removeClaim(deleteId);
      setDeleteId(null);
      setRefreshKey(k => k + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            כתבי תביעה בנזיקין
          </h1>
          <p className="text-sm text-muted-foreground mt-1">ניהול ויצירת כתבי תביעה</p>
        </div>
        <Button onClick={() => navigate('/nizkin/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          כתב תביעה חדש
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">סה"כ תביעות</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">טיוטות</p>
            <p className="text-2xl font-bold">{stats.drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-500" /> דחוף
            </p>
            <p className="text-2xl font-bold text-red-600">{stats.urgent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">סך תביעות</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="חיפוש לפי שם, בית משפט, נתבע..."
                className="pr-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="סוג תביעה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסוגים</SelectItem>
                  {Object.entries(CLAIM_TYPE_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  {Object.entries(CLAIM_STATUS_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table (desktop) / Cards (mobile) */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">
                {claims.length === 0 ? 'אין כתבי תביעה עדיין' : 'לא נמצאו תוצאות'}
              </p>
              <p className="text-sm mt-1">
                {claims.length === 0 ? 'לחץ "כתב תביעה חדש" כדי להתחיל' : 'נסה לשנות את הסינון'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תובע</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead>בית משפט</TableHead>
                    <TableHead>סכום</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>עודכן</TableHead>
                    <TableHead>התיישנות</TableHead>
                    <TableHead>פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(claim => (
                    <ClaimRow
                      key={claim.id}
                      claim={claim}
                      onView={() => navigate(`/nizkin/${claim.id}`)}
                      onEdit={() => navigate(`/nizkin/${claim.id}/edit`)}
                      onDelete={() => setDeleteId(claim.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(claim => (
              <MobileClaimCard
                key={claim.id}
                claim={claim}
                onView={() => navigate(`/nizkin/${claim.id}`)}
                onEdit={() => navigate(`/nizkin/${claim.id}/edit`)}
                onDelete={() => setDeleteId(claim.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת כתב תביעה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ClaimRow({
  claim,
  onView,
  onEdit,
  onDelete,
}: {
  claim: TortClaim;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);
  const defendantNames = claim.defendants.map(d => d.name).join(', ') || '-';

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onView}>
      <TableCell>
        <div>
          <p className="font-medium text-sm">{claim.plaintiff_name || '-'}</p>
          <p className="text-xs text-muted-foreground truncate max-w-[150px]">{defendantNames}</p>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm">{CLAIM_TYPE_LABELS[claim.claim_type]}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">{claim.court_name || '-'}</span>
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium">{formatCurrency(claim.total_claim_amount)}</span>
      </TableCell>
      <TableCell>
        <Badge className={`text-xs ${STATUS_COLORS[claim.status]}`} variant="secondary">
          {CLAIM_STATUS_LABELS[claim.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">
          {new Date(claim.updated_at).toLocaleDateString('he-IL')}
        </span>
      </TableCell>
      <TableCell>
        <StatuteWarning statute={statute} compact />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MobileClaimCard({
  claim,
  onView,
  onEdit,
  onDelete,
}: {
  claim: TortClaim;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);

  return (
    <Card className="cursor-pointer" onClick={onView}>
      <CardContent className="pt-4 pb-3 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{claim.plaintiff_name || '-'}</p>
            <p className="text-xs text-muted-foreground">{CLAIM_TYPE_LABELS[claim.claim_type]}</p>
          </div>
          <Badge className={`text-xs ${STATUS_COLORS[claim.status]}`} variant="secondary">
            {CLAIM_STATUS_LABELS[claim.status]}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{claim.court_name || '-'}</span>
          <span className="font-medium text-foreground">{formatCurrency(claim.total_claim_amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <StatuteWarning statute={statute} compact />
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
