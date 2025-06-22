
-- Fix RLS policies voor calendars tabel zodat gebruikers hun eigen kalenders kunnen aanmaken

-- Verwijder bestaande policies als ze bestaan
DROP POLICY IF EXISTS "Users can view their own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can insert their own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can update their own calendars" ON calendars;
DROP POLICY IF EXISTS "Users can delete their own calendars" ON calendars;

-- Maak nieuwe policies voor calendars tabel
CREATE POLICY "Users can view their own calendars"
ON calendars FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendars"
ON calendars FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendars"
ON calendars FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendars"
ON calendars FOR DELETE
USING (auth.uid() = user_id);

-- Zorg ervoor dat RLS is ingeschakeld op de calendars tabel
ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

-- Ook policies voor calendar_settings tabel (deze wordt automatisch aangemaakt)
DROP POLICY IF EXISTS "Users can manage calendar settings" ON calendar_settings;

CREATE POLICY "Users can manage calendar settings"
ON calendar_settings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM calendars 
    WHERE calendars.id = calendar_settings.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- En voor service_types tabel
DROP POLICY IF EXISTS "Users can manage service types" ON service_types;

CREATE POLICY "Users can manage service types"
ON service_types FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM calendars 
    WHERE calendars.id = service_types.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

-- Calendar members tabel policies
DROP POLICY IF EXISTS "Users can view calendar members" ON calendar_members;
DROP POLICY IF EXISTS "Users can manage calendar members" ON calendar_members;

CREATE POLICY "Users can view calendar members"
ON calendar_members FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM calendars 
    WHERE calendars.id = calendar_members.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage calendar members"
ON calendar_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM calendars 
    WHERE calendars.id = calendar_members.calendar_id 
    AND calendars.user_id = auth.uid()
  )
);
