// Case Type Configuration - statuses workflow per case type

export interface CaseTypeConfig {
  key: string;
  label: string;
  statuses: string[];
}

export const CASE_TYPES: CaseTypeConfig[] = [
  {
    key: 'civil',
    label: 'תביעה אזרחית',
    statuses: [
      'פתיחת תיק',
      'הכנת כתבי טענות',
      'הגשה לבית משפט',
      'קדם משפט',
      'שמיעת ראיות',
      'סיכומים',
      'פסק דין',
      'סגירת תיק',
    ],
  },
  {
    key: 'real-estate',
    label: 'עסקאות מקרקעין',
    statuses: [
      'פתיחת תיק',
      'בדיקת נכס',
      'ניהול מו"מ',
      'עריכת חוזה',
      'חתימה',
      'רישום בטאבו',
      'סגירת תיק',
    ],
  },
  {
    key: 'criminal',
    label: 'פלילי',
    statuses: [
      'פתיחת תיק',
      'חקירה',
      'כתב אישום',
      'הקראה',
      'שמיעת ראיות',
      'סיכומים',
      'גזר דין',
      'סגירת תיק',
    ],
  },
  {
    key: 'tax',
    label: 'מיסים',
    statuses: [
      'פתיחת תיק',
      'איסוף מסמכים',
      'הגשת דוח',
      'דיון בהשגה',
      'ערר',
      'סגירת תיק',
    ],
  },
  {
    key: 'labor',
    label: 'דיני עבודה',
    statuses: [
      'פתיחת תיק',
      'הכנת כתבי טענות',
      'הגשה',
      'גישור',
      'דיון',
      'פסק דין',
      'סגירת תיק',
    ],
  },
  {
    key: 'family',
    label: 'דיני משפחה',
    statuses: [
      'פתיחת תיק',
      'הכנת מסמכים',
      'הגשה',
      'גישור',
      'דיונים',
      'הסכם / פסק דין',
      'סגירת תיק',
    ],
  },
  {
    key: 'corporate',
    label: 'חברות',
    statuses: [
      'פתיחת תיק',
      'בדיקת נאותות',
      'עריכת מסמכים',
      'משא ומתן',
      'חתימה',
      'רישום',
      'סגירת תיק',
    ],
  },
  {
    key: 'tort',
    label: 'נזיקין',
    statuses: [
      'פתיחת תיק',
      'איסוף מסמכים',
      'הכנת כתב תביעה',
      'הגשה לבית משפט',
      'קדם משפט',
      'שמיעת ראיות',
      'סיכומים',
      'פסק דין',
      'סגירת תיק',
    ],
  },
];

export const getCaseTypeConfig = (key: string): CaseTypeConfig | undefined => {
  return CASE_TYPES.find((ct) => ct.key === key);
};

export const getCaseTypeLabel = (key: string): string => {
  return getCaseTypeConfig(key)?.label || key;
};

export const getStatusesForCaseType = (caseTypeKey: string): string[] => {
  return getCaseTypeConfig(caseTypeKey)?.statuses || ['פתיחת תיק', 'בטיפול', 'סגירת תיק'];
};

export const getStatusIndex = (caseTypeKey: string, status: string): number => {
  const statuses = getStatusesForCaseType(caseTypeKey);
  return statuses.indexOf(status);
};

export const getProgressPercent = (caseTypeKey: string, status: string): number => {
  const statuses = getStatusesForCaseType(caseTypeKey);
  const index = statuses.indexOf(status);
  if (index === -1) return 0;
  return Math.round(((index + 1) / statuses.length) * 100);
};
