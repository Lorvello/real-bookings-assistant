-- Reset alle bestaande WhatsApp QR codes zodat nieuwe gegenereerd worden met correcte pre-filled message
-- Dit forceert regeneratie met het nieuwe bericht format: "👋 Hallo van {business}!..."

-- Verwijder alle oude QR code bestanden uit storage
DELETE FROM storage.objects 
WHERE bucket_id = 'whatsapp-qr-codes';

-- Reset QR URL in users tabel zodat nieuwe gegenereerd worden
UPDATE users 
SET whatsapp_qr_url = NULL, 
    whatsapp_qr_generated_at = NULL
WHERE whatsapp_qr_url IS NOT NULL;