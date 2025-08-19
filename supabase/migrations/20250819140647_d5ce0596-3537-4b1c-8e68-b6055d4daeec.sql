-- Create business_stripe_accounts table to store Stripe Connect account details
CREATE TABLE public.business_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_status TEXT NOT NULL DEFAULT 'pending', -- pending, active, restricted, disabled
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  account_type TEXT, -- standard, express, custom
  country TEXT,
  currency TEXT DEFAULT 'eur',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create booking_payments table to track payment transactions
CREATE TABLE public.booking_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  platform_fee_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, canceled, refunded
  payment_method_type TEXT, -- card, ideal, bancontact, etc
  customer_email TEXT,
  customer_name TEXT,
  refund_amount_cents INTEGER DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_settings table for per-calendar payment preferences  
CREATE TABLE public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id UUID NOT NULL REFERENCES public.calendars(id) ON DELETE CASCADE UNIQUE,
  secure_payments_enabled BOOLEAN NOT NULL DEFAULT false,
  payment_required_for_booking BOOLEAN NOT NULL DEFAULT false,
  platform_fee_percentage DECIMAL(5,2) NOT NULL DEFAULT 2.50, -- 2.5% platform fee
  allow_partial_refunds BOOLEAN NOT NULL DEFAULT true,
  refund_policy_text TEXT,
  payment_deadline_hours INTEGER DEFAULT 24, -- Payment deadline in hours after booking
  auto_cancel_unpaid_bookings BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add payment-related columns to calendar_settings
ALTER TABLE public.calendar_settings 
ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT REFERENCES public.business_stripe_accounts(stripe_account_id);

-- Add payment-related columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none', -- none, pending, paid, failed, refunded
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_amount_cents INTEGER,
ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'eur';

-- Enable RLS on new tables
ALTER TABLE public.business_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_stripe_accounts
CREATE POLICY "business_stripe_accounts_owner_all" ON public.business_stripe_accounts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = business_stripe_accounts.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- RLS policies for booking_payments
CREATE POLICY "booking_payments_owner_view" ON public.booking_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.calendars c ON b.calendar_id = c.id
    WHERE b.id = booking_payments.booking_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "booking_payments_system_manage" ON public.booking_payments
FOR ALL
USING (auth.role() = 'service_role');

-- RLS policies for payment_settings
CREATE POLICY "payment_settings_owner_all" ON public.payment_settings
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = payment_settings.calendar_id
    AND calendars.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_business_stripe_accounts_calendar_id ON public.business_stripe_accounts(calendar_id);
CREATE INDEX idx_business_stripe_accounts_stripe_account_id ON public.business_stripe_accounts(stripe_account_id);
CREATE INDEX idx_booking_payments_booking_id ON public.booking_payments(booking_id);
CREATE INDEX idx_booking_payments_stripe_payment_intent_id ON public.booking_payments(stripe_payment_intent_id);
CREATE INDEX idx_payment_settings_calendar_id ON public.payment_settings(calendar_id);

-- Create updated_at trigger for business_stripe_accounts
CREATE OR REPLACE FUNCTION public.handle_updated_at_business_stripe_accounts()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_business_stripe_accounts_updated_at
  BEFORE UPDATE ON public.business_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_business_stripe_accounts();

-- Create updated_at trigger for booking_payments  
CREATE OR REPLACE FUNCTION public.handle_updated_at_booking_payments()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_payments_updated_at
  BEFORE UPDATE ON public.booking_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_booking_payments();

-- Create updated_at trigger for payment_settings
CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_settings()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_payment_settings();