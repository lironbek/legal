// Data Manager - ניהול נתונים עם Local Storage
// בעתיד זה יוחלף ב-Supabase

export interface Case {
  id: string;
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

// Generate unique ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Generate case number starting from 1000
let caseCounter = 1000;
const generateCaseNumber = (): string => {
  const cases = getCases();
  if (cases.length === 0) {
    caseCounter = 1000;
  } else {
    // Find the highest existing case number
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

// Cases
export const getCases = (): Case[] => {
  const cases = localStorage.getItem('cases');
  return cases ? JSON.parse(cases) : [];
};

export const addCase = (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>): Case => {
  const cases = getCases();
  const newCase: Case = {
    ...caseData,
    id: generateCaseNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  cases.push(newCase);
  localStorage.setItem('cases', JSON.stringify(cases));
  return newCase;
};

export const updateCase = (id: string, updates: Partial<Case>): Case | null => {
  const cases = getCases();
  const index = cases.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  cases[index] = {
    ...cases[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem('cases', JSON.stringify(cases));
  return cases[index];
};

export const deleteCase = (id: string): boolean => {
  const cases = getCases();
  const filteredCases = cases.filter(c => c.id !== id);
  
  if (filteredCases.length === cases.length) return false;
  
  localStorage.setItem('cases', JSON.stringify(filteredCases));
  return true;
};

// Clients
export const getClients = (): Client[] => {
  const clients = localStorage.getItem('clients');
  return clients ? JSON.parse(clients) : [];
};

export const addClient = (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'activeCases'>): Client => {
  const clients = getClients();
  const newClient: Client = {
    ...clientData,
    id: generateId(),
    activeCases: 0,
    status: 'פעיל',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  clients.push(newClient);
  localStorage.setItem('clients', JSON.stringify(clients));
  return newClient;
};

export const updateClient = (id: string, updates: Partial<Client>): Client | null => {
  const clients = getClients();
  const index = clients.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  clients[index] = {
    ...clients[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem('clients', JSON.stringify(clients));
  return clients[index];
};

export const deleteClient = (id: string): boolean => {
  const clients = getClients();
  const filteredClients = clients.filter(c => c.id !== id);
  
  if (filteredClients.length === clients.length) return false;
  
  localStorage.setItem('clients', JSON.stringify(filteredClients));
  return true;
};

// Invoices
export const getInvoices = (): Invoice[] => {
  const invoices = localStorage.getItem('invoices');
  return invoices ? JSON.parse(invoices) : [];
};

export const addInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
  const invoices = getInvoices();
  const newInvoice: Invoice = {
    ...invoiceData,
    id: generateId(),
    status: 'חדש',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  invoices.push(newInvoice);
  localStorage.setItem('invoices', JSON.stringify(invoices));
  return newInvoice;
};

// Events
export const getEvents = (): Event[] => {
  const events = localStorage.getItem('events');
  return events ? JSON.parse(events) : [];
};

export const addEvent = (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event => {
  const events = getEvents();
  const newEvent: Event = {
    ...eventData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  events.push(newEvent);
  localStorage.setItem('events', JSON.stringify(events));
  return newEvent;
};

// Documents
export const getDocuments = (): Document[] => {
  const documents = localStorage.getItem('documents');
  return documents ? JSON.parse(documents) : [];
};

export const addDocument = (documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>): Document => {
  const documents = getDocuments();
  const newDocument: Document = {
    ...documentData,
    id: generateId(),
    status: 'פעיל',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  documents.push(newDocument);
  localStorage.setItem('documents', JSON.stringify(documents));
  return newDocument;
};

// Get documents by case ID
export const getDocumentsByCase = (caseId: string): Document[] => {
  const documents = getDocuments();
  return documents.filter(doc => doc.case === caseId);
};

// Update document
export const updateDocument = (id: string, updates: Partial<Document>): Document | null => {
  const documents = getDocuments();
  const index = documents.findIndex(d => d.id === id);
  
  if (index === -1) return null;
  
  documents[index] = {
    ...documents[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  localStorage.setItem('documents', JSON.stringify(documents));
  return documents[index];
};

// Delete document
export const deleteDocument = (id: string): boolean => {
  const documents = getDocuments();
  const filteredDocuments = documents.filter(d => d.id !== id);
  
  if (filteredDocuments.length === documents.length) return false;
  
  localStorage.setItem('documents', JSON.stringify(filteredDocuments));
  return true;
};

// Cash Flow Entries
export const getCashFlowEntries = (): CashFlowEntry[] => {
  const entries = localStorage.getItem('cashFlowEntries');
  return entries ? JSON.parse(entries) : [];
};

export const addCashFlowEntry = (data: Omit<CashFlowEntry, 'id' | 'createdAt' | 'updatedAt'>): CashFlowEntry => {
  const entries = getCashFlowEntries();
  const newEntry: CashFlowEntry = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  localStorage.setItem('cashFlowEntries', JSON.stringify(entries));
  return newEntry;
};

export const updateCashFlowEntry = (id: string, updates: Partial<CashFlowEntry>): CashFlowEntry | null => {
  const entries = getCashFlowEntries();
  const index = entries.findIndex(e => e.id === id);
  if (index === -1) return null;
  entries[index] = { ...entries[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('cashFlowEntries', JSON.stringify(entries));
  return entries[index];
};

export const deleteCashFlowEntry = (id: string): boolean => {
  const entries = getCashFlowEntries();
  const filtered = entries.filter(e => e.id !== id);
  if (filtered.length === entries.length) return false;
  localStorage.setItem('cashFlowEntries', JSON.stringify(filtered));
  return true;
};

// Budget Items
export const getBudgetItems = (): BudgetItem[] => {
  const items = localStorage.getItem('budgetItems');
  return items ? JSON.parse(items) : [];
};

export const addBudgetItem = (data: Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>): BudgetItem => {
  const items = getBudgetItems();
  const newItem: BudgetItem = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.push(newItem);
  localStorage.setItem('budgetItems', JSON.stringify(items));
  return newItem;
};

export const updateBudgetItem = (id: string, updates: Partial<BudgetItem>): BudgetItem | null => {
  const items = getBudgetItems();
  const index = items.findIndex(i => i.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('budgetItems', JSON.stringify(items));
  return items[index];
};

export const deleteBudgetItem = (id: string): boolean => {
  const items = getBudgetItems();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length === items.length) return false;
  localStorage.setItem('budgetItems', JSON.stringify(filtered));
  return true;
};

// Fix existing case numbers to start from 1000
export const fixCaseNumbers = () => {
  const cases = getCases();
  let hasChanges = false;
  
  // Find cases with non-numeric IDs or IDs below 1000
  const casesToFix = cases.filter(c => {
    const numId = parseInt(c.id);
    return isNaN(numId) || numId < 1000;
  });
  
  if (casesToFix.length > 0) {
    let nextNumber = 1000;
    
    // Find the highest existing valid case number
    const validNumbers = cases
      .map(c => parseInt(c.id))
      .filter(num => !isNaN(num) && num >= 1000)
      .sort((a, b) => b - a);
    
    if (validNumbers.length > 0) {
      nextNumber = validNumbers[0] + 1;
    }
    
    // Fix the cases that need fixing
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

// Initialize with sample data if empty
export const initializeSampleData = () => {
  // Fix existing case numbers first
  fixCaseNumbers();
  
  // Initialize cases
  if (getCases().length === 0) {
    // Reset counter for initial data
    caseCounter = 1000;
    
    const sampleCases: Omit<Case, 'id' | 'createdAt' | 'updatedAt'>[] = [
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
    const sampleClients: Omit<Client, 'id' | 'createdAt' | 'updatedAt' | 'activeCases'>[] = [
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
      const sampleDocuments: Omit<Document, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          title: 'חוזה שכירות דירה',
          category: 'contract',
          client: 'יוסף אברהם',
          case: cases[0].id, // First case
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
          case: cases[0].id, // First case
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
          case: cases[1].id, // Second case
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
    const sampleCashFlow: Omit<CashFlowEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
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
    const sampleBudget: Omit<BudgetItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
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
};

