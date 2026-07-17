-- R24: booking writes/deletes must not be blocked by dashboard-notification triggers, and
-- transient event rows must not duplicate the full customer/booking record.
--
-- Reproduced locally before this migration:
--   * an owner deleting their own booking failed RLS inside trigger_realtime_dashboard_refresh;
--   * deleting an owner/calendar failed FK checks when a cascaded booking DELETE tried to
--     insert a business_event for the calendar being deleted;
--   * every booking event copied the complete row, including customer contact data, notes,
--     confirmation token and payment fields, into a second realtime table.

CREATE OR REPLACE FUNCTION public.trigger_realtime_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_record jsonb;
  v_record_id text;
  v_event_type text;
BEGIN
  v_record := CASE
    WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
    ELSE to_jsonb(NEW)
  END;
  v_calendar_id := NULLIF(v_record->>'calendar_id', '')::uuid;
  v_record_id := v_record->>'id';
  v_event_type := TG_TABLE_NAME || '.' || lower(TG_OP);

  -- An ordinary child-row write logs a minimal invalidation event. During a calendar/owner
  -- cascade the parent calendar no longer exists, so skip the transient row instead of
  -- violating the FK and blocking account deletion.
  IF v_calendar_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.calendars WHERE id = v_calendar_id
  ) THEN
    INSERT INTO public.business_events (
      calendar_id,
      event_type,
      event_data
    )
    VALUES (
      v_calendar_id,
      v_event_type,
      jsonb_build_object(
        'record_id', v_record_id,
        'calendar_id', v_calendar_id,
        'source_table', TG_TABLE_NAME,
        'operation', lower(TG_OP)
      )
    );
  END IF;

  PERFORM pg_notify(
    'realtime_dashboard_update',
    json_build_object(
      'calendar_id', v_calendar_id,
      'event_type', v_event_type,
      'timestamp', now()
    )::text
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_dashboard_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_calendar_id uuid;
BEGIN
  v_calendar_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.calendar_id
    ELSE NEW.calendar_id
  END;
  PERFORM pg_notify('dashboard_refresh', v_calendar_id::text);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$function$;

-- Existing rows are invalidation hints, not a source of record truth. Retain their identity
-- and timing while deleting duplicated PII and security/payment fields from event_data.
UPDATE public.business_events
SET event_data = jsonb_build_object(
  'record_id', event_data->>'id',
  'calendar_id', calendar_id,
  'source_table', split_part(event_type, '.', 1),
  'operation', split_part(event_type, '.', 2)
)
WHERE event_data <> jsonb_build_object(
  'record_id', event_data->>'id',
  'calendar_id', calendar_id,
  'source_table', split_part(event_type, '.', 1),
  'operation', split_part(event_type, '.', 2)
);

REVOKE ALL ON TABLE public.business_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.business_events TO service_role;

REVOKE ALL ON FUNCTION public.trigger_realtime_dashboard_refresh() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trigger_dashboard_refresh() FROM PUBLIC;

COMMENT ON FUNCTION public.trigger_realtime_dashboard_refresh() IS
  'R24: SECURITY DEFINER realtime invalidation trigger with parent-existence guard and minimal non-PII payload. Ordinary writes notify; calendar/account cascades cannot be blocked by an orphan event insert.';
