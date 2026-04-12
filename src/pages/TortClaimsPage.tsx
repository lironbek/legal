import { useState, useMemo } from 'react';
import { Gavel, Plus, Search, Trash2, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getTortClaims, deleteTortClaim } from '@/lib/tortClaimService';
import { CLAIM_TYPE_LABELS, CLAIM_STATUS_LABELS } from '@/lib/tortClaimTypes';
import type { TortClaim } from '@/lib/tortClaimTypes';

const statusColors: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border border-amber-200',
  review: 'bg-sky-50 text-sky-700 border border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  filed: 'bg-violet-50 text-violet-700 border border-violet-200',
};

export default function TortClaimsPage() {
  const navigate = useOrgNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const claims = useMemo(() => {
    return getTortClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const filtered = useMemo(() => {
    if (!searchTerm) return claims;
    const term = searchTerm.toLowerCase();
    return claims.filter(c =>
      c.plaintiff_name.toLowerCase().includes(term) ||
      c.defendants.some(d => d.name.toLowerCase().includes(term)) ||
      c.court_name.toLowerCase().includes(term) ||
      CLAIM_TYPE_LABELS[c.claim_type].includes(term)
    );
  }, [claims, searchTerm]);

  const handleDelete = (claim: TortClaim) => {
    if (!confirm(`למחוק את כתב התביעה של ${claim.plaintiff_name}?`)) return;
    deleteTortClaim(claim.id);
    setRefreshKey(k => k + 1);
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4 sm:space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1 flex items-center gap-3">
            <Gavel className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            כתבי תביעה בנזיקין
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            יצירה וניהול כתבי תביעה בתחום הנזיקין
          </p>
        </div>
        <Button onClick={() => navigate('/tort-claims/new')} className="w-full sm:w-auto">
          <Plus className="ml-2 h-5 w-5" />
          כתב תביעה חדש
        </Button>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>כתבי תביעה</CardTitle>
          <CardDescription>כל כתבי התביעה שנוצרו</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, בית משפט, סוג תביעה..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gavel className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {claims.length === 0 ? 'אין כתבי תביעה עדיין' : 'לא נמצאו תוצאות'}
              </p>
              {claims.length === 0 && (
                <p className="text-sm mt-1">לחץ על "כתב תביעה חדש" כדי להתחיל</p>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תובע</TableHead>
                    <TableHead>נתבעים</TableHead>
                    <TableHead>סוג תביעה</TableHead>
                    <TableHead>סכום</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>תאריך</TableHead>
                    <TableHead className="text-center">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(claim => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.plaintiff_name}</TableCell>
                      <TableCell>
                        {claim.defendants.length > 0
                          ? claim.defendants.map(d => d.name).join(', ')
                          : '-'}
                      </TableCell>
                      <TableCell>{CLAIM_TYPE_LABELS[claim.claim_type]}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {claim.total_claim_amount > 0 ? formatCurrency(claim.total_claim_amount) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[claim.status] || ''}>
                          {CLAIM_STATUS_LABELS[claim.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(claim.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/tort-claims/${claim.id}/view`)}
                            title="צפייה"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/tort-claims/${claim.id}/edit`)}
                            title="עריכה"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(claim)}
                            title="מחיקה"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
