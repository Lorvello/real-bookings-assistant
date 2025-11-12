export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      archived_security_events: {
        Row: {
          archived_at: string | null
          blocked: boolean | null
          calendar_id: string | null
          created_at: string | null
          event_category: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          new_value: Json | null
          previous_value: Json | null
          resource_id: string | null
          resource_type: string | null
          risk_score: number | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          blocked?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          blocked?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          previous_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      blocked_ips: {
        Row: {
          block_reason: string
          blocked_by: string | null
          blocked_until: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          permanent_block: boolean | null
        }
        Insert: {
          block_reason: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address: unknown
          permanent_block?: boolean | null
        }
        Update: {
          block_reason?: string
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          permanent_block?: boolean | null
        }
        Relationships: []
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
            foreignKeyName: "booking_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
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
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
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
      booking_payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          id: string
          payment_method_type: string | null
          platform_fee_cents: number
          refund_amount_cents: number | null
          refunded_at: string | null
          status: string
          stripe_account_id: string
          stripe_payment_intent_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_method_type?: string | null
          platform_fee_cents?: number
          refund_amount_cents?: number | null
          refunded_at?: string | null
          status?: string
          stripe_account_id: string
          stripe_payment_intent_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_method_type?: string | null
          platform_fee_cents?: number
          refund_amount_cents?: number | null
          refunded_at?: string | null
          status?: string
          stripe_account_id?: string
          stripe_payment_intent_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          calendar_id: string
          created_at: string | null
          first_attempt_at: string | null
          id: string
          ip_address: unknown
          last_attempt_at: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          calendar_id: string
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address: unknown
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          calendar_id?: string
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          assigned_team_member_id: string | null
          booking_duration: number | null
          business_name: string | null
          calendar_id: string | null
          calender_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          deleted_at: string | null
          end_time: string
          id: string
          internal_notes: string | null
          is_deleted: boolean | null
          notes: string | null
          payment_currency: string | null
          payment_deadline: string | null
          payment_required: boolean | null
          payment_status: string | null
          service_name: string | null
          service_type_id: string | null
          session_id: string | null
          start_time: string
          status: string | null
          total_amount_cents: number | null
          total_price: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_team_member_id?: string | null
          booking_duration?: number | null
          business_name?: string | null
          calendar_id?: string | null
          calender_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          deleted_at?: string | null
          end_time: string
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          payment_currency?: string | null
          payment_deadline?: string | null
          payment_required?: boolean | null
          payment_status?: string | null
          service_name?: string | null
          service_type_id?: string | null
          session_id?: string | null
          start_time: string
          status?: string | null
          total_amount_cents?: number | null
          total_price?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_team_member_id?: string | null
          booking_duration?: number | null
          business_name?: string | null
          calendar_id?: string | null
          calender_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          deleted_at?: string | null
          end_time?: string
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean | null
          notes?: string | null
          payment_currency?: string | null
          payment_deadline?: string | null
          payment_required?: boolean | null
          payment_status?: string | null
          service_name?: string | null
          service_type_id?: string | null
          session_id?: string | null
          start_time?: string
          status?: string | null
          total_amount_cents?: number | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
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
      business_countries: {
        Row: {
          calendar_id: string | null
          country_code: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          registration_required: boolean | null
          registration_status: string | null
          registration_threshold_amount: number | null
          tax_collection_enabled: boolean | null
          threshold_currency: string | null
          threshold_period: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          country_code: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          registration_required?: boolean | null
          registration_status?: string | null
          registration_threshold_amount?: number | null
          tax_collection_enabled?: boolean | null
          threshold_currency?: string | null
          threshold_period?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          country_code?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          registration_required?: boolean | null
          registration_status?: string | null
          registration_threshold_amount?: number | null
          tax_collection_enabled?: boolean | null
          threshold_currency?: string | null
          threshold_period?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_countries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "business_countries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_countries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_countries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_countries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      business_stripe_accounts: {
        Row: {
          account_owner_id: string | null
          account_status: string
          account_type: string | null
          calendar_id: string | null
          charges_enabled: boolean
          country: string | null
          created_at: string
          currency: string | null
          details_submitted: boolean | null
          environment: string | null
          id: string
          onboarding_completed: boolean
          payouts_enabled: boolean
          platform_account_id: string | null
          stripe_account_id: string
          tax_collection_countries: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_owner_id?: string | null
          account_status?: string
          account_type?: string | null
          calendar_id?: string | null
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          details_submitted?: boolean | null
          environment?: string | null
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          platform_account_id?: string | null
          stripe_account_id: string
          tax_collection_countries?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_owner_id?: string | null
          account_status?: string
          account_type?: string | null
          calendar_id?: string | null
          charges_enabled?: boolean
          country?: string | null
          created_at?: string
          currency?: string | null
          details_submitted?: boolean | null
          environment?: string | null
          id?: string
          onboarding_completed?: boolean
          payouts_enabled?: boolean
          platform_account_id?: string | null
          stripe_account_id?: string
          tax_collection_countries?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_stripe_accounts_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_stripe_accounts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_members_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
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
            referencedRelation: "user_status_overview"
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
      calendar_service_types: {
        Row: {
          calendar_id: string
          created_at: string | null
          id: string
          service_type_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string | null
          id?: string
          service_type_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string | null
          id?: string
          service_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "calendar_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "calendar_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_settings: {
        Row: {
          allow_cancellations: boolean | null
          allow_waitlist: boolean | null
          booking_window_days: number | null
          buffer_time: number | null
          calendar_id: string | null
          cancellation_deadline_hours: number | null
          confirmation_required: boolean | null
          created_at: string | null
          first_reminder_enabled: boolean | null
          first_reminder_timing_hours: number | null
          id: string
          last_bot_activity: string | null
          max_bookings_per_day: number | null
          minimum_notice_hours: number | null
          second_reminder_enabled: boolean | null
          second_reminder_timing_minutes: number | null
          slot_duration: number | null
          stripe_connect_account_id: string | null
          whatsapp_bot_active: boolean | null
          whatsapp_phone_number: string | null
          whatsapp_qr_generated_at: string | null
          whatsapp_qr_url: string | null
        }
        Insert: {
          allow_cancellations?: boolean | null
          allow_waitlist?: boolean | null
          booking_window_days?: number | null
          buffer_time?: number | null
          calendar_id?: string | null
          cancellation_deadline_hours?: number | null
          confirmation_required?: boolean | null
          created_at?: string | null
          first_reminder_enabled?: boolean | null
          first_reminder_timing_hours?: number | null
          id?: string
          last_bot_activity?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          second_reminder_enabled?: boolean | null
          second_reminder_timing_minutes?: number | null
          slot_duration?: number | null
          stripe_connect_account_id?: string | null
          whatsapp_bot_active?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_qr_generated_at?: string | null
          whatsapp_qr_url?: string | null
        }
        Update: {
          allow_cancellations?: boolean | null
          allow_waitlist?: boolean | null
          booking_window_days?: number | null
          buffer_time?: number | null
          calendar_id?: string | null
          cancellation_deadline_hours?: number | null
          confirmation_required?: boolean | null
          created_at?: string | null
          first_reminder_enabled?: boolean | null
          first_reminder_timing_hours?: number | null
          id?: string
          last_bot_activity?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          second_reminder_enabled?: boolean | null
          second_reminder_timing_minutes?: number | null
          slot_duration?: number | null
          stripe_connect_account_id?: string | null
          whatsapp_bot_active?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_qr_generated_at?: string | null
          whatsapp_qr_url?: string | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "calendar_settings_stripe_connect_account_id_fkey"
            columns: ["stripe_connect_account_id"]
            isOneToOne: false
            referencedRelation: "business_stripe_accounts"
            referencedColumns: ["stripe_account_id"]
          },
        ]
      }
      calendars: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          is_deleted: boolean | null
          name: string | null
          slug: string | null
          timezone: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_deleted?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          is_deleted?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
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
      failed_login_attempts: {
        Row: {
          attempt_time: string
          created_at: string | null
          email: string
          failure_reason: string | null
          geo_location: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
        }
        Insert: {
          attempt_time?: string
          created_at?: string | null
          email: string
          failure_reason?: string | null
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Update: {
          attempt_time?: string
          created_at?: string | null
          email?: string
          failure_reason?: string | null
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
        }
        Relationships: []
      }
      installment_payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string
          currency: string
          due_date: string | null
          id: string
          installment_number: number
          paid_at: string | null
          payment_method: string
          payment_timing: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          total_installments: number
          updated_at: string
          whatsapp_session_id: string | null
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          installment_number: number
          paid_at?: string | null
          payment_method: string
          payment_timing: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          total_installments: number
          updated_at?: string
          whatsapp_session_id?: string | null
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          installment_number?: number
          paid_at?: string | null
          payment_method?: string
          payment_timing?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          total_installments?: number
          updated_at?: string
          whatsapp_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_whatsapp_session_id_fkey"
            columns: ["whatsapp_session_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_payment_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          created_at: string | null
          device_fingerprint: string | null
          failure_reason: string | null
          flagged_as_suspicious: boolean | null
          id: string
          ip_address: unknown
          location_city: string | null
          location_country: string | null
          login_time: string | null
          risk_score: number | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          flagged_as_suspicious?: boolean | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          login_time?: string | null
          risk_score?: number | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          flagged_as_suspicious?: boolean | null
          id?: string
          ip_address?: unknown
          location_city?: string | null
          location_country?: string | null
          login_time?: string | null
          risk_score?: number | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      payment_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          first_attempt_at: string | null
          id: string
          ip_address: unknown
          last_attempt_at: string | null
          total_blocks: number | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address: unknown
          last_attempt_at?: string | null
          total_blocks?: number | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          blocked_until?: string | null
          created_at?: string | null
          first_attempt_at?: string | null
          id?: string
          ip_address?: unknown
          last_attempt_at?: string | null
          total_blocks?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_security_logs: {
        Row: {
          amount_cents: number | null
          block_reason: string | null
          booking_id: string | null
          created_at: string | null
          currency: string | null
          event_type: string
          id: string
          ip_address: unknown
          request_data: Json | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents?: number | null
          block_reason?: string | null
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number | null
          block_reason?: string | null
          booking_id?: string | null
          created_at?: string | null
          currency?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          request_data?: Json | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_security_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_security_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_security_settings: {
        Row: {
          blocked_countries: string[] | null
          calendar_id: string | null
          card_testing_detection_enabled: boolean | null
          created_at: string | null
          id: string
          max_cards_per_user_per_day: number | null
          max_payment_amount_cents: number | null
          min_payment_amount_cents: number | null
          new_user_payment_delay_hours: number | null
          rate_limit_attempts: number | null
          rate_limit_window_minutes: number | null
          require_captcha_threshold: number | null
          suspicious_amount_threshold_cents: number | null
          updated_at: string | null
        }
        Insert: {
          blocked_countries?: string[] | null
          calendar_id?: string | null
          card_testing_detection_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_cards_per_user_per_day?: number | null
          max_payment_amount_cents?: number | null
          min_payment_amount_cents?: number | null
          new_user_payment_delay_hours?: number | null
          rate_limit_attempts?: number | null
          rate_limit_window_minutes?: number | null
          require_captcha_threshold?: number | null
          suspicious_amount_threshold_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          blocked_countries?: string[] | null
          calendar_id?: string | null
          card_testing_detection_enabled?: boolean | null
          created_at?: string | null
          id?: string
          max_cards_per_user_per_day?: number | null
          max_payment_amount_cents?: number | null
          min_payment_amount_cents?: number | null
          new_user_payment_delay_hours?: number | null
          rate_limit_attempts?: number | null
          rate_limit_window_minutes?: number | null
          require_captcha_threshold?: number | null
          suspicious_amount_threshold_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_security_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "payment_security_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_security_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_security_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_security_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          allow_partial_refunds: boolean
          auto_cancel_unpaid_bookings: boolean
          calendar_id: string
          created_at: string
          enabled_payment_methods: Json | null
          id: string
          payment_deadline_hours: number | null
          payment_required_for_booking: boolean
          payout_option: string | null
          platform_fee_percentage: number
          refund_policy_text: string | null
          secure_payments_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_partial_refunds?: boolean
          auto_cancel_unpaid_bookings?: boolean
          calendar_id: string
          created_at?: string
          enabled_payment_methods?: Json | null
          id?: string
          payment_deadline_hours?: number | null
          payment_required_for_booking?: boolean
          payout_option?: string | null
          platform_fee_percentage?: number
          refund_policy_text?: string | null
          secure_payments_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_partial_refunds?: boolean
          auto_cancel_unpaid_bookings?: boolean
          calendar_id?: string
          created_at?: string
          enabled_payment_methods?: Json | null
          id?: string
          payment_deadline_hours?: number | null
          payment_required_for_booking?: boolean
          payout_option?: string | null
          platform_fee_percentage?: number
          refund_policy_text?: string | null
          secure_payments_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "payment_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_settings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      public_api_rate_limits: {
        Row: {
          blocked_until: string | null
          calendar_slug: string | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown
          last_violation_reason: string | null
          request_count: number | null
          total_blocks: number | null
          updated_at: string | null
          window_start: string | null
        }
        Insert: {
          blocked_until?: string | null
          calendar_slug?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address: unknown
          last_violation_reason?: string | null
          request_count?: number | null
          total_blocks?: number | null
          updated_at?: string | null
          window_start?: string | null
        }
        Update: {
          blocked_until?: string | null
          calendar_slug?: string | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown
          last_violation_reason?: string | null
          request_count?: number | null
          total_blocks?: number | null
          updated_at?: string | null
          window_start?: string | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quick_reply_flows_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_availability_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_events_log: {
        Row: {
          blocked: boolean | null
          calendar_id: string | null
          created_at: string | null
          device_info: string | null
          event_category: string | null
          event_data: Json | null
          event_type: string
          geo_location: string | null
          id: string
          ip_address: unknown
          new_value: Json | null
          previous_value: Json | null
          request_headers: Json | null
          resource_id: string | null
          resource_type: string | null
          risk_score: number | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          blocked?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          device_info?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type: string
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          previous_value?: Json | null
          request_headers?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          blocked?: boolean | null
          calendar_id?: string | null
          created_at?: string | null
          device_info?: string | null
          event_category?: string | null
          event_data?: Json | null
          event_type?: string
          geo_location?: string | null
          id?: string
          ip_address?: unknown
          new_value?: Json | null
          previous_value?: Json | null
          request_headers?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          risk_score?: number | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      service_classifications: {
        Row: {
          classification_keywords: string[] | null
          confidence_score: number | null
          country_specific_tax_codes: Json | null
          created_at: string | null
          id: string
          service_name: string
          suggested_category: string
        }
        Insert: {
          classification_keywords?: string[] | null
          confidence_score?: number | null
          country_specific_tax_codes?: Json | null
          created_at?: string | null
          id?: string
          service_name: string
          suggested_category: string
        }
        Update: {
          classification_keywords?: string[] | null
          confidence_score?: number | null
          country_specific_tax_codes?: Json | null
          created_at?: string | null
          id?: string
          service_name?: string
          suggested_category?: string
        }
        Relationships: []
      }
      service_installment_configs: {
        Row: {
          allow_customer_choice: boolean | null
          created_at: string | null
          custom_deposits: Json | null
          enabled: boolean
          fixed_deposit_amount: number | null
          id: string
          plan_type: string
          preset_plan: string | null
          service_type_id: string
          updated_at: string | null
        }
        Insert: {
          allow_customer_choice?: boolean | null
          created_at?: string | null
          custom_deposits?: Json | null
          enabled?: boolean
          fixed_deposit_amount?: number | null
          id?: string
          plan_type?: string
          preset_plan?: string | null
          service_type_id: string
          updated_at?: string | null
        }
        Update: {
          allow_customer_choice?: boolean | null
          created_at?: string | null
          custom_deposits?: Json | null
          enabled?: boolean
          fixed_deposit_amount?: number | null
          id?: string
          plan_type?: string
          preset_plan?: string | null
          service_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_installment_configs_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "service_installment_configs_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_installment_configs_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "service_installment_configs_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          applicable_tax_rate: number | null
          business_country: string | null
          calendar_id: string | null
          cleanup_time: number | null
          color: string | null
          created_at: string | null
          custom_installment_plan: Json | null
          deleted_at: string | null
          description: string | null
          duration: number
          id: string
          installment_options: Json | null
          installment_plan_override: Json | null
          installments_enabled: boolean | null
          is_active: boolean | null
          is_deleted: boolean | null
          max_attendees: number | null
          name: string
          override_installments_enabled: boolean | null
          payment_description: string | null
          preparation_time: number | null
          price: number | null
          service_category: string | null
          stripe_live_price_id: string | null
          stripe_test_price_id: string | null
          supports_installments: boolean | null
          tax_behavior: string | null
          tax_code: string | null
          tax_enabled: boolean | null
          tax_rate_type: string | null
        }
        Insert: {
          applicable_tax_rate?: number | null
          business_country?: string | null
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          custom_installment_plan?: Json | null
          deleted_at?: string | null
          description?: string | null
          duration: number
          id?: string
          installment_options?: Json | null
          installment_plan_override?: Json | null
          installments_enabled?: boolean | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          max_attendees?: number | null
          name: string
          override_installments_enabled?: boolean | null
          payment_description?: string | null
          preparation_time?: number | null
          price?: number | null
          service_category?: string | null
          stripe_live_price_id?: string | null
          stripe_test_price_id?: string | null
          supports_installments?: boolean | null
          tax_behavior?: string | null
          tax_code?: string | null
          tax_enabled?: boolean | null
          tax_rate_type?: string | null
        }
        Update: {
          applicable_tax_rate?: number | null
          business_country?: string | null
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          custom_installment_plan?: Json | null
          deleted_at?: string | null
          description?: string | null
          duration?: number
          id?: string
          installment_options?: Json | null
          installment_plan_override?: Json | null
          installments_enabled?: boolean | null
          is_active?: boolean | null
          is_deleted?: boolean | null
          max_attendees?: number | null
          name?: string
          override_installments_enabled?: boolean | null
          payment_description?: string | null
          preparation_time?: number | null
          price?: number | null
          service_category?: string | null
          stripe_live_price_id?: string | null
          stripe_test_price_id?: string | null
          supports_installments?: boolean | null
          tax_behavior?: string | null
          tax_code?: string | null
          tax_enabled?: boolean | null
          tax_rate_type?: string | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_tiers: {
        Row: {
          api_access: boolean | null
          created_at: string | null
          description: string | null
          display_name: string
          features: Json | null
          id: string
          is_active: boolean | null
          max_bookings_per_month: number | null
          max_calendars: number | null
          max_team_members: number | null
          max_whatsapp_contacts: number | null
          price_monthly: number | null
          price_yearly: number | null
          priority_support: boolean | null
          stripe_live_monthly_price_id: string | null
          stripe_live_yearly_price_id: string | null
          stripe_test_monthly_price_id: string | null
          stripe_test_yearly_price_id: string | null
          tier_name: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string | null
          white_label: boolean | null
        }
        Insert: {
          api_access?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_bookings_per_month?: number | null
          max_calendars?: number | null
          max_team_members?: number | null
          max_whatsapp_contacts?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          stripe_live_monthly_price_id?: string | null
          stripe_live_yearly_price_id?: string | null
          stripe_test_monthly_price_id?: string | null
          stripe_test_yearly_price_id?: string | null
          tier_name: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          white_label?: boolean | null
        }
        Update: {
          api_access?: boolean | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          features?: Json | null
          id?: string
          is_active?: boolean | null
          max_bookings_per_month?: number | null
          max_calendars?: number | null
          max_team_members?: number | null
          max_whatsapp_contacts?: number | null
          price_monthly?: number | null
          price_yearly?: number | null
          priority_support?: boolean | null
          stripe_live_monthly_price_id?: string | null
          stripe_live_yearly_price_id?: string | null
          stripe_test_monthly_price_id?: string | null
          stripe_test_yearly_price_id?: string | null
          tier_name?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string | null
          white_label?: boolean | null
        }
        Relationships: []
      }
      tax_configurations: {
        Row: {
          calendar_id: string | null
          country_code: string
          created_at: string
          default_tax_code: string
          default_tax_rate: number
          id: string
          multi_country_business: boolean | null
          tax_system_name: string
          updated_at: string
        }
        Insert: {
          calendar_id?: string | null
          country_code: string
          created_at?: string
          default_tax_code?: string
          default_tax_rate?: number
          id?: string
          multi_country_business?: boolean | null
          tax_system_name?: string
          updated_at?: string
        }
        Update: {
          calendar_id?: string | null
          country_code?: string
          created_at?: string
          default_tax_code?: string
          default_tax_rate?: number
          id?: string
          multi_country_business?: boolean | null
          tax_system_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_configurations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "tax_configurations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_configurations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_configurations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tax_configurations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      tax_setup_queue: {
        Row: {
          calendar_id: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          operation_data: Json
          operation_type: string
          retry_count: number | null
          scheduled_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation_data?: Json
          operation_type: string
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          operation_data?: Json
          operation_type?: string
          retry_count?: number | null
          scheduled_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tax_thresholds: {
        Row: {
          country_code: string
          created_at: string | null
          currency: string
          description: string | null
          id: string
          period: string | null
          threshold_amount_cents: number
          threshold_type: string | null
          updated_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          currency: string
          description?: string | null
          id?: string
          period?: string | null
          threshold_amount_cents: number
          threshold_type?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          currency?: string
          description?: string | null
          id?: string
          period?: string | null
          threshold_amount_cents?: number
          threshold_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          calendar_id: string
          created_at: string
          email: string
          expires_at: string
          full_name: string | null
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          calendar_id: string
          created_at?: string
          email: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by: string
          role?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          calendar_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_invitations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      team_member_services: {
        Row: {
          calendar_id: string
          created_at: string
          id: string
          service_type_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_id: string
          created_at?: string
          id?: string
          service_type_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_id?: string
          created_at?: string
          id?: string
          service_type_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_services_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_member_services_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_services_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_services_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_services_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_member_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "team_member_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "team_member_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_settings: {
        Row: {
          created_at: string | null
          force_password_change: boolean | null
          id: string
          last_security_review_at: string | null
          mfa_enabled: boolean | null
          mfa_method: string | null
          mfa_secret: string | null
          password_changed_at: string | null
          password_expiry_days: number | null
          security_questions: Json | null
          trusted_devices: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          force_password_change?: boolean | null
          id?: string
          last_security_review_at?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_secret?: string | null
          password_changed_at?: string | null
          password_expiry_days?: number | null
          security_questions?: Json | null
          trusted_devices?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          force_password_change?: boolean | null
          id?: string
          last_security_review_at?: string | null
          mfa_enabled?: boolean | null
          mfa_method?: string | null
          mfa_secret?: string | null
          password_changed_at?: string | null
          password_expiry_days?: number | null
          security_questions?: Json | null
          trusted_devices?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string | null
          device_fingerprint: string | null
          device_name: string | null
          device_type: string | null
          expires_at: string
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_activity_at: string | null
          location_city: string | null
          location_country: string | null
          os: string | null
          session_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          location_city?: string | null
          location_country?: string | null
          os?: string | null
          session_token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_fingerprint?: string | null
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_activity_at?: string | null
          location_city?: string | null
          location_country?: string | null
          os?: string | null
          session_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          accessibility_info: string | null
          account_owner_id: string | null
          address_city: string | null
          address_country: string | null
          address_number: string | null
          address_postal: string | null
          address_street: string | null
          allow_customer_installment_choice: boolean | null
          avatar_url: string | null
          business_city: string | null
          business_country: string | null
          business_description: string | null
          business_email: string | null
          business_name: string | null
          business_number: string | null
          business_phone: string | null
          business_postal: string | null
          business_street: string | null
          business_type: string | null
          business_type_other: string | null
          business_whatsapp: string | null
          created_at: string | null
          date_of_birth: string | null
          default_installment_plan: Json | null
          default_tax_behavior: string | null
          email: string
          facebook: string | null
          full_name: string | null
          gender: string | null
          grace_period_end: string | null
          id: string
          instagram: string | null
          installments_enabled: boolean | null
          language: string | null
          last_payment_date: string | null
          linkedin: string | null
          opening_hours_note: string | null
          other_info: string | null
          parking_info: string | null
          payment_status: string | null
          phone: string | null
          public_transport_info: string | null
          qr_code_data: string | null
          show_opening_hours: boolean | null
          subscription_end_date: string | null
          subscription_start_date: string | null
          subscription_status: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_configured: boolean | null
          team_size: string | null
          tiktok: string | null
          timezone: string | null
          trial_end_date: string | null
          trial_start_date: string | null
          updated_at: string | null
          website: string | null
          whatsapp_bot_active: boolean | null
          whatsapp_phone_number: string | null
          whatsapp_qr_generated_at: string | null
          whatsapp_qr_url: string | null
        }
        Insert: {
          accessibility_info?: string | null
          account_owner_id?: string | null
          address_city?: string | null
          address_country?: string | null
          address_number?: string | null
          address_postal?: string | null
          address_street?: string | null
          allow_customer_installment_choice?: boolean | null
          avatar_url?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_number?: string | null
          business_phone?: string | null
          business_postal?: string | null
          business_street?: string | null
          business_type?: string | null
          business_type_other?: string | null
          business_whatsapp?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_installment_plan?: Json | null
          default_tax_behavior?: string | null
          email: string
          facebook?: string | null
          full_name?: string | null
          gender?: string | null
          grace_period_end?: string | null
          id: string
          instagram?: string | null
          installments_enabled?: boolean | null
          language?: string | null
          last_payment_date?: string | null
          linkedin?: string | null
          opening_hours_note?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_status?: string | null
          phone?: string | null
          public_transport_info?: string | null
          qr_code_data?: string | null
          show_opening_hours?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_configured?: boolean | null
          team_size?: string | null
          tiktok?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp_bot_active?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_qr_generated_at?: string | null
          whatsapp_qr_url?: string | null
        }
        Update: {
          accessibility_info?: string | null
          account_owner_id?: string | null
          address_city?: string | null
          address_country?: string | null
          address_number?: string | null
          address_postal?: string | null
          address_street?: string | null
          allow_customer_installment_choice?: boolean | null
          avatar_url?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_name?: string | null
          business_number?: string | null
          business_phone?: string | null
          business_postal?: string | null
          business_street?: string | null
          business_type?: string | null
          business_type_other?: string | null
          business_whatsapp?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_installment_plan?: Json | null
          default_tax_behavior?: string | null
          email?: string
          facebook?: string | null
          full_name?: string | null
          gender?: string | null
          grace_period_end?: string | null
          id?: string
          instagram?: string | null
          installments_enabled?: boolean | null
          language?: string | null
          last_payment_date?: string | null
          linkedin?: string | null
          opening_hours_note?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_status?: string | null
          phone?: string | null
          public_transport_info?: string | null
          qr_code_data?: string | null
          show_opening_hours?: boolean | null
          subscription_end_date?: string | null
          subscription_start_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          tax_configured?: boolean | null
          team_size?: string | null
          tiktok?: string | null
          timezone?: string | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          updated_at?: string | null
          website?: string | null
          whatsapp_bot_active?: boolean | null
          whatsapp_phone_number?: string | null
          whatsapp_qr_generated_at?: string | null
          whatsapp_qr_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          customer_email: string | null
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
          customer_email?: string | null
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
          customer_email?: string | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_endpoints_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      webhook_rate_limits: {
        Row: {
          id: string
          ip_address: string
          request_count: number | null
          updated_at: string | null
          window_start: string
        }
        Insert: {
          id?: string
          ip_address: string
          request_count?: number | null
          updated_at?: string | null
          window_start: string
        }
        Update: {
          id?: string
          ip_address?: string
          request_count?: number | null
          updated_at?: string | null
          window_start?: string
        }
        Relationships: []
      }
      webhook_security_logs: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: []
      }
      whatsapp_contact_overview: {
        Row: {
          booking_id: string | null
          booking_status: string | null
          business_name: string | null
          calendar_id: string | null
          calendar_name: string | null
          contact_created_at: string | null
          contact_id: string
          conversation_created_at: string | null
          conversation_status: string | null
          display_name: string | null
          first_name: string | null
          laatste_booking: string | null
          laatste_service: string | null
          last_message_at: string | null
          last_name: string | null
          last_seen_at: string | null
          phone_number: string
          session_id: string | null
          updated_at: string | null
        }
        Insert: {
          booking_id?: string | null
          booking_status?: string | null
          business_name?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          contact_created_at?: string | null
          contact_id: string
          conversation_created_at?: string | null
          conversation_status?: string | null
          display_name?: string | null
          first_name?: string | null
          laatste_booking?: string | null
          laatste_service?: string | null
          last_message_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          phone_number: string
          session_id?: string | null
          updated_at?: string | null
        }
        Update: {
          booking_id?: string | null
          booking_status?: string | null
          business_name?: string | null
          calendar_id?: string | null
          calendar_name?: string | null
          contact_created_at?: string | null
          contact_id?: string
          conversation_created_at?: string | null
          conversation_status?: string | null
          display_name?: string | null
          first_name?: string | null
          laatste_booking?: string | null
          laatste_service?: string | null
          last_message_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          phone_number?: string
          session_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_contacts: {
        Row: {
          created_at: string | null
          display_name: string | null
          first_name: string | null
          id: string
          Last_appointment: string | null
          last_name: string | null
          last_seen_at: string | null
          linked_customer_email: string | null
          metadata: Json | null
          phone_number: string
          profile_picture_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          Last_appointment?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linked_customer_email?: string | null
          metadata?: Json | null
          phone_number: string
          profile_picture_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          first_name?: string | null
          id?: string
          Last_appointment?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          linked_customer_email?: string | null
          metadata?: Json | null
          phone_number?: string
          profile_picture_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          calendar_id: string | null
          contact_id: string | null
          context: Json | null
          created_at: string | null
          id: string
          last_message_at: string | null
          message: Json | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message?: Json | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          message?: Json | null
          session_id?: string | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      whatsapp_payment_sessions: {
        Row: {
          amount_cents: number
          calendar_id: string | null
          conversation_id: string | null
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          installment_plan: Json | null
          payment_status: string
          payment_type: string
          payment_url: string | null
          service_type_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          calendar_id?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          installment_plan?: Json | null
          payment_status?: string
          payment_type?: string
          payment_url?: string | null
          service_type_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          calendar_id?: string | null
          conversation_id?: string | null
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          installment_plan?: Json | null
          payment_status?: string
          payment_type?: string
          payment_url?: string | null
          service_type_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_payment_sessions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_templates_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      public_bookings_view: {
        Row: {
          booking_duration: number | null
          business_name: string | null
          calendar_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          payment_currency: string | null
          payment_deadline: string | null
          payment_required: boolean | null
          payment_status: string | null
          service_name: string | null
          service_type_id: string | null
          start_time: string | null
          status: string | null
          total_amount_cents: number | null
          total_price: number | null
        }
        Insert: {
          booking_duration?: number | null
          business_name?: string | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          end_time?: string | null
          id?: string | null
          notes?: string | null
          payment_currency?: string | null
          payment_deadline?: string | null
          payment_required?: boolean | null
          payment_status?: string | null
          service_name?: string | null
          service_type_id?: string | null
          start_time?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_price?: number | null
        }
        Update: {
          booking_duration?: number | null
          business_name?: string | null
          calendar_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          confirmation_token?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          end_time?: string | null
          id?: string | null
          notes?: string | null
          payment_currency?: string | null
          payment_deadline?: string | null
          payment_required?: boolean | null
          payment_status?: string | null
          service_name?: string | null
          service_type_id?: string | null
          start_time?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_price?: number | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
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
      public_calendar_view: {
        Row: {
          id: string | null
          is_active: boolean | null
          name: string | null
          slug: string | null
          timezone: string | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      public_calendars_view: {
        Row: {
          color: string | null
          created_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          slug: string | null
          timezone: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
      public_service_types_view: {
        Row: {
          calendar_id: string | null
          cleanup_time: number | null
          color: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string | null
          is_active: boolean | null
          max_attendees: number | null
          name: string | null
          payment_description: string | null
          preparation_time: number | null
          price: number | null
          service_category: string | null
          supports_installments: boolean | null
          tax_behavior: string | null
          tax_enabled: boolean | null
        }
        Insert: {
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          name?: string | null
          payment_description?: string | null
          preparation_time?: number | null
          price?: number | null
          service_category?: string | null
          supports_installments?: boolean | null
          tax_behavior?: string | null
          tax_enabled?: boolean | null
        }
        Update: {
          calendar_id?: string | null
          cleanup_time?: number | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string | null
          is_active?: boolean | null
          max_attendees?: number | null
          name?: string | null
          payment_description?: string | null
          preparation_time?: number | null
          price?: number | null
          service_category?: string | null
          supports_installments?: boolean | null
          tax_behavior?: string | null
          tax_enabled?: boolean | null
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_types_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      user_status_overview: {
        Row: {
          business_name: string | null
          created_at: string | null
          days_remaining: number | null
          email: string | null
          full_name: string | null
          id: string | null
          subscription_end_date: string | null
          subscription_status: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date: string | null
          trial_start_date: string | null
          user_status_type: string | null
        }
        Insert: {
          business_name?: string | null
          created_at?: string | null
          days_remaining?: never
          email?: string | null
          full_name?: string | null
          id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          user_status_type?: never
        }
        Update: {
          business_name?: string | null
          created_at?: string | null
          days_remaining?: never
          email?: string | null
          full_name?: string | null
          id?: string | null
          subscription_end_date?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          trial_end_date?: string | null
          trial_start_date?: string | null
          user_status_type?: never
        }
        Relationships: []
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
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
      accept_team_invitation: { Args: { p_token: string }; Returns: Json }
      add_to_waitlist: {
        Args: {
          p_calendar_slug: string
          p_customer_email: string
          p_customer_name: string
          p_flexibility?: string
          p_preferred_date: string
          p_preferred_time_end?: string
          p_preferred_time_start?: string
          p_service_type_id: string
        }
        Returns: Json
      }
      admin_apply_developer_status: {
        Args: { p_status: string; p_tier?: string; p_user_id: string }
        Returns: Json
      }
      admin_clear_user_data: { Args: { p_user_id: string }; Returns: Json }
      admin_developer_update_user_subscription: {
        Args: {
          p_business_name?: string
          p_business_type?: string
          p_subscription_end_date?: string
          p_subscription_status?: string
          p_subscription_tier?: string
          p_trial_end_date?: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_ensure_user_has_calendar: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_extend_trial: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
      admin_generate_comprehensive_mock_data: {
        Args: { p_calendar_id: string; p_data_type?: string }
        Returns: Json
      }
      admin_generate_mock_data: {
        Args: { p_status: string; p_user_id: string }
        Returns: Json
      }
      admin_set_user_status:
        | { Args: { p_status_type: string; p_user_id: string }; Returns: Json }
        | {
            Args: {
              p_clear_data?: boolean
              p_generate_mock_data?: boolean
              p_status: string
              p_user_id: string
            }
            Returns: Json
          }
      admin_setup_mock_incomplete_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_update_user_subscription:
        | {
            Args: {
              p_subscription_end_date?: string
              p_subscription_status?: string
              p_subscription_tier?: string
              p_trial_end_date?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_business_name?: string
              p_business_type?: string
              p_subscription_end_date?: string
              p_subscription_status?: string
              p_subscription_tier?: string
              p_trial_end_date?: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_business_name?: string
              p_business_type?: string
              p_subscription_end_date?: string
              p_subscription_status?: string
              p_subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
              p_trial_end_date?: string
              p_user_id: string
            }
            Returns: Json
          }
      archive_old_security_events: { Args: never; Returns: number }
      check_availability: {
        Args: {
          p_calendar_id: string
          p_datetime: string
          p_duration_minutes?: number
        }
        Returns: boolean
      }
      check_booking_conflicts:
        | {
            Args: {
              p_calendar_id: string
              p_end_time: string
              p_exclude_booking_id?: string
              p_start_time: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_allow_double_bookings?: boolean
              p_calendar_id: string
              p_end_time: string
              p_exclude_booking_id?: string
              p_start_time: string
            }
            Returns: boolean
          }
      check_booking_rate_limit: {
        Args: { p_calendar_id: string; p_ip_address: unknown }
        Returns: Json
      }
      check_payment_rate_limit: {
        Args: { p_calendar_id: string; p_ip_address: unknown }
        Returns: Json
      }
      check_public_rate_limit: {
        Args: {
          p_calendar_slug?: string
          p_endpoint?: string
          p_ip_address: unknown
          p_rate_limit?: number
          p_window_minutes?: number
        }
        Returns: Json
      }
      check_team_member_limit: {
        Args: { p_calendar_id: string; p_user_id: string }
        Returns: boolean
      }
      check_whatsapp_contact_limit: {
        Args: { p_calendar_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_duplicate_availability_rules: {
        Args: { p_day_of_week: number; p_schedule_id: string }
        Returns: undefined
      }
      cleanup_expired_context: { Args: never; Returns: undefined }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_expired_waitlist: { Args: never; Returns: undefined }
      cleanup_old_whatsapp_data: { Args: never; Returns: undefined }
      cleanup_whatsapp_data_for_calendar: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      complete_user_setup: { Args: { p_user_id: string }; Returns: Json }
      create_booking: {
        Args: {
          p_calendar_slug: string
          p_customer_email: string
          p_customer_name: string
          p_customer_phone: string
          p_notes?: string
          p_service_type_id: string
          p_start_time: string
        }
        Returns: Json
      }
      create_default_whatsapp_templates: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      create_team_member_user: {
        Args: { p_calendar_id: string; p_email: string; p_full_name: string }
        Returns: string
      }
      create_user_with_calendar: {
        Args: {
          p_business_name?: string
          p_business_type?: string
          p_email: string
          p_full_name: string
        }
        Returns: Json
      }
      ensure_default_service_types: { Args: never; Returns: undefined }
      ensure_user_has_calendar_and_service: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      export_whatsapp_data:
        | {
            Args: {
              p_calendar_id: string
              p_end_date?: string
              p_start_date?: string
            }
            Returns: Json
          }
        | { Args: { p_calendar_id: string }; Returns: Json }
      find_orphaned_whatsapp_conversations: {
        Args: never
        Returns: {
          contact_name: string
          contact_phone: string
          conversation_id: string
          last_activity: string
          message_count: number
        }[]
      }
      generate_confirmation_token: { Args: never; Returns: string }
      generate_mock_data: {
        Args: { p_data_type?: string; p_user_id: string }
        Returns: undefined
      }
      get_account_owner_id: { Args: { p_user_id: string }; Returns: string }
      get_available_slots: {
        Args: {
          p_calendar_id: string
          p_date: string
          p_service_type_id: string
          p_timezone?: string
        }
        Returns: {
          is_available: boolean
          slot_end: string
          slot_start: string
        }[]
      }
      get_available_slots_range:
        | {
            Args: {
              p_calendar_id: string
              p_end_date: string
              p_service_type_id: string
              p_start_date: string
            }
            Returns: {
              is_available: boolean
              slot_date: string
              slot_end: string
              slot_start: string
            }[]
          }
        | {
            Args: {
              p_calendar_id: string
              p_end_date: string
              p_service_type_id: string
              p_start_date: string
              p_timezone?: string
            }
            Returns: {
              is_available: boolean
              slot_date: string
              slot_end: string
              slot_start: string
            }[]
          }
      get_booking_trends: {
        Args: { p_calendar_id: string; p_days?: number }
        Returns: Json
      }
      get_business_available_slots: {
        Args: {
          p_calendar_slug: string
          p_days?: number
          p_service_type_id?: string
          p_start_date?: string
        }
        Returns: {
          calendar_id: string
          calendar_name: string
          duration_minutes: number
          is_available: boolean
          service_duration: number
          service_name: string
          service_price: number
          service_type_id: string
          slot_end: string
          slot_start: string
        }[]
      }
      get_business_hours: { Args: { p_calendar_id: string }; Returns: Json }
      get_calendar_availability: {
        Args: {
          p_calendar_slug: string
          p_days?: number
          p_start_date?: string
        }
        Returns: Json
      }
      get_calendar_statistics: {
        Args: { p_calendar_id: string }
        Returns: Json
      }
      get_client_ip: { Args: never; Returns: unknown }
      get_conversation_context: {
        Args: { p_calendar_id: string; p_phone_number: string }
        Returns: Json
      }
      get_customer_metrics: {
        Args: {
          p_calendar_ids: string[]
          p_month_start: string
          p_thirty_days_ago: string
        }
        Returns: Json
      }
      get_dashboard_metrics: { Args: { p_calendar_id: string }; Returns: Json }
      get_dashboard_metrics_safe: {
        Args: { p_calendar_id: string }
        Returns: Json
      }
      get_day_name_dutch: { Args: { p_day_of_week: number }; Returns: string }
      get_formatted_business_hours: {
        Args: { p_calendar_id: string }
        Returns: string
      }
      get_n8n_day_mapping: { Args: never; Returns: Json }
      get_todays_schedule: { Args: { p_calendar_id: string }; Returns: Json }
      get_user_status_type: { Args: { p_user_id: string }; Returns: string }
      get_user_subscription_details: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_subscription_tier: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_whatsapp_data_retention_days: {
        Args: { p_calendar_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_team_member: {
        Args: {
          p_calendar_id: string
          p_email: string
          p_full_name: string
          p_role?: string
        }
        Returns: Json
      }
      is_account_owner: { Args: { p_user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      link_existing_whatsapp_conversations: { Args: never; Returns: undefined }
      log_error: {
        Args: {
          p_calendar_id: string
          p_error_context?: Json
          p_error_message: string
          p_error_type: string
          p_user_id?: string
        }
        Returns: string
      }
      log_security_event:
        | {
            Args: {
              p_event_data?: Json
              p_event_type: string
              p_ip_address?: unknown
              p_severity?: string
              p_user_agent?: string
              p_user_id?: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_event_details?: Json
              p_event_type: string
              p_ip_address?: unknown
              p_user_agent?: string
              p_user_id: string
            }
            Returns: undefined
          }
      manual_process_webhooks: {
        Args: { p_calendar_id?: string }
        Returns: Json
      }
      match_quick_reply_flow:
        | { Args: { p_calendar_id: string; p_message: string }; Returns: Json }
        | {
            Args: { p_calendar_id: string; p_message_text: string }
            Returns: Json
          }
      process_automatic_status_transitions: { Args: never; Returns: Json }
      process_booking_webhook_events: { Args: never; Returns: undefined }
      process_webhook_queue: { Args: never; Returns: undefined }
      process_whatsapp_message: {
        Args: {
          p_calendar_id: string
          p_message_content: string
          p_message_id: string
          p_phone_number: string
        }
        Returns: Json
      }
      process_whatsapp_webhook_queue: { Args: never; Returns: undefined }
      record_payment_attempt: {
        Args: {
          p_calendar_id: string
          p_ip_address: unknown
          p_success?: boolean
        }
        Returns: undefined
      }
      refresh_analytics_views: { Args: never; Returns: undefined }
      refresh_business_availability_overview: {
        Args: never
        Returns: undefined
      }
      refresh_dashboard_metrics: { Args: never; Returns: undefined }
      refresh_whatsapp_contact_overview: { Args: never; Returns: undefined }
      render_whatsapp_template:
        | {
            Args: {
              p_calendar_id: string
              p_language?: string
              p_template_key: string
              p_variables?: Json
            }
            Returns: Json
          }
        | {
            Args: {
              p_calendar_id: string
              p_template_key: string
              p_variables?: Json
            }
            Returns: Json
          }
      resolve_recurring_availability: {
        Args: {
          p_calendar_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          availability_rules: Json
          pattern_id: string
          resolved_date: string
        }[]
      }
      setup_calendar_defaults: {
        Args: { p_business_type?: string; p_calendar_id: string }
        Returns: undefined
      }
      test_webhook_system: { Args: { p_calendar_id: string }; Returns: Json }
      update_existing_users_retroactively: { Args: never; Returns: undefined }
      update_expired_trials: { Args: never; Returns: undefined }
      update_user_status: {
        Args: {
          p_status: string
          p_subscription_end_date?: string
          p_tier?: string
          p_user_id: string
        }
        Returns: boolean
      }
      validate_booking_calendar_and_service: {
        Args: { p_calendar_id: string; p_service_type_id: string }
        Returns: boolean
      }
      validate_booking_security:
        | {
            Args: {
              p_calendar_slug: string
              p_customer_email: string
              p_end_time: string
              p_service_type_id: string
              p_start_time: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_calendar_id: string
              p_customer_email: string
              p_end_time: string
              p_service_type_id: string
              p_start_time: string
            }
            Returns: boolean
          }
      validate_payment_security: {
        Args: {
          p_amount_cents: number
          p_calendar_id: string
          p_country_code?: string
          p_currency: string
          p_ip_address: unknown
          p_user_agent?: string
          p_user_email: string
        }
        Returns: Json
      }
      validate_user_input: {
        Args: { p_input: string; p_max_length?: number; p_type?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      subscription_tier: "starter" | "professional" | "enterprise" | "free"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      subscription_tier: ["starter", "professional", "enterprise", "free"],
    },
  },
} as const
