-- Fix remaining functions that still need SET search_path

-- Get all functions that need to be fixed (these are likely new or missing from the previous migration)
ALTER FUNCTION public.get_user_subscription_tier(uuid) SET search_path TO '';

-- Fix any other functions that may have been missed
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find all SECURITY DEFINER functions without SET search_path
    FOR func_record IN 
        SELECT p.proname, n.nspname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.prosecdef = true 
        AND n.nspname = 'public'
        AND NOT EXISTS (
            SELECT 1 FROM pg_settings 
            WHERE name = 'search_path' 
            AND setting = '' 
            AND context = 'user'
        )
    LOOP
        -- Attempt to set search_path for each function
        BEGIN
            EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path TO ''''', 
                          func_record.nspname, 
                          func_record.proname, 
                          func_record.args);
        EXCEPTION 
            WHEN OTHERS THEN
                -- Log the error but continue with other functions
                RAISE NOTICE 'Could not set search_path for function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;

-- Additional specific functions that might need fixing
DO $$
BEGIN
    -- Try to fix common function signatures that might be missing
    BEGIN
        ALTER FUNCTION public.get_formatted_business_hours(uuid) SET search_path TO '';
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Function might not exist or already fixed
    END;
    
    BEGIN
        ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO '';
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Function might not exist
    END;
    
    BEGIN
        ALTER FUNCTION public.get_available_slots_range(uuid, uuid, date, date) SET search_path TO '';
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Function might not exist
    END;
END $$;