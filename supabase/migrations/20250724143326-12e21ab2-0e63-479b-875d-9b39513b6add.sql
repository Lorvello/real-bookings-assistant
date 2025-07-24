-- Fix kritieke Supabase security issues
-- Enable RLS op belangrijke publieke tabellen

-- 1. Enable RLS op daily_booking_stats als dat nog niet is gedaan
ALTER TABLE public.daily_booking_stats ENABLE ROW LEVEL SECURITY;

-- Policy voor daily_booking_stats - alleen eigenaren kunnen hun data zien
CREATE POLICY "daily_booking_stats_owner_view" ON public.daily_booking_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = daily_booking_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- 2. Enable RLS op service_popularity_stats als dat nog niet is gedaan
ALTER TABLE public.service_popularity_stats ENABLE ROW LEVEL SECURITY;

-- Policy voor service_popularity_stats - alleen eigenaren kunnen hun data zien
CREATE POLICY "service_popularity_stats_owner_view" ON public.service_popularity_stats
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.calendars 
    WHERE calendars.id = service_popularity_stats.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- 3. Enable RLS op user_status_overview als dat nog niet is gedaan
ALTER TABLE public.user_status_overview ENABLE ROW LEVEL SECURITY;

-- Policy voor user_status_overview - alleen eigen status kunnen zien
CREATE POLICY "user_status_overview_own_view" ON public.user_status_overview
FOR SELECT USING (id = auth.uid());