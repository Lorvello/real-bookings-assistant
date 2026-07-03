-- R50 (ZEROWIDTH-NAME-SEARCH-GAP, sev-3, filed IUX_r49.md / IUX_r49.md VERIFY): a zero-width
-- space (or other invisible Unicode control character) embedded in a customer name survives
-- byte-exact into bookings.customer_name / waitlist.customer_name and breaks BOTH exact-match
-- and the real owner-app search mechanism (src/hooks/useBookingsFilters.tsx's client-side
-- `booking.customer_name.toLowerCase().includes(searchTerm.toLowerCase())`).
--
-- R49-verify traced 4 independent write sites with NO shared normalization reaching any of them:
--   1. whatsapp-agent/tools.ts book_appointment insert (.trim() only)
--   2. whatsapp-agent/tools.ts rename_booking, two commit branches (same no-strip pattern)
--   3. create-booking/index.ts (public web form) - has its OWN sanitizeBookingText() but that
--      only strips <> and C0/C1 control chars, U+200B is not in that range
--   4. add-to-waitlist -> public.add_to_waitlist RPC (own .trim().substring(0,100), no stripping)
-- The frontend's src/utils/inputSanitization.ts sanitizeText() already strips these client-side,
-- but that TS module cannot be imported by the Deno edge functions (different runtime), so it
-- protects none of the 4 backend write sites above.
--
-- Fix: a single DB-level BEFORE INSERT/UPDATE trigger on the only 2 base tables that carry a
-- genuinely independent customer-name write path (bookings, waitlist) is a real single choke
-- point that closes all 4 current paths AND any future one, by construction, with one migration.
-- (booking_payments.customer_name is a 3rd base table with the column, but its only write site,
-- stripe-webhook's recordBookingPaymentRow, always copies an already-existing bookings.customer_name
-- value read moments earlier in the same function - a downstream mirror, not an independent write
-- path, so it stays clean by construction once bookings is clean; not given its own trigger.)
--
-- Character class stripped is a DELIBERATELY NARROWED subset of
-- whatsapp-agent/hardConfirmGate.ts's own INVISIBLE_RE (already proven safe in this codebase,
-- R32): zero-width space U+200B, zero-width non-joiner U+200C, left-to-right mark U+200E,
-- right-to-left mark U+200F, byte-order-mark / zero-width no-break space U+FEFF, and the
-- invisible-operator range U+2060-U+2064 (word joiner, function application, invisible times,
-- invisible separator, invisible plus). ZERO-WIDTH JOINER (U+200D) IS DELIBERATELY EXCLUDED,
-- unlike hardConfirmGate's set: a live regression test during this migration's development found
-- that stripping ZWJ from a genuine ZWJ-joined compound emoji sequence (e.g. a family emoji
-- "👨‍👩‍👧") visually splits it into 3 separate person
-- emoji instead of preserving the intended single compound glyph. hardConfirmGate strips ZWJ
-- because its job is normalizing short CONFIRM-WORDS (a ZWJ hidden inside "ja" is unambiguously an
-- attack/artifact there); a customer NAME can legitimately contain a ZWJ-joined emoji as real
-- content (matching the spirit of R42's emoji-preservation fix), and stripping it is not necessary
-- to fix the actual bug (ZWSP breaking LETTER-substring search - a ZWJ sitting between two emoji
-- glyphs, not between letters, does not defeat text search the way ZWSP does). Deliberately does
-- NOT touch: diacritics (separate Latin-Extended codepoints, nowhere near this range), regular
-- spaces/punctuation, emoji (all emoji blocks are U+1F300+ or U+2600-27BF, zero overlap; ZWJ
-- itself, see above), RTL/LTR *script* letters (only the invisible directional MARK control chars
-- are stripped, not the script itself), multi-word names (U+0020 space untouched).

CREATE OR REPLACE FUNCTION public.strip_invisible_customer_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.customer_name IS NOT NULL THEN
    NEW.customer_name := regexp_replace(
      NEW.customer_name,
      '[​‌‎‏﻿⁠-⁤]',
      '',
      'g'
    );
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.strip_invisible_customer_name() IS
  'R50 (ZEROWIDTH-NAME-SEARCH-GAP): strips zero-width/invisible Unicode control characters (ZWSP,
  ZWNJ, LRM, RLM, BOM, word-joiner, invisible math operators) from customer_name before persist, so
  client-side name search (useBookingsFilters.tsx .includes()) and exact-match both keep working.
  Deliberately narrower than whatsapp-agent/hardConfirmGate.ts INVISIBLE_RE: excludes ZWJ (U+200D)
  to preserve legitimate ZWJ-joined compound emoji sequences in names (see migration file header).
  Does not touch diacritics, emoji, RTL script letters, or multi-word spacing.';

-- Named to sort alphabetically BEFORE booking_validation_trigger among same-timing (BEFORE)
-- triggers on bookings, so validate_booking_insert()'s empty-name check (raises on
-- NULL/blank-after-trim) sees the ALREADY-STRIPPED value, correctly rejecting a name that was
-- 100% invisible characters instead of silently persisting a blank-looking row.
DROP TRIGGER IF EXISTS aaa_strip_invisible_customer_name ON public.bookings;
CREATE TRIGGER aaa_strip_invisible_customer_name
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_invisible_customer_name();

DROP TRIGGER IF EXISTS aaa_strip_invisible_customer_name ON public.waitlist;
CREATE TRIGGER aaa_strip_invisible_customer_name
  BEFORE INSERT OR UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_invisible_customer_name();
