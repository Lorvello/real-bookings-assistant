// Deterministic unit tests for the R118/R119 pending-booking intervening-exchange guard.
// Run: deno test pendingBookGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  computePendingBookInterveningExchange,
  matchesAbandonPreviousPreview,
  messageRestatesPendingBookTime,
  type PendingBookHistoryRow,
} from "./pendingBookGuard.ts";

const T0 = 1_000_000; // pending_booking.at (preview stored)

function row(id: string, direction: string, content: string, createdAtMs: number): PendingBookHistoryRow {
  return { id, direction, content, created_at: new Date(createdAtMs).toISOString(), meta_timestamp: null };
}

// ── no pending_booking.at at all: never an intervening exchange ─────────────
Deno.test("no pendingBookAtMs -> false regardless of history", () => {
  const history = [row("m1", "inbound", "ja", T0 + 1000)];
  assertEquals(computePendingBookInterveningExchange(history, null, "m1"), false);
});

// ── R119 core repro: REPEATED-WORD intervening exclusion ────────────────────
// Preview stored at T0. Customer answers an UNRELATED yes/no question with "ja" (m2, a genuine
// intervening message). Later, the customer sends "ja" again (m3, this turn's own row) to
// confirm the now-stale preview. Pre-fix (text-equality exclusion), m2's content ("ja") equalled
// the current message's content, so m2 was wrongly excluded and the scan found NO intervening
// message. Post-fix (id-based exclusion), m2 is correctly counted as intervening because its id
// differs from the current row's id, even though its text is identical.
Deno.test("R119: a REPEATED 'ja' intervening message is still detected (the exact live-reproduced exploit)", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("m2-intervening-ja", "inbound", "ja", T0 + 60_000), // answers an unrelated Y/N question
    row("ack-outbound", "outbound", "Top, dan sturen we een herinnering!", T0 + 65_000),
    row("m3-current-ja", "inbound", "ja", T0 + 120_000), // THIS turn's own row, confirming the stale preview
  ];
  const result = computePendingBookInterveningExchange(history, T0, "m3-current-ja");
  assert(result, "a genuinely intervening message must be detected even when its text matches the current message");
});

// ── Sibling shape: intervening message differs in wording (R118 GAP-3 original repro) ──
Deno.test("R118 GAP-3 regression: varied-wording intervening message is still detected", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("m2-intervening", "inbound", "Hebben jullie ook parkeergelegenheid?", T0 + 60_000),
    row("ack-outbound", "outbound", "Geen idee, bel ons even.", T0 + 65_000),
    row("m3-current-ja", "inbound", "ja", T0 + 120_000),
  ];
  const result = computePendingBookInterveningExchange(history, T0, "m3-current-ja");
  assert(result, "a varied-wording intervening message must still be detected (no regression)");
});

// ── Honest flow: NO intervening exchange, immediate clean "ja" ──────────────
Deno.test("honest flow: immediate 'ja' with no intervening message -> false (no false-positive friction)", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("m2-current-ja", "inbound", "ja", T0 + 5_000), // the ONLY inbound row after the preview, and it IS the current turn
  ];
  const result = computePendingBookInterveningExchange(history, T0, "m2-current-ja");
  assertEquals(result, false, "the common single-message confirm flow must stay frictionless");
});

// ── Duplicate content from an EARLIER turn (predates the preview) must not falsely trigger ──
Deno.test("a same-text inbound row BEFORE the preview was stored is not counted (ts must be strictly after pbk.at)", () => {
  const history = [
    row("earlier-ja", "inbound", "ja", T0 - 60_000), // before the preview existed at all
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("m2-current-ja", "inbound", "ja", T0 + 5_000),
  ];
  const result = computePendingBookInterveningExchange(history, T0, "m2-current-ja");
  assertEquals(result, false, "a pre-preview row must never count as intervening, regardless of content");
});

// ── Outbound rows are never counted as intervening (customer-only signal) ───
Deno.test("outbound rows are ignored even if they postdate the preview and differ in id/content", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("agent-followup", "outbound", "Trouwens, wil je ook een herinnering?", T0 + 30_000),
    row("m2-current-ja", "inbound", "ja", T0 + 60_000),
  ];
  const result = computePendingBookInterveningExchange(history, T0, "m2-current-ja");
  assertEquals(result, false, "only INBOUND customer messages count as an intervening exchange");
});

