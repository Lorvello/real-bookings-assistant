-- CB X1: cross-border / OSS VAT data model (place-of-supply + per-jurisdiction tax persistence).
--
-- CONTEXT: the just-closed Stripe TAX-Completeness loop applies the merchant's domestic NL
-- rate to every customer (correct for in-person appointments, place-of-supply = where performed;
-- WRONG for remote/digital services to a customer in another EU country). The Cross-Border / OSS
-- build (CROSS_BORDER_OSS_PLAN.md, target X1) introduces a per-service place-of-supply flag so the
-- charge path can branch: in_person -> existing domestic NL path; remote_service/digital -> Stripe
-- Tax Calculation API (Stripe computes the per-country rate, reverse-charge, OSS). This migration is
-- PURE SCHEMA: it adds the columns the later targets (X2 calc plumbing, X3 inputs, X4 reverse-charge,
-- X6 reports) read and write. NO VAT rate or rule is encoded here by design: Stripe Tax computes all
-- rates downstream; hardcoding tax law would be a bug.
--
-- ADDS (all additive, nullable-or-defaulted, no data backfill needed):
--   service_types.supply_type      enum supply_type ('in_person'|'remote_service'|'digital'),
--                                  DEFAULT 'in_person' NOT NULL -> existing rows become in_person,
--                                  preserving today's domestic-NL behaviour until an owner flags a
--                                  service as remote/digital (the X0 taxonomy human-gate).
--   bookings.customer_country      text, ISO-3166 alpha-2, nullable (required for remote at app layer).
--   bookings.customer_vat_id       text, optional EU B2B VAT id, nullable.
--   booking_payments.customer_country  text, nullable (persist the country used for the calc).
--   booking_payments.tax_breakdown     jsonb, nullable (persist Stripe's per-jurisdiction breakdown
--                                       at charge time; reports cannot recompute historically).
--   booking_payments.reverse_charge    boolean, DEFAULT false NOT NULL (a valid EU B2B VAT id yields
--                                       a 0% reverse_charge line; reports surface it as such).
--
-- CONVENTION: supply_type is a native Postgres enum, matching this repo's first-class domain types
-- (public.app_role, public.subscription_tier). Ad-hoc status columns here use text+CHECK, but a
-- place-of-supply classification that drives a tax branch is first-class, so a native enum is the
-- idiomatic match (and gives a hard type guard at the DB boundary).
--
-- REVERSIBILITY (down-path, for reference; this migration only rolls forward):
--   ALTER TABLE public.service_types DROP COLUMN IF EXISTS supply_type;
--   ALTER TABLE public.bookings DROP COLUMN IF EXISTS customer_country, DROP COLUMN IF EXISTS customer_vat_id;
--   ALTER TABLE public.booking_payments DROP COLUMN IF EXISTS customer_country,
--     DROP COLUMN IF EXISTS tax_breakdown, DROP COLUMN IF EXISTS reverse_charge;
--   DROP TYPE IF EXISTS public.supply_type;
--
-- IDEMPOTENT: CREATE TYPE has no IF NOT EXISTS, so it is guarded in a DO block; all columns use
-- ADD COLUMN IF NOT EXISTS so re-applying is a no-op.

-- 1. Place-of-supply enum (guarded; CREATE TYPE is not IF NOT EXISTS-able).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'supply_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.supply_type AS ENUM ('in_person', 'remote_service', 'digital');
  END IF;
END
$$;

-- 2. service_types.supply_type: default in_person so every existing service keeps the domestic NL path.
ALTER TABLE public.service_types
  ADD COLUMN IF NOT EXISTS supply_type public.supply_type NOT NULL DEFAULT 'in_person';

COMMENT ON COLUMN public.service_types.supply_type IS
  'Place-of-supply classification driving the VAT branch: in_person -> domestic NL rate (place-of-supply = where performed); remote_service/digital -> Stripe Tax Calculation API with the customer country (cross-border / reverse-charge / OSS). Owner-set per service (X0 taxonomy gate). Default in_person preserves pre-cross-border behaviour.';

-- 3. bookings: capture customer country (required for remote at the app layer) + optional EU VAT id.
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_country text,
  ADD COLUMN IF NOT EXISTS customer_vat_id text;

COMMENT ON COLUMN public.bookings.customer_country IS
  'ISO-3166 alpha-2 country code of the customer billing address; required for remote_service/digital so Stripe Tax can compute the destination rate. Nullable: in_person bookings do not need it.';
COMMENT ON COLUMN public.bookings.customer_vat_id IS
  'Optional EU B2B VAT identification number (eu_vat). When present and format-valid, Stripe applies reverse_charge (0%). Real VIES validation is gated separately.';

-- 4. booking_payments: persist the country + Stripe per-jurisdiction breakdown + reverse-charge flag
--    AT CHARGE TIME so the filing reports can show per-country VAT, reverse-charge 0% lines, and the
--    OSS-eligible bucket (reports cannot recompute the breakdown historically).
ALTER TABLE public.booking_payments
  ADD COLUMN IF NOT EXISTS customer_country text,
  ADD COLUMN IF NOT EXISTS tax_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS reverse_charge boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.booking_payments.customer_country IS
  'ISO-3166 alpha-2 country used for the tax calculation on this payment, persisted for the filing reports.';
COMMENT ON COLUMN public.booking_payments.tax_breakdown IS
  'Stripe Tax per-jurisdiction tax_breakdown captured at charge time (jurisdiction, rate, amount, taxability_reason). Source of truth for per-country VAT lines in the reports; cannot be recomputed historically.';
COMMENT ON COLUMN public.booking_payments.reverse_charge IS
  'True when Stripe applied an EU B2B reverse_charge (0%) to this payment, so the reports can mark the 0% line as reverse-charge rather than untaxed.';
