-- Reset alle bestaande WhatsApp QR codes zodat nieuwe gegenereerd worden met correcte pre-filled message
-- Dit forceert regeneratie met het nieuwe bericht format: "👋 Hallo van {business}!..."

-- Storage objects may only be deleted through the Storage API. A direct SQL
-- delete is rejected by current Supabase storage and is unnecessary on a
-- clean database. Existing environments must use an explicit, human-approved
-- Storage API cleanup when those legacy files still need removal.

-- Reset QR URL in users tabel zodat nieuwe gegenereerd worden
UPDATE users 
SET whatsapp_qr_url = NULL, 
    whatsapp_qr_generated_at = NULL
WHERE whatsapp_qr_url IS NOT NULL;
