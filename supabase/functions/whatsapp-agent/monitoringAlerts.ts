// MONITORING/ALERTS ITEM 3 (see launch-ready-loop/MONITORING_ALERTS_DESIGN.md, Item 1's approved
// design, and launch-ready-loop/GOAL_PROMPT_BA_MONITORING_ALERTS.md's backlog).
//
// Detection-only for two proven silent-failure classes from the closed testing loop:
//   1. date_mismatch (R127 class): the final reply TEXT names a different date than the one a
//      committing book_appointment/reschedule_appointment call actually wrote to `bookings`.
//   2. thread_hijack (R130 class): a reply is built against a different identity/booking than the
//      one that owns the current conversation's phone number.
//
// STRICTLY ADDITIVE / READ-ONLY. Every exported detector here is a pure function (or a single
// read-only select for Check B) that only ever produces a candidate alert row. index.ts is
// responsible for wrapping every call site in try/catch and firing the INSERT fire-and-forget,
// AFTER the real reply text/tool results already exist. Nothing in this file may throw in a way
// that reaches the caller uncaught, alter any argument, or touch the customer-facing reply.
//
// DEVIATION FROM THE DESIGN DOC (documented, not silently patched): section 2's Check B pseudocode
// assumed a `bookings.contact_id` column. The live schema (checked via the Supabase Management API
// `/database/query` endpoint during this round) has no such column - `bookings` is scoped by
// `customer_phone` only, matching identityDisambiguationGuard.ts's own header note ("phone number
// is the SOLE identity key end-to-end, no attendee-name field anywhere in the schema"). Check B
// below therefore compares `bookings.customer_phone` against the CURRENT conversation's own phone
// (the same value already used everywhere else in this codebase as the identity key), which is the
// mechanically correct equivalent of the design's intent on the schema that actually exists.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { isRealName } from "./identityDisambiguationGuard.ts";

// ---------------------------------------------------------------------------
// Shared small types
// ---------------------------------------------------------------------------

export interface MonitoringToolCall {
  name: string;
  result: unknown;
}

// ---------------------------------------------------------------------------
// Class 1: date mismatch
// ---------------------------------------------------------------------------

const MUTATION_DATE_TOOLS = new Set(["book_appointment", "reschedule_appointment"]);

export interface CommittedBookingDate {
  bookingId: string;
  iso: string; // YYYY-MM-DD, Europe/Amsterdam
}

function dateOnlyAmsterdam(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

// Mirrors tools.ts's own result shapes exactly (see book_appointment's `start_time` and
// reschedule_appointment's `rescheduled.to_start_time`, both confirmed against tools.ts). Reads
// ONLY already-returned tool result fields, no re-computation. Exported so index.ts can also use
// it for the pg_cron sweep's hint-persistence write (see section 3 of the design), independent of
// whether detectDateMismatch itself found a mismatch this turn.
export function findCommittedBookingDate(toolCalls: MonitoringToolCall[]): CommittedBookingDate | null {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (!MUTATION_DATE_TOOLS.has(t.name)) continue;
    const r = t.result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.ok !== true || typeof rec.booking_id !== "string") continue;
    let startTime: unknown = rec.start_time; // book_appointment
    if (typeof startTime !== "string" && rec.rescheduled && typeof rec.rescheduled === "object") {
      startTime = (rec.rescheduled as Record<string, unknown>).to_start_time; // reschedule_appointment
    }
    if (typeof startTime !== "string") continue;
    const d = new Date(startTime);
    if (Number.isNaN(d.getTime())) continue;
    return { bookingId: rec.booking_id, iso: dateOnlyAmsterdam(d) };
  }
  return null;
}

