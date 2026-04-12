-- Add step tracking to pending org selection for two-step flow (system → company)
ALTER TABLE public.whatsapp_pending_org_selection
  ADD COLUMN IF NOT EXISTS selection_step TEXT DEFAULT 'company',
  ADD COLUMN IF NOT EXISTS system_groups JSONB;

SELECT 'Pending selection step columns added!' as result;
