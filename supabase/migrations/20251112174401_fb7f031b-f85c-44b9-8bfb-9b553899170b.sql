-- Fix error_logs RLS policy to allow NULL user_id for anonymous errors
DROP POLICY IF EXISTS error_logs_owner_insert ON error_logs;

CREATE POLICY error_logs_owner_insert ON error_logs 
FOR INSERT 
TO public 
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);

-- Add comment explaining the policy
COMMENT ON POLICY error_logs_owner_insert ON error_logs IS 
'Allows inserting error logs for both anonymous errors (user_id = NULL) and authenticated user errors (user_id = auth.uid())';