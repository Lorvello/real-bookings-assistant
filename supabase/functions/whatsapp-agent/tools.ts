// Agent tools — thin wrappers over EXISTING Supabase infra (no new business logic).
// calendar_id + phone are BOUND from the webhook (never LLM-controlled) so the model
// can't book/cancel/reschedule for another calendar/customer. The LLM only supplies
// service/time/name. cancel/reschedule always act on THIS phone's own upcoming
// booking (looked up server-side), never an id the model picks.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import type { ToolDecl, ToolExecutor } from "./llm.ts";
import { KIES_DIENST_MESSAGE } from "./serviceDisambiguationGuard.ts";

export interface ToolContext {
  calendarId: string; // the ENTRY calendar the webhook routed this customer to (default target)
  // A2 multi-calendar: the owner's FULL active calendar allowlist (default-first, cap 5), always
  // ≥1 (at minimum the entry calendar). This is the SERVER-SIDE trust boundary: every booking,
  // availability, cancel and reschedule target is resolved from THIS list, so the model can never
  // reach a calendar outside the owner's own set (no cross-leak). Single-calendar = [entry calendar].
  calendars: Array<{ id: string; name: string }>;
  // A2/ITEM2: serviceId to calendarId for the whole owner allowlist (multi-calendar only;
  // undefined single-calendar). A service_type_id is globally unique and lives in exactly ONE
  // calendar, so the service the model picks ALREADY determines the calendar. We route by it
  // server-side instead of forcing a separate "which agenda?" turn that leaked raw internal
  // calendar names. Every id here comes from ctx.calendars' own services, so no cross-owner leak.
  serviceCalendarMap?: Record<string, string>;
  phone: string; // customer's wa_id
  businessUserId: string; // owner user_id (for business_overview_v2 KB)
  conversationId: string | null; // whatsapp_conversations.id (needed for pay-and-book links)
  // Server-detected: the customer's CURRENT message affirms a pending cancel preview from a
  // previous turn. Drives the cancel COMMIT deterministically instead of trusting the small
  // model to set confirmed:true (which it does not do reliably). Set in index.ts each turn.
  confirmCancel?: boolean;
  // Same idea for a NEW booking: the customer affirms a pending booking proposal from a
  // previous turn. Drives the book COMMIT deterministically (and from the SERVER-stored exact
  // start_time, so the model's time-reconstruction can't book the wrong hour).
  confirmBook?: boolean;
  // R40: same idea for update_booking_name. Drives the rename COMMIT deterministically instead of
  // relying purely on the model's own confirmed:true self-attestation, which live testing this
  // round proved unreliable for this newer tool (the model tends to re-preview instead of commit
  // on a bare "ja klopt" turn). Set in index.ts each turn from a fresh pending_rename context.
  confirmRename?: boolean;
  // R24 (AFFIRM-CONFIRM-FALSEPOS, sev-2, second commit path): server-detected, same signal
  // index.ts computes to gate confirmBook/confirmCancel (a day/time-shift mention, a price
  // question, a trailing "?", or a hedge word, see index.ts's own comment for the 5 proven
  // false-positive repro shapes). R23 (1d81a59a) only gated the SERVER-forced confirmBook/
  // confirmCancel arm; it never reached the MODEL's own self-issued args.confirmed flag, which
  // prompt.ts explicitly instructs the model to set on any affirm-shaped reply regardless of
  // ambiguity. Threading this through ctx lets book_appointment/cancel_appointment gate BOTH
  // arms of that OR on the same signal, so an ambiguous message can never commit via either path.
  ambiguousConfirm?: boolean;
  // R32 (2nd AFFIRM-CONFIRM taste-fork, Mathew's "zero errors, build it properly" decision): a
  // THIRD, purely structural commit gate, computed by ./hardConfirmGate.ts's classifyHardConfirm
  // against the raw customer message BEFORE the LLM ever runs. true only when the normalized
  // message is an EXACT member of a small, finite, human-auditable allow-list (or one of a tiny
  // set of fixed "confirm-word + trivial pleasantry" skeletons), never a content-classification
  // regex. This is ADDITIONAL to (ANDed with, not a replacement for) ambiguousConfirm and the
  // model's own only_confirming_previous attestation below: a commit now requires ALL THREE to
  // agree. Closes the confirmation-ambiguity bug class (9 recurrences, R22-R31) BY CONSTRUCTION:
  // any message containing content beyond a clean confirm/reject token structurally cannot be a
  // member of the finite allow-list, so it cannot set this true, so it cannot commit through this
  // gate, regardless of what new phrasing a customer invents in the future. See
  // evidence/IUX_r32.md section 2 for the full design reasoning.
  hardConfirm?: boolean;
  // The customer's raw current message. Used as a SERVER-SIDE disambiguation fallback when the
  // small model fails to pass match_time on a multi-booking cancel/reschedule (it often does):
  // we extract the clock time the customer named and resolve which booking they meant.
  userMessage?: string;
  // FQ-11 locale: the customer's normalised booking locale ("en" when a non-Dutch language was
  // server-detected this turn/conversation, else "nl"). Persisted onto the booking row's
  // customer_locale so the reminder engine (get_due_booking_reminders + reminderBody) sends the
  // reminder in the SAME language the customer booked in. Without it every WhatsApp booking stored
  // customer_locale=null -> the RPC normalised null to 'nl' -> an English customer got a Dutch
  // reminder. Set in index.ts each turn from customerLanguage.
  customerLocale?: "nl" | "en";
  // R71 (R70-3 fix, serviceDisambiguationGuard.ts): server-detected, computed once per turn in
  // index.ts from the FULL conversation history + this turn's message (shouldBlockForMissingServiceChoice).
  // true ONLY when this is a multi-calendar business with genuinely more than one distinct service
  // name across the calendar set, AND the customer has NEVER (this turn or any earlier turn in
  // this conversation) named a specific service or a specific calendar/branch. Gates
  // get_available_slots and the book_appointment PREVIEW step in tools.ts: refuses with
  // "kies_dienst" instead of letting the model silently guess a branch/service, matching
  // resolveBookingCalendar's existing needAsk pattern. Never true for single-calendar tenants or
  // for a multi-calendar business where every branch offers the identical one service (the
  // existing "ask who" tie-break already covers that case correctly).
  blockForMissingServiceChoice?: boolean;
}

interface UpcomingBooking {
  id: string;
  status: string;
  start_time: string;
  service_type_id: string;
  calendar_id: string; // which of the owner's calendars this booking lives in (A2)
  service_types?: { name?: string } | null;
}

// A2: resolve the calendar a booking/availability action targets, from the owner's allowlist.
// The model selects by calendar_index (1-based, matching the prompt's <kalenders> block) so it
// never handles raw UUIDs and can never name a calendar outside ctx.calendars. Single-calendar
// (the common case) ignores the index entirely and returns the entry calendar, so that path is
// behaviourally unchanged. When multiple calendars exist and the model gave no valid index, we
// REFUSE to guess (booking in the wrong staff/location calendar is a real error) and ask.
function resolveBookingCalendar(
  ctx: ToolContext,
  rawIndex: unknown,
  serviceId?: unknown,
): { id: string } | { needAsk: true; options: string[] } {
  if (ctx.calendars.length <= 1) return { id: ctx.calendarId };
  // ITEM2 primary route: a service_type_id is globally unique and belongs to exactly one
  // calendar, so the service the customer chose already pins the staff/location calendar. The
  // model no longer has to ask (or pick) an "agenda" first; it just picks the right service.
  const sid = typeof serviceId === "string" ? serviceId.trim() : "";
  if (sid && ctx.serviceCalendarMap) {
    const cid = ctx.serviceCalendarMap[sid];
    if (cid && ctx.calendars.some((c) => c.id === cid)) return { id: cid };
  }
  // Explicit override / back-compat: an index the model passed (still honoured; redundant once
  // the service routes correctly, but a useful tie-breaker the model may set when staff was named).
  const idx = Number(rawIndex);
  if (Number.isInteger(idx) && idx >= 1 && idx <= ctx.calendars.length) {
    return { id: ctx.calendars[idx - 1].id };
  }
  // Only when we can derive nothing (no resolvable service AND no valid index): ask, framed as
  // people/locations (the caller's message instructs human phrasing, never raw internal names).
  return { needAsk: true, options: ctx.calendars.map((c) => c.name) };
}

// Find WHICH of the caller's own upcoming active bookings to act on. Always scoped
// by phone + calendar (tenant + customer isolation). With more than one upcoming
// booking we refuse to guess and ask the model to disambiguate — the caller re-calls
// with match_time = the local clock time the customer named (the reliable hint; the
// model fills "14:00" naturally) and/or match_start_time = the exact start_time.
async function resolveTarget(
  supabase: SupabaseClient,
  ctx: ToolContext,
  matchStart?: string,
  matchTime?: string,
): Promise<{ booking?: UpcomingBooking; ambiguous?: UpcomingBooking[]; none?: boolean }> {
  const { data } = await supabase
    .from("bookings")
    .select("id, status, start_time, service_type_id, calendar_id, service_types(name)")
    .eq("customer_phone", ctx.phone)
    // A2: search the customer's bookings across the owner's WHOLE calendar allowlist, not just
    // the entry calendar, so "cancel/move my appointment" finds it wherever it lives. The action
    // then runs on the found booking's own calendar_id (always inside the allowlist → no leak).
    .in("calendar_id", ctx.calendars.map((c) => c.id))
    .in("status", ["confirmed", "pending"])
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);
  const list = ((data as UpcomingBooking[]) ?? []);
  if (list.length === 0) return { none: true };
  // Normalise a customer-named clock time ("14:00", "14.00", "2 uur") to HH:MM.
  const wantTime = (() => {
    const m = String(matchTime ?? "").trim().match(/^(\d{1,2})[:.](\d{2})/);
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
  })();
  // Named calendar dates ("donderdag 25 juni") as MM-DD, plus the date in matchStart if any.
  // This is what disambiguates bookings that share a clock time but fall on DIFFERENT days.
  const wantDates = new Set(extractMonthDayNL(ctx.userMessage));
  if (matchStart && /^\d{4}-\d{2}-\d{2}/.test(matchStart)) wantDates.add(matchStart.slice(5, 10));
  const wantMs = matchStart ? new Date(matchStart).getTime() : Number.NaN;
  const hadHint = !Number.isNaN(wantMs) || !!wantTime || wantDates.size > 0;
  if (hadHint) {
    // Successively narrow by each available hint, strongest first; never let a hint EMPTY the
    // set (a wrong/partial hint just doesn't narrow). Intersecting date AND time uniquely
    // resolves same-day-different-time AND same-time-different-day multi-booking cases.
    let hits = list;
    const apply = (pred: (b: UpcomingBooking) => boolean) => {
      const f = hits.filter(pred);
      if (f.length >= 1) hits = f;
    };
    // 1. exact instant (the model echoed the list's start_time; epoch-compare tolerates reformatting)
    if (!Number.isNaN(wantMs)) apply((b) => new Date(b.start_time).getTime() === wantMs);
    // 2. named day(s)
    if (hits.length > 1 && wantDates.size > 0) apply((b) => wantDates.has(localMMDD(b.start_time)));
    // 3. named clock time
    if (hits.length > 1 && wantTime) apply((b) => nlTimeOnly(b.start_time).slice(0, 5) === wantTime);
    // 4. fallback: the local clock time of matchStart (model may pass the displayed local time)
    if (hits.length > 1 && !Number.isNaN(wantMs)) {
      const wl = nlTimeOnly(matchStart!).slice(0, 5);
      apply((b) => nlTimeOnly(b.start_time).slice(0, 5) === wl);
    }
    if (hits.length === 1) return { booking: hits[0] };
    if (hits.length > 1) return { ambiguous: hits };
    // no hint matched anything -> fall through to the generic single/ambiguous handling
  }
  if (list.length === 1) return { booking: list[0] };
  return { ambiguous: list };
}

// --- get_business_data formatting helpers -------------------------------------

const DUTCH_DAY_ORDER = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

// "09:00:00" -> "09:00"
function hhmm(t: unknown): string {
  return typeof t === "string" ? t.slice(0, 5) : "";
}

// --- NL time formatting for tool RESULTS ---------------------------------------
// DB times are stored in UTC. The model must never have to convert a UTC instant
// itself (it echoed raw UTC on cancel = "12:00" instead of "14:00" NL). These
// helpers render an instant in Europe/Amsterdam so every confirmation the agent
// reads back is already correct local time, DST-safe.
const NL_TZ = "Europe/Amsterdam";
// e.g. "2026-06-23T12:00:00+00:00" -> "14:00"
function nlTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: NL_TZ });
}
// e.g. "2026-06-23T12:00:00+00:00" -> "dinsdag 23 juni 14:00"
function nlWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: NL_TZ });
  return `${date} ${nlTimeOnly(iso)}`;
}
// "YYYY-MM-DD" for today in Amsterdam — for past-date guards (en-CA renders ISO order).
function todayNL(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: NL_TZ });
}
// A customer-named calendar date that is already in the past. get_available_slots
// returns no slots for a past day, and the model then invents a wrong reason
// ("we're closed that day"); guard it with an honest, specific message instead.
function isPastDateNL(date: unknown): boolean {
  return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < todayNL();
}
// A customer-named date BEYOND how far ahead this calendar accepts bookings
// (booking_window_days). availability_rules are weekly-recurring and unbounded, so without
// this a far-future date can resolve to a real slot and book past the window; the model also
// tended to call such a date "al voorbij" (wrong + confusing). Honest, specific refusal instead.
// windowDays <= 0 / null = no horizon configured → never refuse. ISO date strings compare
// lexicographically, so a plain string > is a correct date comparison.
function isBeyondWindowNL(date: unknown, windowDays: number | null): boolean {
  if (windowDays == null || !Number.isFinite(windowDays) || windowDays <= 0) return false;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const horizonISO = new Date(new Date(todayNL() + "T00:00:00Z").getTime() + windowDays * 86400000)
    .toISOString().slice(0, 10);
  return date > horizonISO;
}
// Extract clock times ("14:00", "14.30", "14u30", "2 uur") from a message, normalised to
// HH:MM. Server-side disambiguation fallback: the small model often fails to pass match_time,
// so we read the time the customer named directly to resolve WHICH booking they meant.
export function extractClockTimes(msg: unknown): string[] {
  const s = typeof msg === "string" ? msg : "";
  const out: string[] = [];
  const re = /(\d{1,2})[:.u](\d{2})|(\d{1,2})\s*uur/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const h = Number(m[1] ?? m[3]);
    const mm = m[2] ?? "00";
    if (h >= 0 && h <= 23) out.push(`${String(h).padStart(2, "0")}:${mm}`);
  }
  return out;
}
// A booking's local month-day in Amsterdam as "MM-DD" (for disambiguating bookings that
// share a clock time but fall on different days).
function localMMDD(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: NL_TZ }).slice(5);
}
const NL_MONTHS: Record<string, number> = {
  januari: 1, februari: 2, maart: 3, april: 4, mei: 5, juni: 6, juli: 7, augustus: 8,
  september: 9, oktober: 10, november: 11, december: 12,
  jan: 1, feb: 2, mrt: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, august: 8, october: 10,
};
// Extract calendar dates a customer named ("25 juni", "juni 25", "25/6", "25-06") as "MM-DD".
// Used to disambiguate WHICH booking when the model can't (esp. same-clock-time, different days).
function extractMonthDayNL(msg: unknown): string[] {
  const s = (typeof msg === "string" ? msg : "").toLowerCase();
  const out = new Set<string>();
  const push = (day: number, mon: number) => {
    if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31) {
      out.add(`${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }
  };
  let m: RegExpExecArray | null;
  const reNumMonth = /\b(\d{1,2})\s+([a-z]+)/g;
  while ((m = reNumMonth.exec(s)) !== null) { if (NL_MONTHS[m[2]]) push(Number(m[1]), NL_MONTHS[m[2]]); }
  const reMonthNum = /\b([a-z]+)\s+(\d{1,2})\b/g;
  while ((m = reMonthNum.exec(s)) !== null) { if (NL_MONTHS[m[1]]) push(Number(m[2]), NL_MONTHS[m[1]]); }
  const reNumeric = /\b(\d{1,2})[\/\-](\d{1,2})\b/g; // NL day/month order
  while ((m = reNumeric.exec(s)) !== null) { push(Number(m[1]), Number(m[2])); }
  return [...out];
}

export interface DayHours { open: boolean; start?: string; end?: string; }

// Structured opening hours for ALL 7 days (a day absent from the dict OR is_available:false
// counts as CLOSED). The first (default) calendar. Returns null when no schedule is set.
// index.ts uses this to build a deterministic concrete-date calendar so the model never has
// to compute "is Sunday open?" or resolve a relative date itself.
export function openingHoursByDay(calendars: unknown): Record<string, DayHours> | null {
  if (!Array.isArray(calendars) || calendars.length === 0) return null;
  const oh = (calendars[0] as { opening_hours?: Record<string, { start_time?: string; end_time?: string; is_available?: boolean }> })?.opening_hours;
  if (!oh || typeof oh !== "object") return null;
  const out: Record<string, DayHours> = {};
  for (const day of DUTCH_DAY_ORDER) {
    const d = oh[day];
    if (d && d.is_available !== false && d.start_time && d.end_time) {
      out[day] = { open: true, start: hhmm(d.start_time), end: hhmm(d.end_time) };
    } else {
      out[day] = { open: false };
    }
  }
  return out;
}

// Readable opening-hours text, with consecutive same-status days COLLAPSED into ranges so
// the model can't mis-summarise a 5-day list (observed: it rendered Mon-Fri as "Maandag,
// Vrijdag", silently dropping the middle days). E.g. "Maandag t/m vrijdag 09:00-17:00,
// zaterdag en zondag gesloten". Returns null when no schedule is set.
function formatOpeningHoursFromByDay(byDay: Record<string, DayHours> | null): string | null {
  if (!byDay) return null;
  const keyOf = (d: DayHours) => (d.open ? `${d.start}-${d.end}` : "gesloten");
  const segs: string[] = [];
  let i = 0;
  while (i < DUTCH_DAY_ORDER.length) {
    const start = DUTCH_DAY_ORDER[i];
    const key = keyOf(byDay[start]);
    let j = i;
    while (j + 1 < DUTCH_DAY_ORDER.length && keyOf(byDay[DUTCH_DAY_ORDER[j + 1]]) === key) j++;
    const label = i === j
      ? start
      : (j === i + 1 ? `${start} en ${DUTCH_DAY_ORDER[j]}` : `${start} t/m ${DUTCH_DAY_ORDER[j]}`);
    segs.push(byDay[start].open ? `${label} ${key}` : `${label} gesloten`);
    i = j + 1;
  }
  return segs.length ? segs.join(", ") : null;
}
function formatOpeningHours(calendars: unknown): string | null {
  return formatOpeningHoursFromByDay(openingHoursByDay(calendars));
}

// Bookable weekly hours for a SPECIFIC calendar, derived from the REAL availability schedule
// (availability_schedules + availability_rules) — the SAME source get_available_slots uses. This
// is the booking TRUTH, so the agent's spoken opening hours + the concrete-date <kalender> match
// exactly what it can actually book. We deliberately do NOT use business_overview_v2.calendars[0]
// .opening_hours: that JSON is a separate, often-stale field AND is calendars[0], not necessarily
// THIS calendar (a business with >1 calendar would otherwise speak the wrong one's hours). Observed
// live: the agent said "Maandag gesloten" from that stale JSON, then booked Monday via the real
// schedule. day_of_week: 1=Monday .. 7=Sunday (ISO); a day absent or is_available:false = closed.
const DOW_TO_DUTCH: Record<number, string> = {
  1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag", 7: "Zondag",
};
export async function getCalendarWeeklyHours(
  supabase: SupabaseClient,
  calendarId: string,
): Promise<{ byDay: Record<string, DayHours>; text: string | null } | null> {
  // The default schedule (fallback: earliest-created) for this calendar.
  const { data: scheds } = await supabase
    .from("availability_schedules")
    .select("id, is_default, created_at")
    .eq("calendar_id", calendarId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const schedule = (scheds as Array<{ id: string }> | null)?.[0];
  if (!schedule) return null;
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("schedule_id", schedule.id);
  const ruleList =
    (rules as Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }> | null) ?? [];
  // A day can carry multiple windows; for the spoken summary take the earliest start + latest end
  // of its available windows. Absent / is_available:false day = closed.
  const byNum: Record<number, { start: string; end: string }> = {};
  for (const r of ruleList) {
    if (r.is_available === false || !r.start_time || !r.end_time) continue;
    const s = hhmm(r.start_time), e = hhmm(r.end_time);
    const cur = byNum[r.day_of_week];
    if (!cur) byNum[r.day_of_week] = { start: s, end: e };
    else { if (s < cur.start) cur.start = s; if (e > cur.end) cur.end = e; }
  }
  const byDay: Record<string, DayHours> = {};
  for (let d = 1; d <= 7; d++) {
    const nm = DOW_TO_DUTCH[d];
    byDay[nm] = byNum[d] ? { open: true, start: byNum[d].start, end: byNum[d].end } : { open: false };
  }
  return { byDay, text: formatOpeningHoursFromByDay(byDay) };
}

// WEEKLYHOURS-IGNORES-OVERRIDES (R38, sev-2): getCalendarWeeklyHours above is a pure
// day-of-week (recurring) map, with no concept of a specific date, so it cannot represent a
// one-off availability_overrides exception (holiday-hours-extension, special closure, etc).
// The 14-day concrete-date <kalender> table (index.ts buildCalendarHint) is built FROM that
// day-of-week map and is engineered so the model reads open/closed straight off it, per
// exact date, WITHOUT calling a tool. So an override on any date whose weekday the table
// renders was silently invisible: the model could confidently say "we're closed" on a day
// that actually has an override-open window (or vice versa), never consulting
// get_available_slots (which already handles overrides correctly, see the R34 migration).
// This fetches the override rows for a bounded date window (the same 14 days the hint
// renders) so buildCalendarHint can apply them per exact date, matching get_available_slots'
// own override semantics exactly: is_available=false means closed regardless of the
// recurring rule; is_available=true with explicit start/end replaces the day's window;
// is_available=true with null times has no override effect and falls back to the recurring
// day-of-week status.
export interface DateOverride { isAvailable: boolean; start?: string; end?: string; }
export async function getCalendarDateOverrides(
  supabase: SupabaseClient,
  calendarId: string,
  fromDateISO: string, // "YYYY-MM-DD", inclusive
  toDateISO: string, // "YYYY-MM-DD", inclusive
): Promise<Record<string, DateOverride>> {
  const { data } = await supabase
    .from("availability_overrides")
    .select("date, is_available, start_time, end_time")
    .eq("calendar_id", calendarId)
    .gte("date", fromDateISO)
    .lte("date", toDateISO);
  const rows = (data as Array<{ date: string; is_available: boolean | null; start_time: string | null; end_time: string | null }> | null) ?? [];
  const out: Record<string, DateOverride> = {};
  for (const r of rows) {
    out[r.date] = {
      // DB column defaults to false and the RPC treats a falsy/NULL is_available as closed
      // (NOT v_override_record.is_available), so mirror that exactly here.
      isAvailable: r.is_available === true,
      start: r.start_time ? hhmm(r.start_time) : undefined,
      end: r.end_time ? hhmm(r.end_time) : undefined,
    };
  }
  return out;
}

// Service duration (minutes) for end-time computation; default 30 when unknown.
async function serviceDuration(supabase: SupabaseClient, serviceId: string): Promise<number> {
  const { data } = await supabase.from("service_types").select("duration").eq("id", serviceId).maybeSingle();
  const d = (data as { duration?: number } | null)?.duration;
  return typeof d === "number" && d > 0 ? d : 30;
}

// X3b-2 cross-border VAT capture: normalize + format-validate the optional customer tax fields
// the agent captures conversationally, before persisting them onto the bookings row (X1
// columns). IDENTICAL shape rules to the web path (create-booking normalizeCountry/normalizeVatId)
// so both channels store the same canonical value. These are NOT a tax authority: Stripe decides
// the rate / reverse-charge later (whatsapp-payment-handler reads these off the row); we only
// sanitize shape so a malformed value never reaches the DB or Stripe. A bad value is DROPPED
// (→ null), not an error; a remote service missing a usable country is caught by the booking
// guard below (it asks again) and, at charge time, by whatsapp-payment-handler (400).
// country: ISO-3166 alpha-2 (exactly two ASCII letters) → uppercase, else null.
export function normalizeCountry(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const c = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) ? c : null;
}
// VAT-ID: 2-letter country prefix + 2..12 alphanumerics (Stripe eu_vat shape) → uppercase,
// stripped of spaces/dots/hyphens, else null. Format only; Stripe runs the real check.
export function normalizeVatId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.toUpperCase().replace(/[\s.\-]/g, "");
  return /^[A-Z]{2}[A-Z0-9]{2,12}$/.test(v) ? v : null;
}

// X3b-2 gate (server-side, never model-trusted): is the chosen service a remote/digital TAXABLE
// supply that needs the customer's billing country for the cross-border VAT calc? Mirrors the
// charge-time condition in create-booking-payment / whatsapp-payment-handler exactly
// (isRemoteSupply && tax_enabled && tax_code), so the agent captures country precisely when (and
// only when) the charge path will require it. in_person OR a remote service without tax cols =
// false → no extra capture, the conversation is unchanged. Returns the supply_type too for
// storing context. Defaults to in_person on any lookup miss (safe: no extra questions).
async function serviceCrossBorder(
  supabase: SupabaseClient,
  serviceId: string,
): Promise<{ supplyType: string; needsCountry: boolean }> {
  const { data } = await supabase
    .from("service_types")
    .select("supply_type, tax_enabled, tax_code")
    .eq("id", serviceId)
    .maybeSingle();
  const row = data as { supply_type?: string | null; tax_enabled?: boolean | null; tax_code?: string | null } | null;
  const supplyType = (row?.supply_type ?? "in_person") || "in_person";
  const isRemote = supplyType === "remote_service" || supplyType === "digital";
  const needsCountry = isRemote && row?.tax_enabled === true && typeof row?.tax_code === "string" && row.tax_code.trim().length > 0;
  return { supplyType, needsCountry };
}

// Resolve a customer-named clock time (date=YYYY-MM-DD, time=HH:MM in Amsterdam local) to the EXACT
// slot ISO instant SERVER-SIDE, so book/reschedule can act on a named time in ONE tool call — no
// separate get_available_slots LLM round-trip, which is the dominant per-turn latency cost (~3s).
// Reuses the very RPC the slots tool uses, so a booked time is always a real grid slot, DST-safe.
// Returns the free times when the requested one isn't available, so the model offers an alternative
// in the SAME turn (a round-trip happens only when the time is genuinely taken, which is correct).
async function resolveSlotForTime(
  supabase: SupabaseClient,
  calendarId: string,
  serviceId: string,
  date: string,
  time: string,
  durationMin: number,
  noticeHours?: number | null,
): Promise<
  { start: string; end: string }
  | { unavailable: true; available: string[] }
  | { tooSoon: true; available: string[]; earliestNL: string | null }
  | { error: string }
> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "bad_date" };
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { error: "bad_time" };
  const want = `${m[1].padStart(2, "0")}:${m[2]}`;
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_calendar_id: calendarId, p_service_type_id: serviceId, p_date: date,
  });
  if (error) return { error: error.message };
  const rows = (data as Array<{ slot_start: string; is_available: boolean }>) ?? [];
  const free = rows.filter((s) => s.is_available);
  const match = free.find((s) => nlTimeOnly(s.slot_start).slice(0, 5) === want);
  if (match) {
    const end = new Date(new Date(match.slot_start).getTime() + durationMin * 60000).toISOString();
    return { start: match.slot_start, end };
  }
  // Distinguish "too soon" (within minimum_notice_hours) from "taken": the requested time
  // exists in the schedule but the RPC marked it unavailable AND its real start is before
  // now + notice. Using the RPC's slot_start timestamp keeps this DST-correct (no local math).
  // Lets the caller explain "we need X hours notice" instead of a generic "not available".
  if (noticeHours != null && Number.isFinite(noticeHours) && noticeHours > 0) {
    const reqRow = rows.find((s) => nlTimeOnly(s.slot_start).slice(0, 5) === want);
    const cutoff = Date.now() + noticeHours * 3_600_000;
    if (reqRow && !reqRow.is_available && new Date(reqRow.slot_start).getTime() < cutoff) {
      const earliest = free.find((s) => new Date(s.slot_start).getTime() >= cutoff) ?? null;
      const earliestNL = earliest ? nlWhen(earliest.slot_start) : null;
      return { tooSoon: true, available: free.slice(0, 12).map((s) => nlTimeOnly(s.slot_start)), earliestNL };
    }
  }
  return { unavailable: true, available: free.slice(0, 12).map((s) => nlTimeOnly(s.slot_start)) };
}

// Compose one human address line from the parts. Drops the country when it is the
// default (Nederland). Returns null when nothing usable is set.
function formatAddress(d: {
  business_street?: string | null; business_number?: string | null;
  business_postal?: string | null; business_city?: string | null; business_country?: string | null;
}): string | null {
  const line1 = [d.business_street, d.business_number].map((s) => (s || "").trim()).filter(Boolean).join(" ");
  const line2 = [d.business_postal, d.business_city].map((s) => (s || "").trim()).filter(Boolean).join(" ");
  const country = (d.business_country || "").trim();
  const segs = [line1, line2, country && country !== "Nederland" ? country : ""].filter(Boolean);
  return segs.length ? segs.join(", ") : null;
}

// Only share a website that actually looks like one (legacy rows can hold junk like
// " v v"). Returns null otherwise so the agent never quotes garbage.
function cleanWebsite(raw: unknown): string | null {
  const v = (typeof raw === "string" ? raw : "").trim();
  if (!v || /\s/.test(v) || !v.includes(".")) return null;
  return v;
}

// Trim and drop empty; keep internal spaces (phone numbers like "+31 6 1234 5678").
function nonEmpty(raw: unknown): string | null {
  const v = (typeof raw === "string" ? raw : "").trim();
  return v ? v : null;
}

interface CalendarPolicy {
  allowCancellations: boolean;
  cancellationDeadlineHours: number | null;
  maxBookingsPerDay: number | null;
  bookingWindowDays: number | null;
  minimumNoticeHours: number | null; // NULL→24 to mirror get_available_slots' COALESCE(...,24)
}

// Human Dutch duration for a deadline/notice expressed in hours. Sub-hour values read as
// minutes ("30 minuten") instead of a literal "0.5 uur"; whole hours stay "24 uur"; a
// fractional hour keeps a Dutch decimal comma ("1,5 uur"). Used in the policy ANSWER inject
// (index.ts) AND the cancel/reschedule enforcement messages below.
export function formatHoursNL(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0 uur";
  if (hours < 1) {
    const mins = Math.round(hours * 60);
    return `${mins} ${mins === 1 ? "minuut" : "minuten"}`;
  }
  if (Number.isInteger(hours)) return `${hours} uur`;
  return `${String(hours).replace(".", ",")} uur`;
}

// The Operations settings the agent must honour. Read once per booking/cancel/
// reschedule. Defaults are permissive when no settings row exists.
// Exported (T3-A1) so index.ts can derive the SAME per-calendar policy for the
// <business_data> cancellation_policy text when the customer has one identifiable
// upcoming booking, instead of always the entry calendar's settings.
export async function getCalendarPolicy(supabase: SupabaseClient, calendarId: string): Promise<CalendarPolicy> {
  const { data } = await supabase
    .from("calendar_settings")
    .select("allow_cancellations, cancellation_deadline_hours, max_bookings_per_day, booking_window_days, minimum_notice_hours")
    .eq("calendar_id", calendarId)
    .maybeSingle();
  const row = data as {
    allow_cancellations?: boolean | null;
    cancellation_deadline_hours?: number | string | null;
    max_bookings_per_day?: number | string | null;
    booking_window_days?: number | string | null;
    minimum_notice_hours?: number | string | null;
  } | null;
  // PostgREST returns numeric columns as strings ("24.00"); coerce so the deadline reads
  // "24 uur" (not "24.00 uur") in enforcement messages AND so the < comparisons are real
  // numeric comparisons rather than relying on JS string→number coercion.
  const num = (v: number | string | null | undefined): number | null =>
    v == null ? null : Number.isFinite(Number(v)) ? Number(v) : null;
  return {
    allowCancellations: row?.allow_cancellations ?? true,
    cancellationDeadlineHours: num(row?.cancellation_deadline_hours),
    maxBookingsPerDay: num(row?.max_bookings_per_day),
    bookingWindowDays: num(row?.booking_window_days),
    // NULL → 24 so the agent's "te vroeg" explanation matches what the slot RPC enforces.
    minimumNoticeHours: num(row?.minimum_notice_hours) ?? 24,
  };
}

// Hours from now until a booking starts (negative once it has started).
function hoursUntil(startTime: string): number {
  return (new Date(startTime).getTime() - Date.now()) / 3_600_000;
}

// T3-A1: human-readable free-cancellation sentence for THIS booking's OWN calendar policy
// (allowCancellations already true at every call site below, so only the deadline branches
// apply here). Mirrors the derivation index.ts uses for the generic <business_data>
// cancellation_policy line, but scoped to a SPECIFIC calendar's policy instead of the entry
// calendar's. Used by cancel_appointment's needs_confirmation/cancelled results, which inject
// this for the booking's actual calendar_id, so the spoken answer during a cancel flow can
// never cite a different calendar's deadline than the one just enforced.
export function formatCancellationPolicyNL(policy: CalendarPolicy): string {
  const h = policy.cancellationDeadlineHours;
  return h != null && Number.isFinite(h) && h > 0
    ? `Je kunt deze afspraak tot ${formatHoursNL(h)} van tevoren kosteloos annuleren of verzetten via WhatsApp.`
    : `Je kunt deze afspraak op elk moment vóór de starttijd kosteloos annuleren of verzetten via WhatsApp.`;
}

// Fetch + format ALL business info the agent may share, nulls stripped. Shared by the
// get_business_data tool AND index.ts, which injects the result into the system prompt
// EVERY turn — so the agent always has the truth in context and can't skip the tool and
// then guess (observed: false "no info" on set fields + a hallucinated Instagram handle
// when it answered without calling the tool). Returns null when no business row exists.
export async function fetchBusinessData(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  // Only the fields the CURRENT settings UI actually supports (AIKnowledgeTab): the 5
  // social platforms (instagram/facebook/linkedin/tiktok/youtube/x) were removed as orphan
  // fields, so we no longer project them — otherwise the agent quotes stale values the
  // owner can no longer see or edit (observed live: a removed Instagram/Facebook link).
  // Website stays (still an editable link field).
  const { data } = await supabase
    .from("business_overview_v2")
    .select(
      "business_name, business_type, business_description, cancellation_policy, payment_info, parking_info, public_transport_info, accessibility_info, preparation_info, other_info, business_email, business_phone, business_whatsapp, business_street, business_number, business_postal, business_city, business_country, website, calendars",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  // Resolve a "other" business type to the free text the owner typed.
  let businessType: string | null = (data.business_type as string | null) ?? null;
  if (businessType === "other") {
    const { data: u } = await supabase
      .from("users").select("business_type_other").eq("id", userId).maybeSingle();
    businessType = ((u?.business_type_other as string | null) || "").trim() || null;
  }

  const out: Record<string, unknown> = {
    business_name: data.business_name,
    business_type: businessType,
    business_description: data.business_description,
    address: formatAddress(data),
    website: cleanWebsite(data.website),
    opening_hours: formatOpeningHours(data.calendars),
    // Structured per-day hours for index.ts's concrete-date calendar (not rendered into the
    // prompt text by renderBusinessData — it only renders string fields).
    opening_hours_struct: openingHoursByDay(data.calendars),
    business_email: data.business_email,
    business_phone: data.business_phone,
    business_whatsapp: nonEmpty(data.business_whatsapp),
    cancellation_policy: data.cancellation_policy,
    payment_info: data.payment_info,
    preparation_info: data.preparation_info,
    parking_info: data.parking_info,
    public_transport_info: data.public_transport_info,
    accessibility_info: data.accessibility_info,
    other_info: data.other_info,
  };
  for (const k of Object.keys(out)) {
    if (out[k] === null || out[k] === undefined || out[k] === "") delete out[k];
  }
  return out;
}

export function createTools(
  supabase: SupabaseClient,
  ctx: ToolContext,
): { decls: ToolDecl[]; execute: ToolExecutor } {
  const decls: ToolDecl[] = [
    {
      name: "get_business_data",
      description:
        "ZELDZAME fallback voor bedrijfsinfo/beleid (adres, website, openingstijden, annuleringsbeleid, betaalinfo, parkeren/OV, toegankelijkheid, voorbereiding, contact). Deze info staat AL in <business_data> in je context: beantwoord vragen over het bedrijf, openingstijden, locatie en contact DAAR direct uit, zonder deze tool. Roep dit ALLEEN aan als een gevraagd detail echt NIET in <business_data> staat.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_my_appointments",
      description:
        "ALLEEN-LEZEN: leest de aankomende afspraken van DEZE klant terug (dienst + tijd + status). " +
        "Gebruik dit als de klant vraagt wat hij/zij geboekt heeft, welke afspraken er staan, of wanneer de afspraak is " +
        "('wat heb ik geboekt', 'welke afspraken heb ik', 'wanneer is mijn afspraak', 'staat mijn afspraak nog'). " +
        "Het annuleert of wijzigt NIETS. Gebruik NOOIT cancel_appointment of reschedule_appointment om alleen op te zoeken.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_available_slots",
      description:
        "Geeft ECHTE vrije tijdslots voor een dienst op een datum. Roep aan vóór je een tijd voorstelt of boekt. Verzin nooit zelf tijden. " +
        "Elk slot = { tijd: de kloktijd die je AAN DE KLANT toont (bv '14:00'), start: de exacte ISO-tijd die je ONGEWIJZIGD doorgeeft als book_appointment.start_time }. " +
        "Reken zelf NOOIT tijden om; toon `tijd`, boek met `start`. " +
        "LET OP: available_slots toont maximaal de eerste 12 slots van de dag; `laatste_slot` in het resultaat is het ECHTE laatste vrije slot. Vraagt de klant naar het laatste / zo laat mogelijke moment, gebruik dan ALTIJD `laatste_slot`, nooit de laatste tijd uit de lijst.",
      parameters: {
        type: "object",
        properties: {
          service_type_id: { type: "string", description: "UUID van de dienst (uit de services-lijst)." },
          date: { type: "string", description: "Datum in YYYY-MM-DD." },
          calendar_index: { type: "integer", description: "ALLEEN bij meerdere agenda's (<kalenders> in je context): het nummer van de gekozen agenda. Laat WEG als er maar één agenda is." },
        },
        required: ["service_type_id", "date"],
      },
    },
    {
      name: "update_lead",
      description:
        'Sla de naam van de klant op. Geef name_refused: true ALLEEN mee als de klant expliciet weigert een naam te geven (dan first_name "Privé"). ' +
        "Roep dit pas aan als de klant zelf een naam geeft of weigert — verzin geen naam.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          name_refused: { type: "boolean", description: 'true alleen als de klant expliciet GEEN naam wil geven.' },
        },
        required: ["first_name"],
      },
    },
    {
      name: "book_appointment",
      description:
        "Boekt een NIEUWE afspraak in TWEE stappen (net als annuleren, zodat de klant eerst kan bevestigen). " +
        "STAP 1 (preview): heeft de klant een concrete dag + tijd genoemd? Roep dan METEEN aan met service_type_id + date (YYYY-MM-DD uit de <kalender>) + time (HH:MM) + naam — je hoeft get_available_slots NIET apart aan te roepen, de tool zoekt zelf het exacte vrije slot voor die tijd. De tool boekt dan NIETS en geeft 'needs_confirmation' terug met dienst, tijd en naam; vat die kort samen en vraag of het klopt. Is die tijd niet vrij, dan geeft de tool 'niet_beschikbaar' + de vrije tijden terug; stel er meteen een voor. " +
        "STAP 2 (commit): roep PAS NA de bevestiging van de klant opnieuw aan (confirmed:true + only_confirming_previous, de tool gebruikt de in stap 1 opgeslagen tijd). only_confirming_previous MOET je meesturen: true ALLEEN bij een kale, onvoorwaardelijke bevestiging zonder iets anders erbij, false zodra het bericht ENIG signaal bevat dat de klant iets anders wil dan precies de samengevatte afspraak, in welke vorm dan ook (bv. andere tijd/dag, vraag, voorwaarde, andere naam, correctie, of een vage voorkeur zoals 'toch liever iets anders' zonder dat de klant zegt wat). Twijfel je of het bericht 100% een kale bevestiging is, kies dan false. " +
        'Zonder naam weigert de tool de boeking, tenzij de klant expliciet weigerde (update_lead met name_refused: true, dan customer_name "Privé"). ' +
        "Vereist dit bedrijf vooruitbetaling, dan geeft stap 2 een betaallink (payment_url) terug; stuur die en zeg dat de plek gereserveerd is tot betaling.",
      parameters: {
        type: "object",
        // R27 (T3-LATENCY-PAYOFF): confirmed/only_confirming_previous moved to be the FIRST two
        // properties (was 9th/10th of 10, after 8 mostly-commit-irrelevant fields). Mirrors
        // cancel_appointment's existing, better-performing field order below, where these two are
        // already fields 1-2. Live `[stall-retry]` log evidence (this round's own baseline batch +
        // R26-verify) caught bookCommitMissed (this tool) firing repeatedly while
        // confirmCancelMissed did not, consistent with the model's attention being spent reasoning
        // about/omitting 8 preceding fields before reaching only_confirming_previous on the commit
        // call. Pure JSON-key-order change: JS object key order is preserved into the schema JSON
        // sent to Groq; no change to validation, defaults, or the fail-closed `=== true` gate below.
        properties: {
          confirmed: { type: "boolean", description: "true bij de bevestig-aanroep (na klant-akkoord op de samenvatting), samen met only_confirming_previous. Weg/false bij de preview." },
          only_confirming_previous: {
            type: "boolean",
            description:
              "VERPLICHT samen met confirmed:true. true = het laatste klantbericht is UITSLUITEND een kale, onvoorwaardelijke bevestiging ('ja', 'klopt'), helemaal niets anders. false = het bericht bevat ENIG signaal dat de klant iets anders wil dan precies de samengevatte afspraak, ongeacht hoe dat signaal geformuleerd is: bv. andere tijd/dag, vraag, voorwaarde, andere naam, twijfel/correctie, of een vage/ongespecificeerde voorkeur ('toch liever iets anders', 'liever iets rustigers') zonder dat de klant zegt wat precies. De vraag is niet 'past dit in een van de genoemde categorieën', maar 'is dit ECHT en UITSLUITEND een kale bevestiging van precies wat ik zonet samenvatte, zonder enige andere inhoud'. Twijfel je: false (dan wordt gewoon nogmaals gevraagd, veiliger dan verkeerd boeken). Voorbeeld bevestig-aanroep: {confirmed:true, only_confirming_previous:true}.",
          },
          service_type_id: { type: "string", description: "UUID van de dienst uit de services-lijst. Bij de bevestig-aanroep (confirmed:true) niet verplicht: het systeem gebruikt de dienst uit de preview." },
          date: { type: "string", description: "Datum YYYY-MM-DD (uit de <kalender>). Geef date + time door als de klant een concrete tijd noemde; de tool zoekt zelf het exacte slot (sneller, geen aparte get_available_slots nodig)." },
          time: { type: "string", description: "Kloktijd HH:MM (Amsterdamse tijd) die de klant koos, bv '14:00'. Samen met date de voorkeursmanier om te boeken." },
          start_time: { type: "string", description: "ALTERNATIEF voor date+time: de exacte 'start'-waarde (ISO 8601) van een slot uit get_available_slots, ongewijzigd gekopieerd. Gebruik date+time als je die hebt; val alleen op start_time terug als je al een ISO-slot uit get_available_slots koos. Reconstrueer een ISO-tijd NOOIT zelf." },
          end_time: { type: "string", description: "Alleen nodig bij start_time: ISO 8601 = start_time + de dienstduur. Bij date+time berekent de tool de eindtijd zelf." },
          customer_name: { type: "string", description: "Naam van de klant, of \"Privé\". Sla de naam EXACT op zoals de klant 'm typte: LETTERLIJK overnemen, inclusief emoji en ALLE naamdelen/achternamen, ook als er een emoji TUSSEN twee naamdelen in staat. Laat nooit een woord of emoji weg. Voorbeeld: typt de klant \"Anna 🌸 de Vries\", sla dan op \"Anna 🌸 de Vries\" (niet \"Anna\"). Bij de bevestig-aanroep (confirmed:true) niet verplicht: het systeem gebruikt de naam uit de preview, tenzij de klant 'm net corrigeerde." },
          customer_country: { type: "string", description: "ALLEEN voor een AFSTANDS-/DIGITALE dienst (in <services>/<kalenders> gemarkeerd als AFSTAND/DIGITAAL): de 2-letter landcode (ISO, bv. NL, DE, BE) van het land waar de klant gevestigd is, voor de juiste grensoverschrijdende btw. Geef dit mee in de eerste (preview) aanroep. Laat WEG bij een gewone (in_person) dienst. Verzin nooit een land; vraag het de klant." },
          customer_vat_id: { type: "string", description: "OPTIONEEL en alleen voor een AFSTANDS-/DIGITALE dienst: het EU-btw-nummer van de klant als die als BEDRIJF boekt (bv. NL123456789B01, DE123456789). Laat WEG als de klant particulier is of geen nummer heeft, en bij een in_person dienst. Verzin nooit een nummer." },
          calendar_index: { type: "integer", description: "ALLEEN bij meerdere agenda's (<kalenders> in je context): het nummer van de gekozen agenda waarin je boekt. Kies de service_type_id uit DIE agenda. Laat WEG als er maar één agenda is. Bij de bevestig-aanroep (confirmed:true) niet nodig: het systeem onthoudt de agenda uit de preview." },
          confirm_second_booking: { type: "boolean", description: "Alleen op true zetten als de klant ECHT een TWEEDE, losse afspraak naast een bestaande wil. Voor 'een ander tijdstip' gebruik je reschedule_appointment, niet dit." },
        },
        // R26: service_type_id/customer_name are NOT schema-required anymore (were previously).
        // Root cause found live during this round's own latency testing: a hard JSON-schema
        // `required` violation on the Groq API is a 400 that CRASHES the whole turn before any
        // server-side logic runs (no graceful reply, "Sorry, er ging even iets mis"), and the
        // model started omitting these on the confirm-call more often once the prompt started
        // emphasizing confirmed:true + only_confirming_previous as the pair needed to commit. The
        // server-side code ALREADY handles a missing/empty value gracefully on BOTH paths: on
        // commit, serviceId/rawName are ALWAYS sourced from the server-stored pendingBook, never
        // from args (tools.ts ~985/~1125), so an omitted arg here changes nothing; on a fresh
        // preview, a missing serviceId/start falls through to the existing "ontbrekende_gegevens"
        // error (~1135) and a missing/empty name falls through to the existing NAME GATE
        // "naam_ontbreekt" error (~1128), both of which produce a helpful in-character reply
        // instead of a crash. Removing the schema-level `required` turns a hard, ungraceful,
        // whole-turn-killing 400 into the already-correct, already-tested graceful in-app error
        // path. Not a loosening of any actual guarantee: the commit gate itself is unchanged.
      },
    },
    {
      name: "cancel_appointment",
      description:
        "Annuleert de aankomende afspraak van DEZE klant in TWEE stappen (annuleren is destructief → altijd één bevestiging). " +
        "Stap 1: roep aan ZONDER confirmed → de tool annuleert NIETS en geeft 'needs_confirmation' + de afspraak (dienst + when) terug; lees die terug, vraag of je echt mag annuleren, en bied aan om in plaats daarvan te verzetten. " +
        "Stap 2: pas NADAT de klant bevestigt, roep opnieuw aan met confirmed:true + only_confirming_previous, dan annuleert de tool. only_confirming_previous MOET je meesturen: true ALLEEN bij een kale, onvoorwaardelijke bevestiging zonder iets anders erbij, false zodra het bericht ENIG signaal bevat dat de klant iets anders wil (bv. vraag, voorwaarde, correctie, of een vage voorkeur zoals 'toch liever iets anders'). Bij meerdere afspraken geeft stap 1 'meerdere_afspraken' terug met de tijden; vraag welke en geef bij de volgende aanroep match_time = de kloktijd die de klant kiest mee (bv '14:00').",
      parameters: {
        type: "object",
        properties: {
          confirmed: {
            type: "boolean",
            description: "true NADAT de klant expliciet bevestigde te annuleren, samen met only_confirming_previous. Zonder confirmed:true annuleert de tool niets (alleen preview).",
          },
          only_confirming_previous: {
            type: "boolean",
            description:
              "VERPLICHT samen met confirmed:true. true = het laatste klantbericht is UITSLUITEND een kale, onvoorwaardelijke bevestiging ('ja', 'klopt', 'annuleer maar'), helemaal niets anders. false = het bericht bevat ENIG signaal dat de klant iets anders wil dan precies de annulering die je zonet voorlegde, ongeacht hoe dat signaal geformuleerd is: bv. vraag, voorwaarde, andere afspraak/tijd, twijfel/correctie, of een vage/ongespecificeerde voorkeur zonder dat de klant zegt wat precies. De vraag is niet 'past dit in een van de genoemde categorieën', maar 'is dit ECHT en UITSLUITEND een kale bevestiging, zonder enige andere inhoud'. Twijfel je: false (dan wordt gewoon nogmaals gevraagd, veiliger dan verkeerd annuleren). Voorbeeld bevestig-aanroep: {confirmed:true, only_confirming_previous:true}.",
          },
          match_time: {
            type: "string",
            description: "Bij meerdere afspraken: de KLOKTIJD (HH:MM, Amsterdamse tijd) van de afspraak die de klant kiest, bv '14:00'. DIT is de betrouwbare manier om te kiezen — geef gewoon de tijd door die de klant noemt.",
          },
          match_start_time: {
            type: "string",
            description: "Optioneel alternatief voor match_time: de exacte start_time van de gekozen afspraak uit de eerder teruggegeven lijst (ongewijzigd gekopieerd).",
          },
        },
      },
    },
    {
      name: "reschedule_appointment",
      description:
        "Verzet de eerstvolgende aankomende afspraak van DEZE klant naar een nieuwe tijd, in ÉÉN stap. " +
        "De DIENST blijft normaal hetzelfde, vraag die NIET opnieuw. De nieuwe tijd die de klant noemt IS de bevestiging: " +
        "roep METEEN aan met date (YYYY-MM-DD uit de <kalender>) + time (HH:MM); de tool zoekt zelf het exacte slot, " +
        "checkt of het vrij is en verzet direct. Vraag NIET 'klopt dat?' en kondig niets aan. Is die tijd niet vrij, " +
        "dan geeft de tool 'niet_beschikbaar' + de vrije tijden terug; stel er meteen een voor (geen aparte get_available_slots nodig). " +
        "Heeft de klant meerdere afspraken? Dan geeft de tool 'meerdere_afspraken' met de tijden terug; geef bij de volgende aanroep match_time = de kloktijd van de BESTAANDE afspraak die verzet moet worden mee (bv '14:00'), naast date+time van de nieuwe tijd. " +
        "ALLEEN bij meerdere agenda's (<kalenders> in je context): wil de klant naar een ANDERE medewerker/locatie verzetten (bv. 'kan ik naar Anna in plaats van Bram verzetten'), geef dan service_type_id van de dienst bij DIE nieuwe agenda mee (of calendar_index) samen met de nieuwe date+time; de tool verzet de afspraak dan mee naar die agenda, in dezelfde ene stap, mits daar een vrij slot is.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Nieuwe datum YYYY-MM-DD (uit de <kalender>). Voorkeursmanier samen met time." },
          time: { type: "string", description: "Nieuwe kloktijd HH:MM (Amsterdamse tijd), bv '14:00'." },
          start_time: { type: "string", description: "ALTERNATIEF voor date+time: nieuwe starttijd als exacte ISO 8601 uit get_available_slots. Gebruik bij voorkeur date+time." },
          end_time: { type: "string", description: "Alleen bij start_time: nieuwe eindtijd = start_time + dezelfde dienstduur. Bij date+time rekent de tool dit zelf." },
          service_type_id: { type: "string", description: "Alleen meegeven als de klant óók van dienst wisselt, OF (bij meerdere agenda's) naar een andere medewerker/locatie wil: kies dan de service_type_id uit DIE agenda's dienstenlijst, de tool leidt de nieuwe agenda daar zelf uit af." },
          calendar_index: { type: "integer", description: "ALLEEN bij meerdere agenda's (<kalenders> in je context) en de klant wil naar een andere medewerker/locatie verzetten zonder een specifieke nieuwe dienst te noemen: het nummer van de gekozen agenda. Laat WEG als de agenda niet wijzigt of er maar één agenda is; service_type_id is de voorkeursmanier." },
          match_time: {
            type: "string",
            description: "Bij meerdere afspraken: de KLOKTIJD (HH:MM) van de BESTAANDE afspraak die de klant wil verzetten, bv '14:00'. DIT is de betrouwbare manier om te kiezen welke afspraak: geef de tijd door die de klant noemt. Niet te verwarren met 'time' (de NIEUWE tijd).",
          },
          match_start_time: {
            type: "string",
            description: "Optioneel alternatief voor match_time: de exacte start_time van de te verzetten afspraak uit de eerder teruggegeven lijst.",
          },
        },
      },
    },
    {
      // R40 (T3, new capability): a customer whose booking is already CONFIRMED sometimes
      // needs the NAME on it corrected (typo, booked under a colleague's name, etc.) without
      // cancelling and rebooking (which would also needlessly re-trigger any payment/deposit
      // flow and cancellation-policy math). book_appointment's own name-correction handling
      // (nameChanged/namePreviewOnly) only ever applies to the in-flight PENDING PREVIEW of a
      // NOT-YET-committed booking; there was no tool at all for a booking already written to
      // the DB. Deliberately scoped to the NAME field only (not day/time/service, those already
      // have reschedule_appointment / cancel+rebook), same "one clean tool per real user need"
      // pattern as the existing three mutation tools.
      name: "update_booking_name",
      description:
        "Wijzigt ALLEEN de naam op een BESTAANDE, al bevestigde afspraak van deze klant (bv. verkeerd gespeld, of per ongeluk onder iemand anders' naam geboekt). GEEN nieuwe boeking, GEEN dag/tijd/dienst-wijziging (gebruik daarvoor reschedule_appointment). Twee stappen, zoals annuleren: " +
        "STAP 1 (preview): roep aan met new_name = de nieuwe naam die de klant noemt. De tool wijzigt NIETS en geeft 'needs_confirmation' terug met de HUIDIGE naam + de voorgestelde nieuwe naam; lees dat kort terug en vraag of het klopt. Heeft de klant meerdere afspraken? Dan geeft de tool 'meerdere_afspraken' terug; geef bij de volgende aanroep match_time = de kloktijd van de bedoelde afspraak mee. " +
        "STAP 2 (commit): roep PAS NA de bevestiging van de klant opnieuw aan met confirmed:true + only_confirming_previous. only_confirming_previous MOET je meesturen: true ALLEEN bij een kale, onvoorwaardelijke bevestiging zonder iets anders erbij, false zodra het bericht ENIG ander signaal bevat. Twijfel je: false.",
      parameters: {
        type: "object",
        properties: {
          new_name: { type: "string", description: "De nieuwe naam voor de afspraak, zoals de klant die noemt. Verplicht bij de preview-aanroep; bij de bevestig-aanroep (confirmed:true) niet nodig, de tool gebruikt de in stap 1 opgeslagen naam." },
          confirmed: { type: "boolean", description: "true bij de bevestig-aanroep (na klant-akkoord op de samenvatting), samen met only_confirming_previous. Weg/false bij de preview." },
          only_confirming_previous: {
            type: "boolean",
            description: "VERPLICHT samen met confirmed:true. true = het laatste klantbericht is UITSLUITEND een kale, onvoorwaardelijke bevestiging ('ja', 'klopt'), helemaal niets anders. false = het bericht bevat ENIG ander signaal. Twijfel je: false (dan wordt gewoon nogmaals gevraagd, veiliger dan verkeerd wijzigen).",
          },
          match_time: {
            type: "string",
            description: "Bij meerdere afspraken: de KLOKTIJD (HH:MM, Amsterdamse tijd) van de afspraak die de klant kiest, bv '14:00'.",
          },
          match_start_time: {
            type: "string",
            description: "Optioneel alternatief voor match_time: de exacte start_time van de gekozen afspraak uit de eerder teruggegeven lijst.",
          },
        },
      },
    },
  ];

  // Turn-local: how many book_appointment PREVIEWS happened this turn. The two-phase
  // flow stores a SINGLE pending_booking, so a compound request ("book Monday 15:30 AND
  // Tuesday 09:30") previewed twice would keep only the last and then commit one while
  // the model's prose claims both (agent/DB divergence). We refuse a 2nd preview in the
  // same turn and tell the model to handle one booking at a time.
  let bookPreviewsThisTurn = 0;

  // Turn-local: once a booking has COMMITTED this turn, remember it so a redundant 2nd
  // book_appointment call in the SAME turn (gpt-oss-20b sometimes re-fires after committing)
  // returns the already-booked confirmation instead of running a fresh preview that finds the
  // slot "taken" by the customer's OWN just-made booking and tells them it's unavailable
  // (DB correct, reply contradicts it; the A2-WATCH redundant-call case). One commit per turn,
  // so this never blocks a legitimate booking.
  let bookedThisTurn: { when: string; payment_url?: string } | null = null;

  // R36 (PHANTOM-BOOKING-SELFCHAIN, sev-2): the exact `at` epoch-ms stamp THIS closure itself
  // wrote the last time IT stored a pending_booking / pending_cancel preview (undefined until
  // this closure's own first preview write this HTTP turn). createTools/execute is created ONCE
  // per HTTP request and this SAME closure instance is reused for both the primary AND the
  // R22 bookCommitMissed/confirmStall RETRY runAgent call (index.ts's single createTools call
  // site), so this correctly spans a legitimate same-turn retry, unlike a naive wall-clock
  // "before this turn started" check (which was tried first, see evidence/IUX_r36.md section 6.1
  // for the false-positive it caused on a genuine bookCommitMissed retry: the retry's own
  // re-preview legitimately re-stamps `at`, and a wall-clock-only check could not tell that
  // apart from a same-turn self-chain). The actual, precise distinguishing question is: "is the
  // `pending_booking.at`/`pending_cancel.at` I am about to commit a stamp THIS CLOSURE ITSELF
  // JUST WROTE" (self-chain, must NOT commit) vs "a stamp that predates ANY preview this closure
  // has written this turn" (genuinely a prior HTTP turn's proposal, safe to commit). Comparing
  // against the closure's own last-self-written stamp (not a wall-clock instant) makes this
  // exact and immune to retry-timing.
  let lastSelfWrittenBookAt: number | undefined;
  let lastSelfWrittenCancelAt: number | undefined;
  // R40: same self-write-chain guard, mirrored for update_booking_name's own pending_rename
  // preview/commit dance (see the R36 comment above for the full reasoning).
  let lastSelfWrittenRenameAt: number | undefined;

  const execute: ToolExecutor = async (name, args) => {
    switch (name) {
      case "get_business_data": {
        const out = await fetchBusinessData(supabase, ctx.businessUserId);
        if (!out) return { error: "geen bedrijfsdata" };
        // Single source of truth for opening hours = the BOOKABLE weekly schedule
        // (availability_rules via getCalendarWeeklyHours), IDENTICAL to what index.ts injects
        // into <business_data>. Without this the tool returned a SEPARATE, often-stale
        // business_overview_v2.calendars[0].opening_hours, so a model that called this tool for
        // hours got values inconsistent with the injected context (A1d, 2026-06-23).
        // A4: in MULTI-calendar mode hours differ per agenda and this tool has no calendar_index,
        // so returning a single (entry-calendar) opening_hours could quote the WRONG agenda's
        // hours. Drop it here; the per-agenda hours live in the prompt's <kalenders> block.
        if (ctx.calendars.length > 1) {
          // P2-5 (2026-06-24): per-agenda hours differ, so a single opening_hours could quote the
          // WRONG agenda. Don't return one (or nothing): return EVERY calendar's bookable weekly
          // hours keyed by name, so a model that DID call this tool gives a COMPLETE, correctly-
          // attributed answer instead of dropping a calendar. Observed: tool-call turns answered
          // with only one agenda's hours; no-tool turns read <kalenders> and stayed complete. The
          // structural source-of-truth stays availability_rules (getCalendarWeeklyHours), identical
          // to <kalenders>. Rare path (the prompt tells the model to answer from context).
          delete out.opening_hours;
          // Array (not a name-keyed object): calendar names are NOT guaranteed unique (index.ts
          // defaults a nameless calendar to "Agenda"), so an object would silently collapse two
          // same-named calendars and drop one, reintroducing the very bug this fixes. An array
          // preserves every calendar, mirroring the per-index <kalenders> block.
          const perCal = (await Promise.all(
            ctx.calendars.map(async (c) => {
              const wh = await getCalendarWeeklyHours(supabase, c.id);
              return wh?.text ? { name: c.name, hours: wh.text } : null;
            }),
          )).filter((e): e is { name: string; hours: string } => e !== null);
          if (perCal.length) out.opening_hours_per_person = perCal;
        } else {
          const wh = await getCalendarWeeklyHours(supabase, ctx.calendarId);
          if (wh?.text) out.opening_hours = wh.text;
        }
        return out;
      }

      case "get_my_appointments": {
        // Read-only lookup of THIS customer's upcoming bookings. NO side effects (unlike using
        // cancel/reschedule as a lookup, which sets a pending_cancel marker — a mis-commit landmine).
        const { data } = await supabase
          .from("bookings")
          .select("start_time, status, calendar_id, service_types(name)")
          .eq("customer_phone", ctx.phone)
          // A2: across the owner's whole calendar allowlist, so the customer sees appointments
          // in any of the business's calendars (not only the one the webhook routed them to).
          .in("calendar_id", ctx.calendars.map((c) => c.id))
          .in("status", ["confirmed", "pending"])
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(5);
        const list = ((data as Array<{ start_time: string; status: string; calendar_id: string; service_types?: { name?: string } | null }>) ?? []);
        if (list.length === 0) return { appointments: [], message: "Deze klant heeft geen aankomende afspraken." };
        const calName = (id: string) => ctx.calendars.find((c) => c.id === id)?.name ?? null;
        const multi = ctx.calendars.length > 1;
        return {
          appointments: list.map((b) => ({
            service: b.service_types?.name ?? null,
            when: nlWhen(b.start_time),
            status: b.status,
            // Only surface the calendar (staff/location) when the business has more than one,
            // so the customer/agent can tell apart same-time appointments in different calendars.
            ...(multi ? { agenda: calName(b.calendar_id) } : {}),
          })),
        };
      }

      case "get_available_slots": {
        // R71 (R70-3 fix): refuse BEFORE resolving a calendar at all when the customer never
        // named a service or a branch and real service ambiguity exists (see ToolContext comment
        // + serviceDisambiguationGuard.ts). Checked first so this never silently picks a calendar
        // via a model-guessed service_type_id.
        if (ctx.blockForMissingServiceChoice) {
          return { error: "kies_dienst", message: KIES_DIENST_MESSAGE };
        }
        // A2: pick the target calendar from the owner's allowlist. Single-calendar → entry
        // calendar (unchanged). Multiple → require the model's calendar_index; refuse to guess.
        const slotCal = resolveBookingCalendar(ctx, args.calendar_index, args.service_type_id);
        if ("needAsk" in slotCal) {
          return {
            error: "kies_medewerker",
            message: `Deze dienst wordt door meerdere medewerkers of locaties (${slotCal.options.join(", ")}) aangeboden. Vraag de klant kort en menselijk bij wie of waar ze de afspraak willen ("bij wie wil je de afspraak?"), of bied "geen voorkeur" aan als het ze niet uitmaakt. Presenteer de opties als personen of plekken in natuurlijke taal (vertaal/normaliseer de namen mee naar de taal van de klant); noem ze NOOIT "agenda's" en dump geen technische namen. Pak daarna de service_type_id van de gekozen persoon/locatie en roep opnieuw aan.`,
          };
        }
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_calendar_id: slotCal.id,
          p_service_type_id: String(args.service_type_id),
          p_date: String(args.date),
        });
        if (error) return { error: error.message };
        const slots = ((data as Array<{ slot_start: string; is_available: boolean }>) ?? [])
          .filter((s) => s.is_available)
          .map((s) => s.slot_start);
        // Each slot carries `tijd` (NL clock time to SHOW the customer) and `start`
        // (the exact ISO instant to pass back as book_appointment.start_time). The
        // model presents `tijd` and books `start`, so it never converts UTC itself.
        // R22 (task_745b7fa0): `.slice(0, 12)` HEAD-truncates the day, so on a full day the
        // model literally never saw the true last slots and answered "latest slot" questions
        // with the 12th-shown time (measured live: true last 16:30, agent said 15:30).
        // Additive fix: `laatste_slot` always carries the genuine LAST free slot of the day;
        // the shown list stays byte-identical for every other question shape.
        const lastFree = slots.length > 0 ? slots[slots.length - 1] : null;
        return {
          date: args.date,
          available_slots: slots.slice(0, 12).map((s) => ({ tijd: nlTimeOnly(s), start: s })),
          count: slots.length,
          laatste_slot: lastFree ? { tijd: nlTimeOnly(lastFree), start: lastFree } : null,
        };
      }

      case "update_lead": {
        const first = String(args.first_name ?? "").trim();
        const refused = args.name_refused === true;
        // Keep the global contacts row updated for the dashboard contacts list (display only).
        const update: Record<string, unknown> = { first_name: first || "Privé" };
        if (args.last_name) update.last_name = String(args.last_name);
        const { error } = await supabase
          .from("whatsapp_contacts")
          .update(update)
          .eq("phone_number", ctx.phone);
        if (error) return { error: error.message };
        // Tenant-scoped source of truth for the booking name: the conversation context (per
        // calendar_id + contact), NOT the globally-unique contact row. This is what the agent
        // reads as knownName next turn, so a name given at THIS business never bleeds to
        // another (R3). The name_refused flag also lets book_appointment tell a genuine
        // declined "Privé" apart from a premature placeholder.
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          const context = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
          const next: Record<string, unknown> = { ...context };
          if (refused) {
            next.name_refused = true;
            delete next.booking_name;
          } else if (first) {
            next.booking_name = first;
            next.name_refused = false;
          }
          await supabase.from("whatsapp_conversations").update({ context: next }).eq("id", ctx.conversationId);
        }
        return { ok: true };
      }

      case "book_appointment": {
        // Idempotency for a redundant SAME-TURN re-fire after a successful commit: return the
        // already-booked confirmation immediately, so the model can't run a fresh preview that
        // reports the slot "taken" by the customer's own just-made booking (A2-WATCH).
        if (bookedThisTurn) {
          return {
            ok: true,
            already_booked: true,
            when: bookedThisTurn.when,
            ...(bookedThisTurn.payment_url ? { payment_required: true, payment_url: bookedThisTurn.payment_url } : {}),
            message: "Deze afspraak is in deze beurt AL geboekt. Bevestig dat kort en vriendelijk; zeg NIET dat de tijd bezet of niet beschikbaar is en boek niet opnieuw.",
          };
        }
        // Server-driven TWO-PHASE booking (mirrors cancel_appointment): the first call only
        // PREVIEWS (stores a pending_booking proposal, NO insert), the customer confirms, then
        // the COMMIT inserts using the SERVER-STORED exact values. This makes an accidental
        // immediate booking impossible, lets the customer correct the name/time, and removes
        // the model's time-reconstruction from the insert (it once booked 12:00 for a
        // confirmed 10:00 — the stored start_time is now authoritative).
        let bookCtx: Record<string, unknown> = {};
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          bookCtx = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
        }
        const pendingBook = bookCtx.pending_booking as
          { service_type_id?: string; start_time?: string; end_time?: string; customer_name?: string; calendar_id?: string; customer_country?: string | null; customer_vat_id?: string | null; customer_locale?: "nl" | "en"; at?: number } | undefined;
        const clearPendingBook = async () => {
          if (!ctx.conversationId) return;
          const { pending_booking: _drop, ...rest } = bookCtx;
          await supabase.from("whatsapp_conversations").update({ context: rest }).eq("id", ctx.conversationId);
        };
        // R25 (AFFIRM-CONFIRM-COVERAGE-GAP-NAME, sev-3): a name-correction stated on the SAME
        // turn as the confirmation ("Klopt, maar dan voor Iris" on a Dana preview) was silently
        // swallowed: the commit always sourced customer_name from the STORED pendingBook proposal
        // (see rawName below), never the current turn's args.customer_name, even when the model
        // itself called update_lead with the corrected name in the same turn. None of the 4/5
        // ambiguousConfirm categories cover a bare name swap (no day/time word, no price word, no
        // "?", no hedge word, no conditional word), so ctx.ambiguousConfirm stayed false and the
        // stale name committed. Fix: treat a same-turn name change as its own ambiguity signal,
        // the same "clarify over guess" pattern as ambiguousConfirm, rather than trusting the
        // model's args.customer_name on a commit turn (which would reopen the exact "trust the
        // model on an ambiguous turn" risk R23/R24 closed for time/service corrections). Compares
        // the model's args.customer_name THIS turn against the stored preview name; a real
        // placeholder-vs-real-name mismatch (empty/"Privé"/"Prive" on either side) is not a
        // correction and is ignored, only two distinct non-empty real names count.
        const isRealName = (n: unknown) => {
          const t = String(n ?? "").trim().toLowerCase();
          return t !== "" && t !== "privé" && t !== "prive";
        };
        const nameChanged = !!pendingBook?.start_time && isRealName(args.customer_name) && isRealName(pendingBook?.customer_name) &&
          String(args.customer_name).trim().toLowerCase() !== String(pendingBook?.customer_name).trim().toLowerCase();

        // COMMIT only when a proposal was previewed in a previous turn AND the customer
        // confirmed (server-detected ctx.confirmBook, or the model's confirmed flag). On
        // commit we use the STORED proposal, never the model's (possibly mis-reconstructed) args.
        // R24 (AFFIRM-CONFIRM-FALSEPOS, second commit path): the model's own args.confirmed is
        // just as capable of misreading an ambiguous message (a time-shift or service-correction
        // qualifier attached to an affirm word) as the server force ctx.confirmBook was before
        // R23's ambiguousConfirm gate. Gating ONLY ctx.confirmBook (R23's fix) left this arm of
        // the OR fully open: the model self-issues confirmed:true on any ja/klopt-shaped reply
        // per prompt.ts, independent of ambiguity. Applying !ctx.ambiguousConfirm to BOTH arms
        // closes that path: on an ambiguous message neither arm can commit, so the model runs
        // normally against the still-pending proposal (re-previews or answers the question)
        // instead of silently committing the wrong thing.
        // R26 (structural rebuild, replaces category-by-category regex patching as the PRIMARY
        // mechanism): R23-R25 each closed one more wording CATEGORY the ambiguousConfirm regex
        // bank did not yet cover (time-shift/price/day -> service-correction -> conditional/name),
        // an inherently unbounded enumeration of natural language (Mathew's own framing: too many
        // ways to phrase something in Dutch, doubles in English). Instead of adding a 6th/7th/Nth
        // regex category, require the SAME model call that is already reading the message and
        // deciding to call the tool to make its own belief about message-cleanliness EXPLICIT and
        // machine-checkable: args.only_confirming_previous must be exactly true (missing/false/any
        // other value fails CLOSED, never open) for EVERY commit, whichever arm drives it. This
        // generalizes to any future phrasing/language without a new regex, because it is the
        // model's own language understanding attesting to a fact the server can mechanically check
        // for presence, not a wording pattern the server has to recognize. ambiguousConfirm (regex)
        // and nameChanged stay as a SECOND, independent, model-independent layer (defense-in-depth,
        // catches the case where the small 20B model's own attestation is wrong); see the round's
        // evidence file for the full reasoning on why field-echo-compare on date/time/service would
        // NOT have covered 5 of 6 known historical bugs (the server already never trusts those
        // fields from args on commit) and was rejected as the primary mechanism.
        const cleanlyConfirmed = args.only_confirming_previous === true;
        // R32: ctx.hardConfirm === true is a THIRD, structural, ANDed requirement (see ToolContext
        // comment above, evidence/IUX_r32.md section 2). committing now needs ALL of: the server
        // or model saying "confirmed", the regex ambiguousConfirm layer NOT flagging it, the name
        // not having changed, the model's own attestation, AND the hard structural gate agreeing
        // the raw message is a member of the finite clean-confirm allow-list. Any one of the four
        // independent checks failing blocks the commit; only the hard gate is immune to novel
        // phrasing by construction (it does not pattern-match "badness", it membership-tests
        // "goodness" against a closed list).
        // R36 (PHANTOM-BOOKING-SELFCHAIN, sev-2, PURE ADDITIVE FIFTH condition, see ToolContext
        // comment above + evidence/IUX_r36.md): closes the specific incident shape (a first-ever
        // message, ZERO prior pending_booking, that self-chains a preview-then-self-confirm in ONE
        // turn purely off the model's OWN args.confirmed:true). The precise, narrow discriminator:
        // ctx.confirmBook is computed in index.ts from the pending_booking that ALREADY EXISTED
        // in the DB before this HTTP turn's runAgent ever started (a genuine, server-verified
        // PRIOR-turn proposal). When ctx.confirmBook is true, a real prior-turn proposal is proven
        // to exist independently of anything this closure does this turn, so any same-turn
        // re-preview/retry oscillation from there (the proven bookCommitMissed recovery flow,
        // where the model's first attempt omits only_confirming_previous and a nudge retries) stays
        // fully allowed, unchanged from before this round. Only when ctx.confirmBook is FALSE (no
        // prior-turn proposal existed AT ALL) and the commit is being driven purely by the model's
        // own self-issued args.confirmed===true is the pendingBook required to predate anything
        // THIS closure itself wrote this turn (lastSelfWrittenBookAt): that is precisely the
        // self-chain shape (preview call writes it, self-confirm call reads its own just-written
        // stamp back), and it is the ONLY path this guard touches. A missing/non-numeric
        // pendingBook.at fails CLOSED (excluded) in that narrow case.
        const noPriorTurnProposal = ctx.confirmBook !== true;
        const previewIsSelfWritten = noPriorTurnProposal &&
          typeof pendingBook?.at === "number" && pendingBook.at === lastSelfWrittenBookAt;
        const committing = (args.confirmed === true || ctx.confirmBook === true) && !ctx.ambiguousConfirm && !nameChanged && cleanlyConfirmed && ctx.hardConfirm === true && !!pendingBook?.start_time && !previewIsSelfWritten;
        // R25: when nameChanged is the ONLY reason this didn't commit (everything else about a
        // genuine commit turn holds), re-preview using the ALREADY-VALIDATED stored slot/service
        // rather than falling through to the generic fresh-preview path, which would expect
        // args.service_type_id/date/time the model has no reason to resupply on a bare confirm
        // turn that also corrects the name, and would otherwise dead-end on "ontbrekende_gegevens".
        // This is a pure re-preview (no insert either way), so it carries none of the commit risk;
        // it just corrects WHICH name gets shown back to the customer for the next confirm.
        // R32: deliberately NOT gated on ctx.hardConfirm. This path fires when the customer bundled
        // a real name-correction with a clean affirm (e.g. "Klopt, maar dan voor Iris"); that
        // message is legitimately not a hard-confirm member by design, since it carries extra
        // content, and nameChanged already isolates exactly this shape and only ever RE-PREVIEWS,
        // never commits, so leaving it un-gated here carries no commit risk.
        const wouldHaveCommitted = (args.confirmed === true || ctx.confirmBook === true) && !ctx.ambiguousConfirm && !!pendingBook?.start_time;
        const namePreviewOnly = nameChanged && wouldHaveCommitted;

        const serviceId = String(((committing || namePreviewOnly) ? pendingBook!.service_type_id : args.service_type_id) ?? "");
        let start = String(((committing || namePreviewOnly) ? pendingBook!.start_time : args.start_time) ?? "");
        let end = String(((committing || namePreviewOnly) ? pendingBook!.end_time : args.end_time) ?? "");

        // A2: which of the owner's calendars are we booking in? On COMMIT use the calendar stored
        // during the preview (authoritative, like start_time), so the confirm turn needs no
        // calendar_index. On a fresh PREVIEW resolve from the model's calendar_index against the
        // owner allowlist; when multiple calendars exist and no valid index was given, refuse to
        // guess (booking in the wrong staff/location is a real error) and ask which one. Every
        // value of calId comes from ctx.calendars → it can never point at another owner's calendar.
        let calId = ctx.calendarId;
        if (committing || namePreviewOnly) {
          calId = (pendingBook?.calendar_id) ?? ctx.calendarId;
        } else {
          // R71 (R70-3 fix): on a FRESH preview only (never on commit/namePreviewOnly, which
          // already have a stored, previously-resolved service+calendar), refuse before resolving
          // a calendar at all when the customer never named a service or a branch and real
          // service ambiguity exists (see ToolContext comment + serviceDisambiguationGuard.ts).
          if (ctx.blockForMissingServiceChoice) {
            return { error: "kies_dienst", message: KIES_DIENST_MESSAGE };
          }
          const bookCal = resolveBookingCalendar(ctx, args.calendar_index, serviceId);
          if ("needAsk" in bookCal) {
            return {
              error: "kies_medewerker",
              message: `Deze dienst wordt door meerdere medewerkers of locaties (${bookCal.options.join(", ")}) aangeboden. Vraag de klant kort en menselijk bij wie of waar ze de afspraak willen ("bij wie wil je de afspraak?"), of bied "geen voorkeur" aan als het ze niet uitmaakt. Presenteer de opties als personen of plekken in natuurlijke taal (vertaal/normaliseer de namen mee); noem ze NOOIT "agenda's" en dump geen technische namen. Pak daarna de service_type_id van de gekozen persoon/locatie en roep book_appointment opnieuw aan.`,
            };
          }
          calId = bookCal.id;
        }

        // FAST PATH (preview only): the customer named a concrete date+time, so resolve the EXACT
        // slot SERVER-SIDE rather than forcing a separate get_available_slots LLM round-trip (the
        // dominant per-turn latency cost ~3s). On commit we always use the stored pending_booking,
        // so this runs only for a fresh preview. If the named time isn't free, return the free times
        // so the model proposes an alternative in the SAME turn.
        // Date guards run BEFORE any slot resolution (cheap, and they short-circuit the wrong
        // model answers). bookPolicy is fetched ONCE here and reused for the max/day cap below
        // (no extra round-trip — it was already fetched unconditionally further down).
        const bookPolicy = await getCalendarPolicy(supabase, calId);
        if (!committing && !namePreviewOnly && isPastDateNL(args.date)) {
          return { error: "datum_verleden", message: "Die datum is al geweest. Vraag de klant vriendelijk een datum in de toekomst." };
        }
        if (!committing && !namePreviewOnly && isBeyondWindowNL(args.date, bookPolicy.bookingWindowDays)) {
          return { error: "datum_te_ver", message: `Zo ver vooruit kun je nog niet boeken, je kunt tot ${bookPolicy.bookingWindowDays} dagen vooruit een afspraak maken. Vraag de klant vriendelijk een eerdere datum.` };
        }
        if (!committing && !namePreviewOnly && serviceId && (!start || !/^\d{4}-\d{2}-\d{2}T/.test(start)) && args.date && args.time) {
          const dur = await serviceDuration(supabase, serviceId);
          const r = await resolveSlotForTime(supabase, calId, serviceId, String(args.date), String(args.time), dur, bookPolicy.minimumNoticeHours);
          if ("error" in r) {
            return { error: "ongeldige_tijd", message: "Ik kon die datum/tijd niet verwerken. Vraag de klant kort de gewenste dag en tijd." };
          }
          if ("tooSoon" in r) {
            // The named time is within the minimum-notice window → explain WHY (not a generic
            // "niet beschikbaar") and point to the first moment that does work.
            const notice = formatHoursNL(bookPolicy.minimumNoticeHours!);
            return {
              error: "te_vroeg",
              message:
                `Die tijd is te kort dag: een afspraak kan pas vanaf ${notice} van tevoren worden gemaakt. ` +
                (r.earliestNL ? `Het eerste moment dat kan is ${r.earliestNL}. ` : "") +
                "Leg dit kort en vriendelijk uit aan de klant" +
                (r.available.length ? ` en bied een van deze vrije tijden aan: ${r.available.join(", ")}.` : " en vraag om een latere dag/tijd."),
              available_slots: r.available,
            };
          }
          if ("unavailable" in r) {
            // IDEMPOTENCY: a book_appointment re-fire AFTER a successful commit lands on
            // the slot now occupied by the customer's OWN just-made booking → never tell
            // them "niet vrij". If this customer already holds an active booking at the
            // requested local time on this calendar that day, acknowledge it as already
            // booked. (Bookable hours are 09–17 local = 07–16 UTC, so the booking's UTC
            // day equals its local day — a UTC day-window matches correctly.)
            const wantM = String(args.time).trim().match(/^(\d{1,2}):(\d{2})/);
            if (wantM) {
              const want = `${wantM[1].padStart(2, "0")}:${wantM[2]}`;
              const dayStart = `${args.date}T00:00:00Z`;
              const dayEnd = new Date(new Date(dayStart).getTime() + 86_400_000).toISOString();
              const { data: ownSameDay } = await supabase
                .from("bookings")
                .select("id, start_time")
                .eq("customer_phone", ctx.phone)
                .eq("calendar_id", calId)
                .in("status", ["confirmed", "pending"])
                .gte("start_time", dayStart)
                .lt("start_time", dayEnd);
              const mine = (ownSameDay ?? []).find(
                (b) => nlTimeOnly((b as { start_time: string }).start_time).slice(0, 5) === want,
              );
              if (mine) {
                await clearPendingBook();
                const m = mine as { id: string; start_time: string };
                return {
                  ok: true,
                  already_booked: true,
                  booking_id: m.id,
                  start_time: m.start_time,
                  when: nlWhen(m.start_time),
                  message: "Deze afspraak staat al geboekt — bevestig dat kort en bied verder hulp aan.",
                };
              }
            }
            return {
              error: "niet_beschikbaar",
              available_slots: r.available,
              message: r.available.length
                ? `Die tijd is niet vrij. Stel een van deze vrije tijden voor: ${r.available.join(", ")}.`
                : "Die dag heeft geen vrije tijden. Stel vriendelijk een andere dag voor.",
            };
          }
          start = r.start; end = r.end;
        }
        // Safety: end_time is no longer a required param (date+time computes it). If the model used
        // the legacy start_time path and gave a valid ISO start but NO end, derive end from the
        // service duration so we never insert a booking with an empty end_time.
        if (!committing && !namePreviewOnly && start && /^\d{4}-\d{2}-\d{2}T/.test(start) && !end && serviceId) {
          const dur = await serviceDuration(supabase, serviceId);
          end = new Date(new Date(start).getTime() + dur * 60000).toISOString();
        }

        // NAME GATE: never create a nameless booking. The model must collect a real name
        // first, OR the customer must have EXPLICITLY refused (update_lead name_refused:true,
        // recorded in the conversation context). A bare "Privé"/empty without a recorded
        // refusal means the model jumped to booking before asking, refuse and make it ask.
        // This is a server-side guard because the LLM (temp 0.2) otherwise satisfies the
        // required customer_name param with a premature placeholder.
        // R25: on a namePreviewOnly turn, use the model's THIS-TURN args.customer_name (the
        // corrected name), not the stale pendingBook name, so the re-preview reflects the
        // correction the customer just stated.
        const rawName = String(((committing) ? pendingBook!.customer_name : args.customer_name) ?? "").trim();
        const nameMissing = rawName === "" || rawName.toLowerCase() === "privé" || rawName.toLowerCase() === "prive";
        const refused = nameMissing && bookCtx.name_refused === true;
        if (nameMissing && !refused) {
          return {
            error: "naam_ontbreekt",
            message: "Boek niet zonder naam: gebruik de bekende WhatsApp-naam of vraag eerst kort de naam, en boek pas daarna.",
          };
        }
        const customerName = nameMissing ? "Privé" : rawName;
        if (!start || !serviceId) {
          return { error: "ontbrekende_gegevens", message: "Dienst en starttijd zijn nodig om te boeken." };
        }

        // X3b-2 CROSS-BORDER VAT CAPTURE (preview only; commit re-uses the stored proposal).
        // The supply_type is checked SERVER-SIDE here (never the model's claim) so the country
        // question can be neither skipped nor faked. For a remote/digital TAXABLE service we need
        // the customer's billing country; we capture it (+ optional EU VAT-ID) from the model's
        // args, format-validated. If the country is missing/malformed we REFUSE the preview and
        // make the agent ask (mirrors the name-gate), so a remote booking can never be created
        // without the country the charge path (whatsapp-payment-handler) will require. For an
        // in_person service this whole block is a no-op: country/vat stay null and the booking
        // row is byte-identical to before. On COMMIT we use the stored values, so this lookup +
        // gate run only on a fresh preview.
        let bookCountry: string | null = (committing || namePreviewOnly) ? (normalizeCountry(pendingBook?.customer_country)) : null;
        let bookVatId: string | null = (committing || namePreviewOnly) ? (normalizeVatId(pendingBook?.customer_vat_id)) : null;
        if (!committing && !namePreviewOnly) {
          const xb = await serviceCrossBorder(supabase, serviceId);
          bookCountry = normalizeCountry(args.customer_country);
          bookVatId = normalizeVatId(args.customer_vat_id);
          if (xb.needsCountry && !bookCountry) {
            return {
              error: "land_ontbreekt",
              message:
                "Dit is een afstands-/digitale dienst, dus voor de juiste btw is het land van de klant nodig. " +
                "Vraag de klant kort in welk land ze gevestigd zijn (een 2-letter landcode zoals NL, DE of BE; de klant mag de landnaam noemen, vertaal die naar de code) " +
                "en, indien van toepassing, of ze als bedrijf met een EU-btw-nummer boeken. Roep daarna book_appointment opnieuw aan met customer_country (en eventueel customer_vat_id). Boek nog niet.",
            };
          }
        }

        // DUPLICATE GUARD: prevent an accidental DOUBLE booking. Observed: for "kan het
        // een uur later?" the model calls book_appointment (a 2nd booking) instead of
        // reschedule_appointment, leaving the original AND a new row. If this customer
        // already has an upcoming active booking on this calendar, refuse and route to
        // reschedule — unless they EXPLICITLY want a second one (confirm_second_booking).
        // SKIP on commit: a pending_booking only exists because the PREVIEW already passed this guard
        // (no existing booking, or confirm_second_booking was set then). Re-running it on the commit
        // turn blocked genuine second bookings forever, because gpt-4.1-mini rarely re-sets the flag on
        // the "ja" turn (adversarial finding: infinite preview loop). The overlap constraint +
        // validate_booking_security still catch any real slot conflict on insert.
        if (!committing && !namePreviewOnly && args.confirm_second_booking !== true) {
          const { data: existing } = await supabase
            .from("bookings")
            .select("start_time")
            .eq("customer_phone", ctx.phone)
            // A2: scope the duplicate check to the TARGET calendar, so a legitimate booking with a
            // different staff member/location is not falsely blocked by an appointment elsewhere.
            .eq("calendar_id", calId)
            .in("status", ["confirmed", "pending"])
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (existing) {
            return {
              error: "bestaande_afspraak",
              message:
                `De klant heeft al een aankomende afspraak op ${nlWhen((existing as { start_time: string }).start_time)}. ` +
                "Wil de klant een ANDER tijdstip? Gebruik reschedule_appointment (NIET book_appointment — dat maakt een tweede afspraak). " +
                "Alleen als de klant ECHT een losse, extra afspraak ernaast wil: roep book_appointment opnieuw aan met confirm_second_booking=true.",
            };
          }
        }

        // Enforce the "Max bookings per day" Operations setting (previously saved but
        // never enforced). Count this calendar's confirmed+pending bookings on the
        // requested day; refuse when the cap is reached. bookPolicy was fetched once above.
        if (bookPolicy.maxBookingsPerDay != null) {
          const day = start.slice(0, 10);
          const nextDay = new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
          const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("calendar_id", calId)
            .in("status", ["confirmed", "pending"])
            // Match get_available_slots' day-count: exclude soft-deleted rows so the slot
            // RPC (which offers) and this guard (which refuses) agree on whether a day is full.
            .or("is_deleted.is.null,is_deleted.eq.false")
            .gte("start_time", `${day}T00:00:00Z`)
            .lt("start_time", `${nextDay}T00:00:00Z`);
          if ((count ?? 0) >= bookPolicy.maxBookingsPerDay) {
            return { error: "dag_vol", message: "Die dag zit vol. Stel de klant een andere dag voor." };
          }
        }

        // Does this calendar require up-front payment? (secure payments on AND
        // payment required for booking). Decided server-side, never by the LLM.
        const { data: ps } = await supabase
          .from("payment_settings")
          .select("secure_payments_enabled, payment_required_for_booking")
          .eq("calendar_id", calId)
          .maybeSingle();
        const paymentRequired = !!(
          (ps as { secure_payments_enabled?: boolean; payment_required_for_booking?: boolean } | null)
            ?.secure_payments_enabled &&
          (ps as { payment_required_for_booking?: boolean } | null)?.payment_required_for_booking
        );

        // Same safety layer as create-booking: validate_booking_security (the
        // calendar_id overload returns a boolean, true = ok), then the
        // bookings_no_overlap exclusion constraint catches a race on insert.
        // Email is null for WhatsApp (verified allowed).
        const { data: valid, error: valErr } = await supabase.rpc("validate_booking_security", {
          p_calendar_id: calId,
          p_service_type_id: serviceId,
          p_start_time: start,
          p_end_time: end,
          p_customer_email: null,
        });
        if (valErr) return { error: valErr.message };
        if (valid !== true) return { error: "niet_beschikbaar", message: "Dat tijdstip is niet beschikbaar." };

        // PREVIEW phase: every guard passed, but DON'T insert yet. Store the proposal and ask
        // the customer to confirm; the next affirm turn commits THIS exact proposal.
        // R25: this branch is ALSO where a namePreviewOnly turn lands (nameChanged blocked the
        // commit above), re-storing the SAME validated slot/service with the CORRECTED name and
        // asking the customer to confirm again, rather than silently committing the stale name.
        if (!committing) {
          // Compound-request guard: only ONE pending_booking can be held at a time, so a
          // second preview in the same turn would silently drop the first while the model
          // claims both are booked. Refuse it and make the model book sequentially.
          if (bookPreviewsThisTurn >= 1) {
            return {
              error: "een_per_keer",
              message: "Ik kan maar één afspraak tegelijk inplannen. Bevestig eerst DEZE afspraak met de klant; daarna plan je de volgende. Zeg NIET dat een tweede afspraak al geboekt is voordat die echt bevestigd en geboekt is.",
            };
          }
          bookPreviewsThisTurn += 1;
          const { data: stRow } = await supabase
            .from("service_types").select("name").eq("id", serviceId).maybeSingle();
          const svcName = (stRow as { name?: string } | null)?.name ?? null;
          // R36: stamp + remember it as OUR OWN write (lastSelfWrittenBookAt), so a later call
          // within THIS SAME closure/turn that reads this exact row back can never treat it as a
          // genuine prior-turn proposal (see the committing gate above + ToolContext comment).
          const previewAt = Date.now();
          lastSelfWrittenBookAt = previewAt;
          if (ctx.conversationId) {
            await supabase.from("whatsapp_conversations").update({
              context: {
                ...bookCtx,
                // X3b-2: carry the captured (already format-validated) cross-border fields into the
                // stored proposal so the COMMIT turn persists them onto the booking row WITHOUT the
                // model having to resend them on the "ja" turn (same authoritative-from-server
                // pattern as start_time / customer_name). null for an in_person booking.
                pending_booking: { service_type_id: serviceId, start_time: start, end_time: end, customer_name: customerName, calendar_id: calId, customer_country: bookCountry, customer_vat_id: bookVatId, customer_locale: ctx.customerLocale ?? "nl", at: previewAt },
              },
            }).eq("id", ctx.conversationId);
          }
          return {
            needs_confirmation: true,
            // start_time = the SERVER-resolved canonical ISO instant that was just stored in
            // pending_booking. index.ts re-renders THIS into the customer-facing preview read-back
            // (deterministicPreview), so the date the customer confirms == the slot that will be
            // committed. Without it, the model's prose read-back can echo a divergent weekday for
            // the same slot (ITEM 12: confirmed "donderdag 25 juni", stored "dinsdag 30 juni").
            start_time: start,
            proposal: { service: svcName, when: nlWhen(start), customer_name: customerName === "Privé" ? null : customerName },
            message: "NOG NIET geboekt. Vat dienst + tijd + de naam waaronder je boekt kort samen en vraag of het klopt ('..., klopt dat?'). Pas NA de bevestiging van de klant roep je book_appointment opnieuw aan om echt te boeken.",
          };
        }

        // Pay-and-book reserves the slot as pending until payment; a normal booking
        // is confirmed immediately. A pending booking still occupies the slot
        // (availability + bookings_no_overlap count status IN confirmed,pending).
        const insertRow: Record<string, unknown> = {
          calendar_id: calId,
          service_type_id: serviceId,
          customer_name: customerName,
          customer_phone: ctx.phone,
          start_time: start,
          end_time: end,
          status: paymentRequired ? "pending" : "confirmed",
          // FQ-11: stamp the booking locale so the reminder engine sends in the customer's own
          // language. On COMMIT prefer the locale captured at preview (authoritative, alongside
          // start_time/customer_name); on a fresh single-turn insert fall back to this turn's
          // detected locale. Defaults to 'nl' when unknown (matches the RPC's null->nl norm).
          customer_locale: (committing ? pendingBook?.customer_locale : undefined) ?? ctx.customerLocale ?? "nl",
        };
        // X3b-2: persist the customer billing country + optional EU VAT-ID (X1 columns) onto the
        // booking row, so whatsapp-payment-handler reads them off the row at charge time to drive
        // the Stripe Tax cross-border / OSS / reverse-charge calc (X3b-1). Only set when present:
        // an in_person booking leaves both null and is byte-identical to before this change. The
        // values are format-validated (normalizeCountry/normalizeVatId) and come from the stored
        // proposal on commit, so the model cannot inject an unvalidated value here.
        if (bookCountry) insertRow.customer_country = bookCountry;
        if (bookVatId) insertRow.customer_vat_id = bookVatId;
        if (paymentRequired) {
          // Mirror the web create-booking flow: a pending pay-and-book reservation
          // must carry payment_required + payment_timing so cancel_overdue_unpaid_bookings()
          // (which filters payment_required = true) reclaims the slot if the customer
          // never pays. Without this the pending row would hold the slot forever.
          insertRow.payment_status = "pending";
          insertRow.payment_required = true;
          insertRow.payment_timing = "pay_now";
        }

        const { data: booking, error: insErr } = await supabase
          .from("bookings")
          .insert(insertRow)
          .select("id, start_time")
          .single();
        if (insErr) {
          if (insErr.code === "23P01" || /no_overlap|exclusion/i.test(insErr.message || "")) {
            return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          }
          return { error: insErr.message };
        }

        if (!paymentRequired) {
          await clearPendingBook();
          const whenNL = nlWhen(booking.start_time);
          bookedThisTurn = { when: whenNL };
          return { ok: true, booking_id: booking.id, start_time: booking.start_time, when: whenNL };
        }

        // Pay-and-book: mint a hosted Stripe payment link tied to THIS booking via
        // the existing whatsapp-payment-handler (internal, shared-secret). bookingId
        // flows into the Checkout metadata so the stripe-webhook confirms exactly
        // this booking on payment. Mode follows the server's STRIPE_MODE (test until
        // the live-flip), never a client value.
        if (!ctx.conversationId) {
          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
          return {
            error: "payment_setup_failed",
            message: "Ik kon de betaling nu niet opzetten. Probeer het zo nog eens.",
          };
        }
        const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
        const testMode = Deno.env.get("STRIPE_MODE") !== "live";
        const { data: pay, error: payErr } = await supabase.functions.invoke("whatsapp-payment-handler", {
          body: {
            conversationId: ctx.conversationId,
            serviceTypeId: serviceId,
            bookingId: booking.id,
            testMode,
            paymentTiming: "pay_now",
            paymentMethod: "ideal",
          },
          headers: secret ? { "x-internal-secret": secret } : undefined,
        });
        const payUrl = (pay as { payment_url?: string } | null)?.payment_url ?? null;
        if (payErr || !payUrl) {
          // No link → don't leave a stuck pending booking holding the slot.
          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
          return {
            error: "payment_setup_failed",
            message: "Het lukte niet een betaallink te maken. Probeer het later opnieuw of neem contact op.",
          };
        }
        await clearPendingBook();
        const whenPayNL = nlWhen(booking.start_time);
        bookedThisTurn = { when: whenPayNL, payment_url: payUrl };
        return {
          ok: true,
          booking_id: booking.id,
          start_time: booking.start_time,
          when: whenPayNL,
          payment_required: true,
          payment_url: payUrl,
        };
      }

      case "cancel_appointment": {
        // Two-phase confirm (council A8 verdict): cancelling is destructive, so the tool NEVER
        // mutates without an explicit confirmation. Determinism lives here, not in the prompt:
        // a temp-0.2 model cannot be the transaction boundary (cf. the name-gate + announce net).
        const confirmed = args.confirmed === true;
        let cancelCtx: Record<string, unknown> = {};
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          cancelCtx = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
        }
        const pending = cancelCtx.pending_cancel as { booking_id?: string; start_time?: string; at?: number } | undefined;
        const clearPending = async () => {
          if (!ctx.conversationId) return;
          const { pending_cancel: _drop, ...rest } = cancelCtx;
          await supabase.from("whatsapp_conversations").update({ context: rest }).eq("id", ctx.conversationId);
        };

        // COMMIT phase: only when a preview was taken in a PREVIOUS turn AND the customer confirmed.
        // Confirmation is detected server-side (ctx.confirmCancel) OR via the model's confirmed flag.
        // We re-resolve the previewed appointment fresh so a since-changed/cancelled booking is caught
        // (the Contrarian's race window: re-validate at execution, not at confirmation).
        // R24 (AFFIRM-CONFIRM-FALSEPOS, second commit path, cancel mirror): same reasoning as
        // book_appointment above, applied to ctx.ambiguousConfirm here too, so neither the server
        // force nor the model's own confirmed flag can commit a cancel on an ambiguous message.
        // R26 (structural rebuild, cancel mirror of the book_appointment gate above): require the
        // model's own explicit only_confirming_previous attestation too, same reasoning, same
        // fail-closed semantics (missing/false/anything but true blocks the commit).
        const cleanlyConfirmedCancel = args.only_confirming_previous === true;
        // R32: same third structural AND-condition as the book commit gate above (ctx.hardConfirm
        // === true), see ToolContext comment + evidence/IUX_r32.md section 2. A cancel can only
        // commit when the raw message is ALSO a member of the finite clean-confirm allow-list.
        // R36 (PHANTOM-BOOKING-SELFCHAIN, sev-2, PURE ADDITIVE fourth condition, mirrors the book
        // gate above, see ToolContext comment + evidence/IUX_r36.md): same narrow discriminator as
        // the book gate. ctx.confirmCancel is computed in index.ts from a pending_cancel that
        // ALREADY EXISTED before this turn started (server-verified prior-turn proposal); when
        // true, any same-turn oscillation (the proven cancelCommitMissed recovery retry) stays
        // fully allowed. Only when NO prior-turn pending_cancel existed at all (ctx.confirmCancel
        // false) and the commit is driven purely by the model's own self-issued confirmed:true is
        // the pending required to predate anything THIS closure itself wrote this turn.
        const noPriorTurnCancelProposal = ctx.confirmCancel !== true;
        const cancelPreviewIsSelfWritten = noPriorTurnCancelProposal &&
          typeof pending?.at === "number" && pending.at === lastSelfWrittenCancelAt;
        if ((confirmed || ctx.confirmCancel === true) && !ctx.ambiguousConfirm && cleanlyConfirmedCancel && ctx.hardConfirm === true && pending?.start_time && !cancelPreviewIsSelfWritten) {
          const target = await resolveTarget(supabase, ctx, pending.start_time);
          if (target.none || target.ambiguous) {
            await clearPending();
            return {
              error: "geen_boeking",
              // message = customer-facing text the model may render; guidance = internal-only
              // instruction (ITEM 3: keep directives OUT of customer-text strings).
              message: "Die afspraak kan ik niet meer vinden om te annuleren, mogelijk is hij al weg.",
              guidance: "Vraag vriendelijk of er nog iets is waarmee je kunt helpen.",
            };
          }
          const b = target.booking!;
          // A2: enforce the policy of the calendar the booking actually lives in (it may be a
          // non-entry calendar of the same owner), not the entry calendar.
          const policy = await getCalendarPolicy(supabase, b.calendar_id);
          if (!policy.allowCancellations) {
            await clearPending();
            return {
              error: "annuleren_niet_toegestaan",
              message: "Annuleren kan bij dit bedrijf helaas niet via mij.",
              guidance: "Verwijs vriendelijk naar rechtstreeks contact met het bedrijf (noem het telefoonnummer of e-mail uit <business_data> als dat er is). Zeg niet 'neem contact op via WhatsApp' (de klant zit hier al op WhatsApp) en verzin geen contactgegevens.",
            };
          }
          if (policy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < policy.cancellationDeadlineHours) {
            await clearPending();
            return {
              error: "te_laat_annuleren",
              message: `Annuleren kan tot ${formatHoursNL(policy.cancellationDeadlineHours)} van tevoren; voor deze afspraak is dat niet meer mogelijk via mij.`,
              guidance: "Verwijs vriendelijk naar rechtstreeks contact met het bedrijf (noem het telefoonnummer of e-mail uit <business_data> als dat er is, anders het annuleringsbeleid). Zeg niet 'neem contact op via WhatsApp' (de klant zit hier al op WhatsApp) en verzin geen contactgegevens.",
            };
          }
          // Set the audit fields too (mirrors cancel_booking_for_agent) so cancellation
          // reporting isn't blank — the policy was already enforced just above.
          const { error } = await supabase.from("bookings").update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancellation_reason: "Geannuleerd via WhatsApp",
            updated_at: new Date().toISOString(),
          }).eq("id", b.id);
          if (error) return { error: error.message };
          await clearPending();
          return { ok: true, cancelled: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time } };
        }

        // PREVIEW phase (default; also where a stray confirmed:true WITHOUT a preview lands, so an
        // accidental immediate cancel is impossible). Resolve + policy-check, record the pending
        // marker, return the appointment to read back. NOTHING is cancelled here.
        // Server-side disambiguation fallback: if the model passed no hint but the customer
        // named a clock time ("annuleer die van 14:00"), use it so a multi-booking cancel
        // resolves instead of looping on "welke?".
        const cancelMatchTime = args.match_time
          ? String(args.match_time)
          : (!args.match_start_time ? extractClockTimes(ctx.userMessage)[0] : undefined);
        const target = await resolveTarget(supabase, ctx, args.match_start_time ? String(args.match_start_time) : undefined, cancelMatchTime);
        if (target.none) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te annuleren." };
        }
        if (target.ambiguous) {
          return {
            error: "meerdere_afspraken",
            message: "Je hebt meerdere aankomende afspraken staan.",
            guidance: "Vraag kort welke van deze afspraken de klant wil annuleren.",
            appointments: target.ambiguous.map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time })),
          };
        }
        const b = target.booking!;

        // Honour the "Allow cancellations" + "Cancellation deadline" Operations settings before
        // offering to cancel (so we never ask to confirm something that can't be cancelled).
        const cancelPolicy = await getCalendarPolicy(supabase, b.calendar_id);
        if (!cancelPolicy.allowCancellations) {
          return {
            error: "annuleren_niet_toegestaan",
            message: "Annuleren kan bij dit bedrijf helaas niet via mij.",
            guidance: "Verwijs vriendelijk naar het annuleringsbeleid of naar rechtstreeks contact met het bedrijf (telefoon of e-mail uit <business_data> indien aanwezig); verzin geen contactgegevens.",
          };
        }
        if (cancelPolicy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < cancelPolicy.cancellationDeadlineHours) {
          return {
            error: "te_laat_annuleren",
            message: `Annuleren kan tot ${formatHoursNL(cancelPolicy.cancellationDeadlineHours)} van tevoren; voor deze afspraak is dat niet meer mogelijk.`,
            guidance: "Verwijs vriendelijk naar het annuleringsbeleid of naar rechtstreeks contact met het bedrijf; bied eventueel aan een andere tijd te zoeken.",
          };
        }

        // R36: same self-write tracking as the book preview above (lastSelfWrittenCancelAt).
        const cancelPreviewAt = Date.now();
        lastSelfWrittenCancelAt = cancelPreviewAt;
        if (ctx.conversationId) {
          await supabase
            .from("whatsapp_conversations")
            .update({ context: { ...cancelCtx, pending_cancel: { booking_id: b.id, start_time: b.start_time, at: cancelPreviewAt } } })
            .eq("id", ctx.conversationId);
        }
        return {
          needs_confirmation: true,
          appointment: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time },
          // T3-A1: the free-cancellation sentence for THIS booking's OWN calendar (b.calendar_id),
          // not the generic <business_data> annuleringsbeleid (which reflects only the ENTRY
          // calendar and can differ in a multi-calendar business). Use this field, never
          // <business_data>, whenever this specific booking's cancellation terms come up.
          cancellation_policy_this_booking: formatCancellationPolicyNL(cancelPolicy),
          // guidance = internal-only (the model composes the customer-facing read-back itself).
          guidance: "NIET geannuleerd. Lees dienst + tijd terug en vraag of je de afspraak echt zult annuleren; bied ook aan om in plaats daarvan een andere tijd te zoeken. Pas NA de bevestiging van de klant: roep cancel_appointment opnieuw aan met confirmed:true. Noemt de klant hierbij de annuleringstermijn of het beleid? Citeer dan cancellation_policy_this_booking hierboven (het beleid van de eigen agenda van DEZE afspraak), nooit het algemene annuleringsbeleid uit <business_data> (dat kan bij meerdere agenda's een ANDERE termijn zijn).",
        };
      }

      case "reschedule_appointment": {
        // Server-side disambiguation fallback: when the model passes no hint, infer WHICH
        // booking from the customer's message. The message may name TWO times ("verzet die
        // van 14:00 naar 15:00"); the NEW time is args.time, so the OTHER named time is the
        // existing booking to move. Resolves a multi-booking reschedule without looping.
        const newTimeNorm = (() => {
          const m = String(args.time ?? "").trim().match(/^(\d{1,2})[:.](\d{2})/);
          return m ? `${m[1].padStart(2, "0")}:${m[2]}` : null;
        })();
        const reschedMatchTime = args.match_time
          ? String(args.match_time)
          : (!args.match_start_time
            ? extractClockTimes(ctx.userMessage).find((t) => t !== newTimeNorm)
            : undefined);
        const target = await resolveTarget(supabase, ctx, args.match_start_time ? String(args.match_start_time) : undefined, reschedMatchTime);
        if (target.none) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te verzetten." };
        }
        if (target.ambiguous) {
          return {
            error: "meerdere_afspraken",
            message: "Je hebt meerdere aankomende afspraken. Vraag welke de klant wil verzetten.",
            appointments: target.ambiguous.map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time })),
          };
        }
        const b = target.booking!;

        // R48: resolve which calendar this reschedule targets. Default = the booking's OWN
        // current calendar (unchanged behaviour). Only in multi-calendar mode, and only when the
        // model gave a resolvable hint (a service_type_id that maps to a DIFFERENT calendar, or an
        // explicit calendar_index), do we switch. resolveBookingCalendar is the SAME allowlist-
        // routing function book_appointment/get_available_slots already use, so the model can
        // never target a calendar outside ctx.calendars (no new trust boundary). A service_type_id
        // that resolves to the booking's own current calendar (the common "same agenda" case) is a
        // no-op switch, matching prior behaviour exactly.
        let targetCalId = b.calendar_id;
        if (ctx.calendars.length > 1 && (args.service_type_id || args.calendar_index != null)) {
          const calRes = resolveBookingCalendar(ctx, args.calendar_index, args.service_type_id);
          if ("needAsk" in calRes) {
            return {
              error: "meerdere_agendas",
              message: "Bij welke medewerker/locatie wil de klant de afspraak?",
              options: calRes.options,
            };
          }
          targetCalId = calRes.id;
        }

        // R48: the SERVICE must belong to targetCalId, never left over from the booking's OLD
        // calendar (a service id is only valid within its own calendar's slot/duration lookup;
        // mixing an old-calendar service id with a new-calendar id produces a meaningless
        // get_available_slots call, silently reading as "no free times all day"). If the model
        // gave an explicit service_type_id, trust it as-is (it already drove targetCalId above).
        // If only calendar_index switched the calendar WITHOUT naming a new service, find the
        // service on the target calendar with the SAME NAME as the booking's current service
        // (the common "same treatment, different staff" case); if none matches by name, refuse
        // to guess and ask which service, exactly like resolveBookingCalendar's own needAsk path.
        let serviceId = args.service_type_id ? String(args.service_type_id) : b.service_type_id;
        if (targetCalId !== b.calendar_id && !args.service_type_id) {
          const { data: oldSvc } = await supabase.from("service_types").select("name").eq("id", b.service_type_id).maybeSingle();
          const oldName = (oldSvc as { name?: string } | null)?.name?.trim().toLowerCase();
          const { data: newCalSvcs } = await supabase
            .from("service_types").select("id, name").eq("calendar_id", targetCalId).eq("is_active", true)
            .or("is_deleted.is.null,is_deleted.eq.false");
          const match = oldName
            ? ((newCalSvcs as Array<{ id: string; name: string }> | null) ?? []).find((s) => s.name.trim().toLowerCase() === oldName)
            : null;
          if (!match) {
            return {
              error: "dienst_onbekend",
              message: "Welke dienst wil de klant bij die andere medewerker/locatie?",
              options: ((newCalSvcs as Array<{ id: string; name: string }> | null) ?? []).map((s) => s.name),
            };
          }
          serviceId = match.id;
        }

        // Resolve the new time. FAST PATH: the customer named a date+time, so resolve the EXACT slot
        // server-side (no separate get_available_slots LLM round-trip). Else fall back to an ISO
        // start_time. If the named time isn't free, return the free times so the model offers one now.
        let newStart = String(args.start_time ?? "");
        let newEnd = String(args.end_time ?? "");
        // Policy fetched ONCE here (reused for the cancel-deadline check below) so the date
        // guards short-circuit before any slot resolution. Uses targetCalId (the NEW calendar when
        // switching, else unchanged) so a reschedule-with-calendar-switch enforces the destination
        // agenda's own booking window / notice / deadline, not the origin agenda's.
        const reschedPolicy = await getCalendarPolicy(supabase, targetCalId);
        if (isPastDateNL(args.date)) {
          return { error: "datum_verleden", message: "Die nieuwe datum is al geweest. Vraag de klant vriendelijk een datum in de toekomst." };
        }
        if (isBeyondWindowNL(args.date, reschedPolicy.bookingWindowDays)) {
          return { error: "datum_te_ver", message: `Zo ver vooruit kun je nog niet verzetten, je kunt tot ${reschedPolicy.bookingWindowDays} dagen vooruit een afspraak zetten. Vraag de klant vriendelijk een eerdere datum.` };
        }
        if ((!newStart || !/^\d{4}-\d{2}-\d{2}T/.test(newStart)) && args.date && args.time) {
          const dur = await serviceDuration(supabase, serviceId);
          const r = await resolveSlotForTime(supabase, targetCalId, serviceId, String(args.date), String(args.time), dur, reschedPolicy.minimumNoticeHours);
          if ("error" in r) {
            return { error: "ongeldige_tijd", message: "Ik kon die datum/tijd niet verwerken. Vraag kort de gewenste dag en tijd." };
          }
          if ("tooSoon" in r) {
            const notice = formatHoursNL(reschedPolicy.minimumNoticeHours!);
            return {
              error: "te_vroeg",
              available_slots: r.available,
              message:
                `Dat nieuwe tijdstip is te kort dag: verzetten kan alleen naar een moment vanaf ${notice} van tevoren. ` +
                (r.earliestNL ? `Het eerste moment dat kan is ${r.earliestNL}. ` : "") +
                (r.available.length ? `Bied een van deze vrije tijden aan: ${r.available.join(", ")}.` : "Vraag vriendelijk om een latere dag/tijd."),
            };
          }
          if ("unavailable" in r) {
            return {
              error: "niet_beschikbaar",
              available_slots: r.available,
              message: r.available.length
                ? `Dat nieuwe tijdstip is niet vrij. Stel een van deze vrije tijden voor: ${r.available.join(", ")}.`
                : "Die dag heeft geen vrije tijden. Stel vriendelijk een andere dag voor.",
            };
          }
          newStart = r.start; newEnd = r.end;
        }
        // Safety (legacy start_time path): derive end from the service duration if a valid ISO start
        // was given without an end, so a reschedule is never refused for a missing end the model
        // simply didn't pass (end_time is no longer required).
        if (newStart && /^\d{4}-\d{2}-\d{2}T/.test(newStart) && !newEnd) {
          const dur = await serviceDuration(supabase, serviceId);
          newEnd = new Date(new Date(newStart).getTime() + dur * 60000).toISOString();
        }
        if (!newStart || !newEnd) {
          return { error: "ontbrekende_tijd", message: "Geef de nieuwe dag en tijd om naar te verzetten." };
        }

        // Honour the "Cancellation deadline" Operations setting for reschedules too
        // (a reschedule frees the original slot, so the same lead-time rule applies).
        // reschedPolicy was fetched once above.
        if (reschedPolicy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < reschedPolicy.cancellationDeadlineHours) {
          return {
            error: "te_laat_verzetten",
            message: `Verzetten kan tot ${reschedPolicy.cancellationDeadlineHours} uur van tevoren. Voor deze afspraak is dat niet meer mogelijk.`,
          };
        }

        // Atomic reschedule (free-slot -> validate -> move) in ONE transaction via
        // reschedule_booking_atomic. Previously these were 3 separate edge-fn calls
        // with restore-on-failure only in the JS error branches: a crash/timeout
        // between freeing the slot and moving it left the booking cancelled with no
        // replacement and no trace. The RPC rolls back EVERYTHING on any failure, so
        // the booking always keeps its original time + status if it cannot move.
        // R48: p_calendar_id = targetCalId always (equal to b.calendar_id when not
        // switching, so this is a no-op on the RPC's own COALESCE for every existing
        // single-calendar / same-calendar caller).
        const { data: rr, error: rrErr } = await supabase.rpc("reschedule_booking_atomic", {
          p_booking_id: b.id,
          p_new_start: newStart,
          p_new_end: newEnd,
          p_service_type_id: args.service_type_id ? serviceId : null,
          p_calendar_id: targetCalId,
        });
        if (rrErr) return { error: rrErr.message };
        const rres = rr as { ok?: boolean; error?: string } | null;
        if (!rres?.ok) {
          if (rres?.error === "slot_taken") return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          if (rres?.error === "in_verleden") return { error: "in_verleden", message: "Je kunt een afspraak niet naar het verleden verzetten." };
          if (rres?.error === "niet_beschikbaar") return { error: "niet_beschikbaar", message: "Dat nieuwe tijdstip is niet beschikbaar." };
          if (rres?.error === "geen_boeking") return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te verzetten." };
          return { error: rres?.error || "verzetten_mislukt", message: "Het verzetten lukte niet. Probeer een ander tijdstip." };
        }
        const switchedCalendar = targetCalId !== b.calendar_id
          ? ctx.calendars.find((c) => c.id === targetCalId)?.name ?? null
          : null;
        return {
          ok: true,
          rescheduled: { from: nlWhen(b.start_time), to: nlWhen(newStart), to_start_time: newStart },
          ...(switchedCalendar ? { new_agenda: switchedCalendar } : {}),
        };
      }

      case "update_booking_name": {
        // R40 (T3, new capability): correct the customer_name on an EXISTING, already-confirmed
        // booking, without cancel+rebook. Two-phase preview/commit, mirroring cancel_appointment's
        // shape exactly, including the SAME commit-safety stack proven across R22-R36 for book/
        // cancel: only_confirming_previous===true (model attestation) AND !ctx.ambiguousConfirm
        // (regex ambiguity layer) AND ctx.hardConfirm===true (finite closed-list structural gate),
        // plus its own self-write-chain guard (lastSelfWrittenRenameAt) mirroring R36's
        // PHANTOM-BOOKING-SELFCHAIN fix so a same-turn preview-then-self-confirm chain can never
        // commit off its own just-written stamp. Deliberately reuses ctx.ambiguousConfirm/
        // ctx.hardConfirm as-is (both are computed unconditionally every turn in index.ts,
        // independent of book/cancel) rather than adding a new server-side confirmRename regex
        // detector: the model's own args.confirmed+only_confirming_previous is the ONLY commit
        // driver here (no ctx.confirmRename "server force" arm exists, unlike confirmBook/
        // confirmCancel), so there is only ONE arm to gate, already covered by the three
        // conditions above; adding a second server-detection arm would only be needed if a
        // "server force" path existed, which this tool intentionally does not have (smaller
        // surface, same safety bar).
        const isRealName = (n: unknown) => {
          const t = String(n ?? "").trim().toLowerCase();
          return t !== "" && t !== "privé" && t !== "prive";
        };
        let renameCtx: Record<string, unknown> = {};
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          renameCtx = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
        }
        const pendingRename = renameCtx.pending_rename as
          { booking_id?: string; start_time?: string; old_name?: string; new_name?: string; at?: number } | undefined;
        const clearPendingRename = async () => {
          if (!ctx.conversationId) return;
          const { pending_rename: _drop, ...rest } = renameCtx;
          await supabase.from("whatsapp_conversations").update({ context: rest }).eq("id", ctx.conversationId);
        };

        const cleanlyConfirmedRename = args.only_confirming_previous === true;
        const renamePreviewIsSelfWritten =
          typeof pendingRename?.at === "number" && pendingRename.at === lastSelfWrittenRenameAt;
        // R40 (renameCommitMissed follow-up): ctx.confirmRename (server-detected, mirrors
        // confirmBook/confirmCancel) is ORed in as a SECOND trigger for the commit attempt,
        // exactly like book_appointment/cancel_appointment's own `args.confirmed === true ||
        // ctx.confirmX === true` pattern. It is NOT a bypass: every other AND-condition below
        // (ambiguousConfirm, hardConfirm, the self-write-chain guard) still applies identically
        // regardless of which arm triggered the attempt, same safety bar as the OTHER two arms.
        if (
          (args.confirmed === true || ctx.confirmRename === true) && !ctx.ambiguousConfirm && cleanlyConfirmedRename && ctx.hardConfirm === true &&
          pendingRename?.booking_id && isRealName(pendingRename?.new_name) && !renamePreviewIsSelfWritten
        ) {
          // Re-validate at execution (race window: the booking may since have been cancelled or
          // moved by a concurrent turn), same "re-resolve fresh, never trust the stale preview
          // alone" pattern as cancel_appointment's commit phase.
          const { data: fresh } = await supabase
            .from("bookings")
            .select("id, status, start_time, customer_phone")
            .eq("id", pendingRename.booking_id)
            .maybeSingle();
          const freshBooking = fresh as { id: string; status: string; start_time: string; customer_phone: string } | null;
          if (!freshBooking || freshBooking.customer_phone !== ctx.phone || !["confirmed", "pending"].includes(freshBooking.status) || new Date(freshBooking.start_time) <= new Date()) {
            await clearPendingRename();
            return {
              error: "geen_boeking",
              message: "Die afspraak kan ik niet meer vinden om de naam te wijzigen, mogelijk is hij al weg of verzet.",
              guidance: "Vraag vriendelijk of er nog iets is waarmee je kunt helpen.",
            };
          }
          const { error } = await supabase.from("bookings").update({
            customer_name: String(pendingRename.new_name),
            updated_at: new Date().toISOString(),
          }).eq("id", freshBooking.id);
          if (error) return { error: error.message };
          await clearPendingRename();
          return { ok: true, renamed: { when: nlWhen(freshBooking.start_time), old_name: pendingRename.old_name ?? null, new_name: pendingRename.new_name } };
        }

        // R40 (renameCommitMissed follow-up, live-repro'd this round): when the customer's raw
        // message DETERMINISTICALLY affirms a fresh prior-turn pending_rename (ctx.confirmRename,
        // same server-side signal as confirmBook/confirmCancel, computed BEFORE this turn's model
        // call ever ran) AND the model calls again with the SAME new_name it already previewed
        // (a re-preview instead of a clean confirm, the exact failure mode measured live: the
        // small model sometimes re-sends {new_name:"Lisa"} on a "ja klopt" turn instead of
        // {confirmed:true, only_confirming_previous:true}), treat this as the commit the customer
        // actually asked for rather than silently re-arming an identical preview and stalling
        // forever (the self-write-chain guard above correctly refuses to let a SAME-turn retry
        // confirm a preview the primary call itself just rewrote, so without this the turn can
        // only loop). Deliberately narrow and safe-by-construction: only fires when (a) a fresh
        // pending_rename already exists from a GENUINELY PRIOR turn (not self-written this turn,
        // enforced by !renamePreviewIsSelfWritten below reusing the exact same discriminator as
        // the commit branch above), (b) the new_name is UNCHANGED from what was already proposed
        // (a real correction, e.g. a different name, still falls through to a normal re-preview,
        // never silently substituted), and (c) ctx.ambiguousConfirm/ctx.hardConfirm still gate it
        // identically to every other commit path (same three-layer AND as the primary branch).
        const sameNamePreviewIsSelfWritten =
          typeof pendingRename?.at === "number" && pendingRename.at === lastSelfWrittenRenameAt;
        if (
          ctx.confirmRename === true && !ctx.ambiguousConfirm && ctx.hardConfirm === true &&
          pendingRename?.booking_id && isRealName(pendingRename?.new_name) && !sameNamePreviewIsSelfWritten &&
          isRealName(args.new_name) && String(args.new_name).trim().toLowerCase() === String(pendingRename.new_name).trim().toLowerCase()
        ) {
          const { data: fresh } = await supabase
            .from("bookings")
            .select("id, status, start_time, customer_phone")
            .eq("id", pendingRename.booking_id)
            .maybeSingle();
          const freshBooking = fresh as { id: string; status: string; start_time: string; customer_phone: string } | null;
          if (!freshBooking || freshBooking.customer_phone !== ctx.phone || !["confirmed", "pending"].includes(freshBooking.status) || new Date(freshBooking.start_time) <= new Date()) {
            await clearPendingRename();
            return {
              error: "geen_boeking",
              message: "Die afspraak kan ik niet meer vinden om de naam te wijzigen, mogelijk is hij al weg of verzet.",
              guidance: "Vraag vriendelijk of er nog iets is waarmee je kunt helpen.",
            };
          }
          const { error } = await supabase.from("bookings").update({
            customer_name: String(pendingRename.new_name),
            updated_at: new Date().toISOString(),
          }).eq("id", freshBooking.id);
          if (error) return { error: error.message };
          await clearPendingRename();
          return { ok: true, renamed: { when: nlWhen(freshBooking.start_time), old_name: pendingRename.old_name ?? null, new_name: pendingRename.new_name } };
        }

        // PREVIEW phase (default; also where a stray confirmed:true WITHOUT a preview lands).
        const newNameRaw = String(args.new_name ?? "").trim();
        if (!isRealName(newNameRaw)) {
          return { error: "naam_ontbreekt", message: "Welke naam moet er op de afspraak komen te staan?" };
        }
        const renameMatchTime = args.match_time
          ? String(args.match_time)
          : (!args.match_start_time ? extractClockTimes(ctx.userMessage ?? "")[0] : undefined);
        const target = await resolveTarget(supabase, ctx, args.match_start_time ? String(args.match_start_time) : undefined, renameMatchTime);
        if (target.none) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om de naam op te wijzigen." };
        }
        if (target.ambiguous) {
          return {
            error: "meerdere_afspraken",
            message: "Je hebt meerdere aankomende afspraken staan.",
            guidance: "Vraag kort welke van deze afspraken de klant de naam op wil wijzigen.",
            appointments: target.ambiguous.map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time })),
          };
        }
        const b = target.booking!;
        const { data: currentRow } = await supabase.from("bookings").select("customer_name").eq("id", b.id).maybeSingle();
        const currentName = (currentRow as { customer_name?: string } | null)?.customer_name ?? null;
        if (currentName && currentName.trim().toLowerCase() === newNameRaw.toLowerCase()) {
          // No-op: already that name. Friendly short-circuit, no DB write, no pending marker.
          return { ok: true, no_change: true, message: `De afspraak staat al onder de naam ${currentName}.` };
        }
        const renamePreviewAt = Date.now();
        lastSelfWrittenRenameAt = renamePreviewAt;
        if (ctx.conversationId) {
          await supabase
            .from("whatsapp_conversations")
            .update({ context: { ...renameCtx, pending_rename: { booking_id: b.id, start_time: b.start_time, old_name: currentName, new_name: newNameRaw, at: renamePreviewAt } } })
            .eq("id", ctx.conversationId);
        }
        return {
          needs_confirmation: true,
          appointment: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time) },
          current_name: currentName,
          proposed_name: newNameRaw,
          guidance: "NIETS gewijzigd. Lees de afspraak (dienst + tijd) + de huidige naam + de nieuwe naam terug en vraag of het klopt. Pas NA de bevestiging van de klant: roep update_booking_name opnieuw aan met confirmed:true + only_confirming_previous.",
        };
      }

      default:
        return { error: `onbekende tool ${name}` };
    }
  };

  return { decls, execute };
}
