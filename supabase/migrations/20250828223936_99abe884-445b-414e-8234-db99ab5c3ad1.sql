-- Add Stripe price IDs and payment options to service_types table
ALTER TABLE public.service_types 
ADD COLUMN stripe_test_price_id TEXT,
ADD COLUMN stripe_live_price_id TEXT,
ADD COLUMN supports_installments BOOLEAN DEFAULT FALSE,
ADD COLUMN installment_options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN payment_description TEXT;

-- Create table for WhatsApp payment sessions
CREATE TABLE public.whatsapp_payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES public.service_types(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.calendars(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  payment_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'installment', 'deposit'
  installment_plan JSONB,
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on WhatsApp payment sessions
ALTER TABLE public.whatsapp_payment_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for WhatsApp payment sessions
CREATE POLICY "Users can manage payment sessions for their calendars" 
ON public.whatsapp_payment_sessions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.calendars c 
  WHERE c.id = whatsapp_payment_sessions.calendar_id 
  AND c.user_id = auth.uid()
));

CREATE POLICY "System can manage payment sessions" 
ON public.whatsapp_payment_sessions 
FOR ALL 
USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at_whatsapp_payment_sessions()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whatsapp_payment_sessions_updated_at
  BEFORE UPDATE ON public.whatsapp_payment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_whatsapp_payment_sessions();