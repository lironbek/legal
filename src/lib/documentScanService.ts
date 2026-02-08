import { supabase } from './supabase';
import { getCurrentCompany } from './dataManager';

export interface ScannedDocumentData {
  document_type: string;
  document_date: string | null;
  case_number: string | null;
  court_name: string | null;
  parties: { name: string; role: string; id_number?: string | null }[];
  title: string;
  summary: string;
  key_dates: { label: string; date: string }[];
  amounts: { label: string; amount: number; currency: string }[];
  references: string[];
  signatures: { name: string; role: string; signed: boolean }[];
  notes: string;
  raw_text_excerpt: string;
  confidence: string;
}

export interface ScannedDocument {
  id: string;
  company_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  document_type: string | null;
  document_date: string | null;
  title: string | null;
  case_number: string | null;
  court_name: string | null;
  parties: any[];
  summary: string | null;
  key_dates: any[];
  amounts: any[];
  references_list: string[];
  signatures: any[];
  notes: string | null;
  raw_text_excerpt: string | null;
  confidence: string | null;
  status: 'processing' | 'needs_verification' | 'verified' | 'error';
  source: 'web' | 'whatsapp';
  linked_case_id: string | null;
  linked_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScanResult {
  success: boolean;
  data?: ScannedDocumentData;
  error?: string;
  documentId?: string;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contract: 'חוזה/הסכם',
  pleading: 'כתב טענות',
  court_decision: 'פסק דין/החלטה',
  testimony: 'עדות/תצהיר',
  invoice: 'חשבונית',
  correspondence: 'התכתבות',
  power_of_attorney: 'ייפוי כוח',
  id_document: 'מסמך זיהוי',
  other: 'אחר',
};

export const getDocumentTypeLabel = (type: string): string => {
  return DOCUMENT_TYPE_LABELS[type] || type;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:xxx;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getMediaType = (file: File): string => {
  const type = file.type;
  if (type === 'application/pdf') return 'application/pdf';
  if (type.startsWith('image/')) return type;
  // Default to png for unknown image types
  return 'image/png';
};

// Mock scan result for development without Supabase
const mockScanDocument = async (file: File): Promise<ScanResult> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  const mockData: ScannedDocumentData = {
    document_type: 'contract',
    document_date: '2024-01-15',
    case_number: null,
    court_name: null,
    parties: [
      { name: 'ישראל ישראלי', role: 'lessor' },
      { name: 'דוד כהן', role: 'lessee' },
    ],
    title: `מסמך סרוק - ${file.name}`,
    summary: 'מסמך לדוגמה שנסרק במצב פיתוח. זהו סיכום אוטומטי של תוכן המסמך.',
    key_dates: [
      { label: 'תאריך חתימה', date: '2024-01-15' },
      { label: 'תאריך תפוגה', date: '2025-01-15' },
    ],
    amounts: [
      { label: 'סכום חודשי', amount: 5000, currency: 'ILS' },
    ],
    references: [],
    signatures: [
      { name: 'ישראל ישראלי', role: 'משכיר', signed: true },
      { name: 'דוד כהן', role: 'שוכר', signed: true },
    ],
    notes: 'מסמך שנסרק במצב Mock - לא נשלח ל-Claude Vision',
    raw_text_excerpt: 'טקסט לדוגמה מתוך המסמך הסרוק...',
    confidence: 'medium',
  };

  return {
    success: true,
    data: mockData,
    documentId: 'mock-' + Date.now().toString(36),
  };
};

export const scanDocument = async (
  file: File,
  companyId?: string,
  userId?: string
): Promise<ScanResult> => {
  const effectiveCompanyId = companyId || getCurrentCompany() || '';

  // If no Supabase, use mock mode
  if (!supabase) {
    console.log('Mock mode: simulating document scan');
    const result = await mockScanDocument(file);

    // Store in localStorage for mock mode
    if (result.success && result.data) {
      const scannedDocs = JSON.parse(localStorage.getItem('scannedDocuments') || '[]');
      const doc: Partial<ScannedDocument> = {
        id: result.documentId!,
        company_id: effectiveCompanyId,
        uploaded_by: userId || null,
        file_name: file.name,
        file_url: '',
        file_type: file.type,
        file_size: file.size,
        document_type: result.data.document_type,
        document_date: result.data.document_date,
        title: result.data.title,
        case_number: result.data.case_number,
        court_name: result.data.court_name,
        parties: result.data.parties,
        summary: result.data.summary,
        key_dates: result.data.key_dates,
        amounts: result.data.amounts,
        references_list: result.data.references,
        signatures: result.data.signatures,
        notes: result.data.notes,
        raw_text_excerpt: result.data.raw_text_excerpt,
        confidence: result.data.confidence,
        status: 'needs_verification',
        source: 'web',
        linked_case_id: null,
        linked_client_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      scannedDocs.push(doc);
      localStorage.setItem('scannedDocuments', JSON.stringify(scannedDocs));
    }

    return result;
  }

  try {
    // 1. Upload file to Supabase Storage
    const filePath = `${effectiveCompanyId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      return { success: false, error: `העלאה נכשלה: ${uploadError.message}` };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // 2. Convert to base64 and call edge function
    const base64 = await fileToBase64(file);
    const mediaType = getMediaType(file);

    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    if (!accessToken) {
      return { success: false, error: 'לא מחובר - יש להתחבר למערכת' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/process-legal-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        image_base64: base64,
        media_type: mediaType,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.error || 'עיבוד המסמך נכשל' };
    }

    const extractedData = result.data as ScannedDocumentData;

    // 3. Insert into scanned_documents table
    const { data: insertedDoc, error: insertError } = await supabase
      .from('scanned_documents')
      .insert({
        company_id: effectiveCompanyId,
        uploaded_by: userId,
        file_name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        document_type: extractedData.document_type,
        document_date: extractedData.document_date,
        title: extractedData.title,
        case_number: extractedData.case_number,
        court_name: extractedData.court_name,
        parties: extractedData.parties,
        summary: extractedData.summary,
        key_dates: extractedData.key_dates,
        amounts: extractedData.amounts,
        references_list: extractedData.references,
        signatures: extractedData.signatures,
        notes: extractedData.notes,
        raw_text_excerpt: extractedData.raw_text_excerpt,
        confidence: extractedData.confidence,
        raw_extracted_data: extractedData,
        claude_response: result,
        processed_at: new Date().toISOString(),
        status: 'needs_verification',
        source: 'web',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return {
        success: true,
        data: extractedData,
        error: `המסמך עובד בהצלחה אך לא נשמר: ${insertError.message}`,
      };
    }

    return {
      success: true,
      data: extractedData,
      documentId: insertedDoc?.id,
    };

  } catch (error: any) {
    console.error('Scan error:', error);
    return { success: false, error: error.message || 'שגיאה בסריקת המסמך' };
  }
};

// Get all scanned documents
export const getScannedDocuments = (): ScannedDocument[] => {
  if (!supabase) {
    // Mock mode - read from localStorage
    const docs = JSON.parse(localStorage.getItem('scannedDocuments') || '[]');
    const companyId = getCurrentCompany();
    return companyId ? docs.filter((d: ScannedDocument) => d.company_id === companyId) : docs;
  }

  // For Supabase mode, this would be called via async function
  // but we keep the same pattern as dataManager for consistency
  return [];
};

export const getScannedDocumentsAsync = async (): Promise<ScannedDocument[]> => {
  if (!supabase) {
    return getScannedDocuments();
  }

  const companyId = getCurrentCompany();
  const { data, error } = await supabase
    .from('scanned_documents')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scanned documents:', error);
    return [];
  }

  return data || [];
};

export const updateScannedDocument = async (
  id: string,
  updates: Partial<ScannedDocument>
): Promise<boolean> => {
  if (!supabase) {
    const docs = JSON.parse(localStorage.getItem('scannedDocuments') || '[]');
    const index = docs.findIndex((d: ScannedDocument) => d.id === id);
    if (index === -1) return false;
    docs[index] = { ...docs[index], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem('scannedDocuments', JSON.stringify(docs));
    return true;
  }

  const { error } = await supabase
    .from('scanned_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  return !error;
};

export const deleteScannedDocument = async (id: string): Promise<boolean> => {
  if (!supabase) {
    const docs = JSON.parse(localStorage.getItem('scannedDocuments') || '[]');
    const filtered = docs.filter((d: ScannedDocument) => d.id !== id);
    if (filtered.length === docs.length) return false;
    localStorage.setItem('scannedDocuments', JSON.stringify(filtered));
    return true;
  }

  const { error } = await supabase
    .from('scanned_documents')
    .delete()
    .eq('id', id);

  return !error;
};

// Send document via WhatsApp
export const sendWhatsAppDocument = async (
  phone: string,
  message: string,
  fileUrl?: string,
  fileName?: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) {
    // Mock mode
    console.log('Mock: sending WhatsApp to', phone, message);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    const accessToken = session?.session?.access_token;

    if (!accessToken) {
      return { success: false, error: 'לא מחובר' };
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ phone, message, fileUrl, fileName }),
    });

    return await response.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
