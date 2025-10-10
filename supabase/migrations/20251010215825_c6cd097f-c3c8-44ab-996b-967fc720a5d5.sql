-- Reset alle bestaande WhatsApp QR codes zodat ze opnieuw gegenereerd moeten worden met de nieuwe tekst
-- Dit forceert alle gebruikers om een nieuwe QR-code te genereren met het correcte bericht formaat

UPDATE users 
SET 
  whatsapp_qr_url = NULL,
  whatsapp_qr_generated_at = NULL
WHERE whatsapp_qr_url IS NOT NULL;

-- Log deze actie voor audit trail
INSERT INTO security_events_log (
  event_type,
  severity,
  event_data
) VALUES (
  'qr_codes_reset',
  'info',
  jsonb_build_object(
    'reason', 'Message format update - switched from company-to-customer to customer-to-company perspective',
    'old_format', 'Hallo van {BusinessName}!',
    'new_format', 'Hallo {BusinessName}!',
    'reset_at', NOW()
  )
);