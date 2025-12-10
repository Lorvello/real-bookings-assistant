-- Add trigger on bookings table to refresh business_overview
CREATE TRIGGER trigger_bookings_business_overview_refresh
  AFTER INSERT OR UPDATE OR DELETE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_business_overview_refresh();