-- Fix function dependency with CASCADE and then recreate
DROP FUNCTION IF EXISTS public.get_day_name_dutch(integer) CASCADE;

CREATE OR REPLACE FUNCTION public.get_day_name_dutch(p_day_of_week integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN CASE p_day_of_week
    WHEN 1 THEN 'Maandag'
    WHEN 2 THEN 'Dinsdag'
    WHEN 3 THEN 'Woensdag'
    WHEN 4 THEN 'Donderdag'
    WHEN 5 THEN 'Vrijdag'
    WHEN 6 THEN 'Zaterdag'
    WHEN 7 THEN 'Zondag'
    ELSE 'Onbekend'
  END;
END;
$function$;