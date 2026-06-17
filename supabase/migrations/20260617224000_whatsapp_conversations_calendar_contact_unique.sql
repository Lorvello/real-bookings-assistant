-- Fix: process_whatsapp_message deed `INSERT ... ON CONFLICT (calendar_id, contact_id)`
-- op whatsapp_conversations, maar er bestond alleen een NIET-unieke index op die kolommen
-- (idx_whatsapp_conversations_contact_calendar). ON CONFLICT vereist een unieke/exclusion
-- constraint -> "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" -> de functie crasht -> geen gesprek/bericht opgeslagen.
--
-- Eén contact heeft per agenda hooguit één lopende conversatie (de agent laadt met
-- .eq(calendar_id).eq(contact_id).maybeSingle()), dus (calendar_id, contact_id) hoort uniek
-- te zijn. Tabel is leeg, dus geen conflict bij toevoegen.
alter table public.whatsapp_conversations
  add constraint whatsapp_conversations_calendar_contact_uniq
  unique (calendar_id, contact_id);
