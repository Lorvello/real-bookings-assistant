-- Security fixes: Add SET search_path to SECURITY DEFINER functions and strengthen RLS policies

-- Fix 1: Add SET search_path to all SECURITY DEFINER functions
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.manual_process_webhooks(uuid)',
    'public.get_calendar_availability(text,date,integer)',
    'public.check_whatsapp_contact_limit(uuid,uuid)',
    'public.admin_ensure_user_has_calendar(uuid)',
    'public.admin_update_user_subscription(uuid,text,text,text,text,text,text)',
    'public.cleanup_expired_invitations()',
    'public.handle_new_user()',
    'public.complete_user_setup(uuid)',
    'public.process_automatic_status_transitions()',
    'public.add_to_waitlist(text,uuid,text,text,date,time without time zone,time without time zone,text)',
    'public.admin_setup_mock_incomplete_user(uuid)',
    'public.admin_developer_update_user_subscription(uuid,text,text,text,text,text,text)',
    'public.get_calendar_statistics(uuid)',
    'public.get_dashboard_metrics(uuid)',
    'public.update_user_status(uuid,text,text,timestamp with time zone)',
    'public.trigger_business_overview_refresh()',
    'public.render_whatsapp_template(text,uuid,jsonb)',
    'public.match_quick_reply_flow(text,uuid)',
    'public.cleanup_old_whatsapp_data()',
    'public.get_business_hours(uuid)',
    'public.handle_updated_at_users()',
    'public.export_whatsapp_data(uuid,date,date)',
    'public.cleanup_duplicate_availability_rules(uuid,integer)',
    'public.admin_generate_comprehensive_mock_data(uuid,text)',
    'public.handle_new_calendar_settings()',
    'public.create_team_member_user(text,text,uuid)',
    'public.update_existing_users_retroactively()',
    'public.link_whatsapp_conversation_to_booking()',
    'public.check_booking_conflicts(uuid,timestamp with time zone,timestamp with time zone,uuid)',
    'public.ensure_user_has_calendar_and_service(uuid)',
    'public.refresh_dashboard_metrics()',
    'public.trigger_dashboard_refresh()',
    'public.check_team_member_limit(uuid,uuid)',
    'public.admin_clear_user_data(uuid)',
    'public.admin_set_user_status(uuid,text)'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NOT NULL THEN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path TO %L',
        function_signature,
        ''
      );
    END IF;
  END LOOP;
END
$$;

-- Fix 2: Strengthen overly permissive RLS policies

-- Drop and recreate booking_intents policies with proper user ownership checks
DROP POLICY IF EXISTS "System can manage booking intents" ON public.booking_intents;
DROP POLICY IF EXISTS "Users can view booking intents for their conversations" ON public.booking_intents;

CREATE POLICY "Users can manage booking intents for their conversations"
ON public.booking_intents
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = booking_intents.conversation_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = booking_intents.conversation_id 
    AND c.user_id = auth.uid()
  )
);

-- Allow system operations for booking intents (for edge functions)
CREATE POLICY "System can create booking intents"
ON public.booking_intents
FOR INSERT
WITH CHECK (true);

-- Drop and recreate WhatsApp contact policies with proper restrictions
DROP POLICY IF EXISTS "System can manage whatsapp contacts" ON public.whatsapp_contacts;
DROP POLICY IF EXISTS "Users can view whatsapp contacts for their calendars" ON public.whatsapp_contacts;

CREATE POLICY "Users can view whatsapp contacts for their calendars"
ON public.whatsapp_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.contact_id = whatsapp_contacts.id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage whatsapp contacts"
ON public.whatsapp_contacts
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Drop and recreate WhatsApp conversation policies
DROP POLICY IF EXISTS "System can manage whatsapp conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can view whatsapp conversations for their calendars" ON public.whatsapp_conversations;

CREATE POLICY "Users can manage whatsapp conversations for their calendars"
ON public.whatsapp_conversations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id 
    AND c.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.calendars c
    WHERE c.id = whatsapp_conversations.calendar_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage whatsapp conversations"
ON public.whatsapp_conversations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Drop and recreate WhatsApp message policies
DROP POLICY IF EXISTS "System can manage whatsapp messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can view whatsapp messages for their conversations" ON public.whatsapp_messages;

CREATE POLICY "Users can view whatsapp messages for their conversations"
ON public.whatsapp_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = whatsapp_messages.conversation_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage whatsapp messages"
ON public.whatsapp_messages
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Drop and recreate conversation_context policies
DROP POLICY IF EXISTS "System can manage conversation context" ON public.conversation_context;
DROP POLICY IF EXISTS "Users can view conversation context for their conversations" ON public.conversation_context;

CREATE POLICY "Users can view conversation context for their conversations"
ON public.conversation_context
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_conversations wc
    JOIN public.calendars c ON c.id = wc.calendar_id
    WHERE wc.id = conversation_context.conversation_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can manage conversation context"
ON public.conversation_context
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Fix 3: Strengthen subscription escalation prevention policy
DROP POLICY IF EXISTS "users_prevent_subscription_escalation" ON public.users;

CREATE POLICY "users_prevent_subscription_escalation"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND subscription_status IN ('trial', 'expired', 'canceled', 'active')
  AND (subscription_tier IS NULL OR subscription_tier IN ('free', 'starter', 'professional', 'enterprise'))
  AND (trial_end_date IS NULL OR trial_end_date >= (SELECT trial_end_date FROM public.users WHERE id = auth.uid()) OR trial_end_date <= now())
  AND (subscription_end_date IS NULL OR subscription_end_date >= (SELECT subscription_end_date FROM public.users WHERE id = auth.uid()) OR subscription_end_date <= now())
);

-- Fix 4: Add security function for user role checks to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_subscription_tier(user_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT subscription_tier::text FROM public.users WHERE id = user_uuid;
$$;

-- Add audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only allow system to insert security events
CREATE POLICY "system_insert_security_events"
ON public.security_events
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

-- Users can only view their own security events
CREATE POLICY "users_view_own_security_events"
ON public.security_events
FOR SELECT
USING (user_id = auth.uid());
