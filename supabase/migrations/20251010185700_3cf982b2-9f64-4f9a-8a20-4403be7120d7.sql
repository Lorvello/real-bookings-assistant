-- Add WhatsApp QR code storage columns to calendar_settings
ALTER TABLE public.calendar_settings 
ADD COLUMN IF NOT EXISTS whatsapp_qr_url TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_qr_generated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.calendar_settings.whatsapp_qr_url IS 'Public URL to generated WhatsApp QR code SVG in storage';
COMMENT ON COLUMN public.calendar_settings.whatsapp_qr_generated_at IS 'Timestamp when the QR code was last generated';

-- Create storage bucket for WhatsApp QR codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('whatsapp-qr-codes', 'whatsapp-qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Users can view their own QR codes
CREATE POLICY "Users can view own WhatsApp QR codes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'whatsapp-qr-codes' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Service role can manage all QR codes
CREATE POLICY "Service role can manage WhatsApp QR codes"
ON storage.objects FOR ALL
USING (
  bucket_id = 'whatsapp-qr-codes' 
  AND auth.role() = 'service_role'
)
WITH CHECK (
  bucket_id = 'whatsapp-qr-codes' 
  AND auth.role() = 'service_role'
);