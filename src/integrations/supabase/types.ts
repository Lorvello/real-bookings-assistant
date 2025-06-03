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
      appointments: {
        Row: {
          appointment_date: string
          appointment_time: string
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          price: number | null
          service_duration: number
          service_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_time: string
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          price?: number | null
          service_duration?: number
          service_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_time?: string
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          price?: number | null
          service_duration?: number
          service_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      availability_slots: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_settings: {
        Row: {
          booking_buffer_minutes: number | null
          created_at: string
          id: string
          max_advance_days: number | null
          min_advance_hours: number | null
          timezone: string | null
          updated_at: string
          user_id: string
          working_hours: Json | null
        }
        Insert: {
          booking_buffer_minutes?: number | null
          created_at?: string
          id?: string
          max_advance_days?: number | null
          min_advance_hours?: number | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          working_hours?: Json | null
        }
        Update: {
          booking_buffer_minutes?: number | null
          created_at?: string
          id?: string
          max_advance_days?: number | null
          min_advance_hours?: number | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          working_hours?: Json | null
        }
        Relationships: []
      }
      business_metrics: {
        Row: {
          avg_response_time_seconds: number
          cancelled_appointments: number
          completed_appointments: number
          created_at: string
          id: string
          metric_date: string
          new_clients: number
          revenue: number
          total_appointments: number
          user_id: string
        }
        Insert: {
          avg_response_time_seconds?: number
          cancelled_appointments?: number
          completed_appointments?: number
          created_at?: string
          id?: string
          metric_date: string
          new_clients?: number
          revenue?: number
          total_appointments?: number
          user_id: string
        }
        Update: {
          avg_response_time_seconds?: number
          cancelled_appointments?: number
          completed_appointments?: number
          created_at?: string
          id?: string
          metric_date?: string
          new_clients?: number
          revenue?: number
          total_appointments?: number
          user_id?: string
        }
        Relationships: []
      }
      cal_bookings: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          attendee_timezone: string | null
          cal_booking_id: string
          cal_event_type_id: string
          created_at: string
          description: string | null
          end_time: string
          id: string
          last_synced_at: string | null
          start_time: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_timezone?: string | null
          cal_booking_id: string
          cal_event_type_id: string
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          last_synced_at?: string | null
          start_time: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          attendee_timezone?: string | null
          cal_booking_id?: string
          cal_event_type_id?: string
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          last_synced_at?: string | null
          start_time?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cal_com_webhooks: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          triggers: string[]
          updated_at: string
          user_id: string
          webhook_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          triggers?: string[]
          updated_at?: string
          user_id: string
          webhook_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          triggers?: string[]
          updated_at?: string
          user_id?: string
          webhook_id?: string
          webhook_url?: string
        }
        Relationships: []
      }
      cal_users: {
        Row: {
          cal_email: string | null
          cal_user_id: string
          cal_username: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cal_email?: string | null
          cal_user_id: string
          cal_username?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cal_email?: string | null
          cal_user_id?: string
          cal_username?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          api_endpoint: string | null
          cal_user_id: string | null
          connected_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          license_key: string | null
          provider: string
          provider_account_id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_endpoint?: string | null
          cal_user_id?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string | null
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_endpoint?: string | null
          cal_user_id?: string | null
          connected_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          license_key?: string | null
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          attendee_email: string | null
          attendee_name: string | null
          cal_booking_id: string | null
          cal_event_type_id: string | null
          calendar_connection_id: string | null
          created_at: string
          end_time: string
          event_status: string | null
          event_summary: string | null
          external_event_id: string
          id: string
          is_busy: boolean
          last_synced_at: string
          start_time: string
          title: string | null
          user_id: string
        }
        Insert: {
          attendee_email?: string | null
          attendee_name?: string | null
          cal_booking_id?: string | null
          cal_event_type_id?: string | null
          calendar_connection_id?: string | null
          created_at?: string
          end_time: string
          event_status?: string | null
          event_summary?: string | null
          external_event_id: string
          id?: string
          is_busy?: boolean
          last_synced_at?: string
          start_time: string
          title?: string | null
          user_id: string
        }
        Update: {
          attendee_email?: string | null
          attendee_name?: string | null
          cal_booking_id?: string | null
          cal_event_type_id?: string | null
          calendar_connection_id?: string | null
          created_at?: string
          end_time?: string
          event_status?: string | null
          event_summary?: string | null
          external_event_id?: string
          id?: string
          is_busy?: boolean
          last_synced_at?: string
          start_time?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_calendar_connection_id_fkey"
            columns: ["calendar_connection_id"]
            isOneToOne: false
            referencedRelation: "calendar_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          client_name: string | null
          client_phone: string
          created_at: string
          id: string
          last_message: string | null
          last_message_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name?: string | null
          client_phone: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string | null
          client_phone?: string
          created_at?: string
          id?: string
          last_message?: string | null
          last_message_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_from_client: boolean
          message_type: string
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_from_client?: boolean
          message_type?: string
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_from_client?: boolean
          message_type?: string
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_providers: {
        Row: {
          auth_url: string
          client_id: string | null
          client_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          provider: string
          scope: string
          token_url: string
          updated_at: string
        }
        Insert: {
          auth_url: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider: string
          scope: string
          token_url: string
          updated_at?: string
        }
        Update: {
          auth_url?: string
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          provider?: string
          scope?: string
          token_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          duration: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      setup_progress: {
        Row: {
          availability_configured: boolean | null
          booking_rules_set: boolean | null
          cal_oauth_completed: boolean | null
          cal_user_created: boolean | null
          calendar_linked: boolean | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_configured?: boolean | null
          booking_rules_set?: boolean | null
          cal_oauth_completed?: boolean | null
          cal_user_created?: boolean | null
          calendar_linked?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_configured?: boolean | null
          booking_rules_set?: boolean | null
          cal_oauth_completed?: boolean | null
          cal_user_created?: boolean | null
          calendar_linked?: boolean | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_daily_metrics: {
        Args: { target_user_id: string; target_date: string }
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
