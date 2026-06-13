-- LR-R71 (critical, website-audit + agent-scope): onboarding kon niet voltooien.
-- De frontend (useCreateCalendar) wacht op "een database-trigger die de default
-- schedule + rules aanmaakt" en UPDATE't die rules — maar zo'n trigger BESTOND NIET
-- (calendars had wel triggers voor calendar_settings + payment_settings, niet voor
-- availability). Gevolg: geen availability_schedules/rules -> get_user_status_type
-- bleef op setup_incomplete (eist >=1 actieve availability rule) -> business kon
-- nooit voltooien en de agent dus nooit voeden.
--
-- Fix: trigger die bij calendar-insert een default schedule + 7 rules aanmaakt
-- (Mon-Fri 09:00-17:00 beschikbaar, weekend uit). Idempotent. day_of_week 1-7
-- (1=Ma..7=Zo), de conventie die de slot-functies lezen.

CREATE OR REPLACE FUNCTION public.create_default_availability_for_calendar()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE v_schedule_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM availability_schedules WHERE calendar_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  INSERT INTO availability_schedules (calendar_id, name, is_default)
  VALUES (NEW.id, 'Standaard Schema', true) RETURNING id INTO v_schedule_id;
  INSERT INTO availability_rules (schedule_id, day_of_week, start_time, end_time, is_available)
  SELECT v_schedule_id, dow, '09:00'::time, '17:00'::time, (dow BETWEEN 1 AND 5)
  FROM generate_series(1,7) AS dow;
  RETURN NEW;
END; $f$;

DROP TRIGGER IF EXISTS on_calendar_created_availability ON public.calendars;
CREATE TRIGGER on_calendar_created_availability
  AFTER INSERT ON public.calendars
  FOR EACH ROW EXECUTE FUNCTION public.create_default_availability_for_calendar();
