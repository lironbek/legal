// NizkinNewClaim - /nizkin/new - Wizard with drag-drop attachments and AI analysis

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Save, Clock, Gavel, Sparkles, Loader2,
  Copy, FileText, AlertTriangle, Check, Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useOrgNavigate } from '@/hooks/useOrgNavigate';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { DefendantForm } from '@/components/tort/DefendantForm';
import { DamageHeadsBuilder } from '@/components/nizkin/DamageHeadsBuilder';
import { AttachmentAnalyzer } from '@/components/nizkin/AttachmentAnalyzer';
import { StatuteWarning } from '@/components/nizkin/StatuteWarning';
import { OnboardingGuide } from '@/components/nizkin/OnboardingGuide';
import { AiInterview } from '@/components/nizkin/AiInterview';
import { saveAutosave, loadAutosave, clearAutosave } from '@/lib/tortClaimService';
import { createClaim } from '@/lib/nizkin/api';
import { generateClaimDraft } from '@/lib/nizkin/claim-generator';
import type { ClaimDraftResult, AttachmentAnalysis } from '@/lib/nizkin/claim-generator';
import {
  getStepsForClaimType,
  validateStep,
  calculateStatuteOfLimitations,
  calculateTotalDamages,
  getFormCompleteness,
} from '@/lib/nizkin/questionnaire-engine';
import {
  CLAIM_TYPE_LABELS,
  COURT_TYPE_LABELS,
  DAMAGE_TYPE_LABELS,
  CAUSES_OF_ACTION_OPTIONS,
  RELEVANT_LAWS_OPTIONS,
  ISRAELI_COURTS,
  createEmptyTortClaim,
} from '@/lib/tortClaimTypes';
import type {
  TortClaim,
  TortClaimType,
  CourtType,
} from '@/lib/tortClaimTypes';

