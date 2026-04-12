-- Rename system groups to match user's naming
UPDATE public.companies SET system_group = 'Legal עורכי דין' WHERE slug IN ('main', 'sperger-law');
UPDATE public.companies SET system_group = 'שופינה' WHERE slug = 'kanion';
UPDATE public.companies SET system_group = 'מסמכי Corewise' WHERE slug = 'mismachei-mishloach';

SELECT 'System groups renamed!' as result;
