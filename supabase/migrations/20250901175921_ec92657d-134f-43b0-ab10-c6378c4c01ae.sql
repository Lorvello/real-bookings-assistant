-- Add international tax support to service_types table
ALTER TABLE service_types 
ADD COLUMN IF NOT EXISTS business_country TEXT DEFAULT 'NL',
ADD COLUMN IF NOT EXISTS tax_rate_type TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS applicable_tax_rate NUMERIC DEFAULT 21.0,
ADD COLUMN IF NOT EXISTS service_category TEXT DEFAULT 'general';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_types_country ON service_types(business_country);
CREATE INDEX IF NOT EXISTS idx_service_types_category ON service_types(service_category);

-- Add international tax support to business_stripe_accounts
ALTER TABLE business_stripe_accounts 
ADD COLUMN IF NOT EXISTS tax_collection_countries TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Create tax_configurations table for country-specific settings
CREATE TABLE IF NOT EXISTS tax_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID REFERENCES calendars(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  tax_system_name TEXT NOT NULL DEFAULT 'VAT',
  default_tax_rate NUMERIC NOT NULL DEFAULT 21.0,
  default_tax_code TEXT NOT NULL DEFAULT 'txcd_10000000',
  multi_country_business BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(calendar_id, country_code)
);

-- Enable RLS
ALTER TABLE tax_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for tax configurations
CREATE POLICY "tax_configurations_owner_all" ON tax_configurations
FOR ALL
USING (EXISTS (
  SELECT 1 FROM calendars
  WHERE calendars.id = tax_configurations.calendar_id
  AND calendars.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at_tax_configurations()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_configurations_updated_at
  BEFORE UPDATE ON tax_configurations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at_tax_configurations();