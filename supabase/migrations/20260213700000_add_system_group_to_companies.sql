-- Add system_group to companies for multi-system webhook flow
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS system_group TEXT;

-- Set system groups
UPDATE public.companies SET system_group = 'עורכי דין' WHERE slug IN ('main', 'sperger-law');
UPDATE public.companies SET system_group = 'ניהול שופינה' WHERE slug = 'kanion';
UPDATE public.companies SET system_group = 'מסמכי משלוח' WHERE slug = 'mismachei-mishloach';

SELECT 'system_group column added!' as result;
