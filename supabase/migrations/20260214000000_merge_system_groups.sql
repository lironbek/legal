-- Merge kanion + mismachei-mishloach under same system group "ניהול שופינה"
UPDATE public.companies SET system_group = 'ניהול שופינה' WHERE slug = 'mismachei-mishloach';

-- Add selected_system column for tracking system name in company step
ALTER TABLE public.whatsapp_pending_org_selection
  ADD COLUMN IF NOT EXISTS selected_system TEXT;

SELECT 'System groups merged + selected_system column added!' as result;
