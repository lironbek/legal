-- =============================================================================
-- Migration: Create tort_claims table for tort/negligence claim document module
-- =============================================================================

-- Enum: claim type
CREATE TYPE tort_claim_type AS ENUM (
  'general_negligence',       -- רשלנות כללית
  'road_accident',            -- תאונות דרכים (פלת"ד)
  'medical_malpractice',      -- רשלנות רפואית
  'professional_malpractice', -- רשלנות מקצועית
  'property_damage',          -- נזק רכוש
  'defamation',               -- לשון הרע
  'assault',                  -- תקיפה
  'work_accident',            -- תאונת עבודה
  'product_liability',        -- אחריות מוצר
  'other'
);

-- Enum: court type
CREATE TYPE tort_court_type AS ENUM (
  'magistrate',  -- בית משפט השלום
  'district'     -- בית המשפט המחוזי
);

-- Enum: claim status
CREATE TYPE tort_claim_status AS ENUM (
  'draft',     -- טיוטה
  'review',    -- בבדיקה
  'approved',  -- אושר
  'filed'      -- הוגש
);

-- Enum: damage head type
CREATE TYPE tort_damage_type AS ENUM (
  'pain_suffering',          -- כאב וסבל
  'medical_expenses_past',   -- הוצאות רפואיות עבר
  'medical_expenses_future', -- הוצאות רפואיות עתיד
  'lost_wages_past',         -- אובדן שכר עבר
  'lost_earning_capacity',   -- אובדן כושר השתכרות
  'property_damage',         -- נזק רכוש
  'loss_of_amenity',         -- אובדן הנאות חיים
  'care_assistance',         -- עזרת הזולת
  'psychological_damage',    -- נזק נפשי
  'bereavement',             -- תמיכה בתלויים
  'travel_expenses',         -- הוצאות נסיעה
  'other'
);

-- ============================================================================
-- Main table: tort_claims
-- ============================================================================
CREATE TABLE IF NOT EXISTS tort_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id         UUID REFERENCES cases(id) ON DELETE SET NULL,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          tort_claim_status NOT NULL DEFAULT 'draft',

  -- ---- Claim classification ----
  claim_type      tort_claim_type NOT NULL DEFAULT 'general_negligence',
  court_type      tort_court_type NOT NULL DEFAULT 'magistrate',
  court_name      TEXT,
  filing_date     DATE,
  incident_date   DATE NOT NULL,
  statute_of_limitations_date DATE,
  incident_location TEXT,
  incident_description TEXT,

  -- ---- Plaintiff ----
  plaintiff_name    TEXT NOT NULL,
  plaintiff_id      TEXT,           -- ת.ז.
  plaintiff_address TEXT,
  plaintiff_city    TEXT,
  plaintiff_contact JSONB DEFAULT '{}',
  -- { phone, email, secondary_phone }

  plaintiff_attorney TEXT,

  -- ---- Defendant(s) ----
  defendants JSONB NOT NULL DEFAULT '[]',
  -- Array of: { id, name, idNumber, address, city, type, role, insurerName, policyNumber, attorney }

  defendant_insurer TEXT,           -- Primary insurer shortcut

  -- ---- Tort elements (יסודות העוולה) ----
  tort_elements JSONB DEFAULT '{}',
  -- {
  --   duty_of_care: string,
  --   breach_description: string,
  --   causation: string,
  --   damages_description: string,
  --   contributing_negligence: string
  -- }

  -- ---- Damage heads (ראשי נזק) ----
  damage_heads JSONB DEFAULT '[]',
  -- Array of: {
  --   type: tort_damage_type,
  --   amount_estimated: number,
  --   description: string,
  --   evidence_reference: string
  -- }

  total_claim_amount NUMERIC(12, 2) DEFAULT 0,

  -- ---- Attachments ----
  attachments JSONB DEFAULT '[]',
  -- Array of: { type, filename, url, description, uploaded_at }

  -- ---- Generated documents ----
  generated_draft   TEXT,
  final_document    TEXT,
  docx_url          TEXT,
  pdf_url           TEXT,

  -- ---- Legal arguments (from AI or manual) ----
  legal_arguments   TEXT,
  causes_of_action  TEXT[] DEFAULT '{}',
  relevant_laws     TEXT[] DEFAULT '{}',
  requested_remedies TEXT,

  -- ---- Road accident specific (פלת"ד) ----
  vehicle_details JSONB DEFAULT NULL,
  -- { license_plate, make, model, year }
  insurance_policy_number TEXT,
  police_report_number    TEXT,
  is_karnitah             BOOLEAN DEFAULT FALSE,

  -- ---- Medical malpractice specific ----
  medical_facility         TEXT,
  treating_physician       TEXT,
  treatment_dates          JSONB DEFAULT NULL,
  -- { start: date, end: date }
  medical_expert_opinion   BOOLEAN DEFAULT FALSE,
  waiver_of_medical_confidentiality BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_tort_claims_company ON tort_claims(company_id);
CREATE INDEX idx_tort_claims_case ON tort_claims(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX idx_tort_claims_status ON tort_claims(status);
CREATE INDEX idx_tort_claims_claim_type ON tort_claims(claim_type);
CREATE INDEX idx_tort_claims_created_by ON tort_claims(created_by);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_tort_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tort_claims_updated_at
  BEFORE UPDATE ON tort_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_tort_claims_updated_at();

-- RLS
ALTER TABLE tort_claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see tort claims from their company
CREATE POLICY "Users can view own company tort claims"
  ON tort_claims FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_company_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert tort claims for their company
CREATE POLICY "Users can create tort claims for own company"
  ON tort_claims FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_company_assignments
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Policy: Users can update tort claims from their company
CREATE POLICY "Users can update own company tort claims"
  ON tort_claims FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can delete tort claims from their company
CREATE POLICY "Users can delete own company tort claims"
  ON tort_claims FOR DELETE
  USING (
    company_id IN (
      SELECT company_id FROM user_company_assignments
      WHERE user_id = auth.uid()
    )
  );
