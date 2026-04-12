import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gavel, Edit, FileDown, Loader2, AlertTriangle, Sparkles, Copy, Merge } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { getTortClaimById } from '@/lib/tortClaimService';
import { generateTortClaimDocx, generateTortClaimPdf, generateMergedTortClaimPdf, downloadBlob } from '@/lib/tortDocumentGenerator';
import { calculateStatuteOfLimitations, calculateTotalDamages } from '@/lib/nizkin/questionnaire-engine';
import { generateClaimDraft } from '@/lib/nizkin/claim-generator';
import type { ClaimDraftResult } from '@/lib/nizkin/claim-generator';
import {
  CLAIM_TYPE_LABELS,
  CLAIM_STATUS_LABELS,
  DEFENDANT_TYPE_LABELS,
  DAMAGE_TYPE_LABELS,
} from '@/lib/tortClaimTypes';

export default function ViewTortClaimPage() {
  const { claimId } = useParams<{ claimId: string }>();
  const navigate = useOrgNavigate();
  const [generatingDocx, setGeneratingDocx] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingMerged, setGeneratingMerged] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [draftResult, setDraftResult] = useState<ClaimDraftResult | null>(null);

  const claim = useMemo(() => {
    if (!claimId) return null;
    return getTortClaimById(claimId);
  }, [claimId]);

  if (!claim) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">כתב התביעה לא נמצא</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/tort-claims')}>
          חזרה לרשימה
        </Button>
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

  const totalDamages = calculateTotalDamages(claim.damage_heads);
  const statute = calculateStatuteOfLimitations(claim.claim_type, claim.incident_date);

  const handleDownloadDocx = async () => {
    setGeneratingDocx(true);
    try {
      const blob = await generateTortClaimDocx(claim);
      downloadBlob(blob, `כתב_תביעה_${claim.plaintiff_name}.docx`);
    } catch {
      toast.error('שגיאה ביצירת הקובץ');
    } finally {
      setGeneratingDocx(false);
    }
  };

  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    try {
      const blob = await generateTortClaimPdf(claim);
      downloadBlob(blob, `כתב_תביעה_${claim.plaintiff_name}.pdf`);
    } catch {
      toast.error('שגיאה ביצירת הקובץ');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const hasAttachments = (claim.document_attachments?.length || 0) > 0;

  const handleDownloadMergedPdf = async () => {
    setGeneratingMerged(true);
    try {
      // Fetch attachment PDF blobs from their URLs
      const attachmentBlobs: Blob[] = [];
      const attachments = claim.document_attachments || [];
      const sorted = [...attachments].sort((a, b) => a.order - b.order);

      for (const att of sorted) {
        if (att.file_url) {
          try {
            const resp = await fetch(att.file_url);
            if (resp.ok) {
              const blob = await resp.blob();
              // Only include PDF files
              if (blob.type === 'application/pdf' || att.file_name.endsWith('.pdf')) {
                attachmentBlobs.push(blob);
              }
            }
          } catch {
            console.warn(`Failed to fetch attachment: ${att.file_name}`);
          }
        }
      }

      const blob = await generateMergedTortClaimPdf(claim, attachmentBlobs);
      downloadBlob(blob, `כתב_תביעה_מאוחד_${claim.plaintiff_name}.pdf`);
    } catch {
      toast.error('שגיאה ביצירת PDF מאוחד');
    } finally {
      setGeneratingMerged(false);
    }
  };

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const result = await generateClaimDraft(claim);
      setDraftResult(result);
    } catch {
      setDraftResult({ success: false, error: 'שגיאה ביצירת הטיוטה' });
    } finally {
      setGeneratingDraft(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            כתב תביעה - {claim.plaintiff_name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">{CLAIM_STATUS_LABELS[claim.status]}</Badge>
            <Badge variant="outline">{CLAIM_TYPE_LABELS[claim.claim_type]}</Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => navigate(`/tort-claims/${claim.id}/edit`)}>
            <Edit className="ml-2 h-4 w-4" />
            עריכה
          </Button>
          <Button variant="outline" onClick={handleDownloadDocx} disabled={generatingDocx}>
            {generatingDocx ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileDown className="ml-2 h-4 w-4" />}
            DOCX
          </Button>
          <Button onClick={handleDownloadPdf} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <FileDown className="ml-2 h-4 w-4" />}
            PDF
          </Button>
          {hasAttachments && (
            <Button variant="secondary" onClick={handleDownloadMergedPdf} disabled={generatingMerged}>
              {generatingMerged ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Merge className="ml-2 h-4 w-4" />}
              PDF מאוחד ({claim.document_attachments!.length})
            </Button>
          )}
          <Button variant="secondary" onClick={handleGenerateDraft} disabled={generatingDraft}>
            {generatingDraft ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <Sparkles className="ml-2 h-4 w-4" />}
            נסח עם AI
          </Button>
        </div>
      </div>

      {/* Statute warning */}
      {statute && (statute.isExpired || statute.isUrgent) && (
        <div className={`rounded-lg border p-3 flex items-center gap-3 ${
          statute.isExpired ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-yellow-50 border-yellow-300 text-yellow-800'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span className="text-sm">
            {statute.isExpired
              ? `תקופת ההתיישנות חלפה! (${statute.label})`
              : `נותרו ${statute.daysRemaining} ימים להגשה. מועד אחרון: ${new Date(statute.deadline).toLocaleDateString('he-IL')}`}
          </span>
        </div>
      )}

      {/* Court Info */}
      <Card>
        <CardHeader><CardTitle className="text-base">פרטי בית המשפט</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><span className="text-muted-foreground">בית משפט:</span> <span className="font-medium">{claim.court_name}</span></div>
          <div><span className="text-muted-foreground">תאריך אירוע:</span> <span className="font-medium">{claim.incident_date ? new Date(claim.incident_date).toLocaleDateString('he-IL') : '-'}</span></div>
          {statute && (
            <div><span className="text-muted-foreground">התיישנות:</span> <span className="font-medium">{statute.label}</span></div>
          )}
        </CardContent>
      </Card>

      {/* Plaintiff */}
      <Card>
        <CardHeader><CardTitle className="text-base">התובע</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="text-muted-foreground">שם:</span> <span className="font-medium">{claim.plaintiff_name}</span></div>
          <div><span className="text-muted-foreground">ת.ז.:</span> <span className="font-medium">{claim.plaintiff_id}</span></div>
          <div><span className="text-muted-foreground">כתובת:</span> <span className="font-medium">{claim.plaintiff_address}{claim.plaintiff_city ? `, ${claim.plaintiff_city}` : ''}</span></div>
          <div><span className="text-muted-foreground">טלפון:</span> <span className="font-medium">{claim.plaintiff_contact.phone || '-'}</span></div>
          {claim.plaintiff_attorney && (
            <div><span className="text-muted-foreground">עו"ד:</span> <span className="font-medium">{claim.plaintiff_attorney}</span></div>
          )}
        </CardContent>
      </Card>

      {/* Defendants */}
      <Card>
        <CardHeader><CardTitle className="text-base">הנתבעים ({claim.defendants.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {claim.defendants.map((d, i) => (
            <div key={d.id} className="text-sm border-b last:border-0 pb-2 last:pb-0">
              <p className="font-medium">נתבע {i + 1}: {d.name} ({DEFENDANT_TYPE_LABELS[d.type]})</p>
              {d.role && <p className="text-muted-foreground">תפקיד: {d.role}</p>}
              <p className="text-muted-foreground">{d.address}{d.city ? `, ${d.city}` : ''}</p>
              {d.idNumber && <p className="text-muted-foreground">ת.ז./ח.פ.: {d.idNumber}</p>}
              {d.insurerName && <p className="text-muted-foreground">ביטוח: {d.insurerName}{d.policyNumber ? ` (${d.policyNumber})` : ''}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Event */}
      <Card>
        <CardHeader><CardTitle className="text-base">פרטי האירוע</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><span className="text-muted-foreground">תאריך:</span> <span className="font-medium">{claim.incident_date ? new Date(claim.incident_date).toLocaleDateString('he-IL') : '-'}</span></div>
            <div><span className="text-muted-foreground">מיקום:</span> <span className="font-medium">{claim.incident_location || '-'}</span></div>
            <div><span className="text-muted-foreground">סוג:</span> <span className="font-medium">{CLAIM_TYPE_LABELS[claim.claim_type]}</span></div>
          </div>
          <Separator />
          <p className="whitespace-pre-wrap">{claim.incident_description}</p>
        </CardContent>
      </Card>

      {/* Road accident details */}
      {claim.claim_type === 'road_accident' && claim.vehicle_details && (
        <Card>
          <CardHeader><CardTitle className="text-base">פרטי תאונת דרכים</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {claim.vehicle_details.license_plate && <div><span className="text-muted-foreground">מספר רישוי:</span> <span className="font-medium">{claim.vehicle_details.license_plate}</span></div>}
            {claim.vehicle_details.make && <div><span className="text-muted-foreground">רכב:</span> <span className="font-medium">{claim.vehicle_details.make} {claim.vehicle_details.model} {claim.vehicle_details.year}</span></div>}
            {claim.insurance_policy_number && <div><span className="text-muted-foreground">פוליסה:</span> <span className="font-medium">{claim.insurance_policy_number}</span></div>}
            {claim.police_report_number && <div><span className="text-muted-foreground">דו"ח משטרה:</span> <span className="font-medium">{claim.police_report_number}</span></div>}
            {claim.is_karnitah && <Badge variant="destructive">קרנית</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Medical malpractice details */}
      {claim.claim_type === 'medical_malpractice' && (claim.medical_facility || claim.treating_physician) && (
        <Card>
          <CardHeader><CardTitle className="text-base">פרטי רשלנות רפואית</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            {claim.medical_facility && <div><span className="text-muted-foreground">מוסד רפואי:</span> <span className="font-medium">{claim.medical_facility}</span></div>}
            {claim.treating_physician && <div><span className="text-muted-foreground">רופא מטפל:</span> <span className="font-medium">{claim.treating_physician}</span></div>}
            {claim.treatment_dates?.start && <div><span className="text-muted-foreground">תקופת טיפול:</span> <span className="font-medium">{new Date(claim.treatment_dates.start).toLocaleDateString('he-IL')} - {claim.treatment_dates.end ? new Date(claim.treatment_dates.end).toLocaleDateString('he-IL') : 'נמשך'}</span></div>}
            {claim.medical_expert_opinion && <Badge variant="secondary">חוות דעת מומחה</Badge>}
            {claim.waiver_of_medical_confidentiality && <Badge variant="secondary">ויתור סודיות רפואית</Badge>}
          </CardContent>
        </Card>
      )}

      {/* Tort Elements */}
      {(claim.tort_elements.duty_of_care || claim.tort_elements.breach_description || claim.tort_elements.causation) && (
        <Card>
          <CardHeader><CardTitle className="text-base">יסודות העוולה</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {claim.tort_elements.duty_of_care && (
              <div><span className="text-muted-foreground font-medium">חובת זהירות:</span><p className="whitespace-pre-wrap mt-1">{claim.tort_elements.duty_of_care}</p></div>
            )}
            {claim.tort_elements.breach_description && (
              <div><span className="text-muted-foreground font-medium">הפרת החובה:</span><p className="whitespace-pre-wrap mt-1">{claim.tort_elements.breach_description}</p></div>
            )}
            {claim.tort_elements.causation && (
              <div><span className="text-muted-foreground font-medium">קשר סיבתי:</span><p className="whitespace-pre-wrap mt-1">{claim.tort_elements.causation}</p></div>
            )}
            {claim.tort_elements.damages_description && (
              <div><span className="text-muted-foreground font-medium">תיאור הנזק:</span><p className="whitespace-pre-wrap mt-1">{claim.tort_elements.damages_description}</p></div>
            )}
            {claim.tort_elements.contributing_negligence && (
              <div><span className="text-muted-foreground font-medium">אשם תורם:</span><p className="whitespace-pre-wrap mt-1">{claim.tort_elements.contributing_negligence}</p></div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Damage Heads */}
      {claim.damage_heads.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">ראשי נזק</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {claim.damage_heads.map((h, i) => (
              <div key={i} className="flex justify-between items-start border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <span className="font-medium">{DAMAGE_TYPE_LABELS[h.type]}</span>
                  {h.description && <p className="text-muted-foreground text-xs mt-0.5">{h.description}</p>}
                </div>
                <span className="font-medium shrink-0">{formatCurrency(h.amount_estimated)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>סה״כ</span>
              <span className="text-primary">{formatCurrency(totalDamages || claim.total_claim_amount)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legal Arguments */}
      {(claim.legal_arguments || claim.causes_of_action.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">טיעונים משפטיים</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {claim.causes_of_action.length > 0 && (
              <div>
                <span className="text-muted-foreground font-medium">עילות תביעה:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {claim.causes_of_action.map(c => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            )}
            {claim.relevant_laws.length > 0 && (
              <div>
                <span className="text-muted-foreground font-medium">חקיקה:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {claim.relevant_laws.map(l => <Badge key={l} variant="outline" className="text-xs">{l}</Badge>)}
                </div>
              </div>
            )}
            {claim.legal_arguments && (
              <div>
                <span className="text-muted-foreground font-medium">הטיעונים:</span>
                <p className="whitespace-pre-wrap mt-1">{claim.legal_arguments}</p>
              </div>
            )}
            {claim.requested_remedies && (
              <div>
                <span className="text-muted-foreground font-medium">סעד מבוקש:</span>
                <p className="whitespace-pre-wrap mt-1">{claim.requested_remedies}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Draft */}
      {draftResult && !draftResult.success && (
        <div className="text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 p-4">
          {draftResult.error}
        </div>
      )}

      {draftResult?.success && draftResult.draft && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                טיוטת כתב תביעה (AI)
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={() => navigator.clipboard.writeText(draftResult.draft || '')}
              >
                <Copy className="h-3 w-3" />
                העתק
              </Button>
            </div>
            {draftResult.metadata && (
              <p className="text-xs text-muted-foreground">
                {draftResult.model && `מודל: ${draftResult.model}`}
                {draftResult.metadata.estimated_pages && ` | עמודים: ~${draftResult.metadata.estimated_pages}`}
                {draftResult.metadata.court_fee_estimate && ` | אגרה משוערת: ${draftResult.metadata.court_fee_estimate}`}
              </p>
            )}
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4 max-h-[600px] overflow-y-auto bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
              {draftResult.draft}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-start">
        <Button variant="outline" onClick={() => navigate('/tort-claims')}>
          חזרה לרשימה
        </Button>
      </div>
    </div>
  );
}
