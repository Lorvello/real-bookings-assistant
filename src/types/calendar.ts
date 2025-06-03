
export interface CalendarConnection {
  id: string;
  user_id: string;
  cal_user_id: string | null;
  connected_at: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  cal_booking_id: string | null;
  cal_event_type_id: string | null;
  title: string | null;
  event_summary: string | null;
  start_time: string;
  end_time: string;
  is_busy: boolean;
  event_status: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  created_at: string;
  last_synced_at: string;
}

export interface CalendarIntegrationState {
  connections: CalendarConnection[];
  loading: boolean;
  syncing: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string;
}
