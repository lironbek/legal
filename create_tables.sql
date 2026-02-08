-- Legal Nexus Israel - Database Setup
-- Run this script in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('client', 'assistant', 'lawyer', 'admin')) NOT NULL DEFAULT 'client',
  phone TEXT,
  department TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  birth_date DATE,
  id_number TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create permission_groups table
CREATE TABLE IF NOT EXISTS public.permission_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  can_view_dashboard BOOLEAN DEFAULT true,
  can_view_cases BOOLEAN DEFAULT false,
  can_edit_cases BOOLEAN DEFAULT false,
  can_delete_cases BOOLEAN DEFAULT false,
  can_view_clients BOOLEAN DEFAULT false,
  can_edit_clients BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_edit_reports BOOLEAN DEFAULT false,
  can_view_documents BOOLEAN DEFAULT false,
  can_edit_documents BOOLEAN DEFAULT false,
  can_view_calendar BOOLEAN DEFAULT false,
  can_edit_calendar BOOLEAN DEFAULT false,
  can_view_billing BOOLEAN DEFAULT false,
  can_edit_billing BOOLEAN DEFAULT false,
  can_view_time_tracking BOOLEAN DEFAULT false,
  can_edit_time_tracking BOOLEAN DEFAULT false,
  can_view_legal_library BOOLEAN DEFAULT false,
  can_edit_legal_library BOOLEAN DEFAULT false,
  can_view_disability_calculator BOOLEAN DEFAULT false,
  can_edit_disability_calculator BOOLEAN DEFAULT false,
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_permission_groups BOOLEAN DEFAULT false,
  can_manage_system_settings BOOLEAN DEFAULT false,
  can_view_audit_logs BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create policies for permission_groups (allow all for now)
CREATE POLICY "Permission groups are viewable by everyone" ON public.permission_groups
  FOR SELECT USING (true);

CREATE POLICY "Permission groups can be inserted by anyone" ON public.permission_groups
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Permission groups can be updated by anyone" ON public.permission_groups
  FOR UPDATE USING (true);

-- Create policies for user_permissions (allow all for now)
CREATE POLICY "User permissions are viewable by everyone" ON public.user_permissions
  FOR SELECT USING (true);

CREATE POLICY "User permissions can be inserted by anyone" ON public.user_permissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "User permissions can be updated by anyone" ON public.user_permissions
  FOR UPDATE USING (true);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'client');
  
  -- Create default permissions for the user
  INSERT INTO public.user_permissions (user_id, can_view_dashboard)
  VALUES (NEW.id, true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_permissions_updated_at ON public.user_permissions;
CREATE TRIGGER update_user_permissions_updated_at 
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_permission_groups_updated_at ON public.permission_groups;
CREATE TRIGGER update_permission_groups_updated_at 
  BEFORE UPDATE ON public.permission_groups
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Insert default permission groups
INSERT INTO public.permission_groups (name, description) VALUES
  ('מנהלים', 'הרשאות מלאות למערכת'),
  ('עורכי דין', 'הרשאות לעריכת תיקים ולקוחות'),
  ('עוזרים', 'הרשאות מוגבלות לצפייה ועריכה בסיסית'),
  ('לקוחות', 'הרשאות צפייה בלבד')
ON CONFLICT DO NOTHING;

-- ============================================
-- Multi-Tenant Architecture Tables
-- ============================================

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_companies_is_active ON public.companies(is_active);

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create user_company_assignments table
CREATE TABLE IF NOT EXISTS public.user_company_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'lawyer', 'assistant', 'viewer')) NOT NULL DEFAULT 'viewer',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_uca_user_id ON public.user_company_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_company_id ON public.user_company_assignments(company_id);

DROP TRIGGER IF EXISTS update_user_company_assignments_updated_at ON public.user_company_assignments;
CREATE TRIGGER update_user_company_assignments_updated_at
  BEFORE UPDATE ON public.user_company_assignments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create business data tables with company_id

CREATE TABLE IF NOT EXISTS public.cases (
  id TEXT PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  client TEXT,
  case_type TEXT,
  priority TEXT,
  description TEXT,
  estimated_duration TEXT,
  budget TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_company_id ON public.cases(company_id);

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  client_type TEXT,
  notes TEXT,
  status TEXT,
  active_cases INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_company_id ON public.clients(company_id);

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  client TEXT,
  invoice_number TEXT NOT NULL,
  issue_date TEXT,
  due_date TEXT,
  amount NUMERIC(12, 2),
  status TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type TEXT,
  date TEXT,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  client TEXT,
  priority TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_company_id ON public.events(company_id);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  client TEXT,
  case_id TEXT,
  description TEXT,
  tags TEXT,
  file_name TEXT,
  file_size TEXT,
  file_type TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);

CREATE TABLE IF NOT EXISTS public.cash_flow_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT,
  description TEXT,
  amount NUMERIC(12, 2),
  date TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('monthly', 'quarterly', 'yearly')),
  client TEXT,
  case_ref TEXT,
  status TEXT CHECK (status IN ('expected', 'confirmed', 'received', 'paid')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_entries_company_id ON public.cash_flow_entries(company_id);

CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category TEXT,
  description TEXT,
  planned_amount NUMERIC(12, 2),
  actual_amount NUMERIC(12, 2),
  period TEXT,
  period_type TEXT CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budget_items_company_id ON public.budget_items(company_id);

-- RLS for companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view companies they are assigned to" ON public.companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_company_assignments
      WHERE user_company_assignments.company_id = companies.id
        AND user_company_assignments.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert companies" ON public.companies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update companies" ON public.companies
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete companies" ON public.companies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS for user_company_assignments
ALTER TABLE public.user_company_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON public.user_company_assignments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage assignments" ON public.user_company_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- RLS for business data tables (company-scoped)
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- Helper function to check company access
CREATE OR REPLACE FUNCTION public.user_has_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_company_assignments
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply company-scoped RLS to all business tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['cases', 'clients', 'invoices', 'events', 'documents', 'cash_flow_entries', 'budget_items'])
  LOOP
    EXECUTE format('
      CREATE POLICY "Company scoped select on %I" ON public.%I
        FOR SELECT USING (public.user_has_company_access(company_id));
      CREATE POLICY "Company scoped insert on %I" ON public.%I
        FOR INSERT WITH CHECK (public.user_has_company_access(company_id));
      CREATE POLICY "Company scoped update on %I" ON public.%I
        FOR UPDATE USING (public.user_has_company_access(company_id));
      CREATE POLICY "Company scoped delete on %I" ON public.%I
        FOR DELETE USING (public.user_has_company_access(company_id));
    ', tbl, tbl, tbl, tbl, tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Success message
SELECT 'Database setup with multi-tenant support completed successfully!' as result;
