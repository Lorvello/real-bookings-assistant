-- Simply populate the business_overview table using the existing refresh function
DO $$
DECLARE
  cal_record RECORD;
BEGIN
  FOR cal_record IN 
    SELECT id FROM public.calendars 
    WHERE is_active = true AND COALESCE(is_deleted, false) = false
  LOOP
    BEGIN
      -- Try to refresh, continue on error
      PERFORM public.refresh_business_overview(cal_record.id);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not refresh calendar %: %', cal_record.id, SQLERRM;
    END;
  END LOOP;
END $$;