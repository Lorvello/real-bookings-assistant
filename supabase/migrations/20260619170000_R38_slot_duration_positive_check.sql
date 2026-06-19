-- R38 (adversarial DoD-close, round 7) — belt-and-suspenders against a latent
-- infinite-loop in get_available_slots.
--
-- get_available_slots advances its slot cursor by calendar_settings.slot_duration
-- minutes; the COALESCE only defends NULL (-> 30), not 0/negative. service_types.duration
-- has a CHECK (>0 && <=480) but slot_duration had NONE. A 0 would make the WHILE loop
-- never terminate and hang the agent's slot lookup. It is currently UNREACHABLE (the UI
-- guards 0<value<=999, presets are positive, default-create writes 30, no edge function
-- writes the column) — this is a data-layer guard so it can never become reachable.
-- Verified: 0 existing rows violate the constraint.
ALTER TABLE public.calendar_settings
  ADD CONSTRAINT calendar_settings_slot_duration_positive
  CHECK (slot_duration IS NULL OR slot_duration > 0);
