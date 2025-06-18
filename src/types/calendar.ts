
export interface Calendar {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
  settings?: CalendarSettings;
  service_types?: ServiceType[];
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

export interface WhatsAppStatus {
  isConnected: boolean;
  lastSeen?: Date;
  phoneNumber?: string;
}
