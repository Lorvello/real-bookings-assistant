
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
  stripe_test_price_id?: string;
  stripe_live_price_id?: string;
  supports_installments?: boolean;
  installment_options?: InstallmentOption[];
  payment_description?: string;
  tax_enabled?: boolean;
  tax_behavior?: 'inclusive' | 'exclusive';
  tax_code?: string;
  created_at: string;
}

export interface InstallmentOption {
  id: string;
  name: string;
  description?: string;
  payments: InstallmentPayment[];
}

export interface InstallmentPayment {
  order: number;
  percentage: number;
  amount: number;
  due_days: number;
  description?: string;
}

export interface WhatsAppStatus {
  isConnected: boolean;
  lastSeen?: Date;
  phoneNumber?: string;
}
