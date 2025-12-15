-- Enable realtime voor whatsapp_contact_overview tabel
ALTER TABLE whatsapp_contact_overview REPLICA IDENTITY FULL;

-- Trigger functie om whatsapp_contact_overview te refreshen bij booking changes
CREATE OR REPLACE FUNCTION trigger_refresh_whatsapp_contact_overview_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Roep de bestaande refresh functie aan
  PERFORM refresh_whatsapp_contact_overview();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger op bookings tabel - alleen op ROW level voor specifieke booking changes
CREATE TRIGGER refresh_whatsapp_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trigger_refresh_whatsapp_contact_overview_on_booking();