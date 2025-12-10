-- Add triggers for automatic business_overview_v2 sync

-- 1. Bookings trigger
CREATE TRIGGER trigger_bookings_v2_refresh
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- 2. Service types trigger  
CREATE TRIGGER trigger_service_types_v2_refresh
  AFTER INSERT OR UPDATE OR DELETE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- 3. Calendars trigger
CREATE TRIGGER trigger_calendars_v2_refresh
  AFTER INSERT OR UPDATE OR DELETE ON calendars
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- 4. Calendar settings trigger
CREATE TRIGGER trigger_calendar_settings_v2_refresh
  AFTER INSERT OR UPDATE OR DELETE ON calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- 5. Availability rules trigger
CREATE TRIGGER trigger_availability_rules_v2_refresh
  AFTER INSERT OR UPDATE OR DELETE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- 6. Users trigger (for business info updates)
CREATE TRIGGER trigger_users_v2_refresh
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (
    OLD.business_name IS DISTINCT FROM NEW.business_name OR
    OLD.business_email IS DISTINCT FROM NEW.business_email OR
    OLD.business_phone IS DISTINCT FROM NEW.business_phone OR
    OLD.business_whatsapp IS DISTINCT FROM NEW.business_whatsapp OR
    OLD.business_type IS DISTINCT FROM NEW.business_type OR
    OLD.business_description IS DISTINCT FROM NEW.business_description OR
    OLD.business_street IS DISTINCT FROM NEW.business_street OR
    OLD.business_city IS DISTINCT FROM NEW.business_city OR
    OLD.business_country IS DISTINCT FROM NEW.business_country OR
    OLD.website IS DISTINCT FROM NEW.website OR
    OLD.instagram IS DISTINCT FROM NEW.instagram OR
    OLD.facebook IS DISTINCT FROM NEW.facebook OR
    OLD.linkedin IS DISTINCT FROM NEW.linkedin
  )
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();