export default function NizkinNewClaim() {
  const orgNavigate = useOrgNavigate();
  const { toast } = useToast();
  const { currentCompany } = useCompany();
  const { user } = useAuth();

  // Show onboarding guide first (skip if autosave exists)
  const [showGuide, setShowGuide] = useState(true);

  const [formData, setFormData] = useState(() =>
    createEmptyTortClaim(currentCompany?.id || '', user?.id || '')
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<ClaimDraftResult | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [analyses, setAnalyses] = useState<AttachmentAnalysis[]>([]);
  const [hasRestoredAutosave, setHasRestoredAutosave] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Restore autosave on mount — skip guide if autosave exists
  useEffect(() => {
    if (hasRestoredAutosave) return;
    const saved = loadAutosave();
    if (saved) {
      setFormData(prev => ({ ...prev, ...saved.data }));
      setShowGuide(false); // skip guide — user already started before
      toast({
        title: 'טיוטה שוחזרה',
        description: `נשמר לאחרונה ב-${new Date(saved.savedAt).toLocaleTimeString('he-IL')}`,
      });
    }
    setHasRestoredAutosave(true);
  }, [hasRestoredAutosave, toast]);

  const steps = getStepsForClaimType(formData.claim_type);
  const currentStep = steps[currentStepIndex];
  const completeness = getFormCompleteness(formData.claim_type, formData);
  const statute = calculateStatuteOfLimitations(formData.claim_type, formData.incident_date);
  const totalDamages = calculateTotalDamages(formData.damage_heads);

  // Auto-save every 30 seconds — use ref to avoid interval recreation on every keystroke
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const doAutoSave = useCallback(() => {
    saveAutosave(formDataRef.current as Partial<TortClaim>);
    setLastAutoSave(new Date().toLocaleTimeString('he-IL'));
  }, []);

  useEffect(() => {
    autoSaveTimer.current = setInterval(doAutoSave, 30_000);
    return () => clearInterval(autoSaveTimer.current);
  }, [doAutoSave]);

  const updateField = <K extends keyof TortClaim>(field: K, value: TortClaim[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) {
      setErrors(prev => { const n = { ...prev }; delete n[field as string]; return n; });
    }
  };

  const handleClaimTypeChange = (newType: TortClaimType) => {
    updateField('claim_type', newType);
    setCurrentStepIndex(0);
  };

  const goNext = () => {
    const result = validateStep(currentStep.id, formData);
    if (!result.valid) { setErrors(result.errors); return; }
    setErrors({});
    setCurrentStepIndex(i => Math.min(i + 1, steps.length - 1));
  };

  const goPrev = () => {
    setErrors({});
    setCurrentStepIndex(i => Math.max(i - 1, 0));
  };

  const goToStep = (index: number) => {
    setErrors({});
    setCurrentStepIndex(index);
  };

  const handleSave = async () => {
    if (formData.defendants.length === 0) {
      toast({ title: 'חסרים נתבעים', description: 'יש להוסיף לפחות נתבע אחד לפני שמירה', variant: 'destructive' });
      return;
    }
    const data = {
      ...formData,
      total_claim_amount: totalDamages,
      statute_of_limitations_date: statute?.deadline,
    };
    const result = await createClaim(data);
    clearAutosave();
    if (result.success && result.data) {
      toast({ title: 'כתב תביעה נשמר', description: `${result.data.plaintiff_name || 'כתב תביעה'} נוצר בהצלחה` });
      orgNavigate(`/nizkin/${result.data.id}`);
    }
  };

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const result = await generateClaimDraft(formData, analyses);
      setDraftResult(result);
      if (result.success && result.draft) updateField('generated_draft', result.draft);
      if (result.causes_of_action?.length) {
        updateField('causes_of_action', [...new Set([...formData.causes_of_action, ...result.causes_of_action])]);
      }
      if (result.relevant_laws?.length) {
        updateField('relevant_laws', [...new Set([...formData.relevant_laws, ...result.relevant_laws])]);
      }
    } catch {
      setDraftResult({ success: false, error: 'שגיאה ביצירת הטיוטה' });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  const renderStep = () => {
    switch (currentStep.id) {
      case 'classification':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>סוג התביעה {errors.claim_type && <span className="text-destructive text-xs">({errors.claim_type})</span>}</Label>
                <Select value={formData.claim_type} onValueChange={v => handleClaimTypeChange(v as TortClaimType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLAIM_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>סוג בית משפט</Label>
                <Select value={formData.court_type} onValueChange={v => updateField('court_type', v as CourtType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(COURT_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>בית משפט {errors.court_name && <span className="text-destructive text-xs">({errors.court_name})</span>}</Label>
                <Select value={formData.court_name} onValueChange={v => updateField('court_name', v)}>
                  <SelectTrigger className={errors.court_name ? 'border-destructive' : ''}>
                    <SelectValue placeholder="בחר בית משפט..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ISRAELI_COURTS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>תאריך האירוע {errors.incident_date && <span className="text-destructive text-xs">({errors.incident_date})</span>}</Label>
                <Input type="date" value={formData.incident_date} onChange={e => updateField('incident_date', e.target.value)} className={errors.incident_date ? 'border-destructive' : ''} />
              </div>
            </div>
            <StatuteWarning statute={statute} />
            <div>
              <Label>תאריך הגשה (אם ידוע)</Label>
              <Input type="date" value={formData.filing_date || ''} onChange={e => updateField('filing_date', e.target.value || undefined)} />
            </div>
          </div>
        );

      case 'plaintiff':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>שם מלא {errors.plaintiff_name && <span className="text-destructive text-xs">({errors.plaintiff_name})</span>}</Label>
                <Input value={formData.plaintiff_name} onChange={e => updateField('plaintiff_name', e.target.value)} className={errors.plaintiff_name ? 'border-destructive' : ''} />
              </div>
              <div>
                <Label>ת.ז. {errors.plaintiff_id && <span className="text-destructive text-xs">({errors.plaintiff_id})</span>}</Label>
                <Input value={formData.plaintiff_id} onChange={e => updateField('plaintiff_id', e.target.value)} className={errors.plaintiff_id ? 'border-destructive' : ''} />
              </div>
              <div>
                <Label>כתובת</Label>
                <Input value={formData.plaintiff_address} onChange={e => updateField('plaintiff_address', e.target.value)} />
              </div>
              <div>
                <Label>עיר</Label>
                <Input value={formData.plaintiff_city} onChange={e => updateField('plaintiff_city', e.target.value)} />
              </div>
              <div>
                <Label>טלפון</Label>
                <Input value={formData.plaintiff_contact.phone} onChange={e => updateField('plaintiff_contact', { ...formData.plaintiff_contact, phone: e.target.value })} />
              </div>
              <div>
                <Label>דוא"ל</Label>
                <Input value={formData.plaintiff_contact.email} onChange={e => updateField('plaintiff_contact', { ...formData.plaintiff_contact, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>תאריך לידה</Label>
              <Input type="date" value={formData.plaintiff_birth_date || ''} onChange={e => {
                updateField('plaintiff_birth_date', e.target.value || undefined);
                // Auto-detect minor
                if (e.target.value && formData.incident_date) {
                  const birth = new Date(e.target.value);
                  const incident = new Date(formData.incident_date);
                  const ageMs = incident.getTime() - birth.getTime();
                  const age = ageMs / (365.25 * 24 * 60 * 60 * 1000);
                  updateField('plaintiff_is_minor', age < 18);
                }
              }} />
            </div>
            <div>
              <Label>עו"ד מייצג</Label>
              <Input value={formData.plaintiff_attorney} onChange={e => updateField('plaintiff_attorney', e.target.value)} placeholder="שם עורך הדין המייצג" />
            </div>
            {formData.plaintiff_is_minor && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
                <CardContent className="pt-4 pb-4">
                  <p className="text-sm text-amber-700 dark:text-amber-400 mb-3 font-medium">התובע קטין — נדרשים פרטי אפוטרופוס</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">שם האפוטרופוס</Label>
                      <Input value={formData.plaintiff_guardian_name || ''} onChange={e => updateField('plaintiff_guardian_name', e.target.value)} placeholder="שם מלא" />
                    </div>
                    <div>
                      <Label className="text-xs">ת.ז. אפוטרופוס</Label>
                      <Input value={formData.plaintiff_guardian_id || ''} onChange={e => updateField('plaintiff_guardian_id', e.target.value)} placeholder="מספר זהות" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'defendants':
        return (
          <div className="space-y-4">
            {errors.defendants && <p className="text-sm text-destructive">{errors.defendants}</p>}
            <DefendantForm defendants={formData.defendants} onChange={d => updateField('defendants', d)} />
            <div>
              <Label>מבטח עיקרי</Label>
              <Input value={formData.defendant_insurer || ''} onChange={e => updateField('defendant_insurer', e.target.value)} placeholder="שם חברת הביטוח הראשית" />
            </div>
          </div>
        );

      case 'incident':
        return (
          <div className="space-y-4">
            <div>
              <Label>מיקום האירוע</Label>
              <Input value={formData.incident_location} onChange={e => updateField('incident_location', e.target.value)} placeholder="כתובת מלאה" />
            </div>
            <div>
              <Label>תיאור האירוע {errors.incident_description && <span className="text-destructive text-xs">({errors.incident_description})</span>}</Label>
              <Textarea value={formData.incident_description} onChange={e => updateField('incident_description', e.target.value)} placeholder="תאר את נסיבות האירוע בפירוט..." rows={8} className={errors.incident_description ? 'border-destructive' : ''} />
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-3">מסמכים מצורפים</h4>
              <AttachmentAnalyzer
                attachments={formData.attachments}
                onAttachmentsChange={a => updateField('attachments', a)}
                analyses={analyses}
                onAnalysesChange={setAnalyses}
              />
            </div>
          </div>
        );

      case 'road_accident_details':
        return (
          <div className="space-y-4">
            <h4 className="font-medium">פרטי הרכב</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>מספר רישוי</Label>
                <Input value={formData.vehicle_details?.license_plate || ''} onChange={e => updateField('vehicle_details', { ...formData.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, license_plate: e.target.value })} />
              </div>
              <div>
                <Label>יצרן</Label>
                <Input value={formData.vehicle_details?.make || ''} onChange={e => updateField('vehicle_details', { ...formData.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, make: e.target.value })} />
              </div>
              <div>
                <Label>דגם</Label>
                <Input value={formData.vehicle_details?.model || ''} onChange={e => updateField('vehicle_details', { ...formData.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, model: e.target.value })} />
              </div>
              <div>
                <Label>שנת ייצור</Label>
                <Input value={formData.vehicle_details?.year || ''} onChange={e => updateField('vehicle_details', { ...formData.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, year: e.target.value })} />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>מספר פוליסת ביטוח</Label>
                <Input value={formData.insurance_policy_number || ''} onChange={e => updateField('insurance_policy_number', e.target.value)} />
              </div>
              <div>
                <Label>מספר דו"ח משטרה</Label>
                <Input value={formData.police_report_number || ''} onChange={e => updateField('police_report_number', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formData.is_karnitah} onCheckedChange={v => updateField('is_karnitah', v)} />
              <Label>תביעה לקרנית (נפגע ללא ביטוח)</Label>
            </div>
          </div>
        );

      case 'medical_malpractice_details':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>מוסד רפואי</Label>
                <Input value={formData.medical_facility || ''} onChange={e => updateField('medical_facility', e.target.value)} placeholder="שם בית החולים / מרפאה" />
              </div>
              <div>
                <Label>רופא מטפל</Label>
                <Input value={formData.treating_physician || ''} onChange={e => updateField('treating_physician', e.target.value)} />
              </div>
              <div>
                <Label>תחילת טיפול</Label>
                <Input type="date" value={formData.treatment_dates?.start || ''} onChange={e => updateField('treatment_dates', { start: e.target.value, end: formData.treatment_dates?.end || '' })} />
              </div>
              <div>
                <Label>סיום טיפול</Label>
                <Input type="date" value={formData.treatment_dates?.end || ''} min={formData.treatment_dates?.start || undefined} onChange={e => {
                  const endVal = e.target.value;
                  const startVal = formData.treatment_dates?.start || '';
                  if (endVal && startVal && endVal < startVal) {
                    toast({ title: 'תאריך לא תקין', description: 'תאריך סיום טיפול חייב להיות אחרי תאריך ההתחלה', variant: 'destructive' });
                    return;
                  }
                  updateField('treatment_dates', { start: startVal, end: endVal });
                }} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={formData.medical_expert_opinion} onCheckedChange={v => updateField('medical_expert_opinion', v)} />
                <Label>קיימת חוות דעת מומחה</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formData.waiver_of_medical_confidentiality} onCheckedChange={v => updateField('waiver_of_medical_confidentiality', v)} />
                <Label>ויתור על סודיות רפואית</Label>
              </div>
            </div>
          </div>
        );

      case 'tort_elements':
        return (
          <div className="space-y-4">
            <div>
              <Label>חובת זהירות</Label>
              <Textarea value={formData.tort_elements.duty_of_care} onChange={e => updateField('tort_elements', { ...formData.tort_elements, duty_of_care: e.target.value })} placeholder="תאר את חובת הזהירות..." rows={3} />
            </div>
            <div>
              <Label>הפרת החובה</Label>
              <Textarea value={formData.tort_elements.breach_description} onChange={e => updateField('tort_elements', { ...formData.tort_elements, breach_description: e.target.value })} placeholder="כיצד הפר הנתבע..." rows={3} />
            </div>
            <div>
              <Label>קשר סיבתי</Label>
              <Textarea value={formData.tort_elements.causation} onChange={e => updateField('tort_elements', { ...formData.tort_elements, causation: e.target.value })} placeholder="הקשר בין ההפרה לנזק..." rows={3} />
            </div>
            <div>
              <Label>תיאור הנזק</Label>
              <Textarea value={formData.tort_elements.damages_description} onChange={e => updateField('tort_elements', { ...formData.tort_elements, damages_description: e.target.value })} placeholder="תיאור כללי של הנזקים..." rows={3} />
            </div>
            <div>
              <Label>אשם תורם (אם רלוונטי)</Label>
              <Textarea value={formData.tort_elements.contributing_negligence} onChange={e => updateField('tort_elements', { ...formData.tort_elements, contributing_negligence: e.target.value })} rows={2} />
            </div>
          </div>
        );

      case 'damages':
        return (
          <DamageHeadsBuilder
            damageHeads={formData.damage_heads}
            onChange={heads => updateField('damage_heads', heads)}
            claimType={formData.claim_type}
            currentCourtType={formData.court_type}
          />
        );

      case 'legal_arguments':
        return (
          <div className="space-y-4">
            <div>
              <Label>עילות תביעה</Label>
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {CAUSES_OF_ACTION_OPTIONS.map(cause => (
                  <label key={cause} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.causes_of_action.includes(cause)}
                      onCheckedChange={checked => {
                        updateField('causes_of_action', checked
                          ? [...formData.causes_of_action, cause]
                          : formData.causes_of_action.filter(c => c !== cause));
                      }}
                    />
                    {cause}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>חקיקה רלוונטית</Label>
              <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {RELEVANT_LAWS_OPTIONS.map(law => (
                  <label key={law} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={formData.relevant_laws.includes(law)}
                      onCheckedChange={checked => {
                        updateField('relevant_laws', checked
                          ? [...formData.relevant_laws, law]
                          : formData.relevant_laws.filter(l => l !== law));
                      }}
                    />
                    {law}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>טיעונים משפטיים</Label>
              <Textarea value={formData.legal_arguments} onChange={e => updateField('legal_arguments', e.target.value)} placeholder="טיעונים משפטיים..." rows={10} />
            </div>
            <div>
              <Label>סעד מבוקש</Label>
              <Textarea value={formData.requested_remedies} onChange={e => updateField('requested_remedies', e.target.value)} placeholder="פרט את הסעדים המבוקשים..." rows={4} />
            </div>
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SummaryCard title="סוג תביעה" value={CLAIM_TYPE_LABELS[formData.claim_type]} />
              <SummaryCard title="בית משפט" value={formData.court_name || '-'} />
              <SummaryCard title="תובע" value={`${formData.plaintiff_name} (ת.ז. ${formData.plaintiff_id})`} />
              <SummaryCard title="נתבעים" value={formData.defendants.map(d => d.name).join(', ') || '-'} />
              <SummaryCard title="תאריך אירוע" value={formData.incident_date ? new Date(formData.incident_date).toLocaleDateString('he-IL') : '-'} />
              <SummaryCard title="סכום תביעה" value={formatCurrency(totalDamages)} highlight />
            </div>

            {formData.damage_heads.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">ראשי נזק ({formData.damage_heads.length}):</h4>
                <div className="space-y-1 text-sm">
                  {formData.damage_heads.filter(h => h.amount_estimated > 0).map((h, i) => (
                    <div key={i} className="flex justify-between"><span>{DAMAGE_TYPE_LABELS[h.type]}</span><span>{formatCurrency(h.amount_estimated)}</span></div>
                  ))}
                </div>
              </div>
            )}

            {formData.attachments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-1">מצורפים ({formData.attachments.length})</h4>
                <div className="flex flex-wrap gap-1">
                  {formData.attachments.map((a, i) => <Badge key={i} variant="secondary" className="text-xs">{a.filename}</Badge>)}
                </div>
              </div>
            )}

            <StatuteWarning statute={statute} />

            <div className="text-sm text-muted-foreground">השלמה: {completeness}%</div>

            <Separator />

            {/* AI draft */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> יצירת טיוטה <Sparkles className="h-3.5 w-3.5" style={{ color: '#a855f7' }} /></h4>
                <Button onClick={handleGenerateDraft} disabled={generatingDraft || !formData.plaintiff_name || !formData.incident_description} className="gap-2">
                  {generatingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" style={{ color: '#a855f7' }} />}
                  {generatingDraft ? 'מנסח...' : 'נסח כתב תביעה עם AI'}
                </Button>
              </div>
              {draftResult && !draftResult.success && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{draftResult.error}</div>
              )}
              {draftResult?.success && draftResult.draft && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {draftResult.model && `מודל: ${draftResult.model}`}
                      {draftResult.metadata?.estimated_pages && ` | עמודים: ~${draftResult.metadata.estimated_pages}`}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigator.clipboard.writeText(draftResult?.draft || '')}>
                      <Copy className="h-3 w-3" /> העתק
                    </Button>
                  </div>
                  <div className="border rounded-md p-4 max-h-96 overflow-y-auto bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
                    {draftResult.draft}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">שלב לא ידוע</p>;
    }
  };

  // Show onboarding guide before wizard
  if (showGuide) {
    return (
      <OnboardingGuide
        onStart={() => setShowGuide(false)}
        onBack={() => orgNavigate('/nizkin')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            כתב תביעה חדש
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            שלב {currentStepIndex + 1} מתוך {steps.length}: {currentStep.title}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastAutoSave && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> נשמר {lastAutoSave}
            </span>
          )}
          <Button
            variant={showInterview ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowInterview(v => !v)}
          >
            <Bot className="h-4 w-4" />
            {showInterview ? 'חזור לטופס' : 'ראיון AI'}
            {!showInterview && <Sparkles className="h-3 w-3" style={{ color: '#a855f7' }} />}
          </Button>
          <Button variant="outline" onClick={() => orgNavigate('/nizkin')}>חזרה לרשימה</Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex gap-1">
          {steps.map((step, i) => (
            <button key={step.id} onClick={() => goToStep(i)} className={`flex-1 h-2 rounded-full transition-colors cursor-pointer ${i < currentStepIndex ? 'bg-emerald-500' : i === currentStepIndex ? 'bg-primary' : 'bg-muted'}`} title={step.title} />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>השלמה: {completeness}%</span>
          {totalDamages > 0 && <span className="font-medium">סכום: {formatCurrency(totalDamages)}</span>}
        </div>
      </div>

      {/* AI Interview Panel */}
      {showInterview && (
        <AiInterview
          claimData={formData}
          onFieldUpdate={(field, value) => updateField(field as any, value)}
          onClose={() => setShowInterview(false)}
        />
      )}

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{currentStep.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">{renderStep()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
          <ArrowRight className="ml-2 h-4 w-4" /> הקודם
        </Button>
        {currentStepIndex < steps.length - 1 ? (
          <Button onClick={goNext}>הבא <ArrowLeft className="mr-2 h-4 w-4" /></Button>
        ) : (
          <Button onClick={handleSave} className="gap-2"><Save className="h-4 w-4" /> שמור כתב תביעה</Button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className={`text-sm ${highlight ? 'font-bold text-primary' : ''}`}>{value}</CardContent>
    </Card>
  );
}
