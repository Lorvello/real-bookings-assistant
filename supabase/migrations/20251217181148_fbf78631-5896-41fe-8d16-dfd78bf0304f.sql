-- Add RLS policies for service_role on whatsapp_contact_overview
-- This fixes the "DELETE requires a WHERE clause" error when triggers refresh the view

-- Policy for DELETE operations by service_role
CREATE POLICY "Service role can delete whatsapp contact overview"
ON public.whatsapp_contact_overview
FOR DELETE
TO service_role
USING (true);

-- Policy for INSERT operations by service_role
CREATE POLICY "Service role can insert whatsapp contact overview"
ON public.whatsapp_contact_overview
FOR INSERT
TO service_role
WITH CHECK (true);