-- Extend cases table with fields from imported Excel data
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS case_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS claim_date TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS claim_description TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS insurance_case_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS insurance_handler TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS event_date TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS opening_date TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS civil_case_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS court TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS judge TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS assigned_to TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS detailed_status TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS classification TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS opposing_party TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS policy_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS mandatory_insurer TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS driver_name TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS driver_id_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS third_party_vehicle TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS third_party_policy TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS third_party_insurer TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS third_party_driver TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS third_party_driver_id TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS estimated_fee NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS fee_estimation_date TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS serial_number TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS last_hearing_date TEXT;
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS valuation NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS claim_amount NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS real_damage_amount NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS final_payment NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS agreed_fee NUMERIC(12,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS risk_rate NUMERIC(5,2);
ALTER TABLE public.cases ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.cases(case_number);

-- Extend clients table with additional fields
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS secondary_phone TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS family_status TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS children_under_18 INTEGER;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS health_fund TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS health_fund_branch TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS life_insurance TEXT;
