-- Add installment configuration to users table
ALTER TABLE public.users 
ADD COLUMN installments_enabled boolean DEFAULT false,
ADD COLUMN default_installment_plan jsonb DEFAULT '{"type": "50_50", "deposits": [{"percentage": 50, "timing": "now"}, {"percentage": 50, "timing": "appointment"}]}'::jsonb;

-- Add installment configuration to service_types table
ALTER TABLE public.service_types
ADD COLUMN installments_enabled boolean DEFAULT NULL,
ADD COLUMN custom_installment_plan jsonb DEFAULT NULL;

-- Create installment_payments table to track multi-step payments
CREATE TABLE public.installment_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL,
  whatsapp_session_id uuid REFERENCES public.whatsapp_payment_sessions(id),
  installment_number integer NOT NULL,
  total_installments integer NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'eur',
  due_date timestamp with time zone,
  payment_timing text NOT NULL, -- 'now', 'appointment', 'days_after'
  payment_method text NOT NULL, -- 'online', 'cash'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on installment_payments
ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

-- Create policy for business owners to view installment payments
CREATE POLICY "installment_payments_owner_view" ON public.installment_payments
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.bookings b
  JOIN public.calendars c ON b.calendar_id = c.id
  WHERE b.id = installment_payments.booking_id 
  AND c.user_id = auth.uid()
));

-- Create policy for system to manage installment payments
CREATE POLICY "installment_payments_system_manage" ON public.installment_payments
FOR ALL 
USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE TRIGGER update_installment_payments_updated_at
BEFORE UPDATE ON public.installment_payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at_payment_rate_limits();