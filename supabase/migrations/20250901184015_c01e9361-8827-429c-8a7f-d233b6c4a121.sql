-- Add international tax registration support tables

-- Business countries tracking for multi-country operations
CREATE TABLE IF NOT EXISTS public.business_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  registration_threshold_amount NUMERIC,
  threshold_currency TEXT DEFAULT 'eur',
  threshold_period TEXT DEFAULT 'yearly',
  registration_required BOOLEAN DEFAULT false,
  registration_status TEXT DEFAULT 'not_required',
  tax_collection_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, country_code)
);

-- Tax thresholds by country
CREATE TABLE IF NOT EXISTS public.tax_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  threshold_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  period TEXT DEFAULT 'yearly',
  threshold_type TEXT DEFAULT 'revenue',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Service classifications for automated tax code assignment
CREATE TABLE IF NOT EXISTS public.service_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name TEXT NOT NULL,
  classification_keywords TEXT[],
  suggested_category TEXT NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  country_specific_tax_codes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tax setup queue for async operations
CREATE TABLE IF NOT EXISTS public.tax_setup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  calendar_id UUID,
  operation_type TEXT NOT NULL,
  operation_data JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies for business_countries
ALTER TABLE public.business_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_countries_owner_all" ON public.business_countries
FOR ALL USING (user_id = auth.uid());

-- Add RLS policies for tax_thresholds (public read)
ALTER TABLE public.tax_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_thresholds_public_read" ON public.tax_thresholds
FOR SELECT USING (true);

-- Add RLS policies for service_classifications (public read)
ALTER TABLE public.service_classifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_classifications_public_read" ON public.service_classifications
FOR SELECT USING (true);

-- Add RLS policies for tax_setup_queue
ALTER TABLE public.tax_setup_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_setup_queue_owner_all" ON public.tax_setup_queue
FOR ALL USING (user_id = auth.uid());

-- Insert default tax thresholds for major countries
INSERT INTO public.tax_thresholds (country_code, threshold_amount_cents, currency, description) VALUES
('NL', 2000000, 'eur', 'Netherlands VAT registration threshold (€20,000/year)'),
('DE', 2200000, 'eur', 'Germany VAT registration threshold (€22,000/year)'),
('FR', 3650000, 'eur', 'France VAT registration threshold (€36,500/year)'),
('GB', 8500000, 'gbp', 'UK VAT registration threshold (£85,000/year)'),
('US', 10000000, 'usd', 'US sales tax threshold varies by state (~$100,000/year)'),
('CA', 3000000, 'cad', 'Canada GST registration threshold (CAD $30,000/year)'),
('AU', 7500000, 'aud', 'Australia GST registration threshold (AUD $75,000/year)')
ON CONFLICT (country_code) DO NOTHING;

-- Insert common service classifications
INSERT INTO public.service_classifications (service_name, classification_keywords, suggested_category, confidence_score, country_specific_tax_codes) VALUES
('Consultation', ARRAY['consult', 'advice', 'meeting', 'planning'], 'professional_services', 0.9, '{"NL": "txcd_30060000", "DE": "txcd_30060000", "GB": "txcd_30060000"}'),
('Massage Therapy', ARRAY['massage', 'therapy', 'wellness', 'relaxation'], 'personal_care', 0.95, '{"NL": "txcd_20030000", "DE": "txcd_20030000", "GB": "txcd_20030000"}'),
('Medical Check', ARRAY['medical', 'health', 'doctor', 'checkup'], 'medical', 0.9, '{"NL": "txcd_30070000", "DE": "txcd_30070000", "GB": "txcd_30070000"}'),
('Legal Advice', ARRAY['legal', 'lawyer', 'attorney', 'law'], 'professional_services', 0.95, '{"NL": "txcd_30060000", "DE": "txcd_30060000", "GB": "txcd_30060000"}'),
('Fitness Training', ARRAY['fitness', 'training', 'exercise', 'workout'], 'personal_care', 0.85, '{"NL": "txcd_20030000", "DE": "txcd_20030000", "GB": "txcd_20030000"}')
ON CONFLICT DO NOTHING;

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION handle_updated_at_business_countries()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_business_countries_updated_at
  BEFORE UPDATE ON public.business_countries
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at_business_countries();

CREATE OR REPLACE FUNCTION handle_updated_at_tax_thresholds()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tax_thresholds_updated_at
  BEFORE UPDATE ON public.tax_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at_tax_thresholds();