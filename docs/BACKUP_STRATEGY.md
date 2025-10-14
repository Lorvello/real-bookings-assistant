# 🛡️ Backup Strategy - BookingsAssistant

## Overview

This document outlines the comprehensive backup strategy for BookingsAssistant SaaS platform. Our strategy ensures **Recovery Point Objective (RPO) of 24 hours** and **Recovery Time Objective (RTO) of 4 hours** for critical services.

---

## 1. Automated Backup Schedule

### Supabase Automatic Backups

**Configuration:**
- **Frequency**: Daily at 02:00 UTC
- **Retention**: 30 days (rolling window)
- **Storage**: Supabase infrastructure (encrypted at rest with AES-256)
- **Verification**: Automated integrity checks by Supabase
- **Access**: Via Supabase Dashboard → Database → Backups

**Verification Procedure:**
```bash
# Check latest backup status via Supabase CLI
npx supabase db dump --remote > /dev/null 2>&1
echo $? # Should return 0 for success
```

**Alert Configuration:**
- ✅ Enabled: Email alerts for backup failures
- ✅ Enabled: Database size monitoring (alert at 80% quota)
- ⚠️ Manual: Weekly verification that backups completed successfully

### Manual Backup Schedule

| Frequency | Scope | Trigger | Retention |
|-----------|-------|---------|-----------|
| **Weekly** | Critical tables (users, calendars, bookings) | Automated script | 3 months |
| **Monthly** | Full database + edge functions | Automated script | 1 year |
| **Pre-Deployment** | Full database snapshot | Manual trigger | 90 days |
| **On-Demand** | Specific tables or data ranges | Admin request | 30 days |

**Weekly Backup Command:**
```bash
# Run export script (see section 2)
cd supabase/scripts
npx tsx export-critical-data.ts --mode weekly
```

**Monthly Backup Command:**
```bash
# Full database export with encryption
npx tsx export-critical-data.ts --mode full --encrypt
```

---

## 2. Data Export Procedures

### Critical Tables Priority List (16 Tables)

#### Tier 1: Authentication & Access Control (Loss = System Failure)
1. **users** - User accounts, subscription status, business information
2. **user_roles** - Admin and role assignments
3. **user_security_settings** - 2FA, password policies, security preferences
4. **login_history** - Audit trail for security compliance

#### Tier 2: Business Core (Loss = Revenue Impact)
5. **calendars** - Business calendars with slugs and settings
6. **calendar_settings** - WhatsApp integration, Stripe configuration
7. **service_types** - Service offerings with pricing
8. **bookings** - All booking records (critical revenue data)

#### Tier 3: Financial (Loss = Payment Disruption)
9. **business_stripe_accounts** - Stripe Connect account mappings
10. **booking_payments** - Payment transaction records
11. **payment_settings** - Payment configuration per calendar
12. **installment_payments** - Installment payment schedules

#### Tier 4: Communication (Loss = Customer Relationship Impact)
13. **whatsapp_contacts** - Customer contact database
14. **whatsapp_conversations** - Conversation history
15. **whatsapp_messages** - Full message archive

#### Tier 5: Operational (Loss = Debugging Difficulty)
16. **webhook_events** - Event log for n8n integration debugging
17. **security_events_log** - Security audit trail

### Export Formats

**JSON Export (Recommended for Most Tables):**
```json
{
  "metadata": {
    "export_date": "2025-01-14T02:00:00Z",
    "table_name": "bookings",
    "row_count": 15432,
    "schema_version": "1.0",
    "checksum": "sha256:abc123..."
  },
  "data": [
    { "id": "...", "customer_name": "..." }
  ]
}
```

**SQL Dump (For Full Database Restore):**
```sql
-- Generated with pg_dump
-- PostgreSQL database dump
-- Contains schema + data
```

### Encryption Strategy

**PGP Encryption (for sensitive data):**
```bash
# Generate encryption key pair (do once, store securely)
gpg --gen-key --batch <<EOF
Key-Type: RSA
Key-Length: 4096
Name-Real: BookingsAssistant Backup
Name-Email: backup@bookingsassistant.com
Expire-Date: 1y
EOF

# Encrypt backup file
gpg --encrypt --recipient backup@bookingsassistant.com export.json

# Decrypt when needed
gpg --decrypt export.json.gpg > export.json
```

**Key Rotation Schedule:**
- Generate new key pair annually
- Maintain 2 previous keys for decrypting old backups
- Store keys in secure password manager (1Password, Bitwarden)
- Never commit keys to Git repository

### Storage Locations

