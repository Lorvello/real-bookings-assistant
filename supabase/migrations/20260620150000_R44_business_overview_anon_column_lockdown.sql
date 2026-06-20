-- R44: stop the anon (public) key reading private KPIs + contact PII cross-tenant (DoD round-8 MAJOR)
--
-- business_overview / business_overview_v2 had a public_read RLS policy (calendar_active = true) used
-- by the public /business-search directory. RLS is row-level only, so it exposed EVERY column to the
-- anon key — total_revenue, total_bookings, total_calendars, business email/phone/whatsapp, and
-- per-calendar calendar_revenue/calendar_bookings embedded in the `calendars` JSONB — for every active
-- business. The anon key ships in the public frontend and the repo is public, so any visitor could
-- scrape every tenant's revenue/booking KPIs + contact PII. Proven live.
--
-- A column-level REVOKE is insufficient (anon holds a table-level SELECT grant, and the sensitive
-- figures are also nested inside the `calendars` JSONB). Fix = a safe, owner-privileged VIEW that
-- exposes ONLY the columns the public directory needs (name/type/description/address/socials/policies
-- + a sanitized calendars array with services/hours/slugs but no revenue/bookings/upcoming), and DROP
-- the base-table public_read policies so the base tables are no longer anon-reachable at all.
-- The owner dashboard is unaffected (it doesn't read these via the public path; owner_* policies stay),
-- the WhatsApp agent uses service_role, and /book/:slug reads calendars + service_types (not these).

-- 1. Safe public directory view (runs as owner → bypasses base RLS; the view IS the public interface).
CREATE OR REPLACE VIEW public.public_business_directory AS
SELECT
  bov.user_id,
  bov.business_name,
  bov.business_type,
  bov.business_description,
  bov.business_street,
  bov.business_number,
  bov.business_postal,
  bov.business_city,
  bov.business_country,
  bov.website,
  bov.instagram,
  bov.facebook,
  bov.linkedin,
  bov.tiktok,
  bov.youtube,
  bov.x,
  bov.cancellation_policy,
  bov.payment_info,
  bov.parking_info,
  bov.public_transport_info,
  bov.accessibility_info,
  bov.preparation_info,
  bov.other_info,
  bov.created_at,
  bov.last_updated,
  -- Strip revenue/bookings/upcoming out of each calendar element; keep services/hours/slugs/settings.
  (
    SELECT jsonb_agg(cal.value - 'calendar_revenue' - 'calendar_bookings' - 'upcoming_bookings')
    FROM jsonb_array_elements(bov.calendars) AS cal(value)
  ) AS calendars
FROM public.business_overview_v2 bov
WHERE bov.calendars IS NOT NULL
  AND jsonb_array_length(bov.calendars) > 0
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(bov.calendars) c(value)
    WHERE ((c.value ->> 'calendar_active'))::boolean = true
  );

GRANT SELECT ON public.public_business_directory TO anon, authenticated;

-- 2. Remove the over-broad cross-tenant base-table reads (the leak vector).
DROP POLICY IF EXISTS business_overview_v2_public_read ON public.business_overview_v2;
DROP POLICY IF EXISTS business_overview_public_read ON public.business_overview;

-- 3. Defense-in-depth: anon should hold nothing on these projection tables (RLS already denies, but
--    the table-level grants shouldn't exist). Owners use the authenticated owner_* policies; the agent
--    uses service_role.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.business_overview, public.business_overview_v2 FROM anon;
