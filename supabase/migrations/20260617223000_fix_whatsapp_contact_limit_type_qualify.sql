-- Fix: process_whatsapp_message kon GEEN inkomend WhatsApp-bericht opslaan (contact /
-- conversatie / bericht werden nooit aangemaakt). Oorzaak: het roept
-- check_whatsapp_contact_limit aan, en die functie draait met `SET search_path TO ''`
-- (security hardening) maar cast `v_subscription_tier::subscription_tier` ZONDER
-- schema-prefix. Met een lege search_path is het enum-type onvindbaar ->
-- "type subscription_tier does not exist" -> de functie crasht -> process_whatsapp_message
-- crasht -> de webhook (die de RPC-fout negeert) slaat niets op. Gevolg: de agent had
-- geen history, de welkomstgroet vuurde elke beurt, en gesprekken werden nooit bewaard.
--
-- Fix: het type schema-qualificeren als public.subscription_tier. Verder identiek.
create or replace function public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users
  WHERE id = p_user_id;

  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::public.subscription_tier;

  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;

  RETURN v_current_count < v_max_contacts;
END;
$function$;
