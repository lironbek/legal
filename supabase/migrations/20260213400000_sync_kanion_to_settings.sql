-- Sync קניון מסמכי משלוח to global_firm_settings (used by webhook + client app)

-- Update companies_list JSON
UPDATE public.global_firm_settings
SET setting_value = (
  SELECT jsonb_agg(elem)
  FROM (
    SELECT elem FROM jsonb_array_elements(setting_value::jsonb) AS elem
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'a0000000-0000-0000-0000-000000000003',
      'slug', 'kanion-docs',
      'name', 'קניון מסמכי משלוח',
      'is_active', true,
      'created_at', NOW()::text,
      'updated_at', NOW()::text
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        (SELECT setting_value::jsonb FROM public.global_firm_settings WHERE setting_key = 'companies_list')
      ) AS e WHERE e->>'slug' = 'kanion-docs'
    )
  ) sub
),
updated_at = NOW()
WHERE setting_key = 'companies_list';

-- Update user_company_assignments_list JSON
UPDATE public.global_firm_settings
SET setting_value = (
  SELECT jsonb_agg(elem)
  FROM (
    SELECT elem FROM jsonb_array_elements(setting_value::jsonb) AS elem
    UNION ALL
    SELECT jsonb_build_object(
      'id', 'assign-admin-kanion',
      'user_id', '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
      'company_id', 'a0000000-0000-0000-0000-000000000003',
      'role', 'admin',
      'is_primary', false,
      'created_at', NOW()::text,
      'updated_at', NOW()::text
    )
    WHERE NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(
        (SELECT setting_value::jsonb FROM public.global_firm_settings WHERE setting_key = 'user_company_assignments_list')
      ) AS e WHERE e->>'company_id' = 'a0000000-0000-0000-0000-000000000003'
        AND e->>'user_id' = '2a18ade1-0b1b-4fb7-8172-0321a37c38fa'
    )
  ) sub
),
updated_at = NOW()
WHERE setting_key = 'user_company_assignments_list';

SELECT 'קניון מסמכי משלוח synced to global_firm_settings!' as result;
