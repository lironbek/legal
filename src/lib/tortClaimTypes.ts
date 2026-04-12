// Tort Claim Types - טיפוסים מורחבים לכתבי תביעה בנזיקין
// Matches the Supabase schema: supabase/migrations/20260411000000_create_tort_claims.sql

// ============ Enums ============

export type TortClaimType =
  | 'general_negligence'       // רשלנות כללית
  | 'road_accident'            // תאונות דרכים (פלת"ד)
  | 'medical_malpractice'      // רשלנות רפואית
  | 'professional_malpractice' // רשלנות מקצועית
  | 'property_damage'          // נזק רכוש
  | 'defamation'               // לשון הרע
  | 'assault'                  // תקיפה
  | 'work_accident'            // תאונת עבודה
  | 'product_liability'        // אחריות מוצר
  | 'other';

export type CourtType = 'magistrate' | 'district';

export type TortClaimStatus = 'draft' | 'review' | 'approved' | 'filed';

export type TortDamageType =
  | 'pain_suffering'
  | 'medical_expenses_past'
  | 'medical_expenses_future'
  | 'lost_wages_past'
  | 'lost_earning_capacity'
  | 'property_damage'
  | 'loss_of_amenity'
  | 'care_assistance'
  | 'psychological_damage'
  | 'bereavement'
  | 'travel_expenses'
  | 'other';

export type DefendantType = 'individual' | 'company' | 'insurance' | 'government';

// ============ Sub-interfaces ============

export interface TortDefendant {
  id: string;
  name: string;
  idNumber?: string;
  address: string;
  city: string;
  type: DefendantType;
  role?: string;
  insurerName?: string;
  policyNumber?: string;
  attorney?: string;
}

export interface TortElements {
  duty_of_care: string;
  breach_description: string;
  causation: string;
  damages_description: string;
  contributing_negligence: string;
}

export interface DamageHead {
  type: TortDamageType;
  amount_estimated: number;
  description: string;
  evidence_reference: string;
}

export interface TortAttachment {
  type: string;
  filename: string;
  url: string;
  description: string;
  uploaded_at: string;
}

export interface TortDocumentAttachment {
  id: string;
  source: 'scanned' | 'document';
  source_id: string;
  display_name: string;
  order: number;
  file_url?: string;
  file_name: string;
}

export interface VehicleDetails {
  license_plate: string;
  make: string;
  model: string;
  year: string;
}

export interface TreatmentDates {
  start: string;
  end: string;
}

export interface PlaintiffContact {
  phone: string;
  email: string;
  secondary_phone?: string;
}

// ============ Main Interface ============

export interface TortClaim {
  id: string;
  company_id: string;
  case_id?: string;
  client_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: TortClaimStatus;

  // Classification
  claim_type: TortClaimType;
  court_type: CourtType;
  court_name: string;
  filing_date?: string;
  incident_date: string;
  statute_of_limitations_date?: string;
  incident_location: string;
  incident_description: string;

  // Plaintiff
  plaintiff_name: string;
  plaintiff_id: string;
  plaintiff_address: string;
  plaintiff_city: string;
  plaintiff_contact: PlaintiffContact;
  plaintiff_attorney: string;
  plaintiff_birth_date?: string;
  plaintiff_is_minor?: boolean;
  plaintiff_guardian_name?: string;
  plaintiff_guardian_id?: string;

  // Defendants
  defendants: TortDefendant[];
  defendant_insurer?: string;

  // Tort elements
  tort_elements: TortElements;

  // Damage heads
  damage_heads: DamageHead[];
  total_claim_amount: number;

  // Attachments
  attachments: TortAttachment[];
  document_attachments: TortDocumentAttachment[];

  // Generated documents
  generated_draft?: string;
  final_document?: string;
  docx_url?: string;
  pdf_url?: string;

  // Legal arguments
  legal_arguments: string;
  causes_of_action: string[];
  relevant_laws: string[];
  requested_remedies: string;

  // Road accident specific (פלת"ד)
  vehicle_details?: VehicleDetails;
  insurance_policy_number?: string;
  police_report_number?: string;
  is_karnitah: boolean;

  // Medical malpractice specific
  medical_facility?: string;
  treating_physician?: string;
  treatment_dates?: TreatmentDates;
  medical_expert_opinion: boolean;
  waiver_of_medical_confidentiality: boolean;
}

// ============ Hebrew Labels ============

export const CLAIM_TYPE_LABELS: Record<TortClaimType, string> = {
  general_negligence: 'רשלנות כללית',
  road_accident: 'תאונת דרכים (פלת"ד)',
  medical_malpractice: 'רשלנות רפואית',
  professional_malpractice: 'רשלנות מקצועית',
  property_damage: 'נזק רכוש',
  defamation: 'לשון הרע',
  assault: 'תקיפה',
  work_accident: 'תאונת עבודה',
  product_liability: 'אחריות מוצר',
  other: 'אחר',
};

export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  magistrate: 'בית משפט השלום',
  district: 'בית המשפט המחוזי',
};

export const CLAIM_STATUS_LABELS: Record<TortClaimStatus, string> = {
  draft: 'טיוטה',
  review: 'בבדיקה',
  approved: 'אושר',
  filed: 'הוגש',
};

