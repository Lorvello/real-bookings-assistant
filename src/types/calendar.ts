
export interface CalendarConnection {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  calendar_connection_id?: string;
  external_event_id: string;
  title?: string;
  event_summary?: string;
  start_time: string;
  end_time: string;
  is_busy: boolean;
  event_status?: string;
  created_at: string;
  last_synced_at: string;
}

export interface OAuthProvider {
  id: string;
  provider: string;
  client_id: string | null;
  client_secret?: string | null;
  auth_url: string;
  token_url: string;
  scope: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarIntegrationState {
  connections: CalendarConnection[];
  loading: boolean;
  syncing: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string;
}
