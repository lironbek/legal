// Questionnaire Engine - מנוע השאלות הדינמי לכתבי תביעה בנזיקין
// Manages steps, validation, statute of limitations calculations, and claim-type-specific flows

import type {
  TortClaim,
  TortClaimType,
  TortDamageType,
  DamageHead,
} from '../tortClaimTypes';

// ============ Step Definitions ============

export interface QuestionnaireStep {
  id: string;
  title: string;
  description: string;
  /** Which claim types show this step. Empty = all types. */
  claimTypes: TortClaimType[];
  /** Fields that must be filled for this step to be valid */
  requiredFields: string[];
}

export const QUESTIONNAIRE_STEPS: QuestionnaireStep[] = [
  {
    id: 'classification',
    title: 'סיווג התביעה',
    description: 'סוג התביעה, בית משפט ותאריך האירוע',
    claimTypes: [],
    requiredFields: ['claim_type', 'court_type', 'court_name', 'incident_date'],
  },
  {
    id: 'plaintiff',
    title: 'פרטי התובע',
    description: 'שם, ת.ז., כתובת ופרטי קשר של התובע',
    claimTypes: [],
    requiredFields: ['plaintiff_name', 'plaintiff_id'],
  },
  {
    id: 'defendants',
    title: 'הנתבעים',
    description: 'פרטי הנתבע/ים בתביעה',
    claimTypes: [],
    requiredFields: ['defendants'],
  },
  {
    id: 'incident',
    title: 'פרטי האירוע',
    description: 'תיאור מפורט של האירוע, מיקום ונסיבות',
    claimTypes: [],
    requiredFields: ['incident_description'],
  },
  {
    id: 'road_accident_details',
    title: 'פרטי תאונת הדרכים',
    description: 'פרטי רכב, ביטוח ודו"ח משטרה',
    claimTypes: ['road_accident'],
    requiredFields: [],
  },
  {
    id: 'medical_malpractice_details',
    title: 'פרטי הרשלנות הרפואית',
    description: 'מוסד רפואי, רופא מטפל ותאריכי טיפול',
    claimTypes: ['medical_malpractice'],
    requiredFields: [],
  },
  {
    id: 'tort_elements',
    title: 'יסודות העוולה',
    description: 'חובת זהירות, הפרה, קשר סיבתי ונזק',
    claimTypes: [],
    requiredFields: [],
  },
  {
    id: 'damages',
    title: 'ראשי נזק',
    description: 'פירוט הנזקים הכספיים לפי ראשי נזק',
    claimTypes: [],
    requiredFields: [],
  },
  {
    id: 'legal_arguments',
    title: 'טיעונים משפטיים',
    description: 'עילות תביעה, חקיקה וטיעונים',
    claimTypes: [],
    requiredFields: [],
  },
  {
    id: 'summary',
    title: 'סיכום ושמירה',
    description: 'סקירת כל הנתונים ושמירת כתב התביעה',
    claimTypes: [],
    requiredFields: [],
  },
];

// ============ Dynamic Steps ============

/**
 * Returns the relevant steps for a given claim type.
 * Generic steps (claimTypes=[]) are always shown.
 * Type-specific steps are shown only when they match.
 */
export function getStepsForClaimType(claimType: TortClaimType): QuestionnaireStep[] {
  return QUESTIONNAIRE_STEPS.filter(
    step => step.claimTypes.length === 0 || step.claimTypes.includes(claimType)
  );
}

// ============ Validation ============

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates a single step given the current form data.
 */
