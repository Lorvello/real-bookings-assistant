
export interface BookingInfo {
  booking_id: string;
  calendar_id: string;
  calendar_name: string | null;
  business_name: string | null;
  start_time: string;
  end_time: string;
  service_type_id: string | null;
  service_name: string | null;
  status: string;
  customer_name: string;
  customer_email: string | null;
}

export interface WhatsAppContactOverview {
  contact_id: string;
  phone_number: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  session_id?: string;
  last_seen_at?: string;
  contact_created_at?: string;
  conversation_status?: string;
  last_message_at?: string;
  conversation_created_at?: string;
  updated_at?: string;
  with_business?: string;
  all_bookings: BookingInfo[];
}
