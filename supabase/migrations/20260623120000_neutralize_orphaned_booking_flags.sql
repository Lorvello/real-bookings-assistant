-- Neutralize two ORPHANED calendar_settings flags (ITEM 2 / LLM-council verdict 2026-06-23).
--
-- Both are unwritten (no Settings UI control), unread by the WhatsApp agent (it reads
-- business_overview_v2, which does NOT project them, via an explicit safe column list in
-- get_business_data/fetchBusinessData), and unenforced anywhere in the codebase.
--
-- The danger was confirmation_required DEFAULT true: it CLAIMS the safer behavior (every
-- WhatsApp booking waits for owner approval) while the product DELIVERS the riskier one
-- (instant booking). A naive future wiring that started honoring the column would silently
-- make every existing calendar require manual approval, breaking the instant-booking core
-- value prop. We match the column to ACTUAL behavior (instant booking, no waitlist) until
-- the real features (owner-approval flow / waitlist + notifications) are built post-launch.
--
-- We deliberately KEEP the columns rather than DROP them: they are referenced by TS types,
-- the calendar-settings hooks, and the business_overview refresh path, so dropping is a
-- higher-risk, zero-customer-benefit change pre-launch. Flipping the default + de-fanging
-- existing rows + documenting the inert state removes the landmine with no behavioral change
-- (nothing reads these today). Idempotent: safe to re-run.

ALTER TABLE public.calendar_settings ALTER COLUMN confirmation_required SET DEFAULT false;

UPDATE public.calendar_settings
SET confirmation_required = false
WHERE confirmation_required IS DISTINCT FROM false;

COMMENT ON COLUMN public.calendar_settings.confirmation_required IS
  'INERT (2026-06-23, ITEM 2): NOT honored by the WhatsApp agent; no owner-approval flow exists. Default flipped true->false to match real instant-booking behavior. Build the full pending-booking + owner-notify + approve/reject flow BEFORE enabling.';

COMMENT ON COLUMN public.calendar_settings.allow_waitlist IS
  'INERT (2026-06-23, ITEM 2): NOT honored by the WhatsApp agent; no waitlist/notification system exists. Keep false until the waitlist feature is built.';
