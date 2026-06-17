-- Fix: whatsapp_conversations.contact_id had een FK naar whatsapp_contact_overview
-- (een gedenormaliseerde overzichtstabel die via een trigger NIET synchroon wordt
-- bijgewerkt). process_whatsapp_message en de whatsapp-agent gebruiken echter
-- whatsapp_contacts.id als contact-identiteit. Gevolg: een net aangemaakt contact
-- bestond nog niet in de overview-tabel -> FK-violation -> geen gesprek/bericht opgeslagen.
--
-- De FK hoort naar de canonieke whatsapp_contacts(id) te wijzen. whatsapp_conversations
-- is leeg, dus herpunten kan zonder dataverlies. De overview-tabel + refresh-trigger
-- blijven bestaan voor dashboards; ze zijn alleen niet langer een blokkade voor inbound.
alter table public.whatsapp_conversations
  drop constraint whatsapp_conversations_contact_id_fkey;

alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_contact_id_fkey
  foreign key (contact_id) references public.whatsapp_contacts(id) on delete cascade;