export function validateStep(
  stepId: string,
  data: Partial<TortClaim>
): ValidationResult {
  const errors: Record<string, string> = {};

  switch (stepId) {
    case 'classification':
      if (!data.claim_type) errors.claim_type = 'נדרש סוג תביעה';
      if (!data.court_type) errors.court_type = 'נדרש סוג בית משפט';
      if (!data.court_name) errors.court_name = 'נדרש שם בית משפט';
      if (!data.incident_date) {
        errors.incident_date = 'נדרש תאריך אירוע';
      } else {
        const dateCheck = validateIncidentDate(data.incident_date);
        if (!dateCheck.valid) errors.incident_date = dateCheck.error!;
      }
      break;

    case 'plaintiff':
      if (!data.plaintiff_name?.trim()) errors.plaintiff_name = 'נדרש שם התובע';
      if (!data.plaintiff_id?.trim()) errors.plaintiff_id = 'נדרש מספר ת.ז.';
      break;

    case 'defendants':
      if (!data.defendants || data.defendants.length === 0) {
        errors.defendants = 'יש להוסיף לפחות נתבע אחד';
      } else {
        data.defendants.forEach((d, i) => {
          if (!d.name.trim()) errors[`defendant_${i}_name`] = `נדרש שם נתבע ${i + 1}`;
        });
      }
      break;

    case 'incident':
      if (!data.incident_description?.trim()) {
        errors.incident_description = 'נדרש תיאור האירוע';
      }
      break;

    case 'road_accident_details':
      // Optional fields - no required validation
      break;

    case 'medical_malpractice_details':
      // Optional fields - no required validation
      break;

    case 'tort_elements':
      // Encouraged but not strictly required
      break;

    case 'damages':
      // No required fields but total should be > 0 ideally
      break;

    case 'legal_arguments':
      // Optional - AI can fill these
      break;

    case 'summary':
      // Final step - no validation needed
      break;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates all steps and returns a map of step validity.
 */
export function validateAllSteps(
  claimType: TortClaimType,
  data: Partial<TortClaim>
): Record<string, ValidationResult> {
  const steps = getStepsForClaimType(claimType);
  const results: Record<string, ValidationResult> = {};
  for (const step of steps) {
    results[step.id] = validateStep(step.id, data);
  }
  return results;
}

// ============ Statute of Limitations ============

/** Statute of limitations rules per claim type (in years) */
const STATUTE_RULES: Record<TortClaimType, { years: number; label: string }> = {
  general_negligence: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  road_accident: { years: 7, label: '7 שנים (פלת"ד / פקודת הנזיקין)' },
  medical_malpractice: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  professional_malpractice: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  property_damage: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  defamation: { years: 1, label: 'שנה אחת (חוק איסור לשון הרע)' },
  assault: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  work_accident: { years: 7, label: '7 שנים (פקודת הנזיקין)' },
  product_liability: { years: 3, label: '3 שנים (חוק אחריות למוצרים פגומים)' },
  other: { years: 7, label: '7 שנים (ברירת מחדל)' },
};

export interface StatuteResult {
  deadline: string; // ISO date
  yearsAllowed: number;
  label: string;
  daysRemaining: number;
  isExpired: boolean;
  isUrgent: boolean; // < 90 days remaining
  isMinorAdjusted?: boolean; // statute adjusted because plaintiff is a minor
}

/**
 * Calculates the statute of limitations date for a given claim type and incident date.
 * For minors (under 18 at incident date), the statute starts from their 18th birthday
 * per Israeli Limitation Law (חוק ההתיישנות, סעיף 10).
 *
 * @param plaintiffBirthDate - optional; if provided and plaintiff was < 18 at incident, statute is adjusted
 */
export function calculateStatuteOfLimitations(
  claimType: TortClaimType,
  incidentDate: string,
  plaintiffBirthDate?: string
): StatuteResult | null {
  if (!incidentDate) return null;

  const rule = STATUTE_RULES[claimType];
  const incident = new Date(incidentDate);
  if (isNaN(incident.getTime())) return null;

  let startDate = incident;
  let isMinorAdjusted = false;

  // Minor adjustment: if plaintiff was under 18 at incident, statute starts at 18th birthday
  if (plaintiffBirthDate) {
    const birth = new Date(plaintiffBirthDate);
    if (!isNaN(birth.getTime())) {
      const ageAtIncidentMs = incident.getTime() - birth.getTime();
      const ageAtIncidentYears = ageAtIncidentMs / (365.25 * 24 * 60 * 60 * 1000);
      if (ageAtIncidentYears < 18) {
        const eighteenthBday = new Date(birth);
        eighteenthBday.setFullYear(eighteenthBday.getFullYear() + 18);
        startDate = eighteenthBday;
        isMinorAdjusted = true;
      }
    }
  }

  const deadline = new Date(startDate);
  deadline.setFullYear(deadline.getFullYear() + rule.years);

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    deadline: deadline.toISOString().split('T')[0],
    yearsAllowed: rule.years,
    label: isMinorAdjusted ? `${rule.label} (מותאם לקטין — ההתיישנות מתחילה מגיל 18)` : rule.label,
    daysRemaining,
    isExpired: daysRemaining < 0,
    isUrgent: daysRemaining >= 0 && daysRemaining < 90,
    isMinorAdjusted,
  };
}

/**
 * Validates that an incident date is not in the future.
 */
export function validateIncidentDate(dateStr: string): { valid: boolean; error?: string } {
  if (!dateStr) return { valid: false, error: 'תאריך אירוע נדרש' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { valid: false, error: 'תאריך לא תקין' };
  if (d > new Date()) return { valid: false, error: 'תאריך האירוע לא יכול להיות בעתיד' };
  return { valid: true };
}

// ============ Damage Heads Helpers ============

/** Default damage heads based on claim type */
export function getDefaultDamageHeads(claimType: TortClaimType): TortDamageType[] {
  const common: TortDamageType[] = [
    'pain_suffering',
    'medical_expenses_past',
    'medical_expenses_future',
    'lost_wages_past',
    'travel_expenses',
  ];

  switch (claimType) {
    case 'road_accident':
      return [...common, 'lost_earning_capacity', 'care_assistance'];
    case 'medical_malpractice':
      return [...common, 'lost_earning_capacity', 'psychological_damage', 'care_assistance'];
    case 'work_accident':
      return [...common, 'lost_earning_capacity', 'care_assistance'];
    case 'property_damage':
      return ['property_damage', 'loss_of_amenity', 'travel_expenses'];
    case 'defamation':
      return ['pain_suffering', 'psychological_damage', 'lost_wages_past'];
    case 'assault':
      return [...common, 'psychological_damage'];
    default:
      return common;
  }
}

/** Calculate total from damage heads array */
export function calculateTotalDamages(damageHeads: DamageHead[]): number {
  return damageHeads.reduce((sum, h) => sum + (h.amount_estimated || 0), 0);
}

/** Create an empty damage head */
export function createEmptyDamageHead(type: TortDamageType): DamageHead {
  return {
    type,
    amount_estimated: 0,
    description: '',
    evidence_reference: '',
  };
}

// ============ Court auto-selection ============

/**
 * Suggests court type based on total claim amount.
 * Under 2.5M NIS → Magistrate, above → District
 */
export function suggestCourtType(totalAmount: number): 'magistrate' | 'district' {
  return totalAmount > 2_500_000 ? 'district' : 'magistrate';
}

// ============ Step completeness ============

/**
 * Returns completion percentage for the whole form.
 */
export function getFormCompleteness(
  claimType: TortClaimType,
  data: Partial<TortClaim>
): number {
  const steps = getStepsForClaimType(claimType);
  // Exclude summary from calculation
  const validatable = steps.filter(s => s.id !== 'summary');
  if (validatable.length === 0) return 100;

  let completed = 0;
  for (const step of validatable) {
    const result = validateStep(step.id, data);
    if (result.valid) completed++;
  }
  return Math.round((completed / validatable.length) * 100);
}
