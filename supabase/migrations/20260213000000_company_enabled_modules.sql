-- Add enabled_modules column to companies table
-- NULL means all modules enabled (backward compatible)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT NULL;
COMMENT ON COLUMN public.companies.enabled_modules IS 'Array of module keys enabled for this org. NULL = all enabled.';
