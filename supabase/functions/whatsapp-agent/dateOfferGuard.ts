// R18 DATE-OFFER GUARD (the "never suggest an alternative day that isn't real" guarantee, in
// CODE not prompt). Sibling to slotOfferGuard.ts (which guarantees every OFFERED CLOCK TIME is
// real); this guard covers the adjacent gap that guard structurally cannot: an offered
// ALTERNATIVE DAY.
//
// R17/R18 (full-journey agent simulation): on Sanne's calendar, a customer asked for 21 juli
// (inside a 3-day vacation override, zero slots that whole day). book_appointment correctly
// declined with `{error:"niet_beschikbaar", available_slots:[], message:"Die dag heeft geen
// vrije tijden. Stel vriendelijk een andere dag voor."}` (tools.ts). That message text hands the
// model NO real alternative date, yet instructs it to propose one anyway ("stel ... een andere
// dag voor"). The 20B model then free-generated "woensdag 22 juli", which is ALSO inside the
// same override (RPC-verified live: zero slots that day too). This is the exact same "server
// hands the model a task it has no ground truth to do, model invents a plausible-looking value"
// failure class as the R11 installment-disclosure bug: the fix belongs in code (compute the real
// answer, template it), not in a bigger prompt nudge (this codebase's own R17 finding: the
// model's first answer under this pressure is not reliable even though it self-corrects on
// pushback, which is exactly the shape a code guarantee is meant to close).
//
// MECHANISM: whenever this turn's tool calls include a "day fully closed" decline (book_appointment
// / reschedule_appointment returning error:"niet_beschikbaar" with an EMPTY available_slots, or
// get_available_slots returning count:0) AND the model's prose reply mentions a calendar date
// (day + NL/EN month name) as a proposed alternative, index.ts independently re-verifies that
// exact date against the REAL get_available_slots RPC for the SAME calendar_id/service_type_id
// (the same RPC the commit path itself trusts). If the proposed date turns out to have zero real
// slots too, the offer is rebuilt deterministically: index.ts scans forward from the declined
// date for the next genuinely open date(s) via the same RPC and templates an honest reply from
// that real result (mirrors slotOfferGuard's buildDeterministicOffer). If no open date is found
// in the scanned window, an honest "no info on tomorrow, name a day" reply replaces the invented
// one, matching noFreeSlotsReply's own convention for the zero-real-options case.
//
// This module holds only the PURE, unit-testable pieces (date extraction + deterministic reply
// text); the RPC verification/scan itself needs the supabase client + calendar/service context,
// so it lives in index.ts, exactly the same split slotOfferGuard.ts documents for its own guard.
//
// dash-free of em dashes per house rule.

const NL_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8,
  september: 9, oktober: 10, november: 11, december: 12,
  jan: 1, feb: 2, mrt: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10,
};

// Convert a "MM-DD" pair to a full ISO date (YYYY-MM-DD), picking the NEAREST future occurrence
// relative to todayISO (this year if that MM-DD has not yet passed this year, otherwise next
// year). A reply proposing an alternative day always means the next such date, never a past one.
function nearestFutureISO(mmdd: string, todayISO: string): string | null {
  if (!/^\d{2}-\d{2}$/.test(mmdd) || !/^\d{4}-\d{2}-\d{2}$/.test(todayISO)) return null;
  const year = Number(todayISO.slice(0, 4));
  const thisYear = `${year}-${mmdd}`;
  if (thisYear >= todayISO) return thisYear;
  return `${year + 1}-${mmdd}`;
}

// Every calendar date (day + NL/EN month name, either order) the reply mentions, normalised to
// ISO and resolved to the nearest future occurrence, EXCLUDING the date already declined this
// turn (customer/agent restating the closed day is not a NEW offer) and de-duplicated. Order of
// first mention is preserved (the first date named is the one actually being offered).
export function extractOfferedDates(reply: string, todayISO: string, excludeISO?: string | null): string[] {
  const s = (reply || "").toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (day: number, mon: number) => {
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return;
    const mmdd = `${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const iso = nearestFutureISO(mmdd, todayISO);
    if (!iso || iso === excludeISO || seen.has(iso)) return;
    seen.add(iso);
    out.push(iso);
  };
  const reNumMonth = /\b(\d{1,2})\s+([a-z]+)/g;
  let m: RegExpExecArray | null;
  while ((m = reNumMonth.exec(s)) !== null) { if (NL_MONTHS[m[2]]) push(Number(m[1]), NL_MONTHS[m[2]]); }
  const reMonthNum = /\b([a-z]+)\s+(\d{1,2})\b/g;
  while ((m = reMonthNum.exec(s)) !== null) { if (NL_MONTHS[m[1]]) push(Number(m[2]), NL_MONTHS[m[1]]); }
  return out;
}

// NL/EN date label from an ISO date ("2026-07-23" -> "donderdag 23 juli" / "Thursday 23 July").
// Noon UTC keeps the date stable across the Amsterdam DST offset (same convention as
// slotOfferGuard.ts's dateLabelFromISO).
export function dateLabelFromISO(iso: string, en: boolean): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return en
    ? d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" })
    : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
}

// Deterministic, truthful "here are the real next open days" reply, built ONLY from dates index.ts
// has itself verified via the real get_available_slots RPC. Mirrors buildDeterministicOffer's
// shape/tone (slotOfferGuard.ts) for the day-level equivalent.
export function buildDeterministicDateAlternatives(realOpenISOs: string[], en: boolean): string {
  const labels = realOpenISOs.slice(0, 2).map((iso) => dateLabelFromISO(iso, en));
  const list = labels.join(en ? " or " : " of ");
  return en
    ? `That day has no free times. ${labels.length > 1 ? "These days do" : "This day does"}: ${list}. Does one of those work?`
    : `Die dag heeft geen vrije tijden. ${labels.length > 1 ? "Deze dagen wel" : "Deze dag wel"}: ${list}. Komt een van die dagen uit?`;
}

// No real open date found within the scanned window either: an honest ask instead of a guess,
// same fail-safe convention as slotOfferGuard.ts's noFreeSlotsReply.
export function noNearbyOpenDateReply(en: boolean): string {
  return en
    ? `That day has no free times, and I don't have confirmed info on another nearby open day. Which other day would you like to try?`
    : `Die dag heeft geen vrije tijden, en ik heb geen bevestigde info over een andere dag in de buurt. Welke andere dag wil je proberen?`;
}

// R52 FALSE-PAST-DATE-CLAIM GUARD (symmetric mirror of the R17/R18 isPastDateNL guard, which
// catches the model inventing "gesloten" for a genuinely PAST date; see tools.ts's own
// isPastDateNL + its "datum_verleden" branches on book_appointment/reschedule_appointment).
//
// R51 (full-journey agent simulation) found the MIRROR-IMAGE failure: on a real FUTURE date that
// simply falls on a closed weekday for the calendar (live-reproduced: Bo/Thursday 2026-08-06,
// today real-time 2026-07-09, booking_window_days=60, so the date is neither past nor
// beyond-window, it is simply a day Bo does not work), book_appointment's and
// reschedule_appointment's own "niet_beschikbaar" empty-available_slots branch (tools.ts
// ~1858/~3477) already returns an honest, non-specific "die dag heeft helemaal geen vrije tijden"
// message with NO invented reason, but the model (Groq gpt-oss-20b) overrides it with a false,
// specific "al voorbij" (already past) claim instead, e.g. "Sorry, 6 augustus is al voorbij."
// Reproduced 2/2, both call sites (see ROUNDS R51 for the full repro).
//
// This is a DIFFERENT failure shape from the offered-ALTERNATIVE-date gap dateOfferGuard.ts
// already closes above (extractOfferedDates deliberately EXCLUDES the just-declined date, since
// restating it is not a new offer): R51's false reply re-mentions the SAME declined date with a
// false reason attached, so extractOfferedDates alone never catches it (offered.length stays 0).
//
// GROUND TRUTH: the "niet_beschikbaar" empty-available_slots branch this guard engages on is
// reached ONLY after tools.ts's own isPastDateNL(args.date) check already ran and returned
// false for this exact date (a genuinely past date short-circuits earlier with the correct
// "datum_verleden" error and never reaches resolveSlotForTime at all). So any reply claiming
// "voorbij"/"already past" here is false BY CONSTRUCTION; this guard does not need to re-run
// isPastDateNL itself, dayClosedCall's own existence in index.ts is the proof.
const FALSE_PAST_CLAIM_RE =
  /\b(al voorbij|alweer voorbij|reeds voorbij|al geweest|reeds geweest|nu al voorbij|already past|already passed|has (?:already )?passed|already gone|is in the past)\b/i;

export function mentionsFalsePastClaim(reply: string): boolean {
  return FALSE_PAST_CLAIM_RE.test(reply || "");
}
