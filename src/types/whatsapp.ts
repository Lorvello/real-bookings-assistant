
export interface WhatsAppContact {
  id: string;
  phone_number: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string;
  linked_customer_email?: string;
  metadata: Record<string, any>;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversation {
  id: string;
  calendar_id: string;
  contact_id: string;
  status: 'active' | 'closed' | 'archived';
  context: Record<string, any>;
  last_message_at?: string;
  created_at: string;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  message_id?: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'document' | 'location';
  content?: string;
  media_url?: string;
  metadata: Record<string, any>;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
}

export interface ConversationContext {
  id: string;
  conversation_id: string;
  context_type: 'booking_intent' | 'service_preference' | 'availability_discussed' | 'customer_info' | 'previous_interaction';
  context_data: Record<string, any>;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BookingIntent {
  id: string;
  conversation_id: string;
  service_type_id?: string;
  preferred_date?: string;
  preferred_time_slot?: string; // 'morning', 'afternoon', 'specific: 14:00'
  status: 'collecting_info' | 'ready_to_book' | 'booked' | 'abandoned';
  collected_data: Record<string, any>;
  booking_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMemory {
  contact?: WhatsAppContact;
  conversation?: WhatsAppConversation;
  recent_messages?: WhatsAppMessage[];
  active_booking_intent?: BookingIntent;
  context_history?: ConversationContext[];
  previous_bookings?: any[];
}

export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'document' | 'location';
export type WhatsAppConversationStatus = 'active' | 'closed' | 'archived';
export type BookingIntentStatus = 'collecting_info' | 'ready_to_book' | 'booked' | 'abandoned';
export type ContextType = 'booking_intent' | 'service_preference' | 'availability_discussed' | 'customer_info' | 'previous_interaction';
