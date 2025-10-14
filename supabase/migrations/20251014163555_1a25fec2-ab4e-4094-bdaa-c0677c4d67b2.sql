-- PHASE 1: Enhanced Security Audit Logging Schema

-- Add new columns to security_events_log
ALTER TABLE security_events_log 
ADD COLUMN IF NOT EXISTS event_category TEXT,
ADD COLUMN IF NOT EXISTS resource_type TEXT,
ADD COLUMN IF NOT EXISTS resource_id UUID,
ADD COLUMN IF NOT EXISTS previous_value JSONB,
ADD COLUMN IF NOT EXISTS new_value JSONB,
ADD COLUMN IF NOT EXISTS request_headers JSONB,
ADD COLUMN IF NOT EXISTS geo_location TEXT,
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_security_events_category ON security_events_log(event_category);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events_log(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events_log(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_events_risk_score ON security_events_log(risk_score) WHERE risk_score > 0;

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  failure_reason TEXT,
  user_agent TEXT,
  geo_location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_ip ON failed_login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_failed_login_time ON failed_login_attempts(attempt_time DESC);

-- RLS policies for failed_login_attempts
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all failed login attempts"
ON failed_login_attempts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service role can insert failed login attempts"
ON failed_login_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create archived_security_events table (cold storage)
CREATE TABLE IF NOT EXISTS archived_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_category TEXT,
  severity TEXT DEFAULT 'low',
  user_id UUID,
  calendar_id UUID,
  ip_address INET,
  user_agent TEXT,
  resource_type TEXT,
  resource_id UUID,
  previous_value JSONB,
  new_value JSONB,
  event_data JSONB,
  risk_score INTEGER DEFAULT 0,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archived_events_created_at ON archived_security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_events_archived_at ON archived_security_events(archived_at DESC);

-- Enable RLS on archived table
ALTER TABLE archived_security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view archived security events"
ON archived_security_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Function to archive old security events (retention policy)
CREATE OR REPLACE FUNCTION archive_old_security_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive events older than retention policy
  WITH archived AS (
    DELETE FROM security_events_log
    WHERE (
      (severity = 'critical' AND created_at < NOW() - INTERVAL '1 year') OR
      (severity = 'high' AND created_at < NOW() - INTERVAL '6 months') OR
      (severity IN ('medium', 'low') AND created_at < NOW() - INTERVAL '3 months')
    )
    RETURNING *
  )
  INSERT INTO archived_security_events (
    id, event_type, event_category, severity, user_id, calendar_id,
    ip_address, user_agent, resource_type, resource_id, previous_value,
    new_value, event_data, risk_score, blocked, created_at
  )
  SELECT 
    id, event_type, event_category, severity, user_id, calendar_id,
    ip_address, user_agent, resource_type, resource_id, previous_value,
    new_value, event_data, risk_score, blocked, created_at
  FROM archived;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;