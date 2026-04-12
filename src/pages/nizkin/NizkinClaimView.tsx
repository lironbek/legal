// NizkinClaimView - /nizkin/:claimId - 2-column layout: details (30%) + editor (70%)

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Gavel, Edit2, FileDown, FileText, Sparkles, Loader2, Copy, Check,
  RotateCcw, Save, AlertTriangle, Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getClaim, patchClaim, changeStatus, generateDraft } from '@/lib/nizkin/api';
import { calculateStatuteOfLimitations, calculateTotalDamages } from '@/lib/nizkin/questionnaire-engine';
import type { ClaimDraftResult } from '@/lib/nizkin/claim-generator';
import { generateFormalDocx, generateFormalPdf, downloadBlob } from '@/lib/nizkin/document-generator';
import { StatuteWarning } from '@/components/nizkin/StatuteWarning';
import {
  CLAIM_TYPE_LABELS,
  COURT_TYPE_LABELS,
  CLAIM_STATUS_LABELS,
  DAMAGE_TYPE_LABELS,
  DEFENDANT_TYPE_LABELS,
} from '@/lib/tortClaimTypes';
import type { TortClaim, TortClaimStatus } from '@/lib/tortClaimTypes';

const STATUS_COLORS: Record<TortClaimStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  review: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800',
  approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  filed: 'bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800',
};

const formatCurrency = (n: number) =>
  n > 0 ? new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n) : '-';

