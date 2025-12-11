-- Stap 1: Verwijder alle duplicates behalve de nieuwste met calendar_id
DELETE FROM whatsapp_conversations 
WHERE id IN (
  '7a5037e0-ac94-40f7-bd79-0431628b0aa7',
  '25622275-1714-4194-9915-d169d5b46eeb',
  '9bec60ba-312b-43fa-860a-ea57232af8bd'
);

-- Stap 2: Update de overgebleven conversatie met de juiste contact_id
UPDATE whatsapp_conversations 
SET contact_id = '46e87385-d99a-41c7-ac3b-a657611253ca'
WHERE id = '2662f7c7-85e4-4362-85b3-c7d4a5df89a1';