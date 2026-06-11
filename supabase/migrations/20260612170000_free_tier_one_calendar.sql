-- Make the Free tier a real (if minimal) plan instead of a block in disguise.
--
-- The 'free' tier had max_calendars = 0, so any user on Free could not create a
-- calendar at all — i.e. "Free" was functionally a hard lock wearing a friendly
-- label. The product is a freemium-downgrade model: lapsed states (expired trial,
-- canceled + inactive, missed payment after grace) drop to Free rather than being
-- locked out, so they stay engaged and can re-convert. That only works if Free is
-- genuinely usable. Give it a single calendar; the paid core value (WhatsApp AI,
-- multi-calendar, team, analytics, exports) stays gated by the access-control
-- layer (see UserStatusContext freeTierAccess).

UPDATE public.subscription_tiers
SET max_calendars = 1,
    updated_at = now()
WHERE tier_name = 'free'
  AND (max_calendars = 0 OR max_calendars IS NULL);
