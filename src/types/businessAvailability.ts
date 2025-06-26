
import { Json } from '@/integrations/supabase/types';

export interface BusinessAvailabilityOverview {
  user_id: string;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_whatsapp: string | null;
  business_type: string | null;
  business_description: string | null;
  business_street: string | null;
  business_number: string | null;
  business_postal: string | null;
  business_city: string | null;
  business_country: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  calendar_id: string;
  calendar_name: string;
  calendar_slug: string;
  timezone: string;
  calendar_active: boolean;
  calendar_description: string | null;
  calendar_color: string;
  booking_window_days: number;
  minimum_notice_hours: number;
  slot_duration: number;
  buffer_time: number;
  max_bookings_per_day: number | null;
  allow_waitlist: boolean;
  confirmation_required: boolean;
  whatsapp_bot_active: boolean;
  service_type_id: string | null;
  service_name: string | null;
  service_description: string | null;
  service_duration: number | null;
  service_price: number | null;
  service_color: string | null;
  service_active: boolean | null;
  max_attendees: number | null;
  preparation_time: number | null;
  cleanup_time: number | null;
  schedule_id: string | null;
  schedule_name: string | null;
  is_default_schedule: boolean | null;
  formatted_opening_hours: string | null;
  availability_rules: Json | null;
  recent_overrides: Json | null;
  current_month_stats: Json | null;
  last_updated: string;
  calendar_created_at: string;
  business_created_at: string;
}

export interface BusinessSlot {
  business_name: string;
  calendar_name: string;
  service_name: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  is_available: boolean;
  service_price: number;
  service_duration: number;
}

export interface BusinessOverviewFilters {
  business_name?: string;
  calendar_slug?: string;
  business_type?: string;
  city?: string;
}
