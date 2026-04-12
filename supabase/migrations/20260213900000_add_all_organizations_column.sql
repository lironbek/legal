-- Add all_organizations column for "back" feature in two-step selection
ALTER TABLE public.whatsapp_pending_org_selection
  ADD COLUMN IF NOT EXISTS all_organizations JSONB;

SELECT 'all_organizations column added!' as result;
