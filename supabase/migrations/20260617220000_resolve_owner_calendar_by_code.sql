-- Fix: WhatsApp-webhook kon de business-eigenaar/agenda niet resolven op basis van de
-- tracking-code in het eerste bericht ("Code: XXXXXXXX" = eerste 8 tekens van users.id).
-- De webhook deed `users.id ILIKE 'xxxxxxxx%'`, maar `users.id` is een uuid en Postgres
-- heeft geen `uuid ~~* text`-operator -> de PostgREST-query crashte stil, data werd null,
-- en ELK inkomend bericht werd gedropt ("Kon business-eigenaar niet resolven").
--
-- Deze RPC cast de uuid expliciet naar text zodat de prefix-match wel werkt, en geeft
-- meteen de juiste agenda terug (default-agenda eerst, anders de oudste). SECURITY DEFINER
-- + alleen uitvoerbaar door service_role (de webhook draait service-role).
create or replace function public.resolve_owner_calendar_by_code(p_code text)
returns table(owner_id uuid, calendar_id uuid)
language sql
security definer
set search_path = public
as $$
  select u.id as owner_id, c.id as calendar_id
  from public.users u
  join public.calendars c on c.user_id = u.id
  where u.id::text ilike p_code || '%'
  order by c.is_default desc nulls last, c.created_at asc nulls last
  limit 1;
$$;

revoke all on function public.resolve_owner_calendar_by_code(text) from public;
grant execute on function public.resolve_owner_calendar_by_code(text) to service_role;

comment on function public.resolve_owner_calendar_by_code(text) is
  'Resolves the owning user_id + primary calendar_id from a WhatsApp tracking code (first 8 hex chars of users.id). Casts uuid->text so the prefix ILIKE works (raw uuid ILIKE has no operator). service_role only; used by the whatsapp-webhook edge function.';
