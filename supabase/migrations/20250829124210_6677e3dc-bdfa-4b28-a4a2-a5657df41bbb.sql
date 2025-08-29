-- Add tax_code column to service_types table
ALTER TABLE public.service_types 
ADD COLUMN tax_code TEXT;

-- Add index for tax_code lookups
CREATE INDEX idx_service_types_tax_code ON public.service_types(tax_code);

-- Add comment to explain the column
COMMENT ON COLUMN public.service_types.tax_code IS 'Stripe tax code for this service type (e.g., txcd_10502001 for physical goods)';