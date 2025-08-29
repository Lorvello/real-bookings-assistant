-- Add tax configuration fields to service_types table
ALTER TABLE service_types 
ADD COLUMN tax_enabled boolean DEFAULT false,
ADD COLUMN tax_behavior text DEFAULT 'exclusive';

-- Add constraint to ensure tax_behavior is either 'inclusive' or 'exclusive'
ALTER TABLE service_types 
ADD CONSTRAINT service_types_tax_behavior_check 
CHECK (tax_behavior IN ('inclusive', 'exclusive'));