**❌ DO NOT STORE:**
- In Git repository (too large, security risk)
- In Supabase Storage public buckets
- On local development machines only

**✅ APPROVED STORAGE:**
- AWS S3 with server-side encryption (SSE-S3 or SSE-KMS)
- Google Cloud Storage with customer-managed encryption keys
- Azure Blob Storage with encryption at rest
- Dedicated backup server with disk encryption
- Encrypted external hard drive (offline backups)

**Folder Structure:**
```
backups/
├── daily/
│   └── 2025-01-14/
│       ├── users.json.gz.pgp
│       ├── bookings.json.gz.pgp
│       └── checksums.sha256
├── weekly/
│   └── 2025-W02/
│       └── critical-tables.sql.gz.pgp
├── monthly/
│   └── 2025-01/
│       └── full-database.sql.gz.pgp
└── pre-deployment/
    └── 2025-01-10-feature-xyz/
        └── snapshot.sql.gz.pgp
```

---

## 3. Backup Retention Policy

### Retention Schedule

| Backup Type | Frequency | Retention Period | Auto-Delete After | Storage Cost Est. |
|-------------|-----------|------------------|-------------------|-------------------|
| **Daily** (Supabase) | Daily | 30 days | Automatic by Supabase | Included in plan |
| **Weekly** (Manual) | Weekly | 3 months (12 weeks) | Manual cleanup | ~5 GB |
| **Monthly** (Full) | Monthly | 1 year (12 months) | Manual cleanup | ~60 GB |
| **Pre-Deployment** | On-demand | 90 days | Manual cleanup | ~20 GB |

### Compliance Considerations

**GDPR Compliance:**
- User data backups retained for maximum 1 year after account deletion
- Right to be forgotten: Backups excluded from restore if user requested deletion
- Encrypted backups to protect PII

**Data Protection Impact:**
- All backups encrypted at rest
- Access logs maintained for audit trail
- Backup access restricted to admins only

### Cleanup Automation

**Automated Cleanup Script:**
```typescript
// Run monthly to delete expired backups
// File: supabase/scripts/cleanup-old-backups.ts

const retentionPolicies = {
  weekly: 90 * 24 * 60 * 60 * 1000, // 90 days
  monthly: 365 * 24 * 60 * 60 * 1000, // 1 year
  'pre-deployment': 90 * 24 * 60 * 60 * 1000 // 90 days
};

// Delete files older than retention period
// Generate cleanup report for audit trail
```

---

## 4. Backup Verification Procedures

### Daily Verification (Automated)

**Supabase Backup Health Check:**
```sql
-- Query to verify latest backup metadata
SELECT 
  NOW() - MAX(created_at) AS time_since_last_backup,
  COUNT(*) AS backup_count_30_days
FROM system_health_alerts
WHERE alert_type = 'backup_completed'
  AND created_at > NOW() - INTERVAL '30 days';

-- Expected: time_since_last_backup < 25 hours
```

### Weekly Verification (Semi-Automated)

**Run Test Restore:**
```bash
# 1. Download latest weekly backup
# 2. Restore to test database
# 3. Run validation queries (see test-backup-restore.ts)
# 4. Destroy test database
# 5. Generate report
npx tsx supabase/scripts/test-backup-restore.ts --weekly
```

### Monthly Verification (Manual)

**Full Disaster Recovery Drill:**
1. ✅ Select random monthly backup
2. ✅ Restore to isolated Supabase project
3. ✅ Validate all 16 critical tables
4. ✅ Test application connectivity
5. ✅ Document restoration time
6. ✅ Delete test project

**Validation Checklist:**
- [ ] All tables restored with correct row counts
- [ ] Foreign key relationships intact
- [ ] No orphaned records detected
- [ ] Edge functions deployable
- [ ] Stripe Connect accounts retrievable
- [ ] WhatsApp integration data complete

---

## 5. Backup Access Control

### Who Can Access Backups

| Role | Daily (Supabase) | Weekly (Manual) | Monthly (Full) | Restoration |
|------|------------------|-----------------|----------------|-------------|
| **Admin** | ✅ View | ✅ Download | ✅ Download | ✅ Full access |
| **Developer** | ✅ View | ❌ No access | ❌ No access | ❌ No access |
| **Support** | ❌ No access | ❌ No access | ❌ No access | ❌ No access |

### Access Audit Trail

**Log All Backup Access:**
```sql
-- Stored in security_events_log table
INSERT INTO security_events_log (
  event_type,
  event_category,
  severity,
  user_id,
  event_data
) VALUES (
  'backup_accessed',
  'data_access',
  'medium',
  auth.uid(),
  jsonb_build_object(
    'backup_type', 'monthly',
    'backup_date', '2025-01-01',
    'action', 'download'
  )
);
```

