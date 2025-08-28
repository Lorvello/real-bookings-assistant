-- Add enabled_payment_methods column to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN enabled_payment_methods JSONB DEFAULT '["ideal"]'::jsonb;