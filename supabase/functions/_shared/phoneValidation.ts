// SEQP1R10 (fixes P1-9-PHONE2): server-side phone validation/normalization shared by every
// edge function that writes bookings.customer_phone from a request body. This is the actual
// trust boundary for create-booking (a PUBLIC, unauthenticated endpoint -- anyone can POST
// directly to it, bypassing the web form's own client-side validation entirely) and
// create-installment-payment. Reuses libphonenumber-js (same library, same version pin as the
// client-side validator in src/utils/inputSanitization.ts) via Deno's "npm:" specifier, the
// same import convention this repo already uses for other npm packages in edge functions (see
// "npm:resend@2.0.0" in process-booking-reminders/index.ts et al).
//
// Root cause this closes: a naive "does it look like it starts with 0?" heuristic (the
// bug class behind P1-9-PHONE and P1-9-PHONE2) cannot tell a Dutch "06" mobile number apart
// from a French "06" or Belgian "04" mobile number -- both are byte-identical 10-digit,
// single-leading-zero shapes. libphonenumber-js's own isValidPhoneNumber()/parsePhoneNumber()
// have the EXACT SAME ambiguity when given a bare local-format number and a defaultCountry
// hint (verified directly: calling it with defaultCountry "NL" happily reformats a French
// "0687654321" as "+31687654321", the identical mis-tag). So this validator does NOT pass a
// defaultCountry fallback for bare local numbers: it only ever trusts a number that already
// declares its own country via an explicit "+" or "00" international prefix. A bare
// local-format number (no "+"/"00") is ALWAYS rejected here as ambiguous, full stop -- there is
// no server-side context (no customer-supplied country field reaches this shared validator)
// that could safely disambiguate it, so failing closed is the only honest option at this layer.
import {
  parsePhoneNumber,
  isValidPhoneNumber,
} from "npm:libphonenumber-js@1.12.24";

export interface PhoneValidationResult {
  valid: boolean;
  /** E.164 value (e.g. "+31612345678") when valid, otherwise undefined. */
  value?: string;
  error?: string;
}

/**
 * Validates and normalizes a phone number to E.164, WITHOUT guessing a country for an
 * ambiguous bare local-format number. Only numbers that already declare their own country
 * (leading "+" or "00" international-dialing prefix) are accepted; anything else fails
 * closed with a descriptive error rather than defaulting to NL (or any other country).
 *
 * This is deliberately STRICTER than the client-side validatePhoneNumber() in
 * src/utils/inputSanitization.ts, which is allowed to default to NL because that call site is
 * the web form UI, a good-faith context where "NL market default" is a reasonable UX nicety
 * (and, since SEQP1R10, the form now correctly stores the resulting E.164 value). A server
 * write boundary reachable by ANY client (public unauthenticated POST, direct API call, replay
 * of a captured request) has no such good-faith guarantee, so it must not apply the same
 * default-country convenience: doing so would silently resurrect the exact P1-9-PHONE2 bug
 * (an FR/BE customer's bare local number mis-tagged as Dutch) at a DIFFERENT layer.
 */
export function validatePhoneServerSide(raw: unknown): PhoneValidationResult {
  if (raw === null || raw === undefined || raw === "") {
    return { valid: true, value: undefined }; // phone is optional on every write path
  }
  if (typeof raw !== "string") {
    return { valid: false, error: "Phone number must be a string" };
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { valid: true, value: undefined };
  }
  if (trimmed.length > 32) {
    return { valid: false, error: "Phone number too long" };
  }

  const digitsOnly = trimmed.replace(/[^\d+]/g, "");
  const hasPlus = digitsOnly.startsWith("+");
  // "00" is the near-universal ITU international-dialing prefix (equivalent in meaning to
  // "+": "what follows is a country calling code", not a national trunk "0"). Unlike "+",
  // libphonenumber-js cannot resolve a bare "00..." string without a defaultCountry hint (it
  // has no way to know THIS particular "00" is being used as an IDD exit code rather than
  // being read as a national-format leading zero), even though the input itself is genuinely
  // unambiguous to a human. Rewriting a leading "00" to "+" up front makes it just as
  // context-free-parseable as a "+"-prefixed number, without introducing any guess: "00" and
  // "+" carry the identical explicit-international signal, this is a format conversion, not a
  // country guess.
  const hasIdd00 = !hasPlus && /^00\d/.test(digitsOnly);
  const hasExplicitCountryPrefix = hasPlus || hasIdd00;
  if (!hasExplicitCountryPrefix) {
    // Bare local-format number (e.g. "0612345678", "0687654321", "0470123456",
    // "07911123456"): exactly the shape this bug class keeps mis-tagging. No country hint
    // is available at this shared server boundary, so this is unresolvable here -- fail
    // closed rather than default to any country. The web form (BookingBasicFields.tsx /
    // usePublicBookingCreation.tsx) is the correct place to resolve this ambiguity, using a
    // real UI-level country default/hint, BEFORE the value ever reaches this server call.
    return {
      valid: false,
      error: "Phone number must include a country code (e.g. +31612345678), a bare local number is ambiguous",
    };
  }

  // Normalize a leading "00" + any "(0)" trunk marker to a clean "+"-prefixed string before
  // handing off to libphonenumber-js, so it can resolve the country from the number itself
  // with no defaultCountry guess needed for either prefix style.
  const forParsing = hasIdd00
    ? "+" + trimmed.replace(/\(0\)/g, "").replace(/\D/g, "").slice(2)
    : trimmed;

  try {
    // Explicit country prefix present: libphonenumber-js can resolve the country from the
    // number itself, no defaultCountry guess needed or supplied.
    if (!isValidPhoneNumber(forParsing)) {
      return { valid: false, error: "Invalid phone number" };
    }
    const parsed = parsePhoneNumber(forParsing);
    return { valid: true, value: parsed.format("E.164") };
  } catch {
    return { valid: false, error: "Invalid phone number format" };
  }
}
