-- R11 / D-004: grant hygiene on the subscription surfaces (defense-in-depth).
--
-- authenticated/anon hold UNUSED, dangerous grants that are currently
-- neutralized only by RLS deny-by-default + the guard_users_subscription_columns
-- trigger (both proven in R4). Remove the grants themselves so the protection
-- no longer depends solely on RLS/trigger.
--
-- (1) public.subscribers: drop DELETE + TRUNCATE for authenticated/anon. No app
--     path needs them; a cross-tenant DELETE returned a cosmetic 204 in R4,
--     blocked only by RLS select-scope.
REVOKE DELETE, TRUNCATE ON public.subscribers FROM authenticated, anon;

-- (2) public.users subscription_* columns: drop UPDATE for authenticated/anon.
--
-- IMPORTANT: authenticated/anon hold a TABLE-LEVEL `GRANT UPDATE ON
-- public.users` (the Supabase default broad grant). A column-level REVOKE is a
-- NO-OP against a table-level grant, so we must first REVOKE the table-level
-- UPDATE, then RE-GRANT UPDATE on every column EXCEPT the six system-managed
-- subscription columns. This converts the broad grant into an explicit column
-- allowlist that excludes:
--   subscription_status, subscription_tier, trial_end_date,
--   subscription_end_date, grace_period_end, payment_status
-- Legit self-update of profile/business columns (full_name, business_name, etc.)
-- stays intact (R4 proved authed self-update -> 200); only the 6 protected
-- columns become un-grantable at the privilege layer (the guard trigger remains
-- as a second layer).
REVOKE UPDATE ON public.users FROM authenticated, anon;

GRANT UPDATE (
  id,
  email,
  full_name,
  business_name,
  business_type,
  phone,
  created_at,
  updated_at,
  date_of_birth,
  gender,
  language,
  timezone,
  avatar_url,
  address_street,
  address_number,
  address_postal,
  address_city,
  address_country,
  website,
  facebook,
  instagram,
  linkedin,
  tiktok,
  business_phone,
  business_email,
  business_whatsapp,
  business_street,
  business_number,
  business_postal,
  business_city,
  business_country,
  business_description,
  parking_info,
  public_transport_info,
  accessibility_info,
  other_info,
  show_opening_hours,
  opening_hours_note,
  team_size,
  business_type_other,
  trial_start_date,
  subscription_start_date,
  last_payment_date,
  whatsapp_bot_active,
  qr_code_data,
  account_owner_id,
  default_tax_behavior,
  tax_configured,
  installments_enabled,
  default_installment_plan,
  allow_customer_installment_choice,
  whatsapp_phone_number,
  whatsapp_qr_url,
  whatsapp_qr_generated_at,
  password_added,
  youtube,
  x,
  cancellation_policy,
  payment_info,
  preparation_info,
  owner_test_phone
) ON public.users TO authenticated, anon;
