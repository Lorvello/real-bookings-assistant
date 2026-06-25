-- Fix: business_overview_v2 cache went stale on house-number / postal-code-only edits.
--
-- The agent quotes the full address (street + number + postal + city + country) from the
-- denormalized business_overview_v2 cache table (whatsapp-agent/tools.ts formatAddress;
-- bo_v2 stores business_number + business_postal as their own columns). That cache is
-- refreshed by trigger_users_v2_refresh AFTER UPDATE ON public.users, but its WHEN-clause
-- omitted business_number and business_postal. So a tenant who corrected ONLY their house
-- number or postal code in Business Information settings updated public.users but did NOT
-- fire the refresh, leaving the agent quoting the OLD number/postal until some other
-- business field happened to change.
--
-- Empirically reproduced (Premium V2 loop R8): edit business_number 10 -> 99 alone left
-- bo_v2.business_number = 10 (stale) and the agent answered "Papaver 10"; a later phone
-- edit (a column already in the WHEN-clause) refreshed the cache and the number caught up
-- to 99, isolating the WHEN-clause omission as the sole cause.
--
-- Fix: add business_number and business_postal to the WHEN-clause. business_type_other is
-- intentionally NOT added: it is not stored in bo_v2 and is resolved LIVE by the agent
-- (tools.ts queries users.business_type_other when business_type='other'), so it is never
-- stale. Trigger function body is unchanged; only the firing condition is widened.

DROP TRIGGER IF EXISTS trigger_users_v2_refresh ON public.users;
CREATE TRIGGER trigger_users_v2_refresh
  AFTER UPDATE ON public.users
  FOR EACH ROW
  WHEN (
       old.business_name IS DISTINCT FROM new.business_name
    OR old.business_email IS DISTINCT FROM new.business_email
    OR old.business_phone IS DISTINCT FROM new.business_phone
    OR old.business_whatsapp IS DISTINCT FROM new.business_whatsapp
    OR old.business_type IS DISTINCT FROM new.business_type
    OR old.business_description IS DISTINCT FROM new.business_description
    OR old.business_street IS DISTINCT FROM new.business_street
    OR old.business_number IS DISTINCT FROM new.business_number      -- added (was missing -> stale cache)
    OR old.business_postal IS DISTINCT FROM new.business_postal      -- added (was missing -> stale cache)
    OR old.business_city IS DISTINCT FROM new.business_city
    OR old.business_country IS DISTINCT FROM new.business_country
    OR old.website IS DISTINCT FROM new.website
    OR old.instagram IS DISTINCT FROM new.instagram
    OR old.facebook IS DISTINCT FROM new.facebook
    OR old.linkedin IS DISTINCT FROM new.linkedin
    OR old.tiktok IS DISTINCT FROM new.tiktok
    OR old.youtube IS DISTINCT FROM new.youtube
    OR old.x IS DISTINCT FROM new.x
    OR old.cancellation_policy IS DISTINCT FROM new.cancellation_policy
    OR old.payment_info IS DISTINCT FROM new.payment_info
    OR old.parking_info IS DISTINCT FROM new.parking_info
    OR old.public_transport_info IS DISTINCT FROM new.public_transport_info
    OR old.accessibility_info IS DISTINCT FROM new.accessibility_info
    OR old.preparation_info IS DISTINCT FROM new.preparation_info
    OR old.other_info IS DISTINCT FROM new.other_info
  )
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();
