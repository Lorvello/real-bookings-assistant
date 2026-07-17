export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_type: string
          actor: string
          booking_id: string
          calendar_id: string
          channel: string
          conversation_id: string | null
          created_at: string
          id: string
          new_value: Json
          old_value: Json | null
          overridden_at: string | null
          overridden_by: string | null
          override_action: string | null
        }
        Insert: {
          action_type: string
          actor?: string
          booking_id: string
          calendar_id: string
          channel?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          new_value: Json
          old_value?: Json | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_action?: string | null
        }
        Update: {
          action_type?: string
          actor?: string
          booking_id?: string
          calendar_id?: string
          channel?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json
          old_value?: Json | null
          overridden_at?: string | null
          overridden_by?: string | null
          override_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "agent_actions_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "agent_actions_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
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
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          blocked_until: string | null
          created_at: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
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
          identifier: string
          ip_address?: unknown
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
          identifier?: string
          ip_address?: unknown
          last_attempt_at?: string | null
          total_blocks?: number | null
          updated_at?: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      booking_confirmation_deliveries: {
        Row: {
          attempt_count: number
          booking_id: string
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          delivered_at: string | null
          last_error_code: string | null
          provider_message_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          booking_id: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          last_error_code?: string | null
          provider_message_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          booking_id?: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          last_error_code?: string | null
          provider_message_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_confirmation_deliveries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_confirmation_deliveries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_confirmation_deliveries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
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
            foreignKeyName: "booking_intents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "booking_intents_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payment_provider_cleanup_jobs: {
        Row: {
          attempt_count: number
          booking_id: string
          claim_expires_at: string | null
          claim_token: string | null
          completed_at: string | null
          created_at: string
          id: string
          last_error_code: string | null
          next_attempt_at: string
          provider_kind: string
          provider_object_id: string
          provider_result: string | null
          reason_code: string
          request_fingerprint: string
          reservation_generation: number
          reservation_id: string
          state: string
          stripe_mode: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          booking_id: string
          claim_expires_at?: string | null
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string
          provider_kind: string
          provider_object_id: string
          provider_result?: string | null
          reason_code: string
          request_fingerprint: string
          reservation_generation: number
          reservation_id: string
          state?: string
          stripe_mode: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          booking_id?: string
          claim_expires_at?: string | null
          claim_token?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error_code?: string | null
          next_attempt_at?: string
          provider_kind?: string
          provider_object_id?: string
          provider_result?: string | null
          reason_code?: string
          request_fingerprint?: string
          reservation_generation?: number
          reservation_id?: string
          state?: string
          stripe_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payment_provider_cleanup_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_provider_cleanup_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_provider_cleanup_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_provider_cleanup_jobs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "booking_payment_provider_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_payment_provider_reservations: {
        Row: {
          amount_cents: number
          booking_id: string
          channel: string
          claim_expires_at: string
          claim_token: string
          cleaned_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          destination_account_id: string | null
          generation: number
          id: string
          platform_account_id: string
          provider_expires_at: string | null
          provider_kind: string
          provider_object_id: string | null
          provider_url: string | null
          request_fingerprint: string
          settlement_payment_intent_id: string | null
          state: string
          stripe_mode: string
          tax_calculation_id: string | null
          total_due_cents: number
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          channel: string
          claim_expires_at: string
          claim_token: string
          cleaned_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency: string
          destination_account_id?: string | null
          generation: number
          id?: string
          platform_account_id: string
          provider_expires_at?: string | null
          provider_kind: string
          provider_object_id?: string | null
          provider_url?: string | null
          request_fingerprint: string
          settlement_payment_intent_id?: string | null
          state?: string
          stripe_mode: string
          tax_calculation_id?: string | null
          total_due_cents: number
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          channel?: string
          claim_expires_at?: string
          claim_token?: string
          cleaned_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          destination_account_id?: string | null
          generation?: number
          id?: string
          platform_account_id?: string
          provider_expires_at?: string | null
          provider_kind?: string
          provider_object_id?: string | null
          provider_url?: string | null
          request_fingerprint?: string
          settlement_payment_intent_id?: string | null
          state?: string
          stripe_mode?: string
          tax_calculation_id?: string | null
          total_due_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_payment_provider_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_provider_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_payment_provider_reservations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
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
          customer_country: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          payment_method_type: string | null
          platform_fee_cents: number
          refund_amount_cents: number | null
          refunded_at: string | null
          reverse_charge: boolean
          status: string
          stripe_account_id: string
          stripe_mode: string | null
          stripe_payment_intent_id: string
          tax_breakdown: Json | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_method_type?: string | null
          platform_fee_cents?: number
          refund_amount_cents?: number | null
          refunded_at?: string | null
          reverse_charge?: boolean
          status?: string
          stripe_account_id: string
          stripe_mode?: string | null
          stripe_payment_intent_id: string
          tax_breakdown?: Json | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string
          currency?: string
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          payment_method_type?: string | null
          platform_fee_cents?: number
          refund_amount_cents?: number | null
          refunded_at?: string | null
          reverse_charge?: boolean
          status?: string
          stripe_account_id?: string
          stripe_mode?: string | null
          stripe_payment_intent_id?: string
          tax_breakdown?: Json | null
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
            referencedRelation: "bookings_with_period"
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
      booking_reminders_sent: {
        Row: {
          attempt_count: number
          booking_id: string
          booking_start_time_snapshot: string | null
          business_name_snapshot: string | null
          calendar_timezone_snapshot: string | null
          channel: string | null
          claim_expires_at: string | null
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          customer_locale_snapshot: string | null
          customer_name_snapshot: string | null
          delivery_key: string | null
          delivery_mode: string
          id: string
          last_attempted_at: string | null
          last_error_code: string | null
          post_acceptance_state: string | null
          provider_accepted_at: string | null
          provider_attempt_started_at: string | null
          provider_message_id: string | null
          recipient_snapshot: string | null
          reminder_number: number
          resolved_at: string | null
          schedule_generation: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempt_count?: number
          booking_id: string
          booking_start_time_snapshot?: string | null
          business_name_snapshot?: string | null
          calendar_timezone_snapshot?: string | null
          channel?: string | null
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          customer_locale_snapshot?: string | null
          customer_name_snapshot?: string | null
          delivery_key?: string | null
          delivery_mode?: string
          id?: string
          last_attempted_at?: string | null
          last_error_code?: string | null
          post_acceptance_state?: string | null
          provider_accepted_at?: string | null
          provider_attempt_started_at?: string | null
          provider_message_id?: string | null
          recipient_snapshot?: string | null
          reminder_number: number
          resolved_at?: string | null
          schedule_generation: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempt_count?: number
          booking_id?: string
          booking_start_time_snapshot?: string | null
          business_name_snapshot?: string | null
          calendar_timezone_snapshot?: string | null
          channel?: string | null
          claim_expires_at?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          customer_locale_snapshot?: string | null
          customer_name_snapshot?: string | null
          delivery_key?: string | null
          delivery_mode?: string
          id?: string
          last_attempted_at?: string | null
          last_error_code?: string | null
          post_acceptance_state?: string | null
          provider_accepted_at?: string | null
          provider_attempt_started_at?: string | null
          provider_message_id?: string | null
          recipient_snapshot?: string | null
          reminder_number?: number
          resolved_at?: string | null
          schedule_generation?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_reminders_sent_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminders_sent_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_reminders_sent_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
        ]
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
          customer_country: string | null
          customer_email: string | null
          customer_locale: string | null
          customer_name: string
          customer_phone: string | null
          customer_vat_id: string | null
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
          payment_timing: string | null
          public_booking_policy_snapshot: Json | null
          reminder_generation: string
          service_name: string | null
          service_type_id: string | null
          start_time: string
          status: string | null
          time_period: string | null
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
          customer_country?: string | null
          customer_email?: string | null
          customer_locale?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_vat_id?: string | null
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
          payment_timing?: string | null
          public_booking_policy_snapshot?: Json | null
          reminder_generation?: string
          service_name?: string | null
          service_type_id?: string | null
          start_time: string
          status?: string | null
          time_period?: string | null
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
          customer_country?: string | null
          customer_email?: string | null
          customer_locale?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_vat_id?: string | null
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
          payment_timing?: string | null
          public_booking_policy_snapshot?: Json | null
          reminder_generation?: string
          service_name?: string | null
          service_type_id?: string | null
          start_time?: string
          status?: string | null
          time_period?: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      business_events: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          event_data: Json
          event_type: string
          id: string
          processed_at: string | null
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          event_data: Json
          event_type: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          event_data?: Json
          event_type?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "business_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      business_overview: {
        Row: {
          accessibility_info: string | null
          allow_cancellations: boolean | null
          allow_waitlist: boolean | null
          allowed_payment_timing: Json | null
          auto_cancel_unpaid_bookings: boolean | null
          available_slots: Json | null
          booking_window_days: number | null
          buffer_time: number | null
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
          business_whatsapp: string | null
          calendar_active: boolean | null
          calendar_color: string | null
          calendar_description: string | null
          calendar_id: string
          calendar_name: string | null
          calendar_slug: string | null
          cancellation_deadline_hours: number | null
          cancellation_policy: string | null
          confirmation_required: boolean | null
          created_at: string | null
          enabled_payment_methods: Json | null
          facebook: string | null
          instagram: string | null
          last_updated: string | null
          linkedin: string | null
          max_bookings_per_day: number | null
          minimum_notice_hours: number | null
          opening_hours: Json | null
          other_info: string | null
          parking_info: string | null
          payment_deadline_hours: number | null
          payment_info: string | null
          payment_optional: boolean | null
          payment_required_for_booking: boolean | null
          preparation_info: string | null
          public_transport_info: string | null
          refund_policy_text: string | null
          secure_payments_enabled: boolean | null
          services: Json | null
          slot_duration: number | null
          tiktok: string | null
          timezone: string | null
          total_bookings: number | null
          total_revenue: number | null
          upcoming_bookings: Json | null
          user_id: string
          website: string | null
          whatsapp_bot_active: boolean | null
          x: string | null
          youtube: string | null
        }
        Insert: {
          accessibility_info?: string | null
          allow_cancellations?: boolean | null
          allow_waitlist?: boolean | null
          allowed_payment_timing?: Json | null
          auto_cancel_unpaid_bookings?: boolean | null
          available_slots?: Json | null
          booking_window_days?: number | null
          buffer_time?: number | null
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
          business_whatsapp?: string | null
          calendar_active?: boolean | null
          calendar_color?: string | null
          calendar_description?: string | null
          calendar_id: string
          calendar_name?: string | null
          calendar_slug?: string | null
          cancellation_deadline_hours?: number | null
          cancellation_policy?: string | null
          confirmation_required?: boolean | null
          created_at?: string | null
          enabled_payment_methods?: Json | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          opening_hours?: Json | null
          other_info?: string | null
          parking_info?: string | null
          payment_deadline_hours?: number | null
          payment_info?: string | null
          payment_optional?: boolean | null
          payment_required_for_booking?: boolean | null
          preparation_info?: string | null
          public_transport_info?: string | null
          refund_policy_text?: string | null
          secure_payments_enabled?: boolean | null
          services?: Json | null
          slot_duration?: number | null
          tiktok?: string | null
          timezone?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          upcoming_bookings?: Json | null
          user_id: string
          website?: string | null
          whatsapp_bot_active?: boolean | null
          x?: string | null
          youtube?: string | null
        }
        Update: {
          accessibility_info?: string | null
          allow_cancellations?: boolean | null
          allow_waitlist?: boolean | null
          allowed_payment_timing?: Json | null
          auto_cancel_unpaid_bookings?: boolean | null
          available_slots?: Json | null
          booking_window_days?: number | null
          buffer_time?: number | null
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
          business_whatsapp?: string | null
          calendar_active?: boolean | null
          calendar_color?: string | null
          calendar_description?: string | null
          calendar_id?: string
          calendar_name?: string | null
          calendar_slug?: string | null
          cancellation_deadline_hours?: number | null
          cancellation_policy?: string | null
          confirmation_required?: boolean | null
          created_at?: string | null
          enabled_payment_methods?: Json | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          max_bookings_per_day?: number | null
          minimum_notice_hours?: number | null
          opening_hours?: Json | null
          other_info?: string | null
          parking_info?: string | null
          payment_deadline_hours?: number | null
          payment_info?: string | null
          payment_optional?: boolean | null
          payment_required_for_booking?: boolean | null
          preparation_info?: string | null
          public_transport_info?: string | null
          refund_policy_text?: string | null
          secure_payments_enabled?: boolean | null
          services?: Json | null
          slot_duration?: number | null
          tiktok?: string | null
          timezone?: string | null
          total_bookings?: number | null
          total_revenue?: number | null
          upcoming_bookings?: Json | null
          user_id?: string
          website?: string | null
          whatsapp_bot_active?: boolean | null
          x?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "fk_business_overview_calendar"
            columns: ["calendar_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
        ]
      }
      business_overview_v2: {
        Row: {
          accessibility_info: string | null
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
          business_whatsapp: string | null
          calendars: Json | null
          cancellation_policy: string | null
          created_at: string | null
          facebook: string | null
          instagram: string | null
          last_updated: string | null
          linkedin: string | null
          other_info: string | null
          parking_info: string | null
          payment_info: string | null
          preparation_info: string | null
          public_transport_info: string | null
          tiktok: string | null
          total_bookings: number | null
          total_calendars: number | null
          total_revenue: number | null
          user_id: string
          website: string | null
          x: string | null
          youtube: string | null
        }
        Insert: {
          accessibility_info?: string | null
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
          business_whatsapp?: string | null
          calendars?: Json | null
          cancellation_policy?: string | null
          created_at?: string | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_info?: string | null
          preparation_info?: string | null
          public_transport_info?: string | null
          tiktok?: string | null
          total_bookings?: number | null
          total_calendars?: number | null
          total_revenue?: number | null
          user_id: string
          website?: string | null
          x?: string | null
          youtube?: string | null
        }
        Update: {
          accessibility_info?: string | null
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
          business_whatsapp?: string | null
          calendars?: Json | null
          cancellation_policy?: string | null
          created_at?: string | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_info?: string | null
          preparation_info?: string | null
          public_transport_info?: string | null
          tiktok?: string | null
          total_bookings?: number | null
          total_calendars?: number | null
          total_revenue?: number | null
          user_id?: string
          website?: string | null
          x?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_overview_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_overview_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "calendar_service_types_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
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
          whatsapp_welcome_message: string | null
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
          whatsapp_welcome_message?: string | null
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
          whatsapp_welcome_message?: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      contact_meetings: {
        Row: {
          budget: string | null
          company: string | null
          country: string | null
          created_at: string
          delivery_status: string
          delivery_updated_at: string | null
          email: string
          id: string
          meeting_date: string
          meeting_time: string
          message: string
          name: string
          phone: string | null
          platform: string | null
          provider_message_id: string | null
          status: string
          subject: string
          submission_id: string
          updated_at: string
        }
        Insert: {
          budget?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          email: string
          id?: string
          meeting_date: string
          meeting_time: string
          message: string
          name: string
          phone?: string | null
          platform?: string | null
          provider_message_id?: string | null
          status?: string
          subject: string
          submission_id: string
          updated_at?: string
        }
        Update: {
          budget?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          delivery_status?: string
          delivery_updated_at?: string | null
          email?: string
          id?: string
          meeting_date?: string
          meeting_time?: string
          message?: string
          name?: string
          phone?: string | null
          platform?: string | null
          provider_message_id?: string | null
          status?: string
          subject?: string
          submission_id?: string
          updated_at?: string
        }
        Relationships: []
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
      monitoring_alert_config: {
        Row: {
          alert_email: string | null
          enabled: boolean
          id: string
          updated_at: string
        }
        Insert: {
          alert_email?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          alert_email?: string | null
          enabled?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      monitoring_alert_hints: {
        Row: {
          booking_id: string
          created_at: string
          established_iso: string
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          established_iso: string
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          established_iso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_alert_hints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_alert_hints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_alert_hints_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          contact_phone: string | null
          conversation_id: string | null
          created_at: string
          details: Json
          detected_by: string
          failure_class: string
          id: string
          notified_at: string | null
          turn_id: string | null
        }
        Insert: {
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          details: Json
          detected_by?: string
          failure_class: string
          id?: string
          notified_at?: string | null
          turn_id?: string | null
        }
        Update: {
          contact_phone?: string | null
          conversation_id?: string | null
          created_at?: string
          details?: Json
          detected_by?: string
          failure_class?: string
          id?: string
          notified_at?: string | null
          turn_id?: string | null
        }
        Relationships: []
      }
      monitoring_heartbeat: {
        Row: {
          id: boolean
          last_beat: string
        }
        Insert: {
          id?: boolean
          last_beat?: string
        }
        Update: {
          id?: boolean
          last_beat?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
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
            referencedRelation: "bookings_with_period"
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
          allowed_payment_timing: Json | null
          auto_cancel_unpaid_bookings: boolean
          calendar_id: string
          created_at: string
          enabled_payment_methods: Json | null
          id: string
          payment_deadline_hours: number | null
          payment_optional: boolean | null
          payment_required_for_booking: boolean
          payout_option: string | null
          platform_fee_percentage: number
          refund_policy_text: string | null
          secure_payments_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_partial_refunds?: boolean
          allowed_payment_timing?: Json | null
          auto_cancel_unpaid_bookings?: boolean
          calendar_id: string
          created_at?: string
          enabled_payment_methods?: Json | null
          id?: string
          payment_deadline_hours?: number | null
          payment_optional?: boolean | null
          payment_required_for_booking?: boolean
          payout_option?: string | null
          platform_fee_percentage?: number
          refund_policy_text?: string | null
          secure_payments_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_partial_refunds?: boolean
          allowed_payment_timing?: Json | null
          auto_cancel_unpaid_bookings?: boolean
          calendar_id?: string
          created_at?: string
          enabled_payment_methods?: Json | null
          id?: string
          payment_deadline_hours?: number | null
          payment_optional?: boolean | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      processed_stripe_events: {
        Row: {
          attempt_count: number
          claim_token: string | null
          claimed_at: string | null
          completed_at: string | null
          event_id: string
          event_type: string | null
          last_error_code: string | null
          processed_at: string | null
          status: string
          stripe_mode: string | null
        }
        Insert: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          event_id: string
          event_type?: string | null
          last_error_code?: string | null
          processed_at?: string | null
          status?: string
          stripe_mode?: string | null
        }
        Update: {
          attempt_count?: number
          claim_token?: string | null
          claimed_at?: string | null
          completed_at?: string | null
          event_id?: string
          event_type?: string | null
          last_error_code?: string | null
          processed_at?: string | null
          status?: string
          stripe_mode?: string | null
        }
        Relationships: []
      }
      public_api_rate_limits: {
        Row: {
          blocked_until: string | null
          calendar_slug: string
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
          calendar_slug?: string
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
          calendar_slug?: string
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
          allow_customer_choice: boolean
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
          allow_customer_choice?: boolean
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
          allow_customer_choice?: boolean
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "service_installment_configs_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: true
            referencedRelation: "service_types_overview"
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
          supply_type: Database["public"]["Enums"]["supply_type"]
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
          supply_type?: Database["public"]["Enums"]["supply_type"]
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
          supply_type?: Database["public"]["Enums"]["supply_type"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      stripe_subscription_states: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          last_event_created: number
          last_event_id: string
          last_event_kind: string
          last_event_kind_precedence: number
          last_event_precedence: number
          stripe_customer_id: string
          stripe_mode: string
          stripe_status: string
          stripe_subscription_id: string
          subscription_end: string | null
          subscription_tier: string | null
          superseded: boolean
          tombstoned: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          last_event_created: number
          last_event_id: string
          last_event_kind: string
          last_event_kind_precedence: number
          last_event_precedence: number
          stripe_customer_id: string
          stripe_mode: string
          stripe_status: string
          stripe_subscription_id: string
          subscription_end?: string | null
          subscription_tier?: string | null
          superseded?: boolean
          tombstoned?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          last_event_created?: number
          last_event_id?: string
          last_event_kind?: string
          last_event_kind_precedence?: number
          last_event_precedence?: number
          stripe_customer_id?: string
          stripe_mode?: string
          stripe_status?: string
          stripe_subscription_id?: string
          subscription_end?: string | null
          subscription_tier?: string | null
          superseded?: boolean
          tombstoned?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          stripe_mode: string | null
          stripe_subscription_id: string | null
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
          stripe_mode?: string | null
          stripe_subscription_id?: string | null
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
          stripe_mode?: string | null
          stripe_subscription_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_checkout_claims: {
        Row: {
          cadence: string
          checkout_url: string | null
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          expires_at: string | null
          last_error_code: string | null
          status: string
          stripe_mode: string
          stripe_session_id: string | null
          tier_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cadence: string
          checkout_url?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          last_error_code?: string | null
          status: string
          stripe_mode: string
          stripe_session_id?: string | null
          tier_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cadence?: string
          checkout_url?: string | null
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
          last_error_code?: string | null
          status?: string
          stripe_mode?: string
          stripe_session_id?: string | null
          tier_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscription_event_high_water_marks: {
        Row: {
          authoritative_subscription_id: string
          created_at: string
          last_event_created: number
          last_event_id: string
          last_event_kind_precedence: number
          last_event_precedence: number
          stripe_mode: string
          updated_at: string
          user_id: string
        }
        Insert: {
          authoritative_subscription_id: string
          created_at?: string
          last_event_created: number
          last_event_id: string
          last_event_kind_precedence: number
          last_event_precedence: number
          stripe_mode: string
          updated_at?: string
          user_id: string
        }
        Update: {
          authoritative_subscription_id?: string
          created_at?: string
          last_event_created?: number
          last_event_id?: string
          last_event_kind_precedence?: number
          last_event_precedence?: number
          stripe_mode?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_event_high_water_authoritative_subscription_i_fkey"
            columns: ["authoritative_subscription_id"]
            isOneToOne: false
            referencedRelation: "stripe_subscription_states"
            referencedColumns: ["stripe_subscription_id"]
          },
        ]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      team_invitation_deliveries: {
        Row: {
          app_base_url: string
          attempt_count: number
          business_name: string
          calendar_id: string
          calendar_name: string
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          delivered_at: string | null
          invitation_id: string
          invitation_token: string
          invitee_name: string
          last_error_code: string | null
          locale: string
          provider_message_id: string | null
          recipient_email: string
          request_id: string
          requested_by: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          app_base_url: string
          attempt_count?: number
          business_name: string
          calendar_id: string
          calendar_name: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          invitation_id: string
          invitation_token: string
          invitee_name?: string
          last_error_code?: string | null
          locale: string
          provider_message_id?: string | null
          recipient_email: string
          request_id: string
          requested_by: string
          role: string
          status: string
          updated_at?: string
        }
        Update: {
          app_base_url?: string
          attempt_count?: number
          business_name?: string
          calendar_id?: string
          calendar_name?: string
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          invitation_id?: string
          invitation_token?: string
          invitee_name?: string
          last_error_code?: string | null
          locale?: string
          provider_message_id?: string | null
          recipient_email?: string
          request_id?: string
          requested_by?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "team_invitation_deliveries_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "team_invitations"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "team_member_services_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
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
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
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
          allow_customer_installment_choice: boolean
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
          cancel_at_period_end: boolean
          cancellation_policy: string | null
          created_at: string | null
          date_of_birth: string | null
          default_installment_plan: Json
          default_tax_behavior: string | null
          email: string
          facebook: string | null
          full_name: string | null
          gender: string | null
          grace_period_end: string | null
          id: string
          instagram: string | null
          installment_scope: string
          installments_enabled: boolean | null
          language: string | null
          last_payment_date: string | null
          linkedin: string | null
          opening_hours_note: string | null
          other_info: string | null
          owner_test_phone: string | null
          parking_info: string | null
          password_added: boolean | null
          payment_info: string | null
          payment_status: string | null
          phone: string | null
          preparation_info: string | null
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
          x: string | null
          youtube: string | null
        }
        Insert: {
          accessibility_info?: string | null
          account_owner_id?: string | null
          address_city?: string | null
          address_country?: string | null
          address_number?: string | null
          address_postal?: string | null
          address_street?: string | null
          allow_customer_installment_choice?: boolean
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
          cancel_at_period_end?: boolean
          cancellation_policy?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_installment_plan?: Json
          default_tax_behavior?: string | null
          email: string
          facebook?: string | null
          full_name?: string | null
          gender?: string | null
          grace_period_end?: string | null
          id: string
          instagram?: string | null
          installment_scope?: string
          installments_enabled?: boolean | null
          language?: string | null
          last_payment_date?: string | null
          linkedin?: string | null
          opening_hours_note?: string | null
          other_info?: string | null
          owner_test_phone?: string | null
          parking_info?: string | null
          password_added?: boolean | null
          payment_info?: string | null
          payment_status?: string | null
          phone?: string | null
          preparation_info?: string | null
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
          x?: string | null
          youtube?: string | null
        }
        Update: {
          accessibility_info?: string | null
          account_owner_id?: string | null
          address_city?: string | null
          address_country?: string | null
          address_number?: string | null
          address_postal?: string | null
          address_street?: string | null
          allow_customer_installment_choice?: boolean
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
          cancel_at_period_end?: boolean
          cancellation_policy?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          default_installment_plan?: Json
          default_tax_behavior?: string | null
          email?: string
          facebook?: string | null
          full_name?: string | null
          gender?: string | null
          grace_period_end?: string | null
          id?: string
          instagram?: string | null
          installment_scope?: string
          installments_enabled?: boolean | null
          language?: string | null
          last_payment_date?: string | null
          linkedin?: string | null
          opening_hours_note?: string | null
          other_info?: string | null
          owner_test_phone?: string | null
          parking_info?: string | null
          password_added?: boolean | null
          payment_info?: string | null
          payment_status?: string | null
          phone?: string | null
          preparation_info?: string | null
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
          x?: string | null
          youtube?: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "waitlist_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          claim_token: string | null
          claimed_at: string | null
          created_at: string
          delivered_at: string | null
          endpoint_id: string | null
          endpoint_url: string
          event_id: string
          id: string
          last_attempt_at: string | null
          last_error_code: string | null
          last_http_status: number | null
          next_attempt_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string | null
          endpoint_url: string
          event_id: string
          id?: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_http_status?: number | null
          next_attempt_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          claim_token?: string | null
          claimed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          endpoint_id?: string | null
          endpoint_url?: string
          event_id?: string
          id?: string
          last_attempt_at?: string | null
          last_error_code?: string | null
          last_http_status?: number | null
          next_attempt_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
          ip_address: string | null
          severity: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_confirm_claims: {
        Row: {
          calendar_id: string
          claim_key: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          proposal_at: string
        }
        Insert: {
          calendar_id: string
          claim_key: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          proposal_at: string
        }
        Update: {
          calendar_id?: string
          claim_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          proposal_at?: string
        }
        Relationships: []
      }
      whatsapp_contact_business_overrides: {
        Row: {
          business_name: string
          contact_id: string
          created_at: string | null
          created_by: string
          id: string
          updated_at: string | null
        }
        Insert: {
          business_name: string
          contact_id: string
          created_at?: string | null
          created_by: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          business_name?: string
          contact_id?: string
          created_at?: string | null
          created_by?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_business_overrides_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_overview: {
        Row: {
          all_bookings: Json | null
          contact_created_at: string | null
          contact_id: string
          conversation_created_at: string | null
          conversation_status: string | null
          display_name: string | null
          first_name: string | null
          last_message_at: string | null
          last_name: string | null
          last_seen_at: string | null
          phone_number: string
          session_id: string | null
          updated_at: string | null
          with_business: string | null
        }
        Insert: {
          all_bookings?: Json | null
          contact_created_at?: string | null
          contact_id: string
          conversation_created_at?: string | null
          conversation_status?: string | null
          display_name?: string | null
          first_name?: string | null
          last_message_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          phone_number: string
          session_id?: string | null
          updated_at?: string | null
          with_business?: string | null
        }
        Update: {
          all_bookings?: Json | null
          contact_created_at?: string | null
          contact_id?: string
          conversation_created_at?: string | null
          conversation_status?: string | null
          display_name?: string | null
          first_name?: string | null
          last_message_at?: string | null
          last_name?: string | null
          last_seen_at?: string | null
          phone_number?: string
          session_id?: string | null
          updated_at?: string | null
          with_business?: string | null
        }
        Relationships: []
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
          user_id: string | null
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
          user_id?: string | null
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
          business_name: string | null
          calendar_id: string | null
          contact_id: string | null
          context: Json | null
          created_at: string | null
          From: string | null
          id: string
          last_message_at: string | null
          message: string | null
          phone_number: string | null
          session_id: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          From?: string | null
          id?: string
          last_message_at?: string | null
          message?: string | null
          phone_number?: string | null
          session_id?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          calendar_id?: string | null
          contact_id?: string | null
          context?: Json | null
          created_at?: string | null
          From?: string | null
          id?: string
          last_message_at?: string | null
          message?: string | null
          phone_number?: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
          meta_timestamp: string | null
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
          meta_timestamp?: string | null
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
          meta_timestamp?: string | null
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
      whatsapp_payment_attempts: {
        Row: {
          amount_cents: number
          attempt_generation: number
          booking_id: string
          calendar_id: string
          claim_expires_at: string
          claim_token: string
          conversation_id: string
          created_at: string
          currency: string
          expires_at: string
          installment_plan: Json | null
          payment_session_id: string | null
          payment_type: string
          payment_url: string | null
          previous_stripe_session_id: string | null
          provider_expires_at: string | null
          provider_ownership_version: number
          provider_payment_status: string | null
          provider_reconciled_at: string | null
          provider_status: string | null
          request_fingerprint: string
          service_type_id: string
          state: string
          stripe_mode: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          attempt_generation?: number
          booking_id: string
          calendar_id: string
          claim_expires_at: string
          claim_token: string
          conversation_id: string
          created_at?: string
          currency: string
          expires_at: string
          installment_plan?: Json | null
          payment_session_id?: string | null
          payment_type: string
          payment_url?: string | null
          previous_stripe_session_id?: string | null
          provider_expires_at?: string | null
          provider_ownership_version?: number
          provider_payment_status?: string | null
          provider_reconciled_at?: string | null
          provider_status?: string | null
          request_fingerprint: string
          service_type_id: string
          state?: string
          stripe_mode: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attempt_generation?: number
          booking_id?: string
          calendar_id?: string
          claim_expires_at?: string
          claim_token?: string
          conversation_id?: string
          created_at?: string
          currency?: string
          expires_at?: string
          installment_plan?: Json | null
          payment_session_id?: string | null
          payment_type?: string
          payment_url?: string | null
          previous_stripe_session_id?: string | null
          provider_expires_at?: string | null
          provider_ownership_version?: number
          provider_payment_status?: string | null
          provider_reconciled_at?: string | null
          provider_status?: string | null
          request_fingerprint?: string
          service_type_id?: string
          state?: string
          stripe_mode?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_payment_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendar_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "public_calendars_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_analytics"
            referencedColumns: ["calendar_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_payment_session_id_fkey"
            columns: ["payment_session_id"]
            isOneToOne: true
            referencedRelation: "whatsapp_payment_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "available_slots_view"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "public_service_types_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_type_stats"
            referencedColumns: ["service_type_id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_attempts_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_payment_sessions: {
        Row: {
          amount_cents: number
          attempt_generation: number
          booking_id: string | null
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
          provider_payment_status: string | null
          provider_reconciled_at: string | null
          provider_status: string | null
          request_fingerprint: string | null
          service_type_id: string | null
          stripe_mode: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          attempt_generation?: number
          booking_id?: string | null
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
          provider_payment_status?: string | null
          provider_reconciled_at?: string | null
          provider_status?: string | null
          request_fingerprint?: string | null
          service_type_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          attempt_generation?: number
          booking_id?: string | null
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
          provider_payment_status?: string | null
          provider_reconciled_at?: string | null
          provider_status?: string | null
          request_fingerprint?: string | null
          service_type_id?: string | null
          stripe_mode?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings_with_period"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_payment_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "public_bookings_view"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "whatsapp_payment_sessions_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      bookings_with_period: {
        Row: {
          assigned_team_member_id: string | null
          booking_duration: number | null
          business_name: string | null
          calculated_period: string | null
          calendar_id: string | null
          calender_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          confirmation_token: string | null
          confirmed_at: string | null
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          deleted_at: string | null
          end_time: string | null
          id: string | null
          internal_notes: string | null
          is_deleted: boolean | null
          notes: string | null
          payment_currency: string | null
          payment_deadline: string | null
          payment_required: boolean | null
          payment_status: string | null
          payment_timing: string | null
          service_name: string | null
          service_type_id: string | null
          start_time: string | null
          status: string | null
          time_period: string | null
          total_amount_cents: number | null
          total_price: number | null
          updated_at: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      business_intelligence_mv: {
        Row: {
          avg_booking_value: number | null
          calendar_id: string | null
          last_updated: string | null
          month_revenue: number | null
          prev_month_revenue: number | null
          service_performance: Json | null
          unique_customers_month: number | null
          whatsapp_conversion_rate: number | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
        Relationships: []
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      future_insights_mv: {
        Row: {
          calendar_id: string | null
          demand_forecast: Json | null
          last_updated: string | null
          returning_customers_month: number | null
          seasonal_patterns: Json | null
          waitlist_size: number | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      live_operations_mv: {
        Row: {
          calendar_id: string | null
          currently_active_bookings: number | null
          last_updated: string | null
          next_appointment_time: string | null
          today_bookings: number | null
          today_confirmed: number | null
          today_pending: number | null
          whatsapp_messages_last_hour: number | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      performance_efficiency_mv: {
        Row: {
          avg_response_time_minutes: number | null
          calendar_id: string | null
          calendar_utilization_rate: number | null
          cancellation_rate: number | null
          last_updated: string | null
          no_show_rate: number | null
          peak_hours: Json | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_service_types"
            referencedColumns: ["id"]
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
          {
            foreignKeyName: "bookings_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types_overview"
            referencedColumns: ["id"]
          },
        ]
      }
      public_business_directory: {
        Row: {
          accessibility_info: string | null
          business_city: string | null
          business_country: string | null
          business_description: string | null
          business_name: string | null
          business_number: string | null
          business_postal: string | null
          business_street: string | null
          business_type: string | null
          calendars: Json | null
          cancellation_policy: string | null
          created_at: string | null
          facebook: string | null
          instagram: string | null
          last_updated: string | null
          linkedin: string | null
          other_info: string | null
          parking_info: string | null
          payment_info: string | null
          preparation_info: string | null
          public_transport_info: string | null
          tiktok: string | null
          user_id: string | null
          website: string | null
          x: string | null
          youtube: string | null
        }
        Insert: {
          accessibility_info?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_name?: string | null
          business_number?: string | null
          business_postal?: string | null
          business_street?: string | null
          business_type?: string | null
          calendars?: never
          cancellation_policy?: string | null
          created_at?: string | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_info?: string | null
          preparation_info?: string | null
          public_transport_info?: string | null
          tiktok?: string | null
          user_id?: string | null
          website?: string | null
          x?: string | null
          youtube?: string | null
        }
        Update: {
          accessibility_info?: string | null
          business_city?: string | null
          business_country?: string | null
          business_description?: string | null
          business_name?: string | null
          business_number?: string | null
          business_postal?: string | null
          business_street?: string | null
          business_type?: string | null
          calendars?: never
          cancellation_policy?: string | null
          created_at?: string | null
          facebook?: string | null
          instagram?: string | null
          last_updated?: string | null
          linkedin?: string | null
          other_info?: string | null
          parking_info?: string | null
          payment_info?: string | null
          preparation_info?: string | null
          public_transport_info?: string | null
          tiktok?: string | null
          user_id?: string | null
          website?: string | null
          x?: string | null
          youtube?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_overview_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_status_overview"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_overview_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
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
      public_calendars: {
        Row: {
          id: string | null
          is_active: boolean | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          slug?: string | null
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
      public_service_types: {
        Row: {
          calendar_id: string | null
          duration: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          price: number | null
          supply_type: Database["public"]["Enums"]["supply_type"] | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      service_popularity_stats: {
        Row: {
          booking_count: number | null
          calendar_id: string | null
          percentage: number | null
          service_name: string | null
        }
        Relationships: []
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      service_types_overview: {
        Row: {
          booking_window_days: number | null
          buffer_time: number | null
          business_name: string | null
          calendar_active: boolean | null
          calendar_id: string | null
          calendar_name: string | null
          calendar_slug: string | null
          color: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string | null
          is_active: boolean | null
          minimum_notice_hours: number | null
          opening_hours: Json | null
          price: number | null
          service_name: string | null
          slot_duration: number | null
          timezone: string | null
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "daily_booking_stats"
            referencedColumns: ["calendar_id"]
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
            referencedRelation: "public_calendars"
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
            referencedRelation: "service_popularity_stats"
            referencedColumns: ["calendar_id"]
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
      accept_team_invitation_for_user: {
        Args: { p_token: string; p_user_id: string }
        Returns: Json
      }
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
      admin_get_user_subscription_details_safe: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_setup_mock_incomplete_user: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_update_user_subscription:
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
              p_subscription_end_date?: string
              p_subscription_status?: string
              p_subscription_tier?: string
              p_trial_end_date?: string
              p_user_id: string
            }
            Returns: Json
          }
      admin_update_user_subscription_safe: {
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
      apply_installment_settings: {
        Args: {
          p_allow_customer_choice: boolean
          p_apply_to_services: string
          p_default_plan: Json
          p_enabled: boolean
          p_owner_id: string
          p_service_configs?: Json
        }
        Returns: Json
      }
      apply_stripe_subscription_event: {
        Args: {
          p_cancel_at_period_end: boolean
          p_customer_id: string
          p_event_created: number
          p_event_id: string
          p_event_kind: string
          p_period_end: string
          p_stripe_mode: string
          p_stripe_status: string
          p_subscription_id: string
          p_tier: string
          p_user_email: string
          p_user_id: string
        }
        Returns: Json
      }
      apply_stripe_subscription_invoice_event: {
        Args: {
          p_event_created: number
          p_event_id: string
          p_outcome: string
          p_stripe_mode: string
          p_subscription_id: string
        }
        Returns: Json
      }
      archive_old_security_events: { Args: never; Returns: number }
      assert_r45_no_active_payable_legacy_bookings: {
        Args: never
        Returns: undefined
      }
      authorize_booking_payment_provider_settlement: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_currency: string
          p_destination_account_id: string
          p_generation: number
          p_payment_intent_id: string
          p_provider_kind: string
          p_provider_object_id: string
          p_request_fingerprint: string
          p_stripe_mode: string
        }
        Returns: Json
      }
      begin_booking_reminder_attempt_v2: {
        Args: {
          p_booking_id: string
          p_channel: string
          p_claim_token: string
          p_delivery_key: string
          p_delivery_mode: string
          p_reminder_number: number
          p_schedule_generation: string
        }
        Returns: boolean
      }
      begin_booking_reminder_provider_attempt: {
        Args: {
          p_booking_id: string
          p_channel: string
          p_delivery_key: string
          p_delivery_mode: string
          p_reminder_number: number
        }
        Returns: boolean
      }
      caller_is_accepted_calendar_member: {
        Args: { p_calendar_id: string; p_min_role?: string }
        Returns: boolean
      }
      caller_owns_calendar: {
        Args: { p_calendar_id: string }
        Returns: boolean
      }
      caller_shares_calendar_with_user: {
        Args: { p_target_user_id: string }
        Returns: boolean
      }
      cancel_booking_by_token: {
        Args: { p_reason?: string; p_token: string }
        Returns: Json
      }
      cancel_booking_for_agent: {
        Args: { p_booking_id: string; p_phone: string; p_reason?: string }
        Returns: Json
      }
      cancel_overdue_unpaid_bookings: { Args: never; Returns: number }
      check_auth_rate_limit: {
        Args: { p_email: string; p_ip?: unknown }
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
      check_meeting_slot_available: {
        Args: { p_date: string; p_time: string }
        Returns: boolean
      }
      check_team_member_limit: {
        Args: { p_calendar_id: string; p_user_id: string }
        Returns: boolean
      }
      check_whatsapp_contact_limit: {
        Args: { p_calendar_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_booking_confirmation_delivery: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      claim_booking_payment_provider_cleanup: {
        Args: { p_lease_seconds?: number; p_limit?: number }
        Returns: {
          attempt_count: number
          booking_id: string
          claim_token: string
          job_id: string
          provider_kind: string
          provider_object_id: string
          request_fingerprint: string
          reservation_generation: number
          reservation_id: string
          stripe_mode: string
        }[]
      }
      claim_booking_payment_provider_reservation: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_channel: string
          p_claim_ttl_seconds?: number
          p_currency: string
          p_destination_account_id: string
          p_platform_account_id: string
          p_provider_kind: string
          p_request_fingerprint: string
          p_stripe_mode: string
          p_tax_calculation_id: string
          p_total_due_cents: number
        }
        Returns: Json
      }
      claim_booking_reminder: {
        Args: { p_booking_id: string; p_reminder_number: number }
        Returns: {
          attempt_count: number
          calendar_timezone: string
          channel: string
          customer_email: string
          customer_name: string
          customer_phone: string
          status: string
        }[]
      }
      claim_booking_reminder_v2: {
        Args: { p_booking_id: string; p_reminder_number: number }
        Returns: {
          attempt_count: number
          business_name: string
          calendar_id: string
          calendar_timezone: string
          channel: string
          claim_token: string
          customer_email: string
          customer_locale: string
          customer_name: string
          customer_phone: string
          schedule_generation: string
          start_time: string
          status: string
        }[]
      }
      claim_booking_reminder_v2_unfenced: {
        Args: { p_booking_id: string; p_reminder_number: number }
        Returns: {
          attempt_count: number
          business_name: string
          calendar_id: string
          calendar_timezone: string
          channel: string
          claim_token: string
          customer_email: string
          customer_locale: string
          customer_name: string
          customer_phone: string
          schedule_generation: string
          start_time: string
          status: string
        }[]
      }
      claim_stripe_event: {
        Args: {
          p_event_id: string
          p_event_type: string
          p_lease_seconds: number
          p_stripe_mode: string
        }
        Returns: Json
      }
      claim_subscription_checkout: {
        Args: {
          p_cadence: string
          p_lease_seconds?: number
          p_stripe_mode: string
          p_tier_name: string
          p_user_id: string
        }
        Returns: Json
      }
      claim_webhook_deliveries: {
        Args: {
          p_calendar_id?: string
          p_event_id?: string
          p_limit?: number
          p_retry_failed?: boolean
          p_user_id: string
        }
        Returns: {
          calendar_id: string
          delivery_attempt: number
          delivery_claim_token: string
          delivery_id: string
          endpoint_id: string
          endpoint_url: string
          event_created_at: string
          event_id: string
          event_payload: Json
          event_type: string
        }[]
      }
      claim_whatsapp_confirm: {
        Args: {
          p_calendar_id: string
          p_phone: string
          p_proposal_at: string
          p_ttl_seconds?: number
        }
        Returns: {
          claim_id: string
          won: boolean
        }[]
      }
      claim_whatsapp_payment_attempt: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_calendar_id: string
          p_claim_ttl_seconds?: number
          p_conversation_id: string
          p_currency: string
          p_expires_at: string
          p_installment_plan: Json
          p_payment_type: string
          p_request_fingerprint: string
          p_service_type_id: string
          p_stripe_mode: string
        }
        Returns: Json
      }
      cleanup_duplicate_availability_rules: {
        Args: { p_day_of_week: number; p_schedule_id: string }
        Returns: undefined
      }
      cleanup_expired_context: { Args: never; Returns: undefined }
      cleanup_expired_invitations: { Args: never; Returns: undefined }
      cleanup_expired_waitlist: { Args: never; Returns: undefined }
      cleanup_expired_whatsapp_confirm_claims: {
        Args: never
        Returns: undefined
      }
      cleanup_whatsapp_data_for_calendar: {
        Args: { p_calendar_id: string }
        Returns: undefined
      }
      commit_public_booking: {
        Args: {
          p_calendar_slug: string
          p_customer_country: string
          p_customer_email: string
          p_customer_locale: string
          p_customer_name: string
          p_customer_phone: string
          p_customer_vat_id: string
          p_notes: string
          p_service_type_id: string
          p_start_time: string
        }
        Returns: Json
      }
      complete_stripe_event: {
        Args: { p_claim_token: string; p_event_id: string }
        Returns: boolean
      }
      complete_subscription_checkout: {
        Args: {
          p_checkout_url: string
          p_claim_token: string
          p_expires_at: string
          p_session_id: string
          p_stripe_mode: string
          p_user_id: string
        }
        Returns: boolean
      }
      complete_team_invitation_delivery: {
        Args: {
          p_claim_token: string
          p_error_code?: string
          p_provider_message_id?: string
          p_request_id: string
          p_status: string
        }
        Returns: Json
      }
      complete_user_setup: { Args: { p_user_id: string }; Returns: Json }
      complete_webhook_delivery: {
        Args: {
          p_claim_token: string
          p_delivery_id: string
          p_error_code?: string
          p_http_status?: number
          p_success: boolean
        }
        Returns: Json
      }
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
      defer_public_booking_payment_on_site: {
        Args: {
          p_booking_id: string
          p_expected_booking_status: string
          p_expected_payment_status: string
        }
        Returns: Json
      }
      enqueue_booking_payment_provider_cleanup: {
        Args: { p_reason_code: string; p_reservation_id: string }
        Returns: string
      }
      ensure_default_service_types: { Args: never; Returns: undefined }
      ensure_user_has_calendar_and_service: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      export_whatsapp_data: { Args: { p_calendar_id: string }; Returns: Json }
      fail_stripe_event: {
        Args: {
          p_claim_token: string
          p_error_code: string
          p_event_id: string
        }
        Returns: boolean
      }
      fail_subscription_checkout: {
        Args: {
          p_claim_token: string
          p_error_code: string
          p_stripe_mode: string
          p_user_id: string
        }
        Returns: boolean
      }
      finalize_booking_confirmation_delivery: {
        Args: {
          p_booking_id: string
          p_claim_token: string
          p_error_code?: string
          p_provider_message_id?: string
          p_status: string
        }
        Returns: boolean
      }
      finalize_booking_payment_provider_cleanup: {
        Args: {
          p_claim_token: string
          p_error_code: string
          p_job_id: string
          p_provider_result: string
          p_retry_delay_seconds?: number
          p_succeeded: boolean
        }
        Returns: Json
      }
      finalize_booking_payment_provider_reservation: {
        Args: {
          p_booking_id: string
          p_claim_token: string
          p_generation: number
          p_provider_expires_at: string
          p_provider_object_id: string
          p_provider_url: string
          p_request_fingerprint: string
          p_reservation_id: string
          p_stripe_mode: string
        }
        Returns: Json
      }
      finalize_booking_payment_success: {
        Args: {
          p_booking_id: string
          p_paid_at: string
          p_payment_kind: string
          p_stripe_payment_intent_id: string
        }
        Returns: Json
      }
      finalize_booking_payment_success_v2: {
        Args: {
          p_booking_id: string
          p_paid_at: string
          p_payment_kind: string
          p_stripe_mode: string
          p_stripe_payment_intent_id: string
        }
        Returns: Json
      }
      finalize_whatsapp_payment_attempt:
        | {
            Args: {
              p_attempt_generation: number
              p_booking_id: string
              p_claim_token: string
              p_payment_url: string
              p_request_fingerprint: string
              p_stripe_mode: string
              p_stripe_session_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_booking_id: string
              p_claim_token: string
              p_payment_url: string
              p_request_fingerprint: string
              p_stripe_mode: string
              p_stripe_session_id: string
            }
            Returns: Json
          }
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
              p_timezone: string
            }
            Returns: {
              is_available: boolean
              slot_date: string
              slot_end: string
              slot_start: string
            }[]
          }
      get_booked_meeting_slots: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          meeting_date: string
          meeting_time: string
        }[]
      }
      get_booking_by_token: {
        Args: { p_token: string }
        Returns: {
          business_name: string
          calendar_id: string
          cancellation_reason: string
          cancelled_at: string
          confirmation_token: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          end_time: string
          id: string
          notes: string
          service_name: string
          service_type_id: string
          start_time: string
          status: string
          total_price: number
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
      get_due_booking_reminders: {
        Args: never
        Returns: {
          booking_id: string
          business_name: string
          calendar_id: string
          calendar_timezone: string
          channel: string
          customer_email: string
          customer_locale: string
          customer_name: string
          customer_phone: string
          reminder_number: number
          start_time: string
        }[]
      }
      get_due_booking_reminders_v2: {
        Args: { p_booking_id?: string; p_limit?: number }
        Returns: {
          booking_id: string
          reminder_number: number
        }[]
      }
      get_formatted_business_hours: {
        Args: { p_calendar_id: string }
        Returns: string
      }
      get_n8n_day_mapping: { Args: never; Returns: Json }
      get_team_invitation_by_token: { Args: { p_token: string }; Returns: Json }
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
      get_whatsapp_gate_rejections: {
        Args: { p_calendar_ids: string[]; p_days?: number }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      installment_deposits_are_runtime_valid: {
        Args: { p_deposits: Json }
        Returns: boolean
      }
      installment_plan_is_runtime_valid: {
        Args: { p_plan: Json }
        Returns: boolean
      }
      installment_plan_is_runtime_valid_for_price: {
        Args: { p_plan: Json; p_service_price: number }
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
      lock_booking_captured_balance_cents: {
        Args: { p_booking_id: string }
        Returns: number
      }
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
      manual_process_webhooks: {
        Args: { p_calendar_id?: string }
        Returns: Json
      }
      match_quick_reply_flow:
        | {
            Args: { p_calendar_id: string; p_message_text: string }
            Returns: Json
          }
        | { Args: { p_calendar_id: string; p_message: string }; Returns: Json }
      normalize_public_booking_payment_methods: {
        Args: { p_currency: string; p_methods: Json }
        Returns: Json
      }
      owner_update_booking_status: {
        Args: { p_booking_id: string; p_new_status: string; p_reason?: string }
        Returns: Json
      }
      prepare_team_invitation_delivery: {
        Args: {
          p_app_base_url: string
          p_calendar_id: string
          p_email: string
          p_full_name: string
          p_request_id: string
          p_role: string
          p_user_id: string
        }
        Returns: Json
      }
      process_automatic_status_transitions: { Args: never; Returns: Json }
      process_whatsapp_message:
        | {
            Args: {
              p_calendar_id: string
              p_message_content: string
              p_message_id: string
              p_phone_number: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_calendar_id: string
              p_message_content: string
              p_message_id: string
              p_message_timestamp?: string
              p_phone_number: string
            }
            Returns: Json
          }
      reconcile_booking_refund: {
        Args: {
          p_booking_id: string
          p_refund_amount_cents: number
          p_refunded_at: string
          p_stripe_payment_intent_id: string
        }
        Returns: Json
      }
      reconcile_booking_refund_v2: {
        Args: {
          p_booking_id: string
          p_refund_amount_cents: number
          p_refunded_at: string
          p_stripe_mode: string
          p_stripe_payment_intent_id: string
        }
        Returns: Json
      }
      reconcile_booking_reminders_invalid_state_v2: {
        Args: never
        Returns: number
      }
      reconcile_booking_reminders_v2: { Args: never; Returns: number }
      reconcile_or_renew_whatsapp_payment_attempt: {
        Args: {
          p_attempt_generation: number
          p_booking_id: string
          p_claim_ttl_seconds?: number
          p_new_expires_at: string
          p_payment_url: string
          p_provider_expires_at: string
          p_provider_payment_status: string
          p_provider_status: string
          p_request_fingerprint: string
          p_stripe_mode: string
          p_stripe_session_id: string
        }
        Returns: Json
      }
      record_auth_attempt: {
        Args: { p_email: string; p_ip?: unknown; p_success?: boolean }
        Returns: undefined
      }
      record_booking_checkout_failure: {
        Args: {
          p_booking_id: string
          p_failed_at: string
          p_stripe_mode: string
          p_stripe_session_id: string
        }
        Returns: Json
      }
      record_booking_payment_failure: {
        Args: {
          p_booking_id: string
          p_failed_at: string
          p_stripe_mode: string
          p_stripe_payment_intent_id: string
        }
        Returns: Json
      }
      record_booking_reminder_result: {
        Args: {
          p_booking_id: string
          p_channel?: string
          p_delivered: boolean
          p_delivery_key?: string
          p_delivery_mode?: string
          p_failure_reason?: string
          p_max_attempts: number
          p_provider_message_id?: string
          p_reminder_number: number
        }
        Returns: {
          attempt_count: number
          status: string
        }[]
      }
      record_booking_reminder_result_v2: {
        Args: {
          p_booking_id: string
          p_channel: string
          p_claim_token: string
          p_delivery_key: string
          p_delivery_mode: string
          p_failure_reason: string
          p_max_attempts: number
          p_provider_accepted: boolean
          p_provider_message_id: string
          p_reminder_number: number
          p_schedule_generation: string
        }
        Returns: {
          attempt_count: number
          status: string
        }[]
      }
      record_contact_meeting_delivery: {
        Args: {
          p_delivery_status: string
          p_provider_message_id?: string
          p_submission_id: string
        }
        Returns: Json
      }
      record_installment_balance_collected: {
        Args: { p_booking_id: string }
        Returns: Json
      }
      refresh_all_dashboard_views: { Args: never; Returns: undefined }
      refresh_analytics_views: { Args: never; Returns: undefined }
      refresh_booking_time_periods: { Args: never; Returns: undefined }
      refresh_business_overview: {
        Args: { p_calendar_id?: string }
        Returns: undefined
      }
      refresh_business_overview_v2: {
        Args: { p_user_id?: string }
        Returns: undefined
      }
      refresh_dashboard_metrics: { Args: never; Returns: undefined }
      refresh_webhook_event_delivery_status: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      refresh_whatsapp_contact_overview: { Args: never; Returns: undefined }
      release_booking_payment_provider_after_failure: {
        Args: {
          p_booking_id: string
          p_failure_code: string
          p_generation: number
          p_provider_kind: string
          p_provider_object_id: string
          p_request_fingerprint: string
          p_stripe_mode: string
        }
        Returns: Json
      }
      release_whatsapp_confirm_claim: {
        Args: { p_claim_id: string }
        Returns: undefined
      }
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
      renew_booking_payment_provider_after_expiry: {
        Args: {
          p_booking_id: string
          p_claim_ttl_seconds?: number
          p_generation: number
          p_provider_object_id: string
          p_provider_payment_status: string
          p_provider_status: string
          p_request_fingerprint: string
          p_reservation_id: string
          p_stripe_mode: string
        }
        Returns: Json
      }
      require_booking_payment_provider_cleanup: {
        Args: {
          p_booking_id: string
          p_generation: number
          p_provider_object_id: string
          p_reason_code: string
          p_request_fingerprint: string
          p_reservation_id: string
        }
        Returns: Json
      }
      reschedule_booking_atomic: {
        Args: {
          p_booking_id: string
          p_calendar_id?: string
          p_conversation_id?: string
          p_new_end: string
          p_new_start: string
          p_service_type_id?: string
        }
        Returns: Json
      }
      reserve_contact_meeting: {
        Args: {
          p_budget: string
          p_company: string
          p_country: string
          p_email: string
          p_meeting_date: string
          p_meeting_time: string
          p_message: string
          p_name: string
          p_subject: string
          p_submission_id: string
        }
        Returns: Json
      }
      resolve_owner_calendar_by_code: {
        Args: { p_code: string }
        Returns: {
          calendar_id: string
          owner_id: string
        }[]
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
      scan_monitoring_heartbeat: { Args: never; Returns: undefined }
      scan_recent_booking_date_drift: { Args: never; Returns: undefined }
      setup_calendar_defaults: {
        Args: { p_business_type?: string; p_calendar_id: string }
        Returns: undefined
      }
      test_webhook_system: { Args: { p_calendar_id: string }; Returns: Json }
      update_existing_users_retroactively: { Args: never; Returns: undefined }
      update_expired_trials: { Args: never; Returns: undefined }
      validate_booking_calendar_and_service: {
        Args: { p_calendar_id: string; p_service_type_id: string }
        Returns: boolean
      }
      validate_booking_security:
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
      verify_booking_payment_provider_cleanup_claim: {
        Args: { p_claim_token: string; p_job_id: string }
        Returns: Json
      }
      verify_booking_payment_provider_reservation: {
        Args: {
          p_amount_cents: number
          p_booking_id: string
          p_channel: string
          p_currency: string
          p_destination_account_id: string
          p_platform_account_id: string
          p_provider_kind: string
          p_provider_object_id: string
          p_request_fingerprint: string
          p_stripe_mode: string
          p_tax_calculation_id: string
          p_total_due_cents: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      subscription_tier: "starter" | "professional" | "enterprise" | "free"
      supply_type: "in_person" | "remote_service" | "digital"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      subscription_tier: ["starter", "professional", "enterprise", "free"],
      supply_type: ["in_person", "remote_service", "digital"],
    },
  },
} as const
