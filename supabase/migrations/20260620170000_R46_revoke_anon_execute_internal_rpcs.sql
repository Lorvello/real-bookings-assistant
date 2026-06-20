-- R46: close the rest of the anon-executable SECURITY DEFINER class (DoD round-10 systemic, after R45)
--
-- Postgres grants EXECUTE to PUBLIC by default, so a swath of internal/cron/edge/agent SECURITY DEFINER
-- functions touching tenant/PII data were anon-reachable with no real ownership guard — including a
-- DESTRUCTIVE global cleanup (cleanup_old_whatsapp_data) and a cross-tenant PII read
-- (get_due_booking_reminders → all tenants' due bookings: names/phones/times). None of these are called
-- by the anon public-booking surface (which legitimately uses get_business_available_slots,
-- validate_booking_security(slug), create_booking, the *_by_token RPCs, add_to_waitlist — all left intact).
--
-- Fix: REVOKE EXECUTE FROM PUBLIC + anon, then GRANT to the real callers only. Group A = owner-facing tools
-- the authenticated frontend calls (keep authenticated + service_role). Group B = cron/edge/agent/internal/
-- trigger functions with NO frontend caller (service_role only; internal callers invoke them in the
-- SECURITY DEFINER owner context, so they keep working regardless of the caller-role grant).
DO $r46$
DECLARE
  fn text;
  group_a text[] := ARRAY[  -- authenticated + service_role
    'public.find_orphaned_whatsapp_conversations()',
    'public.link_existing_whatsapp_conversations()',
    'public.refresh_whatsapp_contact_overview()',
    'public.refresh_business_overview_v2(uuid)',
    'public.export_whatsapp_data(uuid)'
  ];
  group_b text[] := ARRAY[  -- service_role only (cron / edge / agent / internal / trigger)
    'public.cancel_booking_for_agent(uuid,text,text)',
    'public.cancel_overdue_unpaid_bookings()',
    'public.check_whatsapp_contact_limit(uuid,uuid)',
    'public.cleanup_old_whatsapp_data()',
    'public.get_due_booking_reminders()',
    'public.handle_booking_webhook_trigger()',
    'public.link_whatsapp_conversation_to_booking()',
    'public.process_waitlist_for_cancelled_booking()',
    'public.refresh_business_overview(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY group_a LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
  FOREACH fn IN ARRAY group_b LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END
$r46$;