// ── Multiple repeated-word intervening messages, still correctly detected ───
Deno.test("R119: multiple repeated 'ja' rows between preview and current turn are all still detected via id", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("ja-1", "inbound", "ja", T0 + 30_000),
    row("ack-1", "outbound", "Oke!", T0 + 35_000),
    row("ja-2", "inbound", "ja", T0 + 60_000),
    row("ack-2", "outbound", "Top!", T0 + 65_000),
    row("ja-current", "inbound", "ja", T0 + 90_000), // this turn's own row
  ];
  const result = computePendingBookInterveningExchange(history, T0, "ja-current");
  assert(result, "any number of same-text intervening rows must still be detected by id, none of them is the current row");
});

// ── currentMessageRowId missing/null (defensive: id lookup failed) ──────────
// Falls back to "no row excluded", meaning any inbound row after pbk.at (including one that
// might actually be the current turn, if id resolution ever failed) is treated as intervening.
// This is the SAFE direction: it can only make the gate MORE cautious (require restatement),
// never silently commit a stale preview.
Deno.test("defensive: null currentMessageRowId never allows a bare confirm-only shape through unexamined", () => {
  const history = [
    row("preview-outbound", "outbound", "Ik zet ... klopt dat?", T0),
    row("only-inbound-row", "inbound", "ja", T0 + 5_000),
  ];
  const result = computePendingBookInterveningExchange(history, T0, null);
  assert(result, "with no way to identify the current row, the safer default is to treat any inbound row as intervening");
});

// ── R105 COMPETING-PREVIEW-STUCK-LOOP fix: matchesAbandonPreviousPreview ────
// Live-reproduced R104: a customer with an open pending_booking preview (Manicure) starts
// discussing a different service (Knippen Heren), tools.ts's "vorige_boeking_nog_open" guard asks
// a confirm-or-abandon question, and EVERY explicit decline the customer sent failed to resolve
// it, because the old regex only tolerated an EMPTY or "vorige"/"eerste" filler between the
// article and the verb, never the customer naming the actual service.

Deno.test("R104 exact repro 1: 'Ja, laat de Manicure vervallen.' now matches (service name as filler)", () => {
  assert(matchesAbandonPreviousPreview("ja, laat de manicure vervallen."));
});

Deno.test("R104 exact repro 2: 'Laat die Manicure preview vervallen.' now matches (2-word filler)", () => {
  assert(matchesAbandonPreviousPreview("laat die manicure preview vervallen."));
});

Deno.test("original bare shape (no filler) still matches, no regression", () => {
  assert(matchesAbandonPreviousPreview("laat de vorige maar vervallen"));
  assert(matchesAbandonPreviousPreview("laat maar zitten"));
});

Deno.test("vergeet/sla variants tolerate a named service as filler too", () => {
  assert(matchesAbandonPreviousPreview("vergeet de manicure maar"));
  assert(matchesAbandonPreviousPreview("sla die manicure afspraak maar over"));
});

Deno.test("unrelated message mentioning 'vervallen' in a different shape does not match", () => {
  assert(!matchesAbandonPreviousPreview("wat gebeurt er als mijn afspraak komt te vervallen?"));
});

// ── R105 COMPETING-PREVIEW-STUCK-LOOP fix: messageRestatesPendingBookTime ───
// Live-reproduced R104: "Ja, bevestig de Manicure preview op vrijdag 14 augustus om 10:00 bij Bo."
// used to never resolve confirmBook because ANY day/time mention tripped ambiguousConfirm's
// DAY_OR_TIME_SHIFT_RE, treating a genuine restatement exactly like a request for a different slot.

Deno.test("R104 exact repro: restating the pending preview's own weekday+time is detected", () => {
  // 2026-08-14 is a Friday (vrijdag).
  const iso = "2026-08-14T10:00:00.000+02:00";
  const msg = "ja, bevestig de manicure preview op vrijdag 14 augustus om 10:00 bij bo.";
  assert(messageRestatesPendingBookTime(iso, msg));
});

Deno.test("a DIFFERENT day/time mention is NOT treated as a restatement (genuine shift request)", () => {
  const iso = "2026-08-14T10:00:00.000+02:00"; // vrijdag 10:00
  const msg = "kan het ook op zaterdag om 14:00?";
  assert(!messageRestatesPendingBookTime(iso, msg));
});

Deno.test("weekday alone without the matching time is NOT a restatement", () => {
  const iso = "2026-08-14T10:00:00.000+02:00"; // vrijdag 10:00
  const msg = "ja, vrijdag is goed";
  assert(!messageRestatesPendingBookTime(iso, msg));
});

Deno.test("null/invalid pendingStartTimeISO -> false (defensive)", () => {
  assert(!messageRestatesPendingBookTime(null, "ja, vrijdag 14 augustus om 10:00"));
  assert(!messageRestatesPendingBookTime("not-a-date", "ja, vrijdag 14 augustus om 10:00"));
});
