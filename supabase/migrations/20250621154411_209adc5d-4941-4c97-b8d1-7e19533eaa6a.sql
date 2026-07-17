
-- Update calendar namen gebaseerd op user informatie
-- Voor gebruikers met business_name: gebruik "{business_name} Kalender"
-- Voor gebruikers zonder business_name: gebruik "{first_name} Kalender"
UPDATE public.calendars 
SET name = CASE 
  WHEN u.business_name IS NOT NULL AND u.business_name != '' 
  THEN u.business_name || ' Kalender'
  WHEN u.full_name IS NOT NULL AND u.full_name != ''
  THEN split_part(u.full_name, ' ', 1) || ' Kalender'
  ELSE 'Persoonlijke Kalender'
END
FROM public.users u
WHERE calendars.user_id = u.id
  AND calendars.name = 'Mijn Kalender';

-- Verificatie query om te controleren of de update correct is toegepast
SELECT 
  c.id,
  c.name as calendar_name,
  u.full_name,
  u.business_name,
  u.email
FROM public.calendars c
JOIN public.users u ON c.user_id = u.id
ORDER BY u.email;
