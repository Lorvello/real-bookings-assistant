-- FQ-4-obs (sev-4): backfill legacy whatsapp_contacts.user_id
--
-- Context: whatsapp_contacts.user_id was added in migration 20251010192555 for
-- RLS (policy whatsapp_contacts_user_access: user_id = auth.uid()). Rows created
-- before that column existed have user_id = NULL. The agent's tenant-resolution
-- path derives the owner from the conversation's calendar (calendars.user_id),
-- so a NULL here is not a dangling reference, but it means the row is invisible
-- to the owner-scoped RLS SELECT path. Backfill it to the calendar owner.
--
-- SAFETY: whatsapp_contacts is globally unique by phone_number (one row can talk
-- to multiple businesses), so user_id is only well-defined when ALL of a contact's
-- conversations resolve to the SAME calendar owner. This UPDATE backfills ONLY the
-- unambiguous NULL rows (exactly one distinct calendar owner across their
-- conversations) and matches the code's own resolution (whatsapp-webhook derives
-- ownerId from the conversation's calendars.user_id). Ambiguous rows (>1 owner) or
-- orphan rows (no conversation) are left NULL. Idempotent: re-running is a no-op
-- once user_id is set (the WHERE clause requires user_id IS NULL).

UPDATE public.whatsapp_contacts wc
SET user_id = owner.user_id
FROM (
  -- HAVING guarantees a single distinct owner; cast through text because
  -- aggregate MIN() has no uuid variant. The value is unambiguous by construction.
  SELECT conv.contact_id, MIN(cal.user_id::text)::uuid AS user_id
  FROM public.whatsapp_conversations conv
  JOIN public.calendars cal ON cal.id = conv.calendar_id
  WHERE cal.user_id IS NOT NULL
  GROUP BY conv.contact_id
  HAVING COUNT(DISTINCT cal.user_id) = 1
) AS owner
WHERE wc.id = owner.contact_id
  AND wc.user_id IS NULL;
