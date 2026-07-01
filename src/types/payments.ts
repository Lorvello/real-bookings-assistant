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
  payout_option: 'standard' | 'instant';
  payment_optional: boolean;
  allowed_payment_timing: string[];
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

/**
 * BUG-A selection logic, extracted as a PURE function so it is unit-testable in
 * isolation (no Supabase mock needed) and reused by useStripeConnect.getStripeAccount.
 *
 * Given every Connect row persisted for one owner (already RLS-scoped to that owner,
 * so single-tenant), pick the best one to render for the current frontend Stripe
 * mode WITHOUT ever hiding a persisted row just because its `environment` differs
 * from the current mode. Priority (newest-first within each tier; `accounts` MUST be
 * passed sorted created_at DESC):
 *   1. current-mode + onboarding_completed  (happy path)
 *   2. current-mode, any onboarding state    (incomplete in current mode)
 *   3. any environment, onboarding_completed (persisted in the OTHER env)
 *   4. any environment, newest               (persisted but incomplete elsewhere)
 * Returns null only when the owner has NO Connect row at all in any environment.
 */
export function selectStripeAccountForMode(
  accounts: BusinessStripeAccount[],
  currentMode: 'test' | 'live',
): BusinessStripeAccount | null {
  return (
    accounts.find((a) => a.environment === currentMode && a.onboarding_completed) ??
    accounts.find((a) => a.environment === currentMode) ??
    accounts.find((a) => a.onboarding_completed) ??
    accounts[0] ??
    null
  );
}

/**
 * Derive the rendered Stripe-account state from the selected account + current mode.
 * Single source of truth shared by PaymentSettingsTab (UI) and the persistence test,
 * so the two can never drift. Behaviour-preserving extraction of the inline derivation
 * (see evidence/QA_FQ-2.md). Does NOT cover the 'loading' state: the caller decides
 * loading BEFORE calling this (the account role/query must be resolved first).
 *   - 'complete'          : in-mode row, fully onboarded (charges + payouts enabled)
 *   - 'incomplete'        : in-mode row exists but onboarding not finished
 *   - 'other-environment' : a persisted row exists only in the OTHER environment
 *   - 'none'              : no Connect row at all
 */
export function deriveStripeAccountState(
  account: BusinessStripeAccount | null,
  currentMode: 'test' | 'live',
): 'complete' | 'incomplete' | 'other-environment' | 'none' {
  const matchesMode = !!account && account.environment === currentMode;
  const setupComplete =
    matchesMode &&
    !!account?.onboarding_completed &&
    !!account?.charges_enabled &&
    !!account?.payouts_enabled;
  const hasInMode = matchesMode && !!account?.stripe_account_id;
  const hasOtherEnv = !!account?.stripe_account_id && !matchesMode;
  if (setupComplete) return 'complete';
  if (hasInMode) return 'incomplete';
  if (hasOtherEnv) return 'other-environment';
  return 'none';
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

export interface PaymentTiming {
  type: 'pay_now' | 'pay_on_site';
  label: string;
  description: string;
}

export const PAYMENT_TIMING_OPTIONS: PaymentTiming[] = [
  {
    type: 'pay_now',
    label: 'Pay Now',
    description: 'Complete payment immediately during booking',
  },
  {
    type: 'pay_on_site',
    label: 'Pay On-Site',
    description: 'Pay when service is provided',
  },
];

export interface FeeBreakdown {
  applicationFeeCents: number;
  platformFeeCents: number;
  paymentMethodFeeCents: number;
  payoutFeeCents: number;
  breakdown: {
    platformFeePercent: number;
    platformFeeFixed: number;
    paymentMethodFeePercent: number;
    paymentMethodFeeFixed: number;
  };
}
