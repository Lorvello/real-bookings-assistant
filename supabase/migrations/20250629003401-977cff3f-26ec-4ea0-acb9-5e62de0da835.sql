
-- Stap 1: Verwijder ALLE mogelijke triggers (inclusief varianten)
DROP TRIGGER IF EXISTS validate_booking_rules_trigger ON public.bookings;
DROP TRIGGER IF EXISTS validate_booking_times_trigger ON public.bookings;
DROP TRIGGER IF EXISTS handle_new_booking_trigger ON public.bookings;
DROP TRIGGER IF EXISTS trigger_validate_booking_rules ON public.bookings;
DROP TRIGGER IF EXISTS trigger_validate_booking_times ON public.bookings;

-- Stap 2: Nu kunnen we de functies veilig verwijderen
DROP FUNCTION IF EXISTS public.validate_booking_rules() CASCADE;
DROP FUNCTION IF EXISTS public.validate_booking_times() CASCADE;

-- Stap 3: Update alle pending bookings direct naar confirmed (zonder enige validatie)
UPDATE public.bookings 
SET 
  status = 'confirmed',
  confirmed_at = COALESCE(confirmed_at, now()),
  updated_at = now()
WHERE status = 'pending';

-- Stap 4: Maak nieuwe, eenvoudige functies die alleen confirmed status forceren
CREATE OR REPLACE FUNCTION public.validate_booking_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Altijd confirmed status - geen enkele validatie
  NEW.status := 'confirmed';
  NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stap 5: Herstel de handle_new_booking functie (voor confirmation tokens)
CREATE OR REPLACE FUNCTION public.handle_new_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Forceer confirmed status
  NEW.status := 'confirmed';
  NEW.confirmed_at := COALESCE(NEW.confirmed_at, now());
  
  -- Genereer confirmation token als deze niet is opgegeven
  IF NEW.confirmation_token IS NULL THEN
    NEW.confirmation_token := public.generate_confirmation_token();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Stap 6: Zet alleen de handle_new_booking trigger weer aan
CREATE TRIGGER handle_new_booking_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_booking();

-- Stap 7: Verificatie
SELECT 
  status,
  COUNT(*) as aantal_bookings
FROM public.bookings 
GROUP BY status
ORDER BY aantal_bookings DESC;
