export type ModuleKey =
  | 'dashboard'
  | 'cases'
  | 'clients'
  | 'calendar'
  | 'time-tracking'
  | 'billing'
  | 'reports'
  | 'cash-flow'
  | 'budget'
  | 'documents'
  | 'scanned-documents'
  | 'legal-library'
  | 'disability-calculator'
  | 'signing'
  | 'settings';

export const ALL_MODULES: { key: ModuleKey; label: string; alwaysEnabled?: boolean }[] = [
  { key: 'dashboard', label: 'לוח הבקרה', alwaysEnabled: true },
  { key: 'cases', label: 'ניהול תיקים' },
  { key: 'clients', label: 'לקוחות' },
  { key: 'calendar', label: 'יומן דיונים' },
  { key: 'time-tracking', label: 'שעות עבודה' },
  { key: 'billing', label: 'חשבונות' },
  { key: 'reports', label: 'דוחות' },
  { key: 'cash-flow', label: 'תזרים מזומנים' },
  { key: 'budget', label: 'תקציב' },
  { key: 'documents', label: 'מסמכים' },
  { key: 'scanned-documents', label: 'סריקת מסמכים' },
  { key: 'legal-library', label: 'ספרייה משפטית' },
  { key: 'disability-calculator', label: 'מחשבון נכות' },
  { key: 'signing', label: 'חתימה דיגיטלית' },
  { key: 'settings', label: 'הגדרות', alwaysEnabled: true },
];

export const URL_TO_MODULE: Record<string, ModuleKey> = {
  '/': 'dashboard',
  '/cases': 'cases',
  '/clients': 'clients',
  '/calendar': 'calendar',
  '/time-tracking': 'time-tracking',
  '/billing': 'billing',
  '/reports': 'reports',
  '/cash-flow': 'cash-flow',
  '/budget': 'budget',
  '/documents': 'documents',
  '/scanned-documents': 'scanned-documents',
  '/legal-library': 'legal-library',
  '/disability-calculator': 'disability-calculator',
  '/signing': 'signing',
  '/settings': 'settings',
};
