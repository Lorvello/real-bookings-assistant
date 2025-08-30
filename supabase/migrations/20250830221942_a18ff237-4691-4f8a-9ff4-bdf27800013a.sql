-- Add allow_customer_choice to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS allow_customer_installment_choice boolean DEFAULT true;

-- Add per-service installment settings to service_types
ALTER TABLE public.service_types 
ADD COLUMN IF NOT EXISTS override_installments_enabled boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS installment_plan_override jsonb DEFAULT NULL;

-- Update installments_enabled column to be nullable by default to allow inheritance
ALTER TABLE public.service_types 
ALTER COLUMN installments_enabled DROP NOT NULL;

-- Create service_installment_configs table for detailed per-service configurations
CREATE TABLE IF NOT EXISTS public.service_installment_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id uuid NOT NULL REFERENCES public.service_types(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  plan_type text NOT NULL DEFAULT 'preset' CHECK (plan_type IN ('preset', 'custom')),
  preset_plan text CHECK (preset_plan IN ('100_at_booking', '50_50', '25_25_50', 'fixed_deposit')),
  custom_deposits jsonb DEFAULT '[]'::jsonb,
  fixed_deposit_amount numeric(10,2),
  allow_customer_choice boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(service_type_id)
);

-- Enable RLS
ALTER TABLE public.service_installment_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for service installment configs
CREATE POLICY "service_installment_configs_owner_all" ON public.service_installment_configs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.service_types st 
    WHERE st.id = service_installment_configs.service_type_id 
    AND st.user_id = auth.uid()
  )
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at_service_installment_configs()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_service_installment_configs_updated_at
  BEFORE UPDATE ON public.service_installment_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_service_installment_configs();