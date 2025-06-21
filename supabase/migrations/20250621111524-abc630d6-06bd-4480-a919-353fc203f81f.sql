
-- Update bookings table to work with existing calendar system
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_duration INTEGER DEFAULT 30;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_calendar_date ON bookings(calendar_id, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- Enable real-time for bookings table
ALTER TABLE bookings REPLICA IDENTITY FULL;

-- Add bookings to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
  END IF;
END $$;