export const DEFENDANT_TYPE_LABELS: Record<DefendantType, string> = {
  individual: 'אדם פרטי',
  company: 'חברה',
  insurance: 'חברת ביטוח',
  government: 'גוף ציבורי',
};

export const DAMAGE_TYPE_LABELS: Record<TortDamageType, string> = {
  pain_suffering: 'כאב וסבל',
  medical_expenses_past: 'הוצאות רפואיות (עבר)',
  medical_expenses_future: 'הוצאות רפואיות (עתיד)',
  lost_wages_past: 'הפסד שכר (עבר)',
  lost_earning_capacity: 'אובדן כושר השתכרות',
  property_damage: 'נזק רכוש',
  loss_of_amenity: 'אובדן הנאות חיים',
  care_assistance: 'עזרת הזולת',
  psychological_damage: 'נזק נפשי',
  bereavement: 'תמיכה בתלויים',
  travel_expenses: 'הוצאות נסיעה',
  other: 'אחר',
};

export const CAUSES_OF_ACTION_OPTIONS = [
  'עוולת הרשלנות (סעיפים 35-36 לפקודת הנזיקין)',
  'הפרת חובה חקוקה (סעיף 63 לפקודת הנזיקין)',
  'אחריות שילוחית (סעיף 13 לפקודת הנזיקין)',
  'חוק הפיצויים לנפגעי תאונות דרכים, תשל"ה-1975',
  'אחריות מוחלטת (סעיף 38-40 לפקודת הנזיקין)',
  'תקיפה (סעיף 23 לפקודת הנזיקין)',
  'כליאת שווא (סעיף 26 לפקודת הנזיקין)',
  'הסגת גבול (סעיף 29 לפקודת הנזיקין)',
  'מטרד (סעיפים 44-48 לפקודת הנזיקין)',
  'פגיעה בפרטיות (חוק הגנת הפרטיות, תשמ"א-1981)',
  'לשון הרע (חוק איסור לשון הרע, תשכ"ה-1965)',
];

export const RELEVANT_LAWS_OPTIONS = [
  'פקודת הנזיקין [נוסח חדש]',
  'חוק הפיצויים לנפגעי תאונות דרכים, תשל"ה-1975',
  'פקודת ביטוח רכב מנועי [נוסח חדש], תש"ל-1970',
  'חוק ביטוח בריאות ממלכתי, תשנ"ד-1994',
  'חוק הביטוח הלאומי [נוסח משולב], תשנ"ה-1995',
  'פקודת בריאות העם, 1940',
  'חוק זכויות החולה, תשנ"ו-1996',
  'פקודת הבטיחות בעבודה [נוסח חדש], תש"ל-1970',
  'חוק האחריות למוצרים פגומים, תש"ם-1980',
  'חוק יסוד: כבוד האדם וחירותו',
  'חוק איסור לשון הרע, תשכ"ה-1965',
  'חוק ההתיישנות, תשי"ח-1958',
];

export const ISRAELI_COURTS = [
  'בית משפט השלום תל אביב',
  'בית משפט השלום ירושלים',
  'בית משפט השלום חיפה',
  'בית משפט השלום באר שבע',
  'בית משפט השלום נתניה',
  'בית משפט השלום ראשון לציון',
  'בית משפט השלום פתח תקווה',
  'בית משפט השלום כפר סבא',
  'בית משפט השלום הרצליה',
  'בית משפט השלום אשדוד',
  'בית משפט השלום חדרה',
  'בית משפט השלום עכו',
  'בית משפט השלום נצרת',
  'בית משפט השלום קריות',
  'בית משפט השלום טבריה',
  'בית משפט השלום אילת',
  'בית המשפט המחוזי תל אביב',
  'בית המשפט המחוזי ירושלים',
  'בית המשפט המחוזי חיפה',
  'בית המשפט המחוזי מרכז (לוד)',
  'בית המשפט המחוזי באר שבע',
  'בית המשפט המחוזי נצרת',
];

// ============ Factory ============

export const createEmptyTortClaim = (companyId: string, createdBy: string): Omit<TortClaim, 'id'> => ({
  company_id: companyId,
  created_by: createdBy,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'draft',

  claim_type: 'general_negligence',
  court_type: 'magistrate',
  court_name: '',
  incident_date: '',
  incident_location: '',
  incident_description: '',

  plaintiff_name: '',
  plaintiff_id: '',
  plaintiff_address: '',
  plaintiff_city: '',
  plaintiff_contact: { phone: '', email: '' },
  plaintiff_attorney: '',

  defendants: [],

  tort_elements: {
    duty_of_care: '',
    breach_description: '',
    causation: '',
    damages_description: '',
    contributing_negligence: '',
  },

  damage_heads: [],
  total_claim_amount: 0,

  attachments: [],
  document_attachments: [],

  legal_arguments: '',
  causes_of_action: [],
  relevant_laws: [],
  requested_remedies: '',

  is_karnitah: false,
  medical_expert_opinion: false,
  waiver_of_medical_confidentiality: false,
});
