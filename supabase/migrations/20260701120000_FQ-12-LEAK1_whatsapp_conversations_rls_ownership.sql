-- FQ-12 LEAK1 (sev-2): cross-tenant READ + WRITE + DELETE on whatsapp_conversations.
--
-- The prior policy "Users can manage whatsapp conversations for their calendars"
-- (migration 20251231181818_fa8f9931) was FOR ALL with a USING fallback branch
-- keyed on the USER-MUTABLE column whatsapp_conversations.business_name matched
-- against users.business_name, and NO restrictive WITH CHECK. An attacker could
-- PATCH their own users.business_name to match a victim (self-update of
-- business_name is allowed, R11_D004), then SELECT / PATCH / DELETE the victim's
-- NULL-calendar conversations. The whatsapp-webhook can produce NULL-calendar
-- conversation rows, so the leak was reachable in normal operation.
--
-- Root cause: ownership was inferred from a free-text, self-settable string, and
-- there was no WITH CHECK so writes rode the read fallback.
--
-- Fix: the authenticated-user policy now keys ownership ONLY on a NON-mutable
-- path, the conversation's calendar -> calendars.user_id = auth.uid(), with BOTH
-- a USING clause (read/visibility + the row a write targets) AND a restrictive
-- WITH CHECK (the post-write row must still belong to the caller). The
-- user-mutable business_name branch is removed entirely.
--
-- NULL-calendar conversations are no longer visible/mutable to ANY authenticated
-- tenant via PostgREST. They are NOT world-readable: they fall to the row-owner
-- only after they are linked to a calendar (the link_whatsapp_conversation_to_booking
-- trigger sets calendar_id when a matching booking lands), and the owner reaches
-- still-orphaned rows exclusively through the caller-scoped
-- find_orphaned_whatsapp_conversations() RPC (FQ-12 LEAK2 fix). This does not
-- break legitimate operation:
--   * the live whatsapp-webhook only persists + invokes the agent when
--     calendar_id is non-null (index.ts gate "if (entitled && botActive && calendarId)"),
--     so real conversations are calendar-scoped and remain owner-visible;
--   * the separate "System can manage whatsapp conversations" policy
--     (auth.role() = 'service_role') is unchanged, so the webhook / agent
--     service-role paths can still INSERT / UPDATE conversations (incl. the
--     transient NULL-calendar state) without restriction;
--   * every dashboard read of whatsapp_conversations filters .eq(calendar_id, ...),
--     so no owner surface depends on the removed NULL-calendar fallback.

DROP POLICY IF EXISTS "Users can manage whatsapp conversations for their calendars" ON public.whatsapp_conversations;

CREATE POLICY "Users can manage whatsapp conversations for their calendars"
ON public.whatsapp_conversations
FOR ALL
TO authenticated
USING (
  calendar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id
      AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  calendar_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id
      AND c.user_id = auth.uid()
  )
);
