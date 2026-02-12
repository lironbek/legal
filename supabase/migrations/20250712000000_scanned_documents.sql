-- Legal Nexus - Document Scanning + WhatsApp Integration
-- Run this in Supabase SQL Editor

-- ============================================
-- Scanned Documents Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.scanned_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),

  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,

  -- Extracted metadata
  document_type TEXT, -- contract, pleading, court_decision, testimony, invoice, correspondence, power_of_attorney, id_document, other
  document_date DATE,
  title TEXT,
  case_number TEXT,
  court_name TEXT,
  parties JSONB DEFAULT '[]',
  summary TEXT,
  key_dates JSONB DEFAULT '[]',
  amounts JSONB DEFAULT '[]',
  references_list JSONB DEFAULT '[]',
  signatures JSONB DEFAULT '[]',
  notes TEXT,
  raw_text_excerpt TEXT,
  confidence TEXT,

  -- Processing metadata
  raw_extracted_data JSONB,
  claude_response JSONB,
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'needs_verification' CHECK (status IN ('processing', 'needs_verification', 'verified', 'error')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Source tracking
  source TEXT DEFAULT 'web' CHECK (source IN ('web', 'whatsapp')),
  whatsapp_chat_id TEXT,
  whatsapp_message_id TEXT UNIQUE,
  whatsapp_sender_name TEXT,

  -- Links to existing entities
  linked_case_id TEXT,
  linked_client_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scanned_docs_company ON public.scanned_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_status ON public.scanned_documents(status);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_type ON public.scanned_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_case ON public.scanned_documents(linked_case_id);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_source ON public.scanned_documents(source);
CREATE INDEX IF NOT EXISTS idx_scanned_docs_wa_msg ON public.scanned_documents(whatsapp_message_id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_scanned_documents_updated_at ON public.scanned_documents;
CREATE TRIGGER update_scanned_documents_updated_at
  BEFORE UPDATE ON public.scanned_documents
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- RLS
ALTER TABLE public.scanned_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company scoped select on scanned_documents" ON public.scanned_documents
  FOR SELECT USING (public.user_has_company_access(company_id));
CREATE POLICY "Company scoped insert on scanned_documents" ON public.scanned_documents
  FOR INSERT WITH CHECK (public.user_has_company_access(company_id));
CREATE POLICY "Company scoped update on scanned_documents" ON public.scanned_documents
  FOR UPDATE USING (public.user_has_company_access(company_id));
CREATE POLICY "Company scoped delete on scanned_documents" ON public.scanned_documents
  FOR DELETE USING (public.user_has_company_access(company_id));

-- ============================================
-- WhatsApp Authorization on Profiles
-- ============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_authorized BOOLEAN DEFAULT false;

-- ============================================
-- WhatsApp Pending Org Selection
-- ============================================

CREATE TABLE IF NOT EXISTS public.whatsapp_pending_org_selection (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  organizations JSONB NOT NULL, -- [{id, name}]
  message_id TEXT,
  file_storage_path TEXT,
  media_type TEXT,
  file_name TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes') NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wa_pending_chat ON public.whatsapp_pending_org_selection(chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_pending_expires ON public.whatsapp_pending_org_selection(expires_at);

-- ============================================
-- Storage Bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

SELECT 'Document scanning tables created successfully!' as result;
