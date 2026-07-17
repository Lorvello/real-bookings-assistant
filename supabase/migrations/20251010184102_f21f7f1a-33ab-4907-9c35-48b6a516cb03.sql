-- ============================================
-- RLS SECURITY ENHANCEMENT MIGRATION
-- Priority: CRITICAL + HIGH
-- Fixes multi-tenant data leakage in n8n_chat_histories
-- Adds user visibility for security_events_log
-- ============================================

-- 1. FIX n8n_chat_histories (CRITICAL - Multi-tenant data leakage)
-- This table is managed outside the canonical product migrations in some
-- environments. Harden it when present without preventing a clean product
-- database from being created when the legacy n8n table is absent.
DO $$
BEGIN
  IF to_regclass('public.n8n_chat_histories') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "System can manage n8n chat histories" ON public.n8n_chat_histories';
    EXECUTE '
      CREATE POLICY "n8n_chat_system_manage"
      ON public.n8n_chat_histories
      FOR ALL
      USING (auth.role() = ''service_role'')
      WITH CHECK (auth.role() = ''service_role'')
    ';
    EXECUTE '
      CREATE POLICY "users_view_own_n8n_chats"
      ON public.n8n_chat_histories
      FOR SELECT
      USING (
        session_id IN (
          SELECT DISTINCT session_id
          FROM public.bookings
          WHERE calendar_id IN (
            SELECT id FROM public.calendars WHERE user_id = auth.uid()
          )
        )
      )
    ';
    EXECUTE '
      CREATE INDEX IF NOT EXISTS idx_n8n_chat_session
      ON public.n8n_chat_histories(session_id)
    ';
  END IF;
END
$$;

-- 2. ENHANCE security_events_log (HIGH PRIORITY - User visibility)
-- Allow users to view security logs for their own calendars
CREATE POLICY "users_view_own_calendar_security_logs" 
ON public.security_events_log
FOR SELECT 
USING (
  calendar_id IN (
    SELECT id FROM public.calendars WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- 3. ADD performance indexes for RLS filtering
CREATE INDEX IF NOT EXISTS idx_security_events_log_calendar ON public.security_events_log(calendar_id);
CREATE INDEX IF NOT EXISTS idx_security_events_log_user ON public.security_events_log(user_id);

-- 4. VERIFICATION: These queries should work after migration
-- Test multi-tenant isolation (should only return user's own data):
-- SELECT COUNT(*) FROM n8n_chat_histories;
-- SELECT COUNT(*) FROM security_events_log WHERE calendar_id IS NOT NULL;
