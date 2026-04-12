import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowRight, ArrowLeft, Save, Check, AlertTriangle, Clock, Gavel, Sparkles, Loader2, Copy, FileText, Bot, User } from 'lucide-react';
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
import { DefendantForm } from '@/components/tort/DefendantForm';
import { AiContentGenerator } from '@/components/tort/AiContentGenerator';
import { AiGuidePanel } from '@/components/nizkin/AiGuidePanel';
import { AiInterview } from '@/components/nizkin/AiInterview';
import { saveAutosave } from '@/lib/tortClaimService';
import { getClients } from '@/lib/dataManager';
import type { Client } from '@/lib/dataManager';
import { DocumentAttachmentsStep } from '@/components/nizkin/DocumentAttachmentsStep';
import { generateClaimDraft } from '@/lib/nizkin/claim-generator';
import type { ClaimDraftResult } from '@/lib/nizkin/claim-generator';
import {
  getStepsForClaimType,
  validateStep,
  calculateStatuteOfLimitations,
  getDefaultDamageHeads,
  calculateTotalDamages,
  createEmptyDamageHead,
  suggestCourtType,
  getFormCompleteness,
} from '@/lib/nizkin/questionnaire-engine';
import type { QuestionnaireStep } from '@/lib/nizkin/questionnaire-engine';
import {
  CLAIM_TYPE_LABELS,
  COURT_TYPE_LABELS,
  CLAIM_STATUS_LABELS,
  DAMAGE_TYPE_LABELS,
  CAUSES_OF_ACTION_OPTIONS,
  RELEVANT_LAWS_OPTIONS,
  ISRAELI_COURTS,
} from '@/lib/tortClaimTypes';
import type {
  TortClaim,
  TortClaimType,
  CourtType,
  TortDamageType,
  DamageHead,
  TortDocumentAttachment,
} from '@/lib/tortClaimTypes';

interface QuestionnaireWizardProps {
  initialData: Omit<TortClaim, 'id'> | TortClaim;
  onSave: (data: Omit<TortClaim, 'id'> | TortClaim) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

export function QuestionnaireWizard({ initialData, onSave, onCancel, mode }: QuestionnaireWizardProps) {
  const [formData, setFormData] = useState(initialData);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [draftResult, setDraftResult] = useState<ClaimDraftResult | null>(null);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [showInterview, setShowInterview] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  const steps = getStepsForClaimType(formData.claim_type);
  const currentStep = steps[currentStepIndex];
  const completeness = getFormCompleteness(formData.claim_type, formData);
  const statute = calculateStatuteOfLimitations(formData.claim_type, formData.incident_date);
  const totalDamages = calculateTotalDamages(formData.damage_heads);

  // Auto-save every 30 seconds
  const doAutoSave = useCallback(() => {
    if (mode === 'create') {
      saveAutosave(formData as Partial<TortClaim>);
      setLastAutoSave(new Date().toLocaleTimeString('he-IL'));
    }
  }, [formData, mode]);

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
    // Reset step index when claim type changes (steps may change)
    setCurrentStepIndex(0);
  };

