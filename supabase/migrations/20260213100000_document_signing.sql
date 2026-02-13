-- Document Signing System Tables

-- Main table for signing requests
CREATE TABLE IF NOT EXISTS public.signing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Document info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,

  -- Field definitions (JSON array)
  -- Each: { id, type, label, x, y, width, height, page, required }
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Recipient
  recipient_name TEXT,
  recipient_phone TEXT NOT NULL,
  recipient_email TEXT,

  -- Public access token
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Status
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sent', 'opened', 'signed', 'expired', 'cancelled')),

  -- WhatsApp
  whatsapp_message_id TEXT,
  whatsapp_sent_at TIMESTAMPTZ,

  -- Signed result
  signed_file_url TEXT,
  signed_at TIMESTAMPTZ,
  signer_ip TEXT,
  signer_user_agent TEXT,
  signed_field_values JSONB,

  -- Expiry
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signing_requests_company ON signing_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_signing_requests_token ON signing_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_signing_requests_status ON signing_requests(status);

-- RLS
ALTER TABLE signing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signing requests in their company"
  ON signing_requests FOR SELECT
  USING (user_has_company_access(company_id));

CREATE POLICY "Users can insert signing requests in their company"
  ON signing_requests FOR INSERT
  WITH CHECK (user_has_company_access(company_id));

CREATE POLICY "Users can update signing requests in their company"
  ON signing_requests FOR UPDATE
  USING (user_has_company_access(company_id));

CREATE POLICY "Users can delete signing requests in their company"
  ON signing_requests FOR DELETE
  USING (user_has_company_access(company_id));

-- Audit log
CREATE TABLE IF NOT EXISTS public.signing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signing_request_id UUID NOT NULL REFERENCES signing_requests(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signing_audit_log_request ON signing_audit_log(signing_request_id);

ALTER TABLE signing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their company signing requests"
  ON signing_audit_log FOR SELECT
  USING (
    signing_request_id IN (
      SELECT id FROM signing_requests WHERE user_has_company_access(company_id)
    )
  );

CREATE POLICY "Users can insert audit logs"
  ON signing_audit_log FOR INSERT
  WITH CHECK (
    signing_request_id IN (
      SELECT id FROM signing_requests WHERE user_has_company_access(company_id)
    )
  );

-- Enable realtime for signing_requests
ALTER PUBLICATION supabase_realtime ADD TABLE signing_requests;
