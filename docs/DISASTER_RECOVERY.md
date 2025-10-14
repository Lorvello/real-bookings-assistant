# 🚨 Disaster Recovery Runbook - BookingsAssistant

## Recovery Objectives

- **Recovery Time Objective (RTO)**: 4 hours for critical services
- **Recovery Point Objective (RPO)**: 24 hours maximum data loss
- **Mean Time To Recovery (MTTR)**: 2 hours (target)

---

## Critical Services Hierarchy

### Tier 1: Critical (Must Restore First)
- Database (Supabase PostgreSQL)
- Authentication (Supabase Auth)
- User accounts & roles

### Tier 2: High Priority (Restore Within 4 Hours)
- Booking system
- Calendar management
- Stripe payment processing

### Tier 3: Normal Priority (Restore Within 8 Hours)
- WhatsApp integration
- Webhook processing
- Analytics & reporting

---

## Disaster Scenario #1: Database Unavailable

**Symptoms:**
- Supabase dashboard shows "Database Unavailable"
- Application throws `ECONNREFUSED` errors
- Health check endpoint fails 3+ consecutive times

**Detection:**
```bash
# Health check command
curl -f https://grdgjhkygzciwwrxgvgy.supabase.co/rest/v1/ \
  -H "apikey: [ANON_KEY]" || echo "DATABASE DOWN"
```

**Root Causes:**
1. Supabase infrastructure outage (check https://status.supabase.com)
2. Database connection pool exhausted
3. Disk space full (>95% quota)
4. Database corruption

**Recovery Procedure:**

**STEP 1: Assess Impact (5 minutes)**
```bash
# Check Supabase status page
curl -s https://status.supabase.com/api/v2/status.json | jq '.status.description'

# If "All Systems Operational" → problem is on our side
# If degraded → wait for Supabase recovery or proceed with restore
```

**STEP 2: Attempt Quick Fix (10 minutes)**
```sql
-- If database responds intermittently, try connection pool reset
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
  AND state_change < NOW() - INTERVAL '10 minutes';

-- Clear query cache
DISCARD ALL;

-- Vacuum dead tuples (if disk space issue)
VACUUM ANALYZE;
```

**STEP 3: Restore from Backup (90 minutes)**

**3a. Create New Supabase Project (if catastrophic failure)**
```bash
# Via Supabase Dashboard
# 1. Create new project: bookingsassistant-recovery
# 2. Note new project URL and keys
# 3. Download latest backup
```

**3b. Restore Database**
```bash
# Download backup from Supabase (if available)
npx supabase db dump --remote --project-id grdgjhkygzciwwrxgvgy > backup.sql

# OR use our encrypted backup
gpg --decrypt backups/daily/2025-01-14/full-database.sql.gz.pgp | gunzip > backup.sql

# Restore to new database
psql "postgresql://postgres:[PASSWORD]@[NEW_PROJECT_REF].supabase.co:5432/postgres" < backup.sql
```

**STEP 4: Update Application Configuration (15 minutes)**
```typescript
// Update src/integrations/supabase/client.ts
const SUPABASE_URL = "https://[NEW_PROJECT_REF].supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "[NEW_ANON_KEY]";

// Redeploy application
git commit -am "Emergency: Switch to recovery database"
git push origin main
```

**STEP 5: Validation (10 minutes)**
```sql
-- Verify critical tables
SELECT 
  'users' AS table_name, 
  COUNT(*) AS row_count 
FROM users
UNION ALL
SELECT 'calendars', COUNT(*) FROM calendars
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'booking_payments', COUNT(*) FROM booking_payments;

-- Expected: Row counts match pre-disaster state (±5%)
```

**STEP 6: Smoke Test (10 minutes)**
- ✅ Log in as admin user
- ✅ View calendar page
- ✅ Create test booking
- ✅ Check payment history
- ✅ Send test WhatsApp message

**Rollback Plan:**
If restoration fails, switch back to original database URL:
```bash
git revert HEAD
git push origin main
```

**Estimated Recovery Time: 2 hours**

**Post-Recovery Actions:**
- [ ] Document incident in post-mortem
- [ ] Update emergency contact list
- [ ] Review backup retention policy
- [ ] Schedule disaster recovery drill

---

## Disaster Scenario #2: Edge Function Timeout

**Symptoms:**
- HTTP 504 Gateway Timeout errors
- Edge function logs show "Function invocation timed out"
- Users report "Server not responding" errors

**Detection:**
```typescript
// Monitor edge function health
const response = await fetch('https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/health-check');
if (!response.ok || response.status === 504) {
  console.error('Edge function timeout detected');
}
```

**Root Causes:**
1. Cold start delays (function not invoked recently)
2. Inefficient database queries (missing indexes)
3. External API timeouts (Stripe, WhatsApp)
4. Memory limit exceeded (default 150MB)

**Recovery Procedure:**

**STEP 1: Identify Failing Function (5 minutes)**
```bash
# Check edge function logs
# Via Supabase Dashboard → Edge Functions → [function-name] → Logs
# Look for: "Function execution exceeded time limit"
```

**STEP 2: Quick Fix - Redeploy Function (10 minutes)**
```bash
# Redeploy function to reset state
cd supabase/functions/[function-name]
# Make trivial change (add comment)
git commit -am "Redeploy [function-name] to fix timeout"
git push origin main

# Lovable will auto-deploy the function
```

**STEP 3: Increase Memory/Timeout (if redeploy fails) (5 minutes)**
```toml
# supabase/config.toml
[functions.function-name]
verify_jwt = true
memory_mb = 512  # Increased from 150MB
timeout_ms = 30000  # Increased from 10000ms
```

**STEP 4: Optimize Query (if database-related) (30 minutes)**
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  total_exec_time,
  mean_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- >1 second
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Add missing indexes (see migration 20251014213639)
-- Restart edge function after index creation
```

**STEP 5: Validation (5 minutes)**
```bash
# Test edge function directly
curl -X POST https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/[function-name] \
  -H "Authorization: Bearer [ANON_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: 200 OK response within 3 seconds
```

**Estimated Recovery Time: 15 minutes**

**Prevention:**
- Implement database query optimization (indexes created in latest migration)
- Use connection pooling for external APIs
- Add request timeout handling with graceful degradation

---

## Disaster Scenario #3: Stripe Webhook Failures

**Symptoms:**
- `webhook_events` table shows `status='failed'`
- Payments successful in Stripe Dashboard but not reflected in app
- Email notifications not sent for completed bookings

**Detection:**
```sql
-- Check for failed webhooks in last 24 hours
SELECT 
  COUNT(*) AS failed_webhook_count,
  event_type,
  error_message
FROM webhook_events
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, error_message;
```

**Root Causes:**
1. Stripe webhook signature verification failed
2. Database write failed (RLS policy blocked insert)
3. n8n workflow not configured correctly
4. Network timeout between Stripe and Supabase

**Recovery Procedure:**

**STEP 1: Identify Failed Events (10 minutes)**
```sql
-- Get list of failed events with details
SELECT 
  id,
  event_type,
  stripe_event_id,
  error_message,
  created_at
FROM webhook_events
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '48 hours'
ORDER BY created_at DESC;
```

**STEP 2: Resend Webhooks from Stripe (15 minutes)**
```bash
# Via Stripe Dashboard
# 1. Go to Developers → Webhooks → [your-endpoint]
# 2. Click "Events" tab
# 3. Find failed events (filter by date)
# 4. Click "Resend" button for each failed event

# OR via Stripe CLI
stripe events resend evt_1ABC123...
```

**STEP 3: Verify Webhook Endpoint (5 minutes)**
```bash
# Test webhook endpoint directly
curl -X POST https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/stripe-webhook \
  -H "stripe-signature: [test-signature]" \
  -H "Content-Type: application/json" \
  -d @test-webhook-payload.json

# Expected: 200 OK response
```

**STEP 4: Update Payment Status Manually (if urgent) (20 minutes)**
```sql
-- For critical payments, manually update booking_payments table
UPDATE booking_payments
SET 
  status = 'succeeded',
  paid_at = NOW(),
  updated_at = NOW()
WHERE stripe_payment_intent_id = 'pi_ABC123...'
  AND status = 'pending';

-- Send manual confirmation email (via n8n or admin panel)
```

**STEP 5: Fix Root Cause (30 minutes)**

**If signature verification failed:**
```typescript
// Update webhook secret in Supabase secrets
// Via Supabase Dashboard → Edge Functions → Secrets
// Add or update: STRIPE_WEBHOOK_SECRET = whsec_...

// Verify webhook endpoint URL in Stripe Dashboard matches:
// https://grdgjhkygzciwwrxgvgy.supabase.co/functions/v1/stripe-webhook
```

**If RLS policy blocked:**
```sql
-- Grant service role access to webhook_events
CREATE POLICY "service_role_all_webhook_events"
ON webhook_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

**STEP 6: Validation (10 minutes)**
```bash
# Create test payment in Stripe Dashboard
# Verify webhook processed successfully
# Check booking_payments table updated
# Verify confirmation email sent
```

**Estimated Recovery Time: 30 minutes**

**Post-Recovery:**
- [ ] Review webhook logs for patterns
- [ ] Set up monitoring alerts for failed webhooks
- [ ] Document webhook debugging procedure

---

## Disaster Scenario #4: Data Corruption

**Symptoms:**
- Checksum validation fails on export
- Foreign key violations detected
- Users report missing or incorrect data
- Orphaned records found in database

**Detection:**
```sql
-- Check for orphaned bookings (no matching calendar)
SELECT COUNT(*) AS orphaned_bookings
FROM bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM calendars c WHERE c.id = b.calendar_id
);
-- Expected: 0

-- Check for orphaned payments (no matching booking)
SELECT COUNT(*) AS orphaned_payments
FROM booking_payments bp
WHERE NOT EXISTS (
  SELECT 1 FROM bookings b WHERE b.id = bp.booking_id
);
-- Expected: 0
```

**Root Causes:**
1. Failed migration left partial data
2. Application bug caused invalid writes
3. Manual database modification without constraints
4. Hardware failure (rare with Supabase)

**Recovery Procedure:**

**STEP 1: Assess Corruption Scope (15 minutes)**
```sql
-- Run comprehensive data integrity checks
-- Check all foreign key relationships
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- For each relationship, verify no orphans exist
```

**STEP 2: Identify Corruption Timestamp (10 minutes)**
```sql
-- Find when corruption started by checking created_at/updated_at
SELECT 
  MIN(created_at) AS first_corrupt_record,
  MAX(created_at) AS last_corrupt_record,
  COUNT(*) AS total_corrupt_records
FROM [affected_table]
WHERE [corruption_condition];

-- Example: Bookings without matching calendars
SELECT 
  MIN(b.created_at),
  MAX(b.created_at),
  COUNT(*)
FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM calendars c WHERE c.id = b.calendar_id);
```

**STEP 3: Point-in-Time Restore (90 minutes)**
```bash
# Restore database to timestamp BEFORE corruption
# Via Supabase Dashboard → Database → Backups
# 1. Select backup from before corruption timestamp
# 2. Click "Restore" (creates new project)
# 3. Migrate recent valid data manually

# OR use Supabase CLI
npx supabase db dump \
  --remote \
  --project-id grdgjhkygzciwwrxgvgy \
  --use-copy \
  --timestamp "2025-01-13 14:30:00+00" > pre-corruption-backup.sql
```

**STEP 4: Repair Corrupted Data (45 minutes)**

**Option A: Delete orphaned records (if non-critical)**
```sql
-- DELETE orphaned bookings (if calendar was legitimately deleted)
DELETE FROM bookings
WHERE NOT EXISTS (SELECT 1 FROM calendars c WHERE c.id = calendar_id);

-- Verify deletion
SELECT COUNT(*) FROM bookings; -- Should match expected count
```

**Option B: Restore missing parent records (if data loss)**
```sql
-- Restore missing calendars from backup
INSERT INTO calendars (id, user_id, name, slug, ...)
SELECT id, user_id, name, slug, ...
FROM pre_corruption_backup.calendars
WHERE id IN (
  SELECT DISTINCT calendar_id FROM bookings
  WHERE NOT EXISTS (SELECT 1 FROM calendars c WHERE c.id = calendar_id)
);
```

**STEP 5: Validation (20 minutes)**
```sql
-- Re-run all integrity checks
-- Should return 0 for all queries
SELECT COUNT(*) FROM bookings b
WHERE NOT EXISTS (SELECT 1 FROM calendars c WHERE c.id = b.calendar_id);

SELECT COUNT(*) FROM booking_payments bp
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.id = bp.booking_id);

SELECT COUNT(*) FROM whatsapp_messages wm
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_conversations wc WHERE wc.id = wm.conversation_id);

-- All should return 0
```

**STEP 6: Root Cause Analysis (60 minutes)**
```sql
-- Review recent migrations for issues
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

-- Check application logs for failed writes
-- Review security_events_log for anomalies
SELECT * FROM security_events_log
WHERE created_at > [corruption_timestamp]
  AND severity IN ('high', 'critical')
ORDER BY created_at DESC;
```

**Estimated Recovery Time: 3 hours**

**Prevention:**
- ✅ Enable foreign key constraints on all tables
- ✅ Add database triggers for validation
- ✅ Implement application-level validation
- ✅ Run weekly data integrity checks

---

## Disaster Scenario #5: WhatsApp Integration Down

**Symptoms:**
- No WhatsApp messages received for 10+ minutes
- QR code won't scan
- `whatsapp_conversations` table shows `status='inactive'`
- Users report "WhatsApp bot not responding"

**Detection:**
```sql
-- Check for recent WhatsApp activity
SELECT 
  MAX(created_at) AS last_message_time,
  NOW() - MAX(created_at) AS time_since_last_message
FROM whatsapp_messages;

-- Alert if time_since_last_message > 10 minutes during business hours
```

**Root Causes:**
1. WhatsApp session expired (phone disconnected)
2. n8n workflow stopped or erroring
3. WhatsApp Business API rate limit exceeded
4. Phone number changed or deactivated

**Recovery Procedure:**

**STEP 1: Verify n8n Workflow Status (5 minutes)**
```bash
# Check n8n workflow logs
# Via n8n Dashboard → Workflows → WhatsApp Booking Assistant
# Look for: "Workflow execution failed" or "Connection timeout"

# Test n8n webhook endpoint
curl -X POST [N8N_WEBHOOK_URL] \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'

# Expected: 200 OK response
```

**STEP 2: Regenerate WhatsApp QR Code (10 minutes)**
```sql
-- Update calendar_settings to trigger QR regeneration
UPDATE calendar_settings
SET 
  whatsapp_qr_url = NULL,
  whatsapp_qr_generated_at = NULL,
  whatsapp_bot_active = false
WHERE calendar_id = [affected_calendar_id];

-- Application will auto-generate new QR on next page load
-- User must scan QR with WhatsApp to reconnect
```

**STEP 3: Reconnect WhatsApp Device (15 minutes)**
```
1. Navigate to Calendar Settings → WhatsApp Integration
2. Click "Disconnect WhatsApp" (if currently showing connected)
3. Click "Generate QR Code"
4. Scan QR code with phone (WhatsApp → Settings → Linked Devices → Link a Device)
5. Wait for "Connected" status
6. Send test message to verify
```

**STEP 4: Validation (5 minutes)**
```bash
# Send test message to WhatsApp number
# Verify message appears in whatsapp_messages table
# Check n8n workflow executed successfully
# Verify auto-reply sent

# SQL validation
SELECT * FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 5;
```

**Estimated Recovery Time: 20 minutes**

**Prevention:**
- Monitor `whatsapp_bot_active` status daily
- Set up alerts for session disconnections
- Document QR reconnection procedure for users
- Implement automatic session refresh (if WhatsApp API supports)

---

## Disaster Scenario #6: Stripe Connect Account Suspended

**Symptoms:**
- `charges_enabled=false` in `business_stripe_accounts` table
- Payment attempts fail with "Account suspended" error
- Stripe Dashboard shows "Action Required" banner
- Users can't receive payments

**Detection:**
```sql
-- Check for suspended Stripe accounts
SELECT 
  calendar_id,
  stripe_account_id,
  account_status,
  charges_enabled,
  payouts_enabled
FROM business_stripe_accounts
WHERE charges_enabled = false
  OR account_status = 'suspended';
```

**Root Causes:**
1. Missing verification documents (ID, business proof)
2. High dispute/refund rate (>1%)
3. Terms of Service violation
4. Suspicious transaction patterns

**Recovery Procedure:**

**STEP 1: Identify Suspension Reason (10 minutes)**
```bash
# Via Stripe Dashboard
# 1. Log in to Stripe Connect account
# 2. Check "Account Status" banner for details
# 3. Navigate to "Settings" → "Account" for requirements

# Common reasons:
# - "Verification documents needed"
# - "High dispute rate detected"
# - "Unusual activity pattern"
```

**STEP 2: Contact Stripe Support (Immediate)**
```
Email: support@stripe.com
Subject: Urgent - Connect Account Suspended - [stripe_account_id]

Body:
Hello Stripe Support,

Our Stripe Connect account (acct_XXX) has been suspended, blocking
payments for our SaaS platform. 

Account Details:
- Stripe Account ID: acct_XXX
- Business Name: BookingsAssistant
- Suspension Reason: [from dashboard]
- Impact: 50+ businesses unable to accept payments

We are available to provide any required documents immediately.
Please advise on expedited resolution steps.

Thank you,
[Your Name]
[Contact Info]
```

**STEP 3: Submit Required Documents (30-60 minutes)**
```
Via Stripe Dashboard → Account → Verification

Commonly Required:
✅ Government-issued ID (passport, driver's license)
✅ Business registration documents
✅ Proof of address (utility bill, bank statement)
✅ Website screenshot showing terms of service
✅ Customer support contact information
```

**STEP 4: Implement Temporary Workaround (2 hours)**

**Option A: Enable Manual Payment Collection**
```sql
-- Disable payment requirement temporarily
UPDATE payment_settings
SET payment_required_for_booking = false
WHERE calendar_id IN (
  SELECT calendar_id FROM business_stripe_accounts
  WHERE charges_enabled = false
);

-- Notify affected users via email
INSERT INTO webhook_events (event_type, calendar_id, event_data)
SELECT 
  'stripe_account_suspended',
  calendar_id,
  jsonb_build_object(
    'stripe_account_id', stripe_account_id,
    'action', 'payments_disabled_temporarily'
  )
FROM business_stripe_accounts
WHERE charges_enabled = false;
```

**Option B: Migrate to New Stripe Account (if permanent suspension)**
```sql
-- Create new Stripe Connect account
-- Via application UI or Stripe Dashboard

-- Update business_stripe_accounts table
UPDATE business_stripe_accounts
SET 
  stripe_account_id = '[new_account_id]',
  account_status = 'active',
  charges_enabled = true,
  payouts_enabled = true,
  onboarding_completed = true
WHERE stripe_account_id = '[old_suspended_account_id]';

-- User must complete onboarding again
```

**STEP 5: Validation (15 minutes)**
```bash
# Test payment creation with Stripe API
stripe payment_intents create \
  --amount 5000 \
  --currency eur \
  --destination acct_NEW_ACCOUNT_ID \
  --confirm

# Expected: Payment successful (status=succeeded)
```

**Estimated Recovery Time: 24-48 hours (Stripe review)**

**Prevention:**
- Maintain dispute rate <0.5%
- Provide clear refund policy
- Upload verification documents proactively
- Monitor Stripe Dashboard weekly for warnings

---

## Disaster Scenario #7: Security Breach (Unauthorized Access)

**Symptoms:**
- Anomalous `login_history` entries (unusual IP addresses)
- Unexpected admin role assignments in `user_roles` table
- Data modifications not authorized by legitimate users
- Multiple failed login attempts followed by success

**Detection:**
```sql
-- Check for suspicious login activity
SELECT 
  user_id,
  ip_address,
  location_country,
  login_time,
  risk_score
FROM login_history
WHERE (
  risk_score > 70 
  OR location_country NOT IN ('NL', 'BE', 'DE')  -- Adjust for your expected countries
  OR flagged_as_suspicious = true
)
  AND login_time > NOW() - INTERVAL '7 days'
ORDER BY login_time DESC;
```

**Root Causes:**
1. Compromised user credentials (phishing attack)
2. SQL injection vulnerability (rare with Supabase)
3. Stolen session token
4. Insider threat

**Recovery Procedure:**

**STEP 1: Immediate Containment (5 minutes)**
```sql
-- Revoke all active sessions for affected user
UPDATE user_sessions
SET 
  is_active = false,
  updated_at = NOW()
WHERE user_id = [compromised_user_id]
  AND is_active = true;

-- Force password reset
UPDATE user_security_settings
SET 
  force_password_change = true,
  password_changed_at = NOW()
WHERE user_id = [compromised_user_id];
```

**STEP 2: Audit Unauthorized Actions (20 minutes)**
```sql
-- Review all actions by compromised account
SELECT 
  event_type,
  event_category,
  severity,
  event_data,
  created_at
FROM security_events_log
WHERE user_id = [compromised_user_id]
  AND created_at > [suspected_breach_timestamp]
ORDER BY created_at DESC;

-- Check for data modifications
SELECT 
  table_name,
  operation,
  old_data,
  new_data,
  performed_at
FROM audit_trail  -- If implemented
WHERE performed_by = [compromised_user_id]
  AND performed_at > [suspected_breach_timestamp];
```

**STEP 3: Rollback Unauthorized Changes (30 minutes)**
```sql
-- Revert unauthorized role assignments
DELETE FROM user_roles
WHERE user_id IN (
  SELECT DISTINCT jsonb_extract_path_text(event_data, 'target_user_id')::uuid
  FROM security_events_log
  WHERE user_id = [compromised_user_id]
    AND event_type = 'role_assigned'
    AND created_at > [breach_timestamp]
);

-- Restore modified data from backup (if available)
-- See Disaster Scenario #4 for data restoration steps
```

**STEP 4: Notify Affected Users (15 minutes)**
```sql
-- Send security breach notification emails
INSERT INTO webhook_events (event_type, event_data)
VALUES (
  'security_breach_notification',
  jsonb_build_object(
    'affected_users', ARRAY[...],
    'breach_type', 'unauthorized_access',
    'actions_taken', 'sessions_revoked_password_reset_required',
    'sent_at', NOW()
  )
);
```

**STEP 5: Forensic Analysis (60 minutes)**
```sql
-- Collect evidence for analysis
SELECT 
  lh.user_id,
  lh.ip_address,
  lh.user_agent,
  lh.login_time,
  lh.device_fingerprint,
  COUNT(*) OVER (PARTITION BY lh.ip_address) AS logins_from_ip
FROM login_history lh
WHERE lh.login_time > [breach_timestamp] - INTERVAL '7 days'
ORDER BY lh.login_time DESC;

-- Export for security team review
\copy (SELECT * FROM security_events_log WHERE created_at > [breach_timestamp]) TO 'breach_evidence.csv' CSV HEADER;
```

**STEP 6: Implement Additional Security Measures (Ongoing)**
```sql
-- Enable 2FA for all admin users
UPDATE user_security_settings
SET two_factor_required = true
WHERE user_id IN (
  SELECT user_id FROM user_roles WHERE role = 'admin'
);

-- Implement IP allowlisting for admin access (if applicable)
-- Increase password strength requirements
-- Schedule security audit
```

**Estimated Recovery Time: 1 hour (containment), 24 hours (full forensics)**

**Post-Incident:**
- [ ] File incident report
- [ ] Review access control policies
- [ ] Conduct security training for team
- [ ] Consider penetration testing

---

## Disaster Scenario #8: Database Performance Degradation

**Symptoms:**
- Query execution time >1 second
- Application feels slow and unresponsive
- Supabase Dashboard shows high CPU usage (>80%)
- Connection pool warnings

**Detection:**
```sql
-- Identify slow queries
SELECT 
  query,
  calls,
  total_exec_time / 1000 AS total_seconds,
  mean_exec_time / 1000 AS avg_seconds,
  max_exec_time / 1000 AS max_seconds
FROM pg_stat_statements
WHERE mean_exec_time > 1000  -- >1 second average
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Recovery Procedure:**

**STEP 1: Immediate Performance Boost (15 minutes)**
```sql
-- Terminate long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes'
  AND query NOT LIKE '%pg_stat_activity%';

-- Vacuum and analyze tables
VACUUM ANALYZE;

-- Rebuild bloated indexes
REINDEX DATABASE postgres;
```

**STEP 2: Add Missing Indexes (30 minutes)**
```sql
-- Already implemented in migration 20251014213639
-- If new slow queries identified, create targeted indexes

CREATE INDEX CONCURRENTLY idx_custom_slow_query
ON [table_name]([column1], [column2]);

-- Use CONCURRENTLY to avoid table locks
```

**STEP 3: Optimize Query Plans (45 minutes)**
```sql
-- Analyze specific slow query
EXPLAIN ANALYZE
[slow_query_here];

-- Look for:
-- - "Seq Scan" on large tables (needs index)
-- - "Nested Loop" with high cost (needs join optimization)
-- - "Sort" operations (consider indexed column order)

-- Rewrite inefficient queries
-- Example: Replace NOT EXISTS with LEFT JOIN
```

**Estimated Recovery Time: 45 minutes**

---

## Disaster Scenario #9: Complete Data Loss (Catastrophic)

**Symptoms:**
- Database unreachable for 24+ hours
- Supabase project deleted or corrupted
- No accessible backups in Supabase

**Recovery Procedure:**

**STEP 1: Activate Disaster Recovery Team (Immediate)**
- Contact: engineering@bookingsassistant.com
- Escalate to Level 4 (see EMERGENCY_CONTACTS.md)

**STEP 2: Restore from Encrypted Off-Site Backup (3 hours)**
```bash
# Retrieve backup from secure storage (AWS S3, external drive)
# Decrypt backup
gpg --decrypt backups/monthly/2025-01/full-database.sql.gz.pgp | gunzip > restore.sql

# Create new Supabase project
# Restore database
psql "[new_project_connection_string]" < restore.sql
```

**STEP 3: Full System Smoke Test (2 hours)**
- ✅ All 16 critical tables restored
- ✅ User authentication working
- ✅ Booking creation functional
- ✅ Payment processing operational
- ✅ WhatsApp integration active

**Estimated Recovery Time: 6-8 hours**

---

## Emergency Contact Escalation

**Level 1: Self-Service (0-15 min)** → Use this runbook  
**Level 2: Engineering Team (15-60 min)** → engineering@bookingsassistant.com  
**Level 3: External Support (60+ min)** → Supabase, Stripe support  
**Level 4: Critical Incident (Data breach)** → security@bookingsassistant.com  

---

## Post-Disaster Checklist

After any disaster recovery:
- [ ] Document incident timeline
- [ ] Update runbook with lessons learned
- [ ] Test backup restoration (validate recovery worked)
- [ ] Schedule post-mortem meeting
- [ ] Review and update monitoring alerts
- [ ] Communicate resolution to stakeholders

---

**Last Updated:** 2025-01-14  
**Next Review:** 2025-04-14 (Quarterly)