---

## 6. Emergency Backup Procedures

### Immediate Backup Trigger Scenarios

**Trigger emergency backup if:**
1. 🚨 Security breach detected (compromised credentials)
2. 🚨 Data corruption suspected (checksum mismatches)
3. 🚨 Major deployment about to occur (>50 files changed)
4. 🚨 Database migration planned (schema changes)
5. 🚨 User reports data loss or inconsistency

**Emergency Backup Command:**
```bash
# One-line emergency backup (run from project root)
npx tsx supabase/scripts/export-critical-data.ts \
  --mode emergency \
  --encrypt \
  --notify admin@bookingsassistant.com
```

**Output:**
```
✅ Emergency backup completed
📦 Exported 16 tables (1.2 GB compressed)
🔐 Encrypted with PGP key: backup@bookingsassistant.com
📧 Notification sent to: admin@bookingsassistant.com
📍 Backup location: backups/emergency/2025-01-14-15-30/
⏱️  Total time: 4 minutes 32 seconds
```

---

## 7. Backup Cost Estimation

### Storage Costs (Estimated)

**Monthly Storage:**
- Daily backups (Supabase): $0 (included in plan)
- Weekly exports (3 months): ~5 GB × $0.023/GB = **$0.12/month**
- Monthly backups (1 year): ~60 GB × $0.023/GB = **$1.38/month**
- Pre-deployment backups: ~20 GB × $0.023/GB = **$0.46/month**

**Total: ~$2/month** (AWS S3 Standard pricing)

### Data Transfer Costs

- Export from Supabase: Free (same region)
- Restoration to Supabase: Free
- Download for verification: ~1 GB/month = **$0.09/month**

**Total Estimated Backup Infrastructure: $2.10/month**

---

## 8. Backup Monitoring Dashboard

### Key Metrics to Track

1. **Backup Success Rate**: 100% target (alert if <100%)
2. **Backup Duration**: <10 minutes for daily, <30 minutes for full
3. **Backup Size Growth**: Track month-over-month (predict quota issues)
4. **Restore Test Success Rate**: 100% (quarterly validation)
5. **Time Since Last Backup**: <25 hours (alert threshold)

### Monitoring Query

```sql
-- Dashboard query for backup health
SELECT 
  DATE_TRUNC('day', created_at) AS backup_date,
  COUNT(*) FILTER (WHERE alert_type = 'backup_completed') AS successful_backups,
  COUNT(*) FILTER (WHERE alert_type = 'backup_failed') AS failed_backups,
  AVG(CAST(event_data->>'duration_seconds' AS INTEGER)) AS avg_duration_seconds
FROM system_health_alerts
WHERE alert_type LIKE 'backup_%'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY backup_date
ORDER BY backup_date DESC;
```

---

## 9. Restoration Priority Matrix

### Critical Path to Recovery (Priority Order)

**Phase 1: Authentication (0-30 minutes)**
1. Restore `users` table
2. Restore `user_roles` table
3. Restore `user_security_settings` table
4. ✅ Validate: Users can log in

**Phase 2: Business Core (30-90 minutes)**
5. Restore `calendars` table
6. Restore `calendar_settings` table
7. Restore `service_types` table
8. ✅ Validate: Calendar pages load

**Phase 3: Bookings & Revenue (90-180 minutes)**
9. Restore `bookings` table
10. Restore `booking_payments` table
11. Restore `business_stripe_accounts` table
12. ✅ Validate: Booking history visible, payments retrievable

**Phase 4: Communication (180-240 minutes)**
13. Restore `whatsapp_contacts` table
14. Restore `whatsapp_conversations` table
15. Restore `whatsapp_messages` table
16. ✅ Validate: WhatsApp integration functional

**Total RTO: 4 hours**

---

## 10. Contact Information

**For backup-related issues:**
- Primary: engineering@bookingsassistant.com
- Escalation: See `docs/EMERGENCY_CONTACTS.md`

**External Support:**
- Supabase Support: support@supabase.io
- Supabase Status: https://status.supabase.com

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-01-14 | 1.0 | Initial backup strategy documentation | AI Assistant |

---

**Next Steps:**
1. ✅ Review and approve this strategy
2. ⏳ Implement export scripts (see `supabase/scripts/export-critical-data.ts`)
3. ⏳ Set up monitoring dashboard (see `supabase/functions/database-health-monitor/`)
4. ⏳ Schedule first quarterly disaster recovery test
