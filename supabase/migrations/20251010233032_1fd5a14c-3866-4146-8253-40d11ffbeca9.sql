-- ═══════════════════════════════════════════════════════════════════════════
-- BOOKINGSASSISTANT DATABASE ARCHITECTURE FIX (IDEMPOTENT)
-- Generated: 2025-10-10
-- Description: Comprehensive multi-tenant architecture cleanup
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 1: CRITICAL FIXES (Security & Architecture)
-- ═══════════════════════════════════════════════════════════════════════════

-- FIX 1A: Drop dependent policies FIRST before removing user_id column
DROP POLICY IF EXISTS "service_types_owner_all" ON public.service_types;
DROP POLICY IF EXISTS "service_types_public_view" ON public.service_types;
DROP POLICY IF EXISTS "service_installment_configs_owner_all" ON public.service_installment_configs;

-- FIX 1B: Remove redundant user_id from service_types
ALTER TABLE public.service_types DROP COLUMN IF EXISTS user_id;

-- FIX 1C: Recreate service_types RLS policies using calendar_id only
CREATE POLICY "service_types_owner_all"
ON public.service_types
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = service_types.calendar_id
    AND calendars.user_id = auth.uid()
  )
);

CREATE POLICY "service_types_public_view"
ON public.service_types
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendars
    WHERE calendars.id = service_types.calendar_id
    AND calendars.is_active = true
    AND COALESCE(calendars.is_deleted, false) = false
  )
  AND service_types.is_active = true
  AND COALESCE(service_types.is_deleted, false) = false
);

-- FIX 1D: Recreate service_installment_configs RLS using calendar_id
CREATE POLICY "service_installment_configs_owner_all"
ON public.service_installment_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.service_types st
    JOIN public.calendars c ON c.id = st.calendar_id
    WHERE st.id = service_installment_configs.service_type_id
    AND c.user_id = auth.uid()
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 2: HIGH PRIORITY (Data Integrity)
-- ═══════════════════════════════════════════════════════════════════════════

-- FIX 2A: Add missing foreign key constraints (with IF NOT EXISTS checks)
DO $$
BEGIN
  -- availability_rules.schedule_id FK
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'availability_rules_schedule_id_fkey'
  ) THEN
    ALTER TABLE public.availability_rules
    ADD CONSTRAINT availability_rules_schedule_id_fkey
    FOREIGN KEY (schedule_id) REFERENCES public.availability_schedules(id)
    ON DELETE CASCADE;
  END IF;

  -- quick_reply_flows.calendar_id FK
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'quick_reply_flows_calendar_id_fkey'
  ) THEN
    ALTER TABLE public.quick_reply_flows
    ADD CONSTRAINT quick_reply_flows_calendar_id_fkey
    FOREIGN KEY (calendar_id) REFERENCES public.calendars(id)
    ON DELETE CASCADE;
  END IF;

  -- recurring_availability.calendar_id FK
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'recurring_availability_calendar_id_fkey'
  ) THEN
    ALTER TABLE public.recurring_availability
    ADD CONSTRAINT recurring_availability_calendar_id_fkey
    FOREIGN KEY (calendar_id) REFERENCES public.calendars(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- FIX 2B: Add webhook_endpoints foreign key if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'webhook_endpoints'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'webhook_endpoints_calendar_id_fkey'
  ) THEN
    ALTER TABLE public.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_calendar_id_fkey
    FOREIGN KEY (calendar_id) REFERENCES public.calendars(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- FIX 2C: Add unique constraint on calendar_members
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'calendar_members_user_calendar_unique'
  ) THEN
    ALTER TABLE public.calendar_members
    ADD CONSTRAINT calendar_members_user_calendar_unique
    UNIQUE (user_id, calendar_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- PRIORITY 3: MEDIUM PRIORITY (Performance)
-- ═══════════════════════════════════════════════════════════════════════════

-- FIX 3A: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_calendars_user_id ON public.calendars(user_id);
CREATE INDEX IF NOT EXISTS idx_calendars_slug ON public.calendars(slug);
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_id ON public.bookings(calendar_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_service_types_calendar_id ON public.service_types(calendar_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_calendar_id ON public.whatsapp_conversations(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_calendar_id ON public.calendar_members(calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_members_user_id ON public.calendar_members(user_id);