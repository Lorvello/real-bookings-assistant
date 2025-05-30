
export interface CalendarConnection {
  id: string;
  provider: string;
  provider_account_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  provider_user_id?: string;
  calendar_id?: string;
}

export interface OAuthProvider {
  id: string;
  provider: string;
  client_id: string | null;
  is_active: boolean;
}

export interface CalendarIntegrationState {
  connections: CalendarConnection[];
  loading: boolean;
  syncing: boolean;
  connectionStatus: 'idle' | 'connecting' | 'connected' | 'error';
  errorMessage: string;
}
