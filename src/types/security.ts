export interface PaymentSecuritySettings {
  id?: string;
  calendar_id: string;
  rate_limit_attempts: number;
  rate_limit_window_minutes: number;
  min_payment_amount_cents: number;
  max_payment_amount_cents: number;
  blocked_countries: string[];
  require_captcha_threshold: number;
  card_testing_detection_enabled: boolean;
  suspicious_amount_threshold_cents: number;
  max_cards_per_user_per_day: number;
  new_user_payment_delay_hours: number;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSecurityLog {
  id: string;
  event_type: string;
  ip_address: string;
  user_id?: string;
  booking_id?: string;
  amount_cents?: number;
  currency?: string;
  user_agent?: string;
  request_data?: any;
  block_reason?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  blocked_until?: string;
  attempts?: number;
  remaining?: number;
}

export interface SecurityValidation {
  valid: boolean;
  warnings: SecurityWarning[];
}

export interface SecurityWarning {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  details?: any;
}

export interface BlockedIP {
  id: string;
  ip_address: string;
  blocked_until?: string;
  block_reason: string;
  blocked_by: string;
  permanent_block: boolean;
  created_at: string;
}

export interface PaymentAttempt {
  ip_address: string;
  calendar_id: string;
  amount_cents: number;
  currency: string;
  user_email?: string;
  user_agent?: string;
  country_code?: string;
  success: boolean;
  blocked_reason?: string;
}