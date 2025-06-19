
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

export interface WhatsAppTemplate {
  id: string;
  calendar_id: string;
  template_key: string;
  language: string;
  content: string;
  variables?: string[];
  quick_replies?: QuickReply[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuickReply {
  text: string;
  payload: string;
}

export interface QuickReplyFlow {
  id: string;
  calendar_id: string;
  flow_name: string;
  trigger_keywords: string[];
  flow_data: FlowData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FlowData {
  steps: FlowStep[];
  initial_step: string;
}

export interface FlowStep {
  id: string;
  type: 'message' | 'question' | 'action';
  content?: string;
  quick_replies?: QuickReply[];
  next_step?: string;
  conditions?: FlowCondition[];
  action_type?: 'create_booking_intent' | 'check_availability' | 'send_template';
  action_params?: Record<string, any>;
}

export interface FlowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'not_equals';
  value: string;
  next_step: string;
}

export interface TemplateRenderResult {
  success: boolean;
  content?: string;
  quick_replies?: QuickReply[];
  template_key?: string;
  error?: string;
}

export interface FlowMatchResult {
  success: boolean;
  flow_id?: string;
  flow_name?: string;
  flow_data?: FlowData;
  matched_keyword?: string;
  message?: string;
}

// Nieuwe types voor webhook queue
export interface WhatsAppWebhookQueue {
  id: string;
  webhook_type: 'message' | 'status' | 'contact_update';
  payload: Record<string, any>;
  processed: boolean;
  processed_at?: string;
  error?: string;
  retry_count: number;
  created_at: string;
}

export interface WhatsAppIncomingMessage {
  phone_number: string;
  message_id: string;
  message_content: string;
  message_type?: 'text' | 'image' | 'audio' | 'document';
  media_url?: string;
  timestamp?: string;
}

export interface WhatsAppStatusUpdate {
  message_id: string;
  status: 'delivered' | 'read' | 'failed';
  timestamp: string;
}

export type TemplateKey = 'welcome' | 'booking_confirm' | 'reminder' | 'booking_request' | 'availability_check';
export type FlowTriggerKeyword = string;
export type WhatsAppMessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type WhatsAppMessageType = 'text' | 'image' | 'audio' | 'document' | 'location';
export type WhatsAppConversationStatus = 'active' | 'closed' | 'archived';
export type BookingIntentStatus = 'collecting_info' | 'ready_to_book' | 'booked' | 'abandoned';
export type ContextType = 'booking_intent' | 'service_preference' | 'availability_discussed' | 'customer_info' | 'previous_interaction';
