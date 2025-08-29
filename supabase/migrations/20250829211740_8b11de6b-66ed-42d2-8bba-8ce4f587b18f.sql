-- Add tax configuration fields to users table
ALTER TABLE public.users 
ADD COLUMN default_tax_behavior text,
ADD COLUMN tax_configured boolean DEFAULT false;

-- Update service_types table constraint for tax_behavior
ALTER TABLE public.service_types 
DROP CONSTRAINT IF EXISTS service_types_tax_behavior_check;

ALTER TABLE public.service_types 
ADD CONSTRAINT service_types_tax_behavior_check 
CHECK (tax_behavior IN ('inclusive', 'exclusive') OR tax_behavior IS NULL);

-- Add comment for clarity
COMMENT ON COLUMN public.users.default_tax_behavior IS 'Fallback tax behavior for services without explicit tax_behavior set';
COMMENT ON COLUMN public.users.tax_configured IS 'Whether user has completed initial tax configuration setup';