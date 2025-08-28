export interface PaymentSettings {
  id: string;
  calendar_id: string;
  secure_payments_enabled: boolean;
  payment_required_for_booking: boolean;
  platform_fee_percentage: number;
  allow_partial_refunds: boolean;
  refund_policy_text?: string;
  payment_deadline_hours: number;
  auto_cancel_unpaid_bookings: boolean;
  enabled_payment_methods: string[];
  created_at: string;
  updated_at: string;
}

export interface BusinessStripeAccount {
  id: string;
  calendar_id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted' | 'disabled';
  onboarding_completed: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  account_type?: 'standard' | 'express' | 'custom';
  country?: string;
  currency: string;
  environment: string;
  created_at: string;
  updated_at: string;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
  stripe_account_id: string;
  amount_cents: number;
  currency: string;
  platform_fee_cents: number;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'refunded';
  payment_method_type?: 'card' | 'ideal' | 'bancontact';
  customer_email?: string;
  customer_name?: string;
  refund_amount_cents: number;
  refunded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
  payment_url?: string;
}

export interface StripeConnectOnboardingLink {
  url: string;
  expires_at: number;
}

export interface PaymentResponse {
  success: boolean;
  payment_intent?: PaymentIntent;
  payment_url?: string;
  error?: string;
}