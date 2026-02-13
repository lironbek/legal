// Data Manager - ניהול נתונים עם Local Storage + Supabase sync
// Companies & assignments are synced to Supabase for persistence across browsers

import { pushCompaniesToSupabase, pushAssignmentsToSupabase } from './companyService';

// ============ Company Types ============

export interface Company {
  id: string;
  slug: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  enabled_modules?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserCompanyAssignment {
  id: string;
  user_id: string;
  company_id: string;
  role: 'owner' | 'admin' | 'lawyer' | 'assistant' | 'viewer';
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Business Entity Types ============

export interface Case {
  id: string;
  company_id: string;
  title: string;
  client: string;
  caseType: string;
  priority: string;
  description: string;
  estimatedDuration: string;
  budget: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  idNumber: string;
  address: string;
  city: string;
  postalCode: string;
  clientType: string;
  notes: string;
  status: string;
  activeCases: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  client: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  company_id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  client: string;
  priority: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  company_id: string;
  title: string;
  category: string;
  client: string;
  case: string;
  description: string;
  tags: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashFlowEntry {
  id: string;
  company_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  date: string;
  isRecurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  client?: string;
  caseRef?: string;
  status: 'expected' | 'confirmed' | 'received' | 'paid';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetItem {
  id: string;
  company_id: string;
  category: string;
  description: string;
  plannedAmount: number;
  actualAmount: number;
  period: string;
  periodType: 'monthly' | 'quarterly' | 'yearly';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============ Data Category Types ============

export type DataCategory = 'cases' | 'clients' | 'invoices' | 'events' | 'documents' | 'cashFlowEntries' | 'budgetItems';

export const DATA_CATEGORY_LABELS: Record<DataCategory, string> = {
  cases: 'תיקים',
  clients: 'לקוחות',
  invoices: 'חשבוניות',
  events: 'אירועים',
  documents: 'מסמכים',
  cashFlowEntries: 'תזרים מזומנים',
  budgetItems: 'תקציב',
};

// ============ Current Company State ============

let currentCompanyId: string | null = null;

export const setCurrentCompany = (companyId: string) => {
  currentCompanyId = companyId;
  localStorage.setItem('current-company-id', companyId);
};

export const getCurrentCompany = (): string | null => {
  if (!currentCompanyId) {
    currentCompanyId = localStorage.getItem('current-company-id');
  }
  return currentCompanyId;
};

// ============ Helpers ============

const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Read raw data from localStorage (no filtering)
const readAll = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

// Filter by current company
const filterByCompany = <T extends { company_id: string }>(items: T[]): T[] => {
  const companyId = getCurrentCompany();
  if (!companyId) return items;
  return items.filter(item => item.company_id === companyId);
};

// ============ Slug Helpers ============

const generateSlug = (name: string): string => {
  // Replace Hebrew and non-alphanumeric characters, create URL-friendly slug
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, '-')       // spaces to hyphens
    .replace(/[^a-z0-9\u0590-\u05FF-]/g, '') // keep only alphanumeric, Hebrew, hyphens
    .replace(/--+/g, '-')         // collapse multiple hyphens
    .replace(/^-|-$/g, '');       // trim leading/trailing hyphens

  // If result is empty (e.g., only Hebrew), use transliteration-style fallback
  if (!slug || /^[\u0590-\u05FF-]+$/.test(slug)) {
    return 'org-' + generateId().substring(0, 8);
  }
  return slug;
};

const ensureUniqueSlug = (slug: string, excludeId?: string): string => {
  const companies = readAll<Company>('companies');
  let candidate = slug;
  let counter = 1;
  while (companies.some(c => c.slug === candidate && c.id !== excludeId)) {
    candidate = `${slug}-${counter}`;
    counter++;
  }
  return candidate;
};

// ============ Company CRUD ============

export const getCompanies = (): Company[] => {
  return readAll<Company>('companies');
};

export const getCompanyBySlug = (slug: string): Company | null => {
  const companies = getCompanies();
  return companies.find(c => c.slug === slug) || null;
};

export const addCompany = (data: Omit<Company, 'id' | 'slug' | 'created_at' | 'updated_at'> & { slug?: string }): Company => {
  const companies = getCompanies();
  const baseSlug = data.slug || generateSlug(data.name);
  const uniqueSlug = ensureUniqueSlug(baseSlug);
  const newCompany: Company = {
    ...data,
    id: generateId(),
    slug: uniqueSlug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  companies.push(newCompany);
  localStorage.setItem('companies', JSON.stringify(companies));
  pushCompaniesToSupabase(); // async sync to Supabase
  return newCompany;
};

export const updateCompany = (id: string, updates: Partial<Company>): Company | null => {
  const companies = getCompanies();
  const index = companies.findIndex(c => c.id === id);
  if (index === -1) return null;
  // Ensure slug uniqueness if slug is being updated
  if (updates.slug) {
    updates.slug = ensureUniqueSlug(updates.slug, id);
  }
  companies[index] = { ...companies[index], ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem('companies', JSON.stringify(companies));
  pushCompaniesToSupabase(); // async sync to Supabase
  return companies[index];
};

export const deleteCompany = (id: string): boolean => {
  const companies = getCompanies();
  const filtered = companies.filter(c => c.id !== id);
  if (filtered.length === companies.length) return false;
  localStorage.setItem('companies', JSON.stringify(filtered));
  pushCompaniesToSupabase(); // async sync to Supabase

  // Also delete all data belonging to this company
  const entityKeys = ['cases', 'clients', 'invoices', 'events', 'documents', 'cashFlowEntries', 'budgetItems'];
  entityKeys.forEach(key => {
    const items = readAll<{ company_id: string }>(key);
    const remaining = items.filter(item => item.company_id !== id);
    localStorage.setItem(key, JSON.stringify(remaining));
  });

  // Remove user-company assignments for this company
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');
  const remainingAssignments = assignments.filter(a => a.company_id !== id);
  localStorage.setItem('user-company-assignments', JSON.stringify(remainingAssignments));
  pushAssignmentsToSupabase(); // async sync to Supabase

  return true;
};

// ============ User-Company Assignments ============

export const getUserCompanyAssignments = (userId?: string): UserCompanyAssignment[] => {
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');
  if (userId) return assignments.filter(a => a.user_id === userId);
  return assignments;
};

export const getCompanyUserAssignments = (companyId: string): UserCompanyAssignment[] => {
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');
  return assignments.filter(a => a.company_id === companyId);
};

export const addUserCompanyAssignment = (
  userId: string,
  companyId: string,
  role: UserCompanyAssignment['role'] = 'viewer',
  isPrimary = false
): UserCompanyAssignment => {
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');

  // Check if already exists
  const existing = assignments.find(a => a.user_id === userId && a.company_id === companyId);
  if (existing) return existing;

  const newAssignment: UserCompanyAssignment = {
    id: generateId(),
    user_id: userId,
    company_id: companyId,
    role,
    is_primary: isPrimary,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  assignments.push(newAssignment);
  localStorage.setItem('user-company-assignments', JSON.stringify(assignments));
  pushAssignmentsToSupabase(); // async sync to Supabase
  return newAssignment;
};

export const removeUserCompanyAssignment = (userId: string, companyId: string): boolean => {
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');
  const filtered = assignments.filter(a => !(a.user_id === userId && a.company_id === companyId));
  if (filtered.length === assignments.length) return false;
  localStorage.setItem('user-company-assignments', JSON.stringify(filtered));
  pushAssignmentsToSupabase(); // async sync to Supabase
  return true;
};

export const updateUserCompanyRole = (userId: string, companyId: string, role: UserCompanyAssignment['role']): boolean => {
  const assignments = readAll<UserCompanyAssignment>('user-company-assignments');
  const index = assignments.findIndex(a => a.user_id === userId && a.company_id === companyId);
  if (index === -1) return false;
  assignments[index].role = role;
  assignments[index].updated_at = new Date().toISOString();
  localStorage.setItem('user-company-assignments', JSON.stringify(assignments));
  pushAssignmentsToSupabase(); // async sync to Supabase
  return true;
};

// ============ Cases ============

// Generate case number starting from 1000
let caseCounter = 1000;
const generateCaseNumber = (): string => {
  const cases = getCases();
  if (cases.length === 0) {
    caseCounter = 1000;
  } else {
    const existingNumbers = cases
      .map(c => parseInt(c.id))
      .filter(num => !isNaN(num))
      .sort((a, b) => b - a);

    if (existingNumbers.length > 0) {
      caseCounter = Math.max(existingNumbers[0] + 1, 1000);
    } else {
      caseCounter = 1000;
    }
  }

  return caseCounter.toString();
};

export const getCases = (): Case[] => {
  return filterByCompany(readAll<Case>('cases'));
};

export const addCase = (caseData: Omit<Case, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): Case => {
  const allCases = readAll<Case>('cases');
  const companyId = getCurrentCompany();
  const newCase: Case = {
    ...caseData,
    id: generateCaseNumber(),
    company_id: companyId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allCases.push(newCase);
  localStorage.setItem('cases', JSON.stringify(allCases));
  return newCase;
};

export const updateCase = (id: string, updates: Partial<Case>): Case | null => {
  const allCases = readAll<Case>('cases');
  const index = allCases.findIndex(c => c.id === id);

  if (index === -1) return null;

  allCases[index] = {
    ...allCases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem('cases', JSON.stringify(allCases));
  return allCases[index];
};

export const deleteCase = (id: string): boolean => {
  const allCases = readAll<Case>('cases');
  const filteredCases = allCases.filter(c => c.id !== id);

  if (filteredCases.length === allCases.length) return false;

  localStorage.setItem('cases', JSON.stringify(filteredCases));
  return true;
};

// ============ Clients ============

export const getClients = (): Client[] => {
  return filterByCompany(readAll<Client>('clients'));
};

export const addClient = (clientData: Omit<Client, 'id' | 'company_id' | 'createdAt' | 'updatedAt' | 'activeCases'>): Client => {
  const allClients = readAll<Client>('clients');
  const companyId = getCurrentCompany();
  const newClient: Client = {
    ...clientData,
    id: generateId(),
    company_id: companyId || '',
    activeCases: 0,
    status: clientData.status || 'פעיל',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allClients.push(newClient);
  localStorage.setItem('clients', JSON.stringify(allClients));
  return newClient;
};

export const updateClient = (id: string, updates: Partial<Client>): Client | null => {
  const allClients = readAll<Client>('clients');
  const index = allClients.findIndex(c => c.id === id);

  if (index === -1) return null;

  allClients[index] = {
    ...allClients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem('clients', JSON.stringify(allClients));
  return allClients[index];
};

export const deleteClient = (id: string): boolean => {
  const allClients = readAll<Client>('clients');
  const filteredClients = allClients.filter(c => c.id !== id);

  if (filteredClients.length === allClients.length) return false;

  localStorage.setItem('clients', JSON.stringify(filteredClients));
  return true;
};

// ============ Invoices ============

export const getInvoices = (): Invoice[] => {
  return filterByCompany(readAll<Invoice>('invoices'));
};

export const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): Invoice => {
  const allInvoices = readAll<Invoice>('invoices');
  const companyId = getCurrentCompany();
  const newInvoice: Invoice = {
    ...invoiceData,
    id: generateId(),
    company_id: companyId || '',
    status: invoiceData.status || 'חדש',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allInvoices.push(newInvoice);
  localStorage.setItem('invoices', JSON.stringify(allInvoices));
  return newInvoice;
};

// ============ Events ============

export const getEvents = (): Event[] => {
  return filterByCompany(readAll<Event>('events'));
};

export const addEvent = (eventData: Omit<Event, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): Event => {
  const allEvents = readAll<Event>('events');
  const companyId = getCurrentCompany();
  const newEvent: Event = {
    ...eventData,
    id: generateId(),
    company_id: companyId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allEvents.push(newEvent);
  localStorage.setItem('events', JSON.stringify(allEvents));
  return newEvent;
};

// ============ Documents ============

export const getDocuments = (): Document[] => {
  return filterByCompany(readAll<Document>('documents'));
};

export const addDocument = (documentData: Omit<Document, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): Document => {
  const allDocuments = readAll<Document>('documents');
  const companyId = getCurrentCompany();
  const newDocument: Document = {
    ...documentData,
    id: generateId(),
    company_id: companyId || '',
    status: documentData.status || 'פעיל',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  allDocuments.push(newDocument);
  localStorage.setItem('documents', JSON.stringify(allDocuments));
  return newDocument;
};

export const getDocumentsByCase = (caseId: string): Document[] => {
  const documents = getDocuments();
  return documents.filter(doc => doc.case === caseId);
};

export const updateDocument = (id: string, updates: Partial<Document>): Document | null => {
  const allDocuments = readAll<Document>('documents');
  const index = allDocuments.findIndex(d => d.id === id);

  if (index === -1) return null;

  allDocuments[index] = {
    ...allDocuments[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem('documents', JSON.stringify(allDocuments));
  return allDocuments[index];
};

export const deleteDocument = (id: string): boolean => {
  const allDocuments = readAll<Document>('documents');
  const filteredDocuments = allDocuments.filter(d => d.id !== id);

  if (filteredDocuments.length === allDocuments.length) return false;

  localStorage.setItem('documents', JSON.stringify(filteredDocuments));
  return true;
};

// ============ Cash Flow Entries ============

export const getCashFlowEntries = (): CashFlowEntry[] => {
  return filterByCompany(readAll<CashFlowEntry>('cashFlowEntries'));
};

export const addCashFlowEntry = (data: Omit<CashFlowEntry, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): CashFlowEntry => {
  const allEntries = readAll<CashFlowEntry>('cashFlowEntries');
  const companyId = getCurrentCompany();
  const newEntry: CashFlowEntry = {
    ...data,
    id: generateId(),
    company_id: companyId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  allEntries.push(newEntry);
  localStorage.setItem('cashFlowEntries', JSON.stringify(allEntries));
  return newEntry;
};

export const updateCashFlowEntry = (id: string, updates: Partial<CashFlowEntry>): CashFlowEntry | null => {
  const allEntries = readAll<CashFlowEntry>('cashFlowEntries');
  const index = allEntries.findIndex(e => e.id === id);
  if (index === -1) return null;
  allEntries[index] = { ...allEntries[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('cashFlowEntries', JSON.stringify(allEntries));
  return allEntries[index];
};

export const deleteCashFlowEntry = (id: string): boolean => {
  const allEntries = readAll<CashFlowEntry>('cashFlowEntries');
  const filtered = allEntries.filter(e => e.id !== id);
  if (filtered.length === allEntries.length) return false;
  localStorage.setItem('cashFlowEntries', JSON.stringify(filtered));
  return true;
};

// ============ Budget Items ============

export const getBudgetItems = (): BudgetItem[] => {
  return filterByCompany(readAll<BudgetItem>('budgetItems'));
};

export const addBudgetItem = (data: Omit<BudgetItem, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>): BudgetItem => {
  const allItems = readAll<BudgetItem>('budgetItems');
  const companyId = getCurrentCompany();
  const newItem: BudgetItem = {
    ...data,
    id: generateId(),
    company_id: companyId || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  allItems.push(newItem);
  localStorage.setItem('budgetItems', JSON.stringify(allItems));
  return newItem;
};

export const updateBudgetItem = (id: string, updates: Partial<BudgetItem>): BudgetItem | null => {
  const allItems = readAll<BudgetItem>('budgetItems');
  const index = allItems.findIndex(i => i.id === id);
  if (index === -1) return null;
  allItems[index] = { ...allItems[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('budgetItems', JSON.stringify(allItems));
  return allItems[index];
};

export const deleteBudgetItem = (id: string): boolean => {
  const allItems = readAll<BudgetItem>('budgetItems');
  const filtered = allItems.filter(i => i.id !== id);
  if (filtered.length === allItems.length) return false;
  localStorage.setItem('budgetItems', JSON.stringify(filtered));
  return true;
};

// ============ Bulk Purge ============

export const getCompanyDataCounts = (companyId: string): Record<DataCategory, number> => {
  const categories: DataCategory[] = ['cases', 'clients', 'invoices', 'events', 'documents', 'cashFlowEntries', 'budgetItems'];
  const counts = {} as Record<DataCategory, number>;
  categories.forEach(key => {
    const items = readAll<{ company_id: string }>(key);
    counts[key] = items.filter(item => item.company_id === companyId).length;
  });
  return counts;
};

export const purgeCompanyData = (companyId: string, dataTypes: DataCategory[]): Record<DataCategory, number> => {
  const deleted = {} as Record<DataCategory, number>;
  dataTypes.forEach(key => {
    const items = readAll<{ company_id: string }>(key);
    const remaining = items.filter(item => item.company_id !== companyId);
    deleted[key] = items.length - remaining.length;
    localStorage.setItem(key, JSON.stringify(remaining));
  });
  return deleted;
};

// ============ Migration ============

export const migrateToMultiTenant = () => {
  if (localStorage.getItem('multi-tenant-migrated')) return;

  // Create default company
  const defaultCompanyId = generateId();
  const defaultCompany: Company = {
    id: defaultCompanyId,
    slug: 'main',
    name: 'משרד ראשי',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const existingCompanies = readAll<Company>('companies');
  if (existingCompanies.length === 0) {
    localStorage.setItem('companies', JSON.stringify([defaultCompany]));
  } else {
    // Add slug to existing companies that don't have one
    let companiesChanged = false;
    existingCompanies.forEach((company, index) => {
      if (!company.slug) {
        existingCompanies[index].slug = index === 0 ? 'main' : ensureUniqueSlug(generateSlug(company.name));
        companiesChanged = true;
      }
    });
    if (companiesChanged) {
      localStorage.setItem('companies', JSON.stringify(existingCompanies));
    }
  }

  const companyIdToUse = existingCompanies.length > 0 ? existingCompanies[0].id : defaultCompanyId;
  setCurrentCompany(companyIdToUse);

  // Add company_id to all existing entities
  const entityKeys = ['cases', 'clients', 'invoices', 'events', 'documents', 'cashFlowEntries', 'budgetItems'];
  entityKeys.forEach(key => {
    const items = readAll<any>(key);
    let changed = false;
    items.forEach((item: any) => {
      if (!item.company_id) {
        item.company_id = companyIdToUse;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(key, JSON.stringify(items));
    }
  });

  localStorage.setItem('multi-tenant-migrated', 'true');
  console.log('Multi-tenant migration completed');
};

// ============ Fix Case Numbers ============

export const fixCaseNumbers = () => {
  const cases = readAll<Case>('cases');
  let hasChanges = false;

  const casesToFix = cases.filter(c => {
    const numId = parseInt(c.id);
    return isNaN(numId) || numId < 1000;
  });

  if (casesToFix.length > 0) {
    let nextNumber = 1000;

    const validNumbers = cases
      .map(c => parseInt(c.id))
      .filter(num => !isNaN(num) && num >= 1000)
      .sort((a, b) => b - a);

    if (validNumbers.length > 0) {
      nextNumber = validNumbers[0] + 1;
    }

    casesToFix.forEach(caseToFix => {
      caseToFix.id = nextNumber.toString();
      caseToFix.updatedAt = new Date().toISOString();
      nextNumber++;
      hasChanges = true;
    });

    if (hasChanges) {
      localStorage.setItem('cases', JSON.stringify(cases));
      console.log(`Fixed ${casesToFix.length} case numbers to start from 1000+`);
    }
  }
};

// ============ Initialize Sample Data ============

export const initializeSampleData = () => {
  // Run migration first
  migrateToMultiTenant();

  // Fix existing case numbers
  fixCaseNumbers();

  // Initialize cases
  if (getCases().length === 0) {
    caseCounter = 1000;

    const sampleCases: Omit<Case, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'תביעת נזיקין - יוסף אברהם',
        client: 'יוסף אברהם',
        caseType: 'civil',
        priority: 'high',
        description: 'תביעה בגין תאונת דרכים',
        estimatedDuration: '6 חודשים',
        budget: '15000',
        status: 'בטיפול'
      },
      {
        title: 'הסכם מקרקעין - משפחת לוי',
        client: 'משפחת לוי',
        caseType: 'real-estate',
        priority: 'medium',
        description: 'הכנת הסכם מכירה לדירה',
        estimatedDuration: '2 חודשים',
        budget: '8000',
        status: 'בהמתנה'
      }
    ];

    sampleCases.forEach(caseData => addCase(caseData));
  }

  // Initialize clients
  if (getClients().length === 0) {
    const sampleClients: Omit<Client, 'id' | 'company_id' | 'createdAt' | 'updatedAt' | 'activeCases'>[] = [
      {
        name: 'יוסף אברהם',
        email: 'yosef@email.com',
        phone: '050-1234567',
        idNumber: '123456789',
        address: 'רחוב הרצל 15',
        city: 'תל אביב',
        postalCode: '12345',
        clientType: 'individual',
        notes: 'לקוח קבוע',
        status: 'פעיל'
      },
      {
        name: 'משפחת לוי',
        email: 'levi@email.com',
        phone: '050-9876543',
        idNumber: '987654321',
        address: 'רחוב ויצמן 8',
        city: 'ירושלים',
        postalCode: '54321',
        clientType: 'individual',
        notes: 'משפחה עם מספר תיקים',
        status: 'פעיל'
      }
    ];

    sampleClients.forEach(clientData => addClient(clientData));
  }

  // Initialize sample documents
  if (getDocuments().length === 0) {
    const cases = getCases();
    if (cases.length > 0) {
      const sampleDocuments: Omit<Document, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>[] = [
        {
          title: 'חוזה שכירות דירה',
          category: 'contract',
          client: 'יוסף אברהם',
          case: cases[0].id,
          description: 'חוזה שכירות לדירת 3 חדרים בתל אביב',
          tags: 'חוזה, שכירות, דירה',
          fileName: 'lease_agreement.pdf',
          fileSize: '2.5 MB',
          fileType: 'PDF',
          status: 'פעיל'
        },
        {
          title: 'תמונות נזק לרכב',
          category: 'evidence',
          client: 'יוסף אברהם',
          case: cases[0].id,
          description: 'תמונות המתעדות נזקים לרכב בעקבות התאונה',
          tags: 'ראיות, תאונה, נזק',
          fileName: 'car_damage_photos.jpg',
          fileSize: '8.2 MB',
          fileType: 'תמונה',
          status: 'פעיל'
        }
      ];

      if (cases.length > 1) {
        sampleDocuments.push({
          title: 'הסכם מכירת דירה',
          category: 'contract',
          client: 'משפחת לוי',
          case: cases[1].id,
          description: 'הסכם למכירת דירת 4 חדרים בירושלים',
          tags: 'הסכם, מכירה, דירה',
          fileName: 'sale_agreement.docx',
          fileSize: '1.8 MB',
          fileType: 'Word',
          status: 'פעיל'
        });
      }

      sampleDocuments.forEach(docData => addDocument(docData));
    }
  }

  // Initialize sample cash flow entries
  if (getCashFlowEntries().length === 0) {
    const sampleCashFlow: Omit<CashFlowEntry, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>[] = [
      {
        type: 'income',
        category: 'שכר טרחה',
        description: 'שכר טרחה - תיק אברהם',
        amount: 15000,
        date: '2024-07-15',
        isRecurring: false,
        client: 'יוסף אברהם',
        status: 'expected',
        notes: 'תשלום צפוי לאחר סיום הליך',
      },
      {
        type: 'income',
        category: 'ריטיינר',
        description: 'ריטיינר חודשי - משפחת לוי',
        amount: 5000,
        date: '2024-07-01',
        isRecurring: true,
        recurringFrequency: 'monthly',
        client: 'משפחת לוי',
        status: 'confirmed',
        notes: 'הסכם ריטיינר שנתי',
      },
      {
        type: 'expense',
        category: 'שכירות',
        description: 'שכירות משרד חודשית',
        amount: 8000,
        date: '2024-07-01',
        isRecurring: true,
        recurringFrequency: 'monthly',
        status: 'paid',
        notes: '',
      },
      {
        type: 'expense',
        category: 'טכנולוגיה',
        description: 'רישיון תוכנה שנתי',
        amount: 3600,
        date: '2024-08-01',
        isRecurring: true,
        recurringFrequency: 'yearly',
        status: 'expected',
        notes: 'חידוש רישיון Legal Nexus',
      },
    ];
    sampleCashFlow.forEach(entry => addCashFlowEntry(entry));
  }

  // Initialize sample budget items
  if (getBudgetItems().length === 0) {
    const sampleBudget: Omit<BudgetItem, 'id' | 'company_id' | 'createdAt' | 'updatedAt'>[] = [
      {
        category: 'משכורות ושכר',
        description: 'שכר עובדים ומזכירות',
        plannedAmount: 45000,
        actualAmount: 44200,
        period: '2024-07',
        periodType: 'monthly',
        notes: '',
      },
      {
        category: 'שכירות ואחזקה',
        description: 'שכירות משרד + ועד בית',
        plannedAmount: 9000,
        actualAmount: 8500,
        period: '2024-07',
        periodType: 'monthly',
        notes: '',
      },
      {
        category: 'טכנולוגיה ותוכנה',
        description: 'רישיונות תוכנה ואינטרנט',
        plannedAmount: 2500,
        actualAmount: 2800,
        period: '2024-07',
        periodType: 'monthly',
        notes: 'חריגה בגלל רישיון חדש',
      },
      {
        category: 'שיווק ופרסום',
        description: 'קידום דיגיטלי ופרסום',
        plannedAmount: 5000,
        actualAmount: 3200,
        period: '2024-07',
        periodType: 'monthly',
        notes: '',
      },
      {
        category: 'ביטוחים',
        description: 'ביטוח אחריות מקצועית',
        plannedAmount: 1500,
        actualAmount: 1500,
        period: '2024-07',
        periodType: 'monthly',
        notes: '',
      },
    ];
    sampleBudget.forEach(item => addBudgetItem(item));
  }

  // Initialize default admin user if no mock users exist
  initializeDefaultAdmin();
};

export const initializeDefaultAdmin = () => {
  const existingUsers = JSON.parse(localStorage.getItem('mock-users') || '[]');

  // Ensure lironbek88@gmail.com always exists as admin
  const hasLiron = existingUsers.some((u: any) => u.email === 'lironbek88@gmail.com');
  if (!hasLiron && existingUsers.length > 0) {
    const now = new Date().toISOString();
    const lironId = generateId();
    existingUsers.push({
      id: lironId,
      email: 'lironbek88@gmail.com',
      full_name: 'לירון בק',
      role: 'admin',
      phone: '',
      department: 'הנהלה',
      is_active: true,
      created_at: now,
      updated_at: now
    });
    localStorage.setItem('mock-users', JSON.stringify(existingUsers));

    // Store password
    const mockPasswords = JSON.parse(localStorage.getItem('mock-passwords') || '{}');
    mockPasswords['lironbek88@gmail.com'] = '123456';
    localStorage.setItem('mock-passwords', JSON.stringify(mockPasswords));

    // Create admin permissions
    const existingPermissions = JSON.parse(localStorage.getItem('mock-permissions') || '[]');
    existingPermissions.push({
      id: generateId(),
      user_id: lironId,
      can_view_dashboard: true,
      can_view_cases: true, can_edit_cases: true, can_delete_cases: true,
      can_view_clients: true, can_edit_clients: true,
      can_view_reports: true, can_edit_reports: true,
      can_view_documents: true, can_edit_documents: true,
      can_view_calendar: true, can_edit_calendar: true,
      can_view_billing: true, can_edit_billing: true,
      can_view_time_tracking: true, can_edit_time_tracking: true,
      can_view_legal_library: true, can_edit_legal_library: true,
      can_view_disability_calculator: true, can_edit_disability_calculator: true,
      can_view_cash_flow: true, can_edit_cash_flow: true,
      can_view_budget: true, can_edit_budget: true,
      can_manage_users: true, can_manage_permission_groups: true,
      can_manage_system_settings: true, can_view_audit_logs: true,
      created_at: now, updated_at: now
    });
    localStorage.setItem('mock-permissions', JSON.stringify(existingPermissions));

    // Assign to default company
    const companies = getCompanies();
    if (companies.length > 0) {
      addUserCompanyAssignment(lironId, companies[0].id, 'admin', true);
    }
  }

  if (existingUsers.length > 0) return; // Users already exist

  const adminId = generateId();
  const now = new Date().toISOString();

  const defaultAdmin = {
    id: adminId,
    email: 'lironbek88@gmail.com',
    full_name: 'לירון בק',
    role: 'admin',
    phone: '',
    department: 'הנהלה',
    is_active: true,
    created_at: now,
    updated_at: now
  };

  localStorage.setItem('mock-users', JSON.stringify([defaultAdmin]));

  // Store default password
  const mockPasswords = JSON.parse(localStorage.getItem('mock-passwords') || '{}');
  mockPasswords['lironbek88@gmail.com'] = '123456';
  localStorage.setItem('mock-passwords', JSON.stringify(mockPasswords));

  // Create admin permissions
  const adminPermissions = {
    id: generateId(),
    user_id: adminId,
    can_view_dashboard: true,
    can_view_cases: true, can_edit_cases: true, can_delete_cases: true,
    can_view_clients: true, can_edit_clients: true,
    can_view_reports: true, can_edit_reports: true,
    can_view_documents: true, can_edit_documents: true,
    can_view_calendar: true, can_edit_calendar: true,
    can_view_billing: true, can_edit_billing: true,
    can_view_time_tracking: true, can_edit_time_tracking: true,
    can_view_legal_library: true, can_edit_legal_library: true,
    can_view_disability_calculator: true, can_edit_disability_calculator: true,
    can_view_cash_flow: true, can_edit_cash_flow: true,
    can_view_budget: true, can_edit_budget: true,
    can_manage_users: true, can_manage_permission_groups: true,
    can_manage_system_settings: true, can_view_audit_logs: true,
    created_at: now, updated_at: now
  };
  localStorage.setItem('mock-permissions', JSON.stringify([adminPermissions]));

  // Assign admin to default company
  const companies = getCompanies();
  if (companies.length > 0) {
    addUserCompanyAssignment(adminId, companies[0].id, 'admin', true);
  }
};
