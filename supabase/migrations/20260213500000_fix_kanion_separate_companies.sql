-- Fix: "קניון" and "מסמכי משלוח" are 2 separate companies, not one

-- Remove the incorrectly combined company
DELETE FROM public.user_company_assignments WHERE company_id = 'a0000000-0000-0000-0000-000000000003';
DELETE FROM public.companies WHERE id = 'a0000000-0000-0000-0000-000000000003';

-- Create "קניון"
INSERT INTO public.companies (id, slug, name, is_active)
VALUES ('a0000000-0000-0000-0000-000000000003', 'kanion', 'קניון', true)
ON CONFLICT (id) DO UPDATE SET name = 'קניון', slug = 'kanion';

-- Create "מסמכי משלוח"
INSERT INTO public.companies (id, slug, name, is_active)
VALUES ('a0000000-0000-0000-0000-000000000004', 'mismachei-mishloach', 'מסמכי משלוח', true)
ON CONFLICT (id) DO NOTHING;

-- Assign admin to both
INSERT INTO public.user_company_assignments (user_id, company_id, role, is_primary)
VALUES
  ('2a18ade1-0b1b-4fb7-8172-0321a37c38fa', 'a0000000-0000-0000-0000-000000000003', 'admin', false),
  ('2a18ade1-0b1b-4fb7-8172-0321a37c38fa', 'a0000000-0000-0000-0000-000000000004', 'admin', false)
ON CONFLICT (user_id, company_id) DO NOTHING;

-- Update global_firm_settings: companies_list
UPDATE public.global_firm_settings
SET setting_value = (
  SELECT jsonb_agg(elem)
  FROM (
    -- Keep existing companies except the wrong one
    SELECT elem FROM jsonb_array_elements(setting_value::jsonb) AS elem
    WHERE elem->>'slug' != 'kanion-docs'
    UNION ALL
    -- Add קניון
    SELECT jsonb_build_object(
      'id', 'a0000000-0000-0000-0000-000000000003',
      'slug', 'kanion', 'name', 'קניון',
      'is_active', true, 'created_at', NOW()::text, 'updated_at', NOW()::text
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        (SELECT setting_value::jsonb FROM public.global_firm_settings WHERE setting_key = 'companies_list')
      ) AS e WHERE e->>'slug' = 'kanion'
    )
    UNION ALL
    -- Add מסמכי משלוח
    SELECT jsonb_build_object(
      'id', 'a0000000-0000-0000-0000-000000000004',
      'slug', 'mismachei-mishloach', 'name', 'מסמכי משלוח',
      'is_active', true, 'created_at', NOW()::text, 'updated_at', NOW()::text
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        (SELECT setting_value::jsonb FROM public.global_firm_settings WHERE setting_key = 'companies_list')
      ) AS e WHERE e->>'slug' = 'mismachei-mishloach'
    )
  ) sub
), updated_at = NOW()
WHERE setting_key = 'companies_list';

-- Update global_firm_settings: assignments
UPDATE public.global_firm_settings
SET setting_value = (
  SELECT jsonb_agg(elem)
  FROM (
    -- Keep existing assignments except the wrong one
    SELECT elem FROM jsonb_array_elements(setting_value::jsonb) AS elem
    WHERE elem->>'company_id' != 'a0000000-0000-0000-0000-000000000003'
      OR elem->>'user_id' != '2a18ade1-0b1b-4fb7-8172-0321a37c38fa'
    UNION ALL
    -- Assign admin to קניון
    SELECT jsonb_build_object(
      'id', 'assign-admin-kanion', 'user_id', '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
      'company_id', 'a0000000-0000-0000-0000-000000000003',
      'role', 'admin', 'is_primary', false, 'created_at', NOW()::text, 'updated_at', NOW()::text
    )
    UNION ALL
    -- Assign admin to מסמכי משלוח
    SELECT jsonb_build_object(
      'id', 'assign-admin-mishloach', 'user_id', '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
      'company_id', 'a0000000-0000-0000-0000-000000000004',
      'role', 'admin', 'is_primary', false, 'created_at', NOW()::text, 'updated_at', NOW()::text
    )
  ) sub
), updated_at = NOW()
WHERE setting_key = 'user_company_assignments_list';

SELECT 'Fixed: קניון + מסמכי משלוח as separate companies!' as result;
