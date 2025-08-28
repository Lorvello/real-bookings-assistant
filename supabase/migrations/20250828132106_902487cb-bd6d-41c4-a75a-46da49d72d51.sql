-- Add payout_option field to payment_settings table
ALTER TABLE public.payment_settings 
ADD COLUMN payout_option text DEFAULT 'standard' CHECK (payout_option IN ('standard', 'instant'));