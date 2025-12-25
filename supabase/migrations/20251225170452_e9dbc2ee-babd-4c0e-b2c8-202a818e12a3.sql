-- Create triggers on relevant tables to automatically refresh business_overview_v2

-- Trigger on calendars
CREATE TRIGGER trigger_calendars_refresh_business_overview_v2
  AFTER INSERT OR UPDATE OR DELETE ON calendars
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- Trigger on service_types
CREATE TRIGGER trigger_service_types_refresh_business_overview_v2
  AFTER INSERT OR UPDATE OR DELETE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- Trigger on bookings
CREATE TRIGGER trigger_bookings_refresh_business_overview_v2
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- Trigger on calendar_settings
CREATE TRIGGER trigger_calendar_settings_refresh_business_overview_v2
  AFTER INSERT OR UPDATE OR DELETE ON calendar_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();

-- Trigger on availability_rules
CREATE TRIGGER trigger_availability_rules_refresh_business_overview_v2
  AFTER INSERT OR UPDATE OR DELETE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_v2_refresh();