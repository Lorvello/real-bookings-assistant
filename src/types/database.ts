
export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
}

export interface CalendarSettings {
  id: string;
  calendar_id: string;
  booking_window_days: number;
  minimum_notice_hours: number;
  slot_duration: number;
  buffer_time: number;
  max_bookings_per_day?: number;
  allow_waitlist: boolean;
  confirmation_required: boolean;
  created_at: string;
}

export interface ServiceType {
  id: string;
  calendar_id: string;
  name: string;
  description?: string;
  duration: number;
  price?: number;
  color: string;
  is_active: boolean;
  max_attendees: number;
  preparation_time: number;
  cleanup_time: number;
  created_at: string;
}

export interface AvailabilitySchedule {
  id: string;
  calendar_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
}

export interface AvailabilityRule {
  id: string;
  schedule_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
}

export interface AvailabilityOverride {
  id: string;
  calendar_id: string;
  date: string;
  is_available: boolean;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_at: string;
}

export type BusinessType = 'salon' | 'clinic' | 'consultant' | 'trainer' | 'other';
