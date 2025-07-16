export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
  business_type?: string;
  phone?: string;
  subscription_status?: 'trial' | 'active' | 'expired' | 'cancelled';
  trial_start_date?: string;
  trial_end_date?: string;
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
  is_default: boolean;
  description?: string;
  color: string;
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
  whatsapp_bot_active: boolean;
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

export interface Booking {
  id: string;
  calendar_id: string;
  service_type_id?: string;
  customer_name: string;
  customer_email?: string | null; // Now properly nullable
  customer_phone?: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no-show';
  notes?: string;
  internal_notes?: string;
  total_price?: number;
  confirmation_token?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export type BusinessType = 'salon' | 'clinic' | 'consultant' | 'trainer' | 'other';

export interface WebhookEndpoint {
  id: string;
  calendar_id: string;
  webhook_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEvent {
  id: string;
  calendar_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  last_attempt_at?: string;
  created_at: string;
}

export interface RecurringAvailability {
  id: string;
  calendar_id: string;
  pattern_type: 'weekly' | 'biweekly' | 'monthly' | 'seasonal';
  pattern_name: string;
  start_date: string;
  end_date?: string;
  schedule_data: {
    // Weekly pattern
    days?: string[];
    time_slots?: { start: string; end: string }[];
    availability?: { time_slots: { start: string; end: string }[] };
    
    // Biweekly pattern
    week1_days?: string[];
    week2_days?: string[];
    week1_availability?: { time_slots: { start: string; end: string }[] };
    week2_availability?: { time_slots: { start: string; end: string }[] };
    
    // Monthly pattern
    occurrence?: 'first' | 'last';
    
    // Seasonal pattern
    start_month?: number;
    end_month?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarMember {
  id: string;
  calendar_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  created_at: string;
}

export interface WhatsAppContactOverview {
  contact_id: string;
  phone_number: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  session_id?: string;
  calendar_id?: string;
  calendar_name?: string;
  business_name?: string;
  booking_id?: string;
  laatste_booking?: string;
  laatste_service?: string;
  booking_status?: string;
  last_seen_at?: string;
  contact_created_at?: string;
  conversation_status?: string;
  last_message_at?: string;
  conversation_created_at?: string;
  updated_at?: string;
}
