export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      availability_overrides: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          is_available: boolean | null
          reason: string | null
          start_time: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          start_time?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          is_available?: boolean | null
          reason?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "availability_overrides_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      availability_rules: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          schedule_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          schedule_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          schedule_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "availability_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_schedules: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "availability_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      booking_intents: {
        Row: {
          booking_id: string | null
          collected_data: Json | null
          conversation_id: string | null
          created_at: string | null
          id: string
          preferred_date: string | null
          preferred_time_slot: string | null
          service_type_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          collected_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          service_type_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          collected_data?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          preferred_date?: string | null
          preferred_time_slot?: string | null
          service_type_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_intents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_intents_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "booking_intents_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "booking_intents_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_duration: number | null
          calendar_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          end_time: string
          id: string
          internal_notes: string | null
          notes: string | null
          service_name: string | null
          service_type_id: string | null
          start_time: string
          status: string | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          booking_duration?: number | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          end_time: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          service_name?: string | null
          service_type_id?: string | null
          start_time: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          booking_duration?: number | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          end_time?: string
          id?: string
          internal_notes?: string | null
          notes?: string | null
          service_name?: string | null
          service_type_id?: string | null
          start_time?: string
          status?: string | null
          total_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_members: {
        Row: {
          accepted_at: string | null
          calendar_id: string
          created_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          calendar_id: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          calendar_id?: string
          created_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_settings: {
        Row: {
          allow_waitlist: boolean | null
          booking_window_days: number | null
          buffer_time: number | null
          calendar_id: string | null
          confirmation_required: boolean | null
          created_at: string | null
          id: string
          last_bot_activity: string | null
          max_bookings_per_day: number | null
          minimum_notice_hours: number | null
          slot_duration: number | null
          whatsapp_bot_active: boolean | null
        }
        Insert: {
          allow_waitlist?: boolean | null
          booking_window_days?: number | null
          buffer_time?: number | null
          calendar_id?: string | null
          confirmation_required?: boolean | null
          created_at?: string | null
          id?: string
          last_bot_activity?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          slot_duration?: number | null
          whatsapp_bot_active?: boolean | null
        }
        Update: {
          allow_waitlist?: boolean | null
          booking_window_days?: number | null
          buffer_time?: number | null
          calendar_id?: string | null
          confirmation_required?: boolean | null
          created_at?: string | null
          id?: string
          last_bot_activity?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          slot_duration?: number | null
          whatsapp_bot_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string | null
          slug: string | null
          timezone: string | null
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_context: {
        Row: {
          context_data: Json
          context_type: string
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          context_data: Json
          context_type: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          context_data?: Json
          context_type?: string
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_context_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          error_context: Json | null
          error_message: string
          error_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          error_context?: Json | null
          error_message: string
          error_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          error_context?: Json | null
          error_message?: string
          error_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      quick_reply_flows: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          flow_data: Json
          flow_name: string
          id: string
          is_active: boolean | null
          trigger_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          flow_data: Json
          flow_name: string
          id?: string
          is_active?: boolean | null
          trigger_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          flow_data?: Json
          flow_name?: string
          id?: string
          is_active?: boolean | null
          trigger_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quick_reply_flows_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "quick_reply_flows_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_reply_flows_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      recurring_availability: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          pattern_name: string
          pattern_type: string | null
          schedule_data: Json
          start_date: string
          updated_at: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          pattern_name: string
          pattern_type?: string | null
          schedule_data: Json
          start_date: string
          updated_at?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          pattern_name?: string
          pattern_type?: string | null
          schedule_data?: Json
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_availability_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "recurring_availability_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_availability_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      service_types: {
        Row: {
          calendar_id: string | null
          cleanup_time: number | null
          color: string | null
          created_at: string | null
          description: string | null
          duration: number
          id: string
          is_active: boolean | null
          max_attendees: number | null
          name: string
          preparation_time: number | null
          price: number | null
        }
        Insert: {
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration: number
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          name: string
          preparation_time?: number | null
          price?: number | null
        }
        Update: {
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean | null
          max_attendees?: number | null
          name?: string
          preparation_time?: number | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      users: {
        Row: {
          business_name: string | null
          business_type: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_type?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          customer_email: string
          customer_name: string
          expires_at: string | null
          flexibility: string | null
          id: string
          notified_at: string | null
          preferred_date: string
          preferred_time_end: string | null
          preferred_time_start: string | null
          service_type_id: string | null
          status: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          customer_email: string
          customer_name: string
          expires_at?: string | null
          flexibility?: string | null
          id?: string
          notified_at?: string | null
          preferred_date: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_type_id?: string | null
          status?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          expires_at?: string | null
          flexibility?: string | null
          id?: string
          notified_at?: string | null
          preferred_date?: string
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          service_type_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "waitlist_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "waitlist_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "waitlist_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "waitlist_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "webhook_endpoints_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number | null
          calendar_id: string | null
          created_at: string | null
          event_type: string
          id: string
          last_attempt_at: string | null
          payload: Json
          status: string | null
        }
        Insert: {
          attempts?: number | null
          calendar_id?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          last_attempt_at?: string | null
          payload: Json
          status?: string | null
        }
        Update: {
          attempts?: number | null
          calendar_id?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          payload?: Json
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "webhook_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          last_seen_at: string | null
          linked_customer_email: string | null
          metadata: Json | null
          phone_number: string
          profile_picture_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          linked_customer_email?: string | null
          metadata?: Json | null
          phone_number: string
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          last_seen_at?: string | null
          linked_customer_email?: string | null
          metadata?: Json | null
          phone_number?: string
          profile_picture_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          calendar_id: string | null
          contact_id: string | null
          context: Json | null
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string | null
        }
        Insert: {
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
        }
        Update: {
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          direction: string | null
          id: string
          media_url: string | null
          message_id: string | null
          message_type: string | null
          metadata: Json | null
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          direction?: string | null
          id?: string
          media_url?: string | null
          message_id?: string | null
          message_type?: string | null
          metadata?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          calendar_id: string | null
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          quick_replies: Json | null
          template_key: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          calendar_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          quick_replies?: Json | null
          template_key: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          calendar_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          quick_replies?: Json | null
          template_key?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_templates_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      whatsapp_webhook_queue: {
        Row: {
          created_at: string | null
          error: string | null
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
          webhook_type: string
        }
        Insert: {
          created_at?: string | null
          error?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          webhook_type: string
        }
        Update: {
          created_at?: string | null
          error?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
          webhook_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_slots_view: {
        Row: {
          calendar_id: string | null
          calendar_name: string | null
          calendar_slug: string | null
          duration_minutes: number | null
          is_available: boolean | null
          service_duration: number | null
          service_name: string | null
          service_price: number | null
          service_type_id: string | null
          slot_end: string | null
          slot_start: string | null
        }
        Relationships: []
      }
      calendar_stats: {
        Row: {
          avg_duration_minutes: number | null
          calendar_id: string | null
          cancelled_bookings: number | null
          completed_bookings: number | null
          last_updated_month: string | null
          no_show_bookings: number | null
          total_bookings: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      daily_booking_stats: {
        Row: {
          avg_booking_value: number | null
          booking_date: string | null
          calendar_id: string | null
          cancelled_bookings: number | null
          confirmed_bookings: number | null
          pending_bookings: number | null
          total_bookings: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      dashboard_metrics_mv: {
        Row: {
          calendar_id: string | null
          last_updated: string | null
          month_bookings: number | null
          month_revenue: number | null
          pending_bookings: number | null
          today_bookings: number | null
          week_bookings: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      service_popularity_stats: {
        Row: {
          booking_count: number | null
          calendar_id: string | null
          percentage: number | null
          service_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      service_type_stats: {
        Row: {
          avg_duration: number | null
          booking_count: number | null
          calendar_id: string | null
          no_show_count: number | null
          service_name: string | null
          service_type_id: string | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      whatsapp_analytics: {
        Row: {
          active_conversations: number | null
          avg_response_time_minutes: number | null
          booking_intent_conversion_rate: number | null
          bookings_via_whatsapp: number | null
          calendar_id: string | null
          calendar_name: string | null
          completed_booking_intents: number | null
          conversation_to_booking_rate: number | null
          inbound_messages: number | null
          outbound_messages: number | null
          total_booking_intents: number | null
          total_contacts: number | null
          total_conversations: number | null
          total_messages: number | null
        }
        Relationships: []
      }
      whatsapp_conversation_topics: {
        Row: {
          calendar_id: string | null
          conversation_count: number | null
          topic_category: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      whatsapp_message_volume: {
        Row: {
          calendar_id: string | null
          inbound_count: number | null
          message_count: number | null
          message_date: string | null
          message_hour: number | null
          outbound_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
    }
    Functions: {
      add_to_waitlist: {
        Args: {
          p_calendar_slug: string
          p_service_type_id: string
          p_customer_name: string
          p_customer_email: string
          p_preferred_date: string
          p_preferred_time_start?: string
          p_preferred_time_end?: string
          p_flexibility?: string
        }
        Returns: Json
      }
      check_availability: {
        Args: {
          p_calendar_id: string
          p_datetime: string
          p_duration_minutes?: number
        }
        Returns: boolean
      }
      check_booking_conflicts: {
        Args: {
          p_calendar_id: string
          p_start_time: string
          p_end_time: string
          p_exclude_booking_id?: string
        }
        Returns: boolean
      }
      cleanup_duplicate_availability_rules: {
        Args: { p_schedule_id: string; p_day_of_week: number }
        Returns: undefined
      }
      cleanup_expired_context: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_waitlist: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_whatsapp_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_whatsapp_data_for_calendar: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      create_booking: {
        Args: {
          p_calendar_slug: string
          p_service_type_id: string
          p_customer_name: string
          p_customer_email: string
          p_customer_phone: string
          p_start_time: string
          p_notes?: string
        }
        Returns: Json
      }
      create_default_whatsapp_templates: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      create_user_with_calendar: {
        Args: {
          p_email: string
          p_full_name: string
          p_business_name?: string
          p_business_type?: string
        }
        Returns: Json
      }
      export_whatsapp_data: {
        Args: { p_calendar_id: string }
        Returns: Json
      }
      generate_confirmation_token: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_slots: {
        Args: {
          p_calendar_id: string
          p_service_type_id: string
          p_date: string
          p_timezone?: string
        }
        Returns: {
          slot_start: string
          slot_end: string
          is_available: boolean
        }[]
      }
      get_available_slots_range: {
        Args: {
          p_calendar_id: string
          p_service_type_id: string
          p_start_date: string
          p_end_date: string
          p_timezone?: string
        }
        Returns: {
          slot_date: string
          slot_start: string
          slot_end: string
          is_available: boolean
        }[]
      }
      get_booking_trends: {
        Args: { p_calendar_id: string; p_days?: number }
        Returns: Json
      }
      get_calendar_availability: {
        Args: {
          p_calendar_slug: string
          p_start_date?: string
          p_days?: number
        }
        Returns: Json
      }
      get_conversation_context: {
        Args: { p_phone_number: string; p_calendar_id: string }
        Returns: Json
      }
      get_dashboard_metrics: {
        Args: { p_calendar_id: string }
        Returns: Json
      }
      get_todays_schedule: {
        Args: { p_calendar_id: string }
        Returns: Json
      }
      get_whatsapp_data_retention_days: {
        Args: { p_calendar_id: string }
        Returns: number
      }
      log_error: {
        Args: {
          p_calendar_id: string
          p_error_type: string
          p_error_message: string
          p_error_context?: Json
          p_user_id?: string
        }
        Returns: string
      }
      match_quick_reply_flow: {
        Args: { p_calendar_id: string; p_message_text: string }
        Returns: Json
      }
      process_webhook_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      process_whatsapp_message: {
        Args: {
          p_phone_number: string
          p_message_id: string
          p_message_content: string
          p_calendar_id: string
        }
        Returns: Json
      }
      process_whatsapp_webhook_queue: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refresh_dashboard_metrics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      render_whatsapp_template: {
        Args: {
          p_calendar_id: string
          p_template_key: string
          p_variables?: Json
          p_language?: string
        }
        Returns: Json
      }
      resolve_recurring_availability: {
        Args: {
          p_calendar_id: string
          p_start_date: string
          p_end_date: string
        }
        Returns: {
          resolved_date: string
          pattern_id: string
          availability_rules: Json
        }[]
      }
      setup_calendar_defaults: {
        Args: { p_calendar_id: string; p_business_type?: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
