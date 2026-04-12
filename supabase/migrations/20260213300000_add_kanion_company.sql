-- Add "קניון מסמכי משלוח" company and assign admin user

INSERT INTO public.companies (id, slug, name, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'kanion-docs',
  'קניון מסמכי משלוח',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Assign admin user (Liron Bekman) to this company
INSERT INTO public.user_company_assignments (user_id, company_id, role, is_primary)
VALUES (
  '2a18ade1-0b1b-4fb7-8172-0321a37c38fa',
  'a0000000-0000-0000-0000-000000000003',
  'admin',
  false
) ON CONFLICT (user_id, company_id) DO NOTHING;

SELECT 'קניון מסמכי משלוח added and admin assigned!' as result;
