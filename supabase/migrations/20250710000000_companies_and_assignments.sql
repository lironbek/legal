-- Legal Nexus - Companies & User-Company Assignments
-- Multi-tenant organization management

-- ============================================
-- Companies Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_active ON public.companies(is_active);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- User-Company Assignments Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_company_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'lawyer', 'assistant', 'viewer')) NOT NULL,
  is_primary BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_uca_user ON public.user_company_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_company ON public.user_company_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_uca_primary ON public.user_company_assignments(is_primary);

DROP TRIGGER IF EXISTS update_uca_updated_at ON public.user_company_assignments;
CREATE TRIGGER update_uca_updated_at
  BEFORE UPDATE ON public.user_company_assignments
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- ============================================
-- Helper function: check if user has access to a company
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Service role always has access
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN true;
  END IF;

  -- Check if user is admin (via profiles table)
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- Check user-company assignment
  RETURN EXISTS (
    SELECT 1 FROM public.user_company_assignments
    WHERE user_id = auth.uid() AND company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS Policies for companies
-- ============================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Everyone can read active companies (needed for login page company lookup)
CREATE POLICY "Anyone can read active companies" ON public.companies
  FOR SELECT USING (is_active = true);

-- Service role and admins can do everything
CREATE POLICY "Service role full access on companies" ON public.companies
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- RLS Policies for user_company_assignments
-- ============================================

ALTER TABLE public.user_company_assignments ENABLE ROW LEVEL SECURITY;

-- Users can see their own assignments
CREATE POLICY "Users can view own assignments" ON public.user_company_assignments
  FOR SELECT USING (user_id = auth.uid());

-- Admins can see all assignments
CREATE POLICY "Admins can view all assignments" ON public.user_company_assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role and admins can manage assignments
CREATE POLICY "Service role full access on assignments" ON public.user_company_assignments
  FOR ALL USING (
    current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Seed data: Default companies
-- ============================================

-- Insert "משרד ראשי" (Main Office) if not exists
INSERT INTO public.companies (id, slug, name, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'main',
  'משרד ראשי',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Insert "שפרגר ושות'" from global_firm_settings data
INSERT INTO public.companies (id, slug, name, legal_name, email, phone, address, website, logo_url, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'sperger-law',
  'שפרגר ושות׳ משרד עורכי דין',
  'שפרגר ושות׳ משרד עורכי דין',
  'ts@sperger-law.co.il',
  '046208110',
  'אקליטופס 1 רמת ישי',
  '/sperger-law.co.il',
  'https://lbaqrfbobfomkcfmfahq.supabase.co/storage/v1/object/public/firm-logos/firm-logo-1752326111878.png',
  true
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Assign admin user to both companies
-- ============================================

-- Assign lironbek88@gmail.com (admin) to both companies
INSERT INTO public.user_company_assignments (user_id, company_id, role, is_primary)
VALUES (
  '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
  'a0000000-0000-0000-0000-000000000001',
  'admin',
  true
) ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO public.user_company_assignments (user_id, company_id, role, is_primary)
VALUES (
  '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
  'a0000000-0000-0000-0000-000000000002',
  'admin',
  false
) ON CONFLICT (user_id, company_id) DO NOTHING;

-- Assign lior@sperger-law.co.il to Sperger company
INSERT INTO public.user_company_assignments (user_id, company_id, role, is_primary)
VALUES (
  '08a4212e-b3be-438e-9ab1-5eb67049573f',
  'a0000000-0000-0000-0000-000000000002',
  'viewer',
  true
) ON CONFLICT (user_id, company_id) DO NOTHING;

SELECT 'Companies and assignments tables created successfully!' as result;