export default function NizkinClaimView() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useOrgNavigate();
  const { toast } = useToast();

  const [claim, setClaim] = useState<TortClaim | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftDirty, setDraftDirty] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [regenDialogOpen, setRegenDialogOpen] = useState(false);
  const [regenInstructions, setRegenInstructions] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!claimId) return;
    getClaim(claimId).then(result => {
      if (result.success && result.data) {
        setClaim(result.data);
        setDraftText(result.data.generated_draft || result.data.final_document || '');
      }
    });
  }, [claimId]);

  if (!claim) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>כתב תביעה לא נמצא</p>
      </div>
    );
  }

  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);
  const totalDamages = calculateTotalDamages(claim.damage_heads);
  const amount = totalDamages || claim.total_claim_amount;

  const handleSaveDraft = async () => {
    await patchClaim(claim.id, { generated_draft: draftText });
    setClaim(prev => prev ? { ...prev, generated_draft: draftText } : prev);
    setDraftDirty(false);
    toast({ title: 'טיוטה נשמרה' });
  };

  const handleStatusChange = async (status: TortClaimStatus) => {
    await changeStatus(claim.id, status);
    setClaim(prev => prev ? { ...prev, status } : prev);
    toast({ title: `סטטוס עודכן: ${CLAIM_STATUS_LABELS[status]}` });
  };

  const handleGenerateDraft = async (additionalInstructions?: string) => {
    setGeneratingDraft(true);
    setRegenDialogOpen(false);
    try {
      const result = await generateDraft(claim, undefined, additionalInstructions);
      if (result.success && result.draft) {
        setDraftText(result.draft);
        setDraftDirty(false);
        setClaim(prev => prev ? {
          ...prev,
          generated_draft: result.draft!,
          ...(result.causes_of_action?.length ? { causes_of_action: [...new Set([...prev.causes_of_action, ...result.causes_of_action!])] } : {}),
          ...(result.relevant_laws?.length ? { relevant_laws: [...new Set([...prev.relevant_laws, ...result.relevant_laws!])] } : {}),
        } : prev);
        toast({ title: 'טיוטה נוצרה בהצלחה' });
      } else {
        toast({ title: 'שגיאה', description: result.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'שגיאה ביצירת הטיוטה', variant: 'destructive' });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleDocx = async () => {
    setGeneratingDocx(true);
    try {
      const blob = await generateFormalDocx(claim);
      downloadBlob(blob, `כתב_תביעה_${claim.plaintiff_name || 'טיוטה'}.docx`);
    } catch {
      toast({ title: 'שגיאה ביצירת DOCX', variant: 'destructive' });
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handlePdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await generateFormalPdf(claim);
      downloadBlob(blob, `כתב_תביעה_${claim.plaintiff_name || 'טיוטה'}.pdf`);
    } catch {
      toast({ title: 'שגיאה ביצירת PDF', variant: 'destructive' });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            {claim.plaintiff_name || 'כתב תביעה'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {CLAIM_TYPE_LABELS[claim.claim_type]} | {claim.court_name || '-'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={claim.status} onValueChange={v => handleStatusChange(v as TortClaimStatus)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLAIM_STATUS_LABELS).map(([k, l]) => (
                <SelectItem key={k} value={k}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => navigate(`/nizkin/${claim.id}/edit`)} className="gap-1">
            <Edit2 className="h-3.5 w-3.5" /> עריכה
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/nizkin')} className="gap-1">
            חזרה לרשימה
          </Button>
        </div>
      </div>

      {/* Statute warning */}
      <StatuteWarning statute={statute} />

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left: Details (30%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Status */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">סטטוס</span>
                <Badge className={STATUS_COLORS[claim.status]}>{CLAIM_STATUS_LABELS[claim.status]}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Plaintiff */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">התובע</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{claim.plaintiff_name}</p>
              <p className="text-muted-foreground">ת.ז. {claim.plaintiff_id}</p>
              {claim.plaintiff_address && <p className="text-muted-foreground">{claim.plaintiff_address}{claim.plaintiff_city ? ', ' + claim.plaintiff_city : ''}</p>}
              {claim.plaintiff_contact.phone && <p className="text-muted-foreground">טל: {claim.plaintiff_contact.phone}</p>}
              {claim.plaintiff_attorney && <p className="text-muted-foreground">ב"כ: {claim.plaintiff_attorney}</p>}
            </CardContent>
          </Card>

          {/* Defendants */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">נתבעים ({claim.defendants.length})</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {claim.defendants.map((d, i) => (
                <div key={d.id || i} className="space-y-0.5">
                  <p className="font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{DEFENDANT_TYPE_LABELS[d.type]}{d.role ? ` - ${d.role}` : ''}</p>
                  {d.address && <p className="text-xs text-muted-foreground">{d.address}{d.city ? ', ' + d.city : ''}</p>}
                </div>
              ))}
              {claim.defendants.length === 0 && <p className="text-muted-foreground">לא צוינו נתבעים</p>}
            </CardContent>
          </Card>

          {/* Incident */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">פרטי האירוע</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="text-muted-foreground">{claim.incident_date ? new Date(claim.incident_date).toLocaleDateString('he-IL') : '-'}</p>
              {claim.incident_location && <p className="text-muted-foreground">{claim.incident_location}</p>}
              <p className="text-sm leading-relaxed mt-2">{claim.incident_description || '-'}</p>
            </CardContent>
          </Card>

          {/* Damages */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">ראשי נזק</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {claim.damage_heads.filter(h => h.amount_estimated > 0).map((h, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{DAMAGE_TYPE_LABELS[h.type]}</span>
                  <span className="font-medium">{formatCurrency(h.amount_estimated)}</span>
                </div>
              ))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>סה"כ</span>
                <span className="text-primary">{formatCurrency(amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          {claim.attachments.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">מצורפים ({claim.attachments.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {claim.attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{a.filename}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Editor (70%) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Action bar */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={draftDirty ? handleSaveDraft : () => {}}
                  disabled={!draftDirty}
                  size="sm"
                  className="gap-1"
                >
                  <Save className="h-3.5 w-3.5" />
                  שמור טיוטה
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={generatingDraft}
                  onClick={() => handleGenerateDraft()}
                >
                  {generatingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" style={{ color: '#a855f7' }} />}
                  {draftText ? 'נסח מחדש' : 'נסח עם AI'}
                </Button>
                {draftText && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => setRegenDialogOpen(true)}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    נסח מחדש עם הנחיות
                    <Sparkles className="h-3 w-3" style={{ color: '#a855f7' }} />
                  </Button>
                )}
                <div className="flex-1" />
                <Button variant="outline" size="sm" className="gap-1" onClick={handleCopy} disabled={!draftText}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'הועתק' : 'העתק'}
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handleDocx} disabled={generatingDocx}>
                  {generatingDocx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  DOCX
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={handlePdf} disabled={generatingPdf}>
                  {generatingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Editor */}
          <Card>
            <CardContent className="pt-4">
              {draftText ? (
                <Textarea
                  value={draftText}
                  onChange={e => { setDraftText(e.target.value); setDraftDirty(true); }}
                  className="min-h-[600px] font-mono text-sm leading-relaxed resize-y"
                  dir="rtl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                  <FileText className="h-16 w-16 opacity-30 mb-4" />
                  <p className="text-lg font-medium">עדיין לא נוצרה טיוטה</p>
                  <p className="text-sm mt-1">לחץ "נסח עם AI" כדי ליצור טיוטת כתב תביעה</p>
                  <Button
                    onClick={() => handleGenerateDraft()}
                    disabled={generatingDraft}
                    className="mt-4 gap-2"
                  >
                    {generatingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" style={{ color: '#a855f7' }} />}
                    {generatingDraft ? 'מנסח...' : 'נסח כתב תביעה עם AI'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Legal info */}
          {(claim.causes_of_action.length > 0 || claim.relevant_laws.length > 0) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">מידע משפטי</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {claim.causes_of_action.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">עילות תביעה:</p>
                    <div className="flex flex-wrap gap-1">
                      {claim.causes_of_action.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                    </div>
                  </div>
                )}
                {claim.relevant_laws.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-1">חקיקה:</p>
                    <div className="flex flex-wrap gap-1">
                      {claim.relevant_laws.map(l => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Regenerate dialog */}
      <Dialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>ניסוח מחדש עם הנחיות נוספות</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">הוסף הנחיות שישולבו בניסוח החדש. לדוגמה: "הדגש את האשם התורם" או "הוסף טיעון לגבי פיצוי עונשי"</p>
            <Textarea
              value={regenInstructions}
              onChange={e => setRegenInstructions(e.target.value)}
              placeholder="הנחיות נוספות..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenDialogOpen(false)}>ביטול</Button>
            <Button onClick={() => handleGenerateDraft(regenInstructions)} disabled={!regenInstructions.trim()} className="gap-1">
              <Sparkles className="h-4 w-4" style={{ color: '#a855f7' }} /> נסח מחדש
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
