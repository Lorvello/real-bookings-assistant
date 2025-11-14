
import { Json } from '@/integrations/supabase/types';

export interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
  service_name: string;
  is_available: boolean;
}

export interface UpcomingBooking {
  booking_id: string;
  customer_name: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  total_price: number | null;
}

export interface Service {
  service_id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  color: string;
  is_active: boolean;
}

export interface OpeningHours {
  [day: string]: {
    start_time: string;
    end_time: string;
    is_available: boolean;
  };
}

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
  available_slots: AvailableSlot[];
  upcoming_bookings: UpcomingBooking[];
  services: Service[];
  opening_hours: OpeningHours;
  total_bookings: number;
  total_revenue: number;
  created_at: string;
  last_updated: string;
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
