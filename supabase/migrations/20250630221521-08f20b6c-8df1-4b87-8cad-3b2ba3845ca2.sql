
-- Enable de bestaande disabled trigger
ALTER TABLE public.bookings ENABLE TRIGGER booking_webhook_trigger;

-- Verificeer dat de trigger nu enabled is
SELECT 
  tgname as trigger_name,
  CASE tgenabled 
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
    ELSE 'UNKNOWN'
  END as trigger_status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'bookings' 
  AND t.tgname = 'booking_webhook_trigger';

-- Test: Check if we have any active webhook endpoints to receive the webhooks
SELECT 
  we.calendar_id,
  we.webhook_url,
  we.is_active,
  c.name as calendar_name
FROM public.webhook_endpoints we
JOIN public.calendars c ON c.id = we.calendar_id
WHERE we.is_active = true;