  const goNext = () => {
    const result = validateStep(currentStep.id, formData);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
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

  const handleSave = () => {
    const data = {
      ...formData,
      total_claim_amount: totalDamages,
      statute_of_limitations_date: statute?.deadline,
    };
    onSave(data);
  };

  const handleAiGenerated = (content: { legalArguments: string; causesOfAction: string[]; relevantLaws: string[] }) => {
    setFormData(prev => ({
      ...prev,
      legal_arguments: content.legalArguments,
      causes_of_action: [...new Set([...prev.causes_of_action, ...content.causesOfAction])],
      relevant_laws: [...new Set([...prev.relevant_laws, ...content.relevantLaws])],
    }));
  };

  // Damage heads helpers
  const addDamageHead = (type: TortDamageType) => {
    updateField('damage_heads', [...formData.damage_heads, createEmptyDamageHead(type)]);
  };

  const updateDamageHead = (index: number, updates: Partial<DamageHead>) => {
    const heads = [...formData.damage_heads];
    heads[index] = { ...heads[index], ...updates };
    updateField('damage_heads', heads);
  };

  const removeDamageHead = (index: number) => {
    updateField('damage_heads', formData.damage_heads.filter((_, i) => i !== index));
  };

  const initDefaultDamageHeads = () => {
    const defaults = getDefaultDamageHeads(formData.claim_type);
    const existing = new Set(formData.damage_heads.map(h => h.type));
    const newHeads = defaults.filter(t => !existing.has(t)).map(t => createEmptyDamageHead(t));
    updateField('damage_heads', [...formData.damage_heads, ...newHeads]);
  };

  const handleGenerateDraft = async () => {
    setGeneratingDraft(true);
    try {
      const result = await generateClaimDraft(formData);
      setDraftResult(result);
      if (result.success && result.draft) {
        updateField('generated_draft', result.draft);
      }
      if (result.causes_of_action && result.causes_of_action.length > 0) {
        updateField('causes_of_action', [...new Set([...formData.causes_of_action, ...result.causes_of_action])]);
      }
      if (result.relevant_laws && result.relevant_laws.length > 0) {
        updateField('relevant_laws', [...new Set([...formData.relevant_laws, ...result.relevant_laws])]);
      }
    } catch {
      setDraftResult({ success: false, error: 'שגיאה ביצירת הטיוטה' });
    } finally {
      setGeneratingDraft(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gavel className="h-6 w-6 text-primary" />
            {mode === 'create' ? 'כתב תביעה חדש' : 'עריכת כתב תביעה'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            שלב {currentStepIndex + 1} מתוך {steps.length}: {currentStep.title}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastAutoSave && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              נשמר אוטומטית {lastAutoSave}
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
          </Button>
          <Button variant="outline" onClick={onCancel}>חזרה לרשימה</Button>
        </div>
      </div>

      {/* Statute of limitations warning */}
      {statute && (statute.isExpired || statute.isUrgent) && (
        <div className={`rounded-lg border p-3 flex items-center gap-3 ${
          statute.isExpired ? 'bg-destructive/10 border-destructive text-destructive' : 'bg-yellow-50 border-yellow-300 text-yellow-800'
        }`}>
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="text-sm">
            {statute.isExpired ? (
              <span className="font-semibold">תקופת ההתיישנות חלפה! ({statute.label})</span>
            ) : (
              <span>
                <span className="font-semibold">תשומת לב:</span> נותרו {statute.daysRemaining} ימים להגשת התביעה ({statute.label}).
                מועד אחרון: {new Date(statute.deadline).toLocaleDateString('he-IL')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex gap-1">
          {steps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => goToStep(i)}
              className={`flex-1 h-2 rounded-full transition-colors cursor-pointer ${
                i < currentStepIndex ? 'bg-green-500' :
                i === currentStepIndex ? 'bg-primary' : 'bg-muted'
              }`}
              title={step.title}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>השלמה: {completeness}%</span>
          {totalDamages > 0 && (
            <span className="font-medium">
              סכום: {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(totalDamages)}
            </span>
          )}
        </div>
      </div>

      {/* AI Interview Panel */}
      {showInterview && (
        <AiInterview
          claimData={formData}
          onFieldUpdate={(field, value) => updateField(field as keyof TortClaim, value)}
          onClose={() => setShowInterview(false)}
        />
      )}

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{currentStep.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{currentStep.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderStepContent(currentStep, formData, updateField, errors, {
            handleClaimTypeChange,
            handleAiGenerated,
            addDamageHead,
            updateDamageHead,
            removeDamageHead,
            initDefaultDamageHeads,
            totalDamages,
            statute,
            completeness,
            handleGenerateDraft,
            generatingDraft,
            draftResult,
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={currentStepIndex === 0}>
          <ArrowRight className="ml-2 h-4 w-4" />
          הקודם
        </Button>

        {currentStepIndex < steps.length - 1 ? (
          <Button onClick={goNext}>
            הבא
            <ArrowLeft className="mr-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'שמור כתב תביעה' : 'שמור שינויים'}
          </Button>
        )}
      </div>

      {/* AI Guide Agent — fixed position, overlays wizard */}
      <AiGuidePanel
        claimData={formData}
        currentStep={currentStep.id}
        currentStepTitle={currentStep.title}
      />
    </div>
  );
}

// ============ Step Renderers ============

interface StepHelpers {
  handleClaimTypeChange: (type: TortClaimType) => void;
  handleAiGenerated: (content: { legalArguments: string; causesOfAction: string[]; relevantLaws: string[] }) => void;
  addDamageHead: (type: TortDamageType) => void;
  updateDamageHead: (index: number, updates: Partial<DamageHead>) => void;
  removeDamageHead: (index: number) => void;
  initDefaultDamageHeads: () => void;
  totalDamages: number;
  statute: ReturnType<typeof calculateStatuteOfLimitations>;
  completeness: number;
  handleGenerateDraft: () => void;
  generatingDraft: boolean;
  draftResult: ClaimDraftResult | null;
}

function renderStepContent(
  step: QuestionnaireStep,
  data: Omit<TortClaim, 'id'> | TortClaim,
  updateField: <K extends keyof TortClaim>(field: K, value: TortClaim[K]) => void,
  errors: Record<string, string>,
  helpers: StepHelpers
) {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);

  switch (step.id) {
    // ---- Step: Classification ----
    case 'classification':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>סוג התביעה {errors.claim_type && <span className="text-destructive text-xs">({errors.claim_type})</span>}</Label>
              <Select value={data.claim_type} onValueChange={v => helpers.handleClaimTypeChange(v as TortClaimType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLAIM_TYPE_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג בית משפט {errors.court_type && <span className="text-destructive text-xs">({errors.court_type})</span>}</Label>
              <Select value={data.court_type} onValueChange={v => updateField('court_type', v as CourtType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(COURT_TYPE_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>בית משפט {errors.court_name && <span className="text-destructive text-xs">({errors.court_name})</span>}</Label>
              <Select value={data.court_name} onValueChange={v => updateField('court_name', v)}>
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
              <Input
                type="date"
                value={data.incident_date}
                onChange={e => updateField('incident_date', e.target.value)}
                className={errors.incident_date ? 'border-destructive' : ''}
              />
            </div>
          </div>

          {helpers.statute && !helpers.statute.isExpired && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
              <span className="font-medium">התיישנות:</span> {helpers.statute.label} | מועד אחרון: {new Date(helpers.statute.deadline).toLocaleDateString('he-IL')} ({helpers.statute.daysRemaining} ימים)
            </div>
          )}

          <div>
            <Label>תאריך הגשה (אם ידוע)</Label>
            <Input
              type="date"
              value={data.filing_date || ''}
              onChange={e => updateField('filing_date', e.target.value || undefined)}
            />
          </div>
        </div>
      );

    // ---- Step: Plaintiff ----
    case 'plaintiff': {
      const clients = getClients();
      const handleClientSelect = (clientId: string) => {
        if (clientId === '__manual__') {
          updateField('client_id' as keyof TortClaim, undefined as any);
          return;
        }
        const client = clients.find(c => c.id === clientId);
        if (!client) return;
        updateField('client_id' as keyof TortClaim, clientId as any);
        updateField('plaintiff_name', client.name);
        updateField('plaintiff_id', client.idNumber || '');
        updateField('plaintiff_address', client.address || '');
        updateField('plaintiff_city', client.city || '');
        updateField('plaintiff_contact', {
          phone: client.phone || '',
          email: client.email || '',
          secondary_phone: client.secondaryPhone,
        });
      };
      return (
        <div className="space-y-4">
          {/* Client selector */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <User className="h-4 w-4" />
              בחירת לקוח מהמערכת
            </Label>
            <Select
              value={(data as any).client_id || '__manual__'}
              onValueChange={handleClientSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר לקוח או הזן ידנית..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">הזנה ידנית</SelectItem>
                {clients.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{c.idNumber ? ` (${c.idNumber})` : ''}{c.phone ? ` - ${c.phone}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(data as any).client_id && (
              <p className="text-xs text-muted-foreground">
                הפרטים מולאו אוטומטית מנתוני הלקוח. ניתן לערוך את השדות.
              </p>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>שם מלא {errors.plaintiff_name && <span className="text-destructive text-xs">({errors.plaintiff_name})</span>}</Label>
              <Input
                value={data.plaintiff_name}
                onChange={e => updateField('plaintiff_name', e.target.value)}
                className={errors.plaintiff_name ? 'border-destructive' : ''}
              />
            </div>
            <div>
              <Label>ת.ז. {errors.plaintiff_id && <span className="text-destructive text-xs">({errors.plaintiff_id})</span>}</Label>
              <Input
                value={data.plaintiff_id}
                onChange={e => updateField('plaintiff_id', e.target.value)}
                className={errors.plaintiff_id ? 'border-destructive' : ''}
              />
            </div>
            <div>
              <Label>כתובת</Label>
              <Input
                value={data.plaintiff_address}
                onChange={e => updateField('plaintiff_address', e.target.value)}
              />
            </div>
            <div>
              <Label>עיר</Label>
              <Input
                value={data.plaintiff_city}
                onChange={e => updateField('plaintiff_city', e.target.value)}
              />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input
                value={data.plaintiff_contact.phone}
                onChange={e => updateField('plaintiff_contact', { ...data.plaintiff_contact, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>דוא"ל</Label>
              <Input
                value={data.plaintiff_contact.email}
                onChange={e => updateField('plaintiff_contact', { ...data.plaintiff_contact, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>עו"ד מייצג</Label>
            <Input
              value={data.plaintiff_attorney}
              onChange={e => updateField('plaintiff_attorney', e.target.value)}
              placeholder="שם עורך הדין המייצג את התובע"
            />
          </div>
        </div>
      );
    }

    // ---- Step: Defendants ----
    case 'defendants':
      return (
        <div className="space-y-4">
          {errors.defendants && <p className="text-sm text-destructive">{errors.defendants}</p>}
          <DefendantForm
            defendants={data.defendants}
            onChange={d => updateField('defendants', d)}
          />
          <div>
            <Label>מבטח עיקרי (קיצור)</Label>
            <Input
              value={data.defendant_insurer || ''}
              onChange={e => updateField('defendant_insurer', e.target.value)}
              placeholder="שם חברת הביטוח הראשית"
            />
          </div>
        </div>
      );

    // ---- Step: Incident ----
    case 'incident':
      return (
        <div className="space-y-4">
          <div>
            <Label>מיקום האירוע</Label>
            <Input
              value={data.incident_location}
              onChange={e => updateField('incident_location', e.target.value)}
              placeholder="כתובת מלאה של מקום האירוע"
            />
          </div>
          <div>
            <Label>
              תיאור האירוע {errors.incident_description && <span className="text-destructive text-xs">({errors.incident_description})</span>}
            </Label>
            <Textarea
              value={data.incident_description}
              onChange={e => updateField('incident_description', e.target.value)}
              placeholder="תאר את נסיבות האירוע בפירוט מלא..."
              rows={8}
              className={errors.incident_description ? 'border-destructive' : ''}
            />
          </div>
        </div>
      );

    // ---- Step: Road Accident Details ----
    case 'road_accident_details':
      return (
        <div className="space-y-4">
          <h4 className="font-medium">פרטי הרכב</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>מספר רישוי</Label>
              <Input
                value={data.vehicle_details?.license_plate || ''}
                onChange={e => updateField('vehicle_details', { ...data.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, license_plate: e.target.value })}
              />
            </div>
            <div>
              <Label>יצרן</Label>
              <Input
                value={data.vehicle_details?.make || ''}
                onChange={e => updateField('vehicle_details', { ...data.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, make: e.target.value })}
              />
            </div>
            <div>
              <Label>דגם</Label>
              <Input
                value={data.vehicle_details?.model || ''}
                onChange={e => updateField('vehicle_details', { ...data.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, model: e.target.value })}
              />
            </div>
            <div>
              <Label>שנת ייצור</Label>
              <Input
                value={data.vehicle_details?.year || ''}
                onChange={e => updateField('vehicle_details', { ...data.vehicle_details || { license_plate: '', make: '', model: '', year: '' }, year: e.target.value })}
              />
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>מספר פוליסת ביטוח</Label>
              <Input
                value={data.insurance_policy_number || ''}
                onChange={e => updateField('insurance_policy_number', e.target.value)}
              />
            </div>
            <div>
              <Label>מספר דו"ח משטרה</Label>
              <Input
                value={data.police_report_number || ''}
                onChange={e => updateField('police_report_number', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={data.is_karnitah}
              onCheckedChange={v => updateField('is_karnitah', v)}
            />
            <Label>תביעה לקרנית (נפגע ללא ביטוח)</Label>
          </div>
        </div>
      );

    // ---- Step: Medical Malpractice Details ----
    case 'medical_malpractice_details':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>מוסד רפואי</Label>
              <Input
                value={data.medical_facility || ''}
                onChange={e => updateField('medical_facility', e.target.value)}
                placeholder="שם בית החולים / מרפאה"
              />
            </div>
            <div>
              <Label>רופא מטפל</Label>
              <Input
                value={data.treating_physician || ''}
                onChange={e => updateField('treating_physician', e.target.value)}
                placeholder="שם הרופא"
              />
            </div>
            <div>
              <Label>תחילת טיפול</Label>
              <Input
                type="date"
                value={data.treatment_dates?.start || ''}
                onChange={e => updateField('treatment_dates', { start: e.target.value, end: data.treatment_dates?.end || '' })}
              />
            </div>
            <div>
              <Label>סיום טיפול</Label>
              <Input
                type="date"
                value={data.treatment_dates?.end || ''}
                onChange={e => updateField('treatment_dates', { start: data.treatment_dates?.start || '', end: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={data.medical_expert_opinion}
                onCheckedChange={v => updateField('medical_expert_opinion', v)}
              />
              <Label>קיימת חוות דעת מומחה</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={data.waiver_of_medical_confidentiality}
                onCheckedChange={v => updateField('waiver_of_medical_confidentiality', v)}
              />
              <Label>ויתור על סודיות רפואית</Label>
            </div>
          </div>
        </div>
      );

    // ---- Step: Tort Elements ----
    case 'tort_elements':
      return (
        <div className="space-y-4">
          <div>
            <Label>חובת זהירות</Label>
            <Textarea
              value={data.tort_elements.duty_of_care}
              onChange={e => updateField('tort_elements', { ...data.tort_elements, duty_of_care: e.target.value })}
              placeholder="תאר את חובת הזהירות שהייתה מוטלת על הנתבע..."
              rows={3}
            />
          </div>
          <div>
            <Label>הפרת החובה</Label>
            <Textarea
              value={data.tort_elements.breach_description}
              onChange={e => updateField('tort_elements', { ...data.tort_elements, breach_description: e.target.value })}
              placeholder="כיצד הפר הנתבע את חובת הזהירות..."
              rows={3}
            />
          </div>
          <div>
            <Label>קשר סיבתי</Label>
            <Textarea
              value={data.tort_elements.causation}
              onChange={e => updateField('tort_elements', { ...data.tort_elements, causation: e.target.value })}
              placeholder="הקשר בין ההפרה לנזק שנגרם..."
              rows={3}
            />
          </div>
          <div>
            <Label>תיאור הנזק</Label>
            <Textarea
              value={data.tort_elements.damages_description}
              onChange={e => updateField('tort_elements', { ...data.tort_elements, damages_description: e.target.value })}
              placeholder="תיאור כללי של הנזקים שנגרמו לתובע..."
              rows={3}
            />
          </div>
          <div>
            <Label>אשם תורם (אם רלוונטי)</Label>
            <Textarea
              value={data.tort_elements.contributing_negligence}
              onChange={e => updateField('tort_elements', { ...data.tort_elements, contributing_negligence: e.target.value })}
              placeholder="האם יש אשם תורם מצד התובע? אם כן, פרט..."
              rows={2}
            />
          </div>
        </div>
      );

    // ---- Step: Damages ----
    case 'damages':
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">ראשי נזק</h4>
            {data.damage_heads.length === 0 && (
              <Button variant="outline" size="sm" onClick={helpers.initDefaultDamageHeads}>
                הוסף ראשי נזק מומלצים
              </Button>
            )}
          </div>

          {data.damage_heads.map((head, i) => (
            <Card key={i} className="border-dashed">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">{DAMAGE_TYPE_LABELS[head.type]}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7"
                    onClick={() => helpers.removeDamageHead(i)}
                  >
                    הסר
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">סכום משוער (₪)</Label>
                    <Input
                      type="number"
                      value={head.amount_estimated || ''}
                      onChange={e => helpers.updateDamageHead(i, { amount_estimated: Number(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">אסמכתא / ראיה</Label>
                    <Input
                      value={head.evidence_reference}
                      onChange={e => helpers.updateDamageHead(i, { evidence_reference: e.target.value })}
                      placeholder="מספר מסמך, חוות דעת..."
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">תיאור</Label>
                  <Textarea
                    value={head.description}
                    onChange={e => helpers.updateDamageHead(i, { description: e.target.value })}
                    rows={2}
                    placeholder="תיאור הנזק..."
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add damage head */}
          <div>
            <Label className="text-sm">הוסף ראש נזק</Label>
            <Select onValueChange={v => helpers.addDamageHead(v as TortDamageType)}>
              <SelectTrigger>
                <SelectValue placeholder="בחר סוג נזק..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DAMAGE_TYPE_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <div className="flex items-center justify-between font-bold text-lg">
            <span>סה״כ סכום התביעה</span>
            <span className="text-primary">{formatCurrency(helpers.totalDamages)}</span>
          </div>
          {helpers.totalDamages > 0 && (
            <p className="text-xs text-muted-foreground">
              בית משפט מומלץ: {suggestCourtType(helpers.totalDamages) === 'district' ? 'מחוזי (מעל 2.5 מיליון ₪)' : 'שלום (עד 2.5 מיליון ₪)'}
            </p>
          )}
        </div>
      );

    // ---- Step: Legal Arguments ----
    case 'legal_arguments':
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">טיעונים משפטיים</h4>
            <AiContentGenerator
              claimData={data as Omit<TortClaim, 'id'>}
              onGenerated={helpers.handleAiGenerated}
            />
          </div>

          <div>
            <Label>עילות תביעה</Label>
            <div className="grid grid-cols-1 gap-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-3">
              {CAUSES_OF_ACTION_OPTIONS.map(cause => (
                <label key={cause} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={data.causes_of_action.includes(cause)}
                    onCheckedChange={checked => {
                      updateField('causes_of_action', checked
                        ? [...data.causes_of_action, cause]
                        : data.causes_of_action.filter(c => c !== cause));
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
                    checked={data.relevant_laws.includes(law)}
                    onCheckedChange={checked => {
                      updateField('relevant_laws', checked
                        ? [...data.relevant_laws, law]
                        : data.relevant_laws.filter(l => l !== law));
                    }}
                  />
                  {law}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label>טיעונים משפטיים</Label>
            <Textarea
              value={data.legal_arguments}
              onChange={e => updateField('legal_arguments', e.target.value)}
              placeholder='הזן טיעונים משפטיים או השתמש בכפתור "ניסוח AI" למעלה...'
              rows={10}
            />
          </div>

          <div>
            <Label>סעד מבוקש</Label>
            <Textarea
              value={data.requested_remedies}
              onChange={e => updateField('requested_remedies', e.target.value)}
              placeholder="פרט את הסעדים המבוקשים מבית המשפט..."
              rows={4}
            />
          </div>
        </div>
      );

    // ---- Step: Document Attachments ----
    case 'document_attachments':
      return (
        <DocumentAttachmentsStep
          clientId={(data as any).client_id}
          companyId={data.company_id}
          documentAttachments={(data as any).document_attachments || []}
          onChange={(attachments: TortDocumentAttachment[]) => updateField('document_attachments' as keyof TortClaim, attachments as any)}
        />
      );

    // ---- Step: Summary ----
    case 'summary':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SummaryCard title="סוג תביעה" value={CLAIM_TYPE_LABELS[data.claim_type]} />
            <SummaryCard title="בית משפט" value={data.court_name || '-'} />
            <SummaryCard title="תובע" value={`${data.plaintiff_name} (ת.ז. ${data.plaintiff_id})`} />
            <SummaryCard title="נתבעים" value={data.defendants.map(d => d.name).join(', ') || '-'} />
            <SummaryCard title="תאריך אירוע" value={data.incident_date ? new Date(data.incident_date).toLocaleDateString('he-IL') : '-'} />
            <SummaryCard
              title="סכום תביעה"
              value={formatCurrency(helpers.totalDamages)}
              highlight
            />
          </div>

          {data.damage_heads.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">ראשי נזק ({data.damage_heads.length}):</h4>
              <div className="space-y-1 text-sm">
                {data.damage_heads.filter(h => h.amount_estimated > 0).map((h, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{DAMAGE_TYPE_LABELS[h.type]}</span>
                    <span>{formatCurrency(h.amount_estimated)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.causes_of_action.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">עילות תביעה:</h4>
              <div className="flex flex-wrap gap-1">
                {data.causes_of_action.map(c => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {helpers.statute && (
            <div className="text-sm bg-muted/50 rounded-md p-3">
              <span className="font-medium">התיישנות:</span> {helpers.statute.label} |
              מועד אחרון: {new Date(helpers.statute.deadline).toLocaleDateString('he-IL')}
              {helpers.statute.isExpired && <span className="text-destructive font-bold mr-2">(חלף!)</span>}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            השלמה: {helpers.completeness}%
          </div>

          <Separator />

          {/* AI Draft Generation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                יצירת טיוטת כתב תביעה
              </h4>
              <Button
                onClick={helpers.handleGenerateDraft}
                disabled={helpers.generatingDraft || !data.plaintiff_name || !data.incident_description}
                className="gap-2"
              >
                {helpers.generatingDraft ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {helpers.generatingDraft ? 'מנסח...' : 'נסח כתב תביעה עם AI'}
              </Button>
            </div>

            {helpers.draftResult && !helpers.draftResult.success && (
              <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {helpers.draftResult.error}
              </div>
            )}

            {helpers.draftResult?.success && helpers.draftResult.draft && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {helpers.draftResult.model && `מודל: ${helpers.draftResult.model}`}
                    {helpers.draftResult.metadata?.estimated_pages && ` | עמודים: ~${helpers.draftResult.metadata.estimated_pages}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    onClick={() => navigator.clipboard.writeText(helpers.draftResult?.draft || '')}
                  >
                    <Copy className="h-3 w-3" />
                    העתק
                  </Button>
                </div>
                <div className="border rounded-md p-4 max-h-96 overflow-y-auto bg-muted/30 text-sm whitespace-pre-wrap leading-relaxed" dir="rtl">
                  {helpers.draftResult.draft}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    default:
      return <p className="text-muted-foreground">שלב לא ידוע</p>;
  }
}

function SummaryCard({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className={`text-sm ${highlight ? 'font-bold text-primary' : ''}`}>
        {value}
      </CardContent>
    </Card>
  );
}
