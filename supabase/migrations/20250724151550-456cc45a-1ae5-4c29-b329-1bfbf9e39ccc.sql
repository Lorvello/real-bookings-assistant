-- =====================================================
-- CRITICAL SECURITY FIXES - Phase 1b: Remaining Database Functions
-- =====================================================

-- Continue fixing all remaining database functions by adding SET search_path TO ''
-- This prevents search path injection attacks

CREATE OR REPLACE FUNCTION public.link_whatsapp_conversation_to_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_contact_id uuid;
  v_conversation_id uuid;
BEGIN
  -- Alleen uitvoeren als customer_phone aanwezig is
  IF NEW.customer_phone IS NOT NULL AND NEW.calendar_id IS NOT NULL THEN
    
    -- Zoek het contact op basis van telefoonnummer
    SELECT id INTO v_contact_id
    FROM public.whatsapp_contacts
    WHERE phone_number = NEW.customer_phone;
    
    -- Als contact gevonden, update de conversation met calendar_id
    IF v_contact_id IS NOT NULL THEN
      UPDATE public.whatsapp_conversations 
      SET calendar_id = NEW.calendar_id,
          last_message_at = COALESCE(last_message_at, NOW())
      WHERE contact_id = v_contact_id 
        AND calendar_id IS NULL;
      
      -- Log voor debugging
      INSERT INTO public.webhook_events (calendar_id, event_type, payload)
      VALUES (
        NEW.calendar_id,
        'whatsapp.conversation.linked',
        jsonb_build_object(
          'booking_id', NEW.id,
          'contact_phone', NEW.customer_phone,
          'contact_id', v_contact_id,
          'linked_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_booking_conflicts(p_calendar_id uuid, p_start_time timestamp with time zone, p_end_time timestamp with time zone, p_exclude_booking_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  conflict_count integer;
BEGIN
  -- Tel het aantal conflicterende boekingen
  SELECT COUNT(*) INTO conflict_count
  FROM public.bookings
  WHERE calendar_id = p_calendar_id
    AND status NOT IN ('cancelled', 'no-show')
    AND (
      -- Nieuwe booking start tijdens bestaande booking
      (p_start_time >= start_time AND p_start_time < end_time)
      OR
      -- Nieuwe booking eindigt tijdens bestaande booking
      (p_end_time > start_time AND p_end_time <= end_time)
      OR
      -- Nieuwe booking omvat bestaande booking volledig
      (p_start_time <= start_time AND p_end_time >= end_time)
    )
    AND (p_exclude_booking_id IS NULL OR id != p_exclude_booking_id);
  
  -- Return true als er conflicten zijn
  RETURN conflict_count > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_whatsapp_contact_limit(p_user_id uuid, p_calendar_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_current_count integer;
  v_max_contacts integer;
  v_subscription_tier text;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM public.users 
  WHERE id = p_user_id;
  
  -- Get max contacts based on subscription tier
  SELECT max_whatsapp_contacts INTO v_max_contacts
  FROM public.subscription_tiers
  WHERE tier_name = v_subscription_tier::subscription_tier;
  
  -- If unlimited (null), return true
  IF v_max_contacts IS NULL THEN
    RETURN true;
  END IF;
  
  -- Count current WhatsApp contacts for this user's calendars
  SELECT COUNT(DISTINCT wc.id) INTO v_current_count
  FROM public.whatsapp_contacts wc
  JOIN public.whatsapp_conversations conv ON wc.id = conv.contact_id
  JOIN public.calendars cal ON conv.calendar_id = cal.id
  WHERE cal.user_id = p_user_id;
  
  -- Return true if under limit
  RETURN v_current_count < v_max_contacts;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_team_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_invitation RECORD;
  v_user_id uuid;
  v_new_calendar_id uuid;
BEGIN
  -- Get invitation details
  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > now();
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired invitation'
    );
  END IF;
  
  -- Get or create user
  SELECT public.create_team_member_user(
    v_invitation.email,
    v_invitation.full_name,
    v_invitation.calendar_id
  ) INTO v_user_id;
  
  -- Create personal calendar for the new team member
  INSERT INTO public.calendars (
    user_id,
    name,
    slug,
    description,
    is_default
  ) VALUES (
    v_user_id,
    COALESCE(v_invitation.full_name, 'Mijn Kalender'),
    'cal-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
    'Persoonlijke kalender',
    true
  ) RETURNING id INTO v_new_calendar_id;
  
  -- Add team member to the inviting calendar
  INSERT INTO public.calendar_members (
    calendar_id,
    user_id,
    role,
    invited_by,
    accepted_at
  ) VALUES (
    v_invitation.calendar_id,
    v_user_id,
    v_invitation.role,
    v_invitation.invited_by,
    now()
  ) ON CONFLICT (calendar_id, user_id) DO UPDATE SET
    role = v_invitation.role,
    accepted_at = now();
  
  -- Mark invitation as accepted
  UPDATE public.team_invitations
  SET status = 'accepted', accepted_at = now()
  WHERE id = v_invitation.id;
  
  -- Create webhook event
  INSERT INTO public.webhook_events (calendar_id, event_type, payload)
  VALUES (
    v_invitation.calendar_id,
    'team.invitation.accepted',
    jsonb_build_object(
      'user_id', v_user_id,
      'email', v_invitation.email,
      'role', v_invitation.role,
      'personal_calendar_id', v_new_calendar_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'personal_calendar_id', v_new_calendar_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_calendar_availability(p_calendar_slug text, p_start_date date DEFAULT CURRENT_DATE, p_days integer DEFAULT 14)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_calendar_id uuid;
  v_end_date date;
  v_result json;
BEGIN
  -- Haal calendar ID op via slug
  SELECT id INTO v_calendar_id
  FROM public.calendars
  WHERE slug = p_calendar_slug 
    AND is_active = true;
    
  IF v_calendar_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Calendar not found'
    );
  END IF;
  
  v_end_date := p_start_date + (p_days || ' days')::interval;
  
  -- Haal beschikbare slots op voor alle actieve service types
  SELECT json_agg(
    json_build_object(
      'date', slot_date,
      'service_type_id', service_type_id,
      'service_name', service_name,
      'duration', service_duration,
      'price', service_price,
      'slots', slots_array
    )
  ) INTO v_result
  FROM (
    SELECT 
      slots.slot_date,
      st.id as service_type_id,
      st.name as service_name,
      st.duration as service_duration,
      st.price as service_price,
      json_agg(
        json_build_object(
          'start_time', slots.slot_start,
          'end_time', slots.slot_end,
          'available', slots.is_available
        ) ORDER BY slots.slot_start
      ) as slots_array
    FROM public.service_types st
    CROSS JOIN LATERAL public.get_available_slots_range(
      v_calendar_id,
      st.id,
      p_start_date,
      v_end_date
    ) as slots
    WHERE st.calendar_id = v_calendar_id 
      AND st.is_active = true
    GROUP BY slots.slot_date, st.id, st.name, st.duration, st.price
    ORDER BY slots.slot_date, st.name
  ) availability_data;
  
  RETURN json_build_object(
    'success', true,
    'calendar_id', v_calendar_id,
    'availability', COALESCE(v_result, '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_recurring_availability(p_calendar_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(resolved_date date, pattern_id uuid, availability_rules jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  pattern_record record;
  processing_date date;
  week_offset integer;
  day_of_month integer;
  week_of_month integer;
BEGIN
  -- Loop through all active recurring patterns for this calendar
  FOR pattern_record IN 
    SELECT * FROM public.recurring_availability 
    WHERE calendar_id = p_calendar_id 
      AND is_active = true 
      AND start_date <= p_end_date 
      AND (end_date IS NULL OR end_date >= p_start_date)
  LOOP
    processing_date := GREATEST(pattern_record.start_date, p_start_date);
    
    WHILE processing_date <= p_end_date AND 
          (pattern_record.end_date IS NULL OR processing_date <= pattern_record.end_date) 
    LOOP
      CASE pattern_record.pattern_type
        WHEN 'weekly' THEN
          -- Weekly pattern: check if current day matches
          IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'biweekly' THEN
          -- Biweekly pattern: alternate weeks
          week_offset := FLOOR(EXTRACT(EPOCH FROM (processing_date - pattern_record.start_date)) / (7 * 24 * 3600))::integer;
          IF week_offset % 2 = 0 AND 
             (pattern_record.schedule_data->>'week1_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week1_availability';
          ELSIF week_offset % 2 = 1 AND 
                (pattern_record.schedule_data->>'week2_days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
            RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'week2_availability';
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'monthly' THEN
          -- Monthly pattern: specific weeks of month
          week_of_month := CEIL(EXTRACT(DAY FROM processing_date) / 7.0)::integer;
          day_of_month := EXTRACT(DAY FROM processing_date)::integer;
          
          -- Check for "first/last" patterns
          IF (pattern_record.schedule_data->>'occurrence' = 'first' AND week_of_month = 1) OR
             (pattern_record.schedule_data->>'occurrence' = 'last' AND 
              processing_date + 7 > (date_trunc('month', processing_date) + interval '1 month - 1 day')::date) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        WHEN 'seasonal' THEN
          -- Seasonal pattern: date ranges within year
          IF (EXTRACT(MONTH FROM processing_date) >= (pattern_record.schedule_data->>'start_month')::integer AND
              EXTRACT(MONTH FROM processing_date) <= (pattern_record.schedule_data->>'end_month')::integer) THEN
            IF (pattern_record.schedule_data->>'days')::jsonb ? EXTRACT(DOW FROM processing_date)::text THEN
              RETURN QUERY SELECT processing_date, pattern_record.id, pattern_record.schedule_data->'availability';
            END IF;
          END IF;
          processing_date := processing_date + 1;
          
        ELSE
          processing_date := processing_date + 1;
      END CASE;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_waitlist_for_cancelled_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  waitlist_entry record;
  service_duration integer;
  booking_start_time timestamp with time zone;
  booking_end_time timestamp with time zone;
BEGIN
  -- Only process when a booking is cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    -- Get service duration
    SELECT duration INTO service_duration
    FROM public.service_types
    WHERE id = NEW.service_type_id;
    
    booking_start_time := NEW.start_time;
    booking_end_time := NEW.end_time;
    
    -- Find matching waitlist entries
    FOR waitlist_entry IN 
      SELECT * FROM public.waitlist
      WHERE calendar_id = NEW.calendar_id
        AND service_type_id = NEW.service_type_id
        AND status = 'waiting'
        AND preferred_date = booking_start_time::date
        AND (
          flexibility = 'anytime' OR
          (flexibility = 'morning' AND EXTRACT(HOUR FROM booking_start_time) < 12) OR
          (flexibility = 'afternoon' AND EXTRACT(HOUR FROM booking_start_time) >= 12) OR
          (flexibility = 'specific' AND 
           booking_start_time::time >= COALESCE(preferred_time_start, '00:00'::time) AND
           booking_start_time::time <= COALESCE(preferred_time_end, '23:59'::time))
        )
      ORDER BY created_at ASC
      LIMIT 1
    LOOP
      -- Create booking for waitlist entry
      INSERT INTO public.bookings (
        calendar_id,
        service_type_id,
        customer_name,
        customer_email,
        start_time,
        end_time,
        status,
        notes
      ) VALUES (
        waitlist_entry.calendar_id,
        waitlist_entry.service_type_id,
        waitlist_entry.customer_name,
        waitlist_entry.customer_email,
        booking_start_time,
        booking_end_time,
        'confirmed',
        'Converted from waitlist'
      );
      
      -- Update waitlist entry status
      UPDATE public.waitlist
      SET status = 'converted',
          notified_at = now()
      WHERE id = waitlist_entry.id;
      
      -- Exit after converting first match
      EXIT;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;