// Deterministic, mechanical regex date extraction from the OUTBOUND reply text. Deliberately
// duplicated rather than importing relativeDateHint.ts's internal (non-exported) primitives -
// this codebase's own established convention (see identityDisambiguationGuard.ts's isRealName
// header: "kept independent/duplicated on purpose, matching every other guard module's
// independence, no cross-file coupling"). No AI judgment: same NL day/month/weekday literals,
// same "nearest forward occurrence" rule as relativeDateHint.ts uses for the inbound message.
const NL_MONTH_NAMES =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december";
const NL_MONTHS: Record<string, number> = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
};
const EXPLICIT_DATE_RE = new RegExp(`\\b(\\d{1,2})\\s+(${NL_MONTH_NAMES})(?:\\s+(\\d{4}))?\\b`, "i");
const NL_WEEKDAYS: Record<string, number> = {
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
};
const NL_WEEKDAY_RE = new RegExp(`\\b(${Object.keys(NL_WEEKDAYS).join("|")})\\b`, "i");

function inferYear(now: Date, month: number, day: number): number {
  const y = now.getFullYear();
  const candidate = new Date(y, month, day, 12);
  const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  // A date that already lies more than a day in the past this year is almost certainly next year's
  // occurrence (mirrors relativeDateHint.ts's own forward-only convention for bare mentions).
  if (candidate.getTime() < todayNoon.getTime() - 24 * 3600 * 1000) return y + 1;
  return y;
}

export function extractDateFromReplyText(text: string | null | undefined, now: Date): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\bvandaag\b/.test(t)) return dateOnlyAmsterdam(now);
  if (/\bmorgen\b/.test(t) && !/\bovermorgen\b/.test(t)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return dateOnlyAmsterdam(d);
  }
  const explicit = t.match(EXPLICIT_DATE_RE);
  if (explicit) {
    const day = parseInt(explicit[1], 10);
    const month = NL_MONTHS[explicit[2]];
    if (month !== undefined && day >= 1 && day <= 31) {
      const year = explicit[3] ? parseInt(explicit[3], 10) : inferYear(now, month, day);
      return dateOnlyAmsterdam(new Date(year, month, day, 12));
    }
  }
  const wm = t.match(NL_WEEKDAY_RE);
  if (wm) {
    const targetDow = NL_WEEKDAYS[wm[1].toLowerCase()];
    const d = new Date(now);
    const curDow = d.getDay();
    let delta = (targetDow - curDow + 7) % 7;
    if (delta === 0) delta = 7; // a weekday NAMED in a reply always reads as the next occurrence
    d.setDate(d.getDate() + delta);
    return dateOnlyAmsterdam(d);
  }
  return null;
}

export interface DateMismatchTurnCtx {
  toolCalls: MonitoringToolCall[];
  finalReplyText: string;
  relativeDateHintISO: string | null;
  matchedPhrase: string | null;
  now: Date;
}

export interface DateMismatchAlert {
  failure_class: "date_mismatch";
  established_iso: string | null;
  committed_iso: string;
  reply_iso: string;
  matched_phrase: string | null;
  booking_id: string;
}

// Section 1 of the design, mechanical: compare the deterministic hint (if any fired this turn),
// the tool result's own committed date, and a regex re-scan of the OUTBOUND reply. No LLM call.
export function detectDateMismatch(ctx: DateMismatchTurnCtx): DateMismatchAlert | null {
  const committed = findCommittedBookingDate(ctx.toolCalls);
  if (!committed) return null; // nothing actually booked/changed this turn
  const replyISO = extractDateFromReplyText(ctx.finalReplyText, ctx.now);
  if (!replyISO) return null; // reply names no date at all, nothing to compare
  if (replyISO === committed.iso) return null;
  return {
    failure_class: "date_mismatch",
    established_iso: ctx.relativeDateHintISO ?? committed.iso,
    committed_iso: committed.iso,
    reply_iso: replyISO,
    matched_phrase: ctx.relativeDateHintISO ? ctx.matchedPhrase : null,
    booking_id: committed.bookingId,
  };
}

// ---------------------------------------------------------------------------
// Class 2: wrong-thread hijack
// ---------------------------------------------------------------------------

function normalizeNameForCompare(n: string): string {
  return n
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export interface ThreadHijackNameMismatchTurnCtx {
  toolCalls: MonitoringToolCall[];
  knownSelfName: string | null | undefined;
}

export interface ThreadHijackNameMismatchAlert {
  failure_class: "thread_hijack_name_mismatch";
  stated_name: string;
  actual_name: string;
}

// Check A: surfaces the SAME "naam_verificatie_nodig" gate signal
// enforceVerificationGateDisclosure (identityDisambiguationGuard.ts) already consumes to build the
// disclosure sentence - zero new logic, this only ALSO writes the signal to monitoring_alerts.
// `current_name` on that gate result is the real owner name on the target booking; the stated
// identity is whatever this conversation already established (ctx.knownSelfName, the same value
// createTools receives as `knownSelfName`).
export function detectThreadHijackNameMismatch(
  ctx: ThreadHijackNameMismatchTurnCtx,
): ThreadHijackNameMismatchAlert | null {
  if (!isRealName(ctx.knownSelfName)) return null;
  for (let i = ctx.toolCalls.length - 1; i >= 0; i--) {
    const r = ctx.toolCalls[i].result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.error !== "naam_verificatie_nodig") continue;
    const actual = rec.current_name;
    if (!isRealName(actual)) return null;
    const statedName = String(ctx.knownSelfName);
    const actualName = String(actual);
    if (normalizeNameForCompare(statedName) === normalizeNameForCompare(actualName)) return null;
    return { failure_class: "thread_hijack_name_mismatch", stated_name: statedName, actual_name: actualName };
  }
  return null;
}

const MUTATION_OWNER_TOOLS = new Set(["book_appointment", "reschedule_appointment", "cancel_appointment"]);

function extractReferencedBookingId(toolCalls: MonitoringToolCall[]): string | null {
  for (let i = toolCalls.length - 1; i >= 0; i--) {
    const t = toolCalls[i];
    if (!MUTATION_OWNER_TOOLS.has(t.name)) continue;
    const r = t.result;
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (rec.ok === true && typeof rec.booking_id === "string") return rec.booking_id;
  }
  return null;
}

export interface ThreadHijackWrongOwnerAlert {
  failure_class: "thread_hijack_wrong_owner";
  referenced_booking_id: string;
  booking_owner_phone: string | null;
  current_phone: string;
}

// Check B: direct DB-level ownership check. Reads the booking id straight off the tool RESULT
// object (never parsed from prose), then a single read-only select confirms whether the row it
// mutated actually belongs to the phone number that owns THIS conversation. See the file header
// for why this compares `customer_phone` rather than the design doc's assumed `contact_id`
// (that column does not exist on `bookings`; phone is the schema's real identity key).
export async function detectThreadHijackWrongOwner(
  supabase: SupabaseClient,
  toolCalls: MonitoringToolCall[],
  currentPhone: string | null | undefined,
): Promise<ThreadHijackWrongOwnerAlert | null> {
  if (!currentPhone) return null;
  const bookingId = extractReferencedBookingId(toolCalls);
  if (!bookingId) return null;
  const { data, error } = await supabase
    .from("bookings")
    .select("customer_phone")
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) return null;
  const ownerPhone = (data as { customer_phone?: string | null }).customer_phone ?? null;
  if (ownerPhone && ownerPhone !== currentPhone) {
    return {
      failure_class: "thread_hijack_wrong_owner",
      referenced_booking_id: bookingId,
      booking_owner_phone: ownerPhone,
      current_phone: currentPhone,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Storage: fire-and-forget insert, never throws
// ---------------------------------------------------------------------------

export interface MonitoringAlertRow {
  failure_class: string;
  conversation_id: string | null;
  contact_phone: string | null;
  turn_id: string | null;
  details: Record<string, unknown>;
  detected_by?: string;
}

// Deliberately swallows every error. A monitoring-write failure must NEVER surface to, block, or
// delay the real customer-facing turn - the only acceptable side effect of a bug in this file is a
// missing alert row, never a broken reply.
export async function writeMonitoringAlert(supabase: SupabaseClient, row: MonitoringAlertRow): Promise<void> {
  try {
    await supabase.from("monitoring_alerts").insert({
      failure_class: row.failure_class,
      conversation_id: row.conversation_id,
      contact_phone: row.contact_phone,
      turn_id: row.turn_id,
      details: row.details,
      detected_by: row.detected_by ?? "in_turn",
    });
  } catch (_e) {
    // best-effort only, see header
  }
}
