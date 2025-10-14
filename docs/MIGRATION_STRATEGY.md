# 🔄 Zero-Downtime Migration Strategy

## Database Version Upgrades

### Blue-Green Deployment Pattern

```sql
-- Step 1: Create new schema version
CREATE SCHEMA IF NOT EXISTS public_v2;

-- Step 2: Copy tables to new schema
CREATE TABLE public_v2.bookings AS SELECT * FROM public.bookings;

-- Step 3: Create sync triggers
CREATE OR REPLACE FUNCTION sync_to_schema_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public_v2.bookings VALUES (NEW.*)
  ON CONFLICT (id) DO UPDATE SET
    start_time = NEW.start_time,
    end_time = NEW.end_time,
    updated_at = NEW.updated_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_bookings_to_v2
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION sync_to_schema_v2();

-- Step 4: Switch reads to new schema (gradual)
-- Step 5: Deprecate old schema after 48 hours
```

### Pre-Migration Checklist

- [ ] Create database snapshot
- [ ] Test migration in staging environment
- [ ] Use `IF NOT EXISTS` for all DDL statements
- [ ] Use `CREATE INDEX CONCURRENTLY` (no locks)
- [ ] Verify rollback procedure works
- [ ] Schedule migration during low-traffic period

### Rollback Procedure

```sql
-- If migration fails, rollback immediately
DROP SCHEMA public_v2 CASCADE;
DROP TRIGGER sync_bookings_to_v2 ON public.bookings;
-- Restore from snapshot if data corrupted
```

## Zero-Downtime Deployment

**Key Principles:**
1. Never lock tables during migrations
2. Keep old schema for 48-hour rollback window
3. Use feature flags for gradual rollout
4. Monitor query performance post-deployment

**Deployment Window:** 48 hours for full cutover
