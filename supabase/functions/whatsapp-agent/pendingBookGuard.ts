// ---------------------------------------------------------------------------
// R118/R119 PENDING-BOOKING INTERVENING-EXCHANGE GUARD.
//
// A NEW booking is two-phase: book_appointment's first call only PREVIEWS (stores a
// pending_booking proposal, no DB insert). The pre-existing 15-minute TTL (pendingBookFresh,
// index.ts) only checks raw elapsed time, never whether anything unrelated happened in between.
//
// R118 (GAP 3, PENDING-BOOKING-NO-EXPIRY fix, live-reproduced on the S6 testpad): a booking
// preview is offered, the customer asks something unrelated in between, gets an answer, then
// sends an unrelated LATER "ja" (plausibly meaning something else entirely) which silently
// committed the old, stale, possibly-abandoned preview, with no re-confirmation of what was
// actually being confirmed. Fix: detect a genuine INTERVENING exchange (at least one other
// inbound customer message strictly between the preview being stored and this turn's own
// message); when found, require the confirming message to also restate a day/time reference.
//
// R119 (REPEATED-WORD-INTERVENING-EXCLUSION fix): R118's own exclusion of "this turn's own row"
// used TEXT EQUALITY (`m.content !== message`). Live-reproduced (S6 testpad, DB proof in the
// R119 handoff): the inbound row for THIS turn is already persisted before this code runs, so
// text equality does not uniquely identify "this turn's own row" -- it also matches any EARLIER
// row that happens to share the same wording. A customer who answers an unrelated yes/no
// question with "ja" (a genuine intervening message) and LATER sends "ja" again to confirm the
// now-stale preview had that earlier, genuinely-intervening "ja" wrongly excluded from the scan
// purely because its text matched the current message, so the intervening-exchange check came
// back false and the stale preview committed silently, no restatement required -- the exact
// exploit this gate exists to close, just triggered by a REPEATED affirmation instead of a
// single isolated one (a very plausible shape for short Dutch affirmations like "ja"/"oke"/
// "prima").
//
// FIX: identify "this turn's own row" by ROW IDENTITY (its `id`), never by content. The current
// inbound row is always the newest by created_at (the SAME signal index.ts's own R97 fix already
// established as reliable for this exact purpose: the raw DESC-by-created_at fetch, BEFORE any
// meta_timestamp re-sort, since that re-sort can legitimately move the current row away from the
// tail when its own meta_timestamp is stale). Comparing by id means an earlier row can never be
// mistaken for the current one just because the customer repeated a word, while a genuine
// duplicate-content row from an EARLIER turn is still counted as a real intervening message,
// exactly as it should be.
//
// Extracted into its own module (mirrors confirmationGuard.ts / identityDisambiguationGuard.ts)
// so the pure guard logic is unit-testable without importing index.ts (whose top-level
// Deno.serve would start a server).

export type PendingBookHistoryRow = {
  id: string;
  direction: string;
  content: string | null;
  created_at: string;
  meta_timestamp: string | null;
};

// True iff at least one OTHER inbound customer message exists strictly AFTER the pending_booking
// preview was stored (pendingBookAtMs) and is NOT this turn's own row (identified by
// currentMessageRowId, never by content).
export function computePendingBookInterveningExchange(
  historyWindow: PendingBookHistoryRow[],
  pendingBookAtMs: number | null,
  currentMessageRowId: string | null,
): boolean {
  if (pendingBookAtMs == null) return false;
  return historyWindow.some((m) => {
    if (m.direction !== "inbound") return false;
    const ts = new Date(m.meta_timestamp ?? m.created_at).getTime();
    if (!Number.isFinite(ts)) return false;
    // Strictly AFTER the preview was stored, and not this turn's own row (identified by id,
    // never by content, so a repeated word can no longer hide a genuinely intervening earlier
    // message).
    return ts > pendingBookAtMs && m.id !== currentMessageRowId;
  });
}

// ---------------------------------------------------------------------------
// R105 (COMPETING-PREVIEW-STUCK-LOOP fix, live-reproduced R104: evidence in
// _FULL_JOURNEY_AGENT_SIMULATION_V2_STATE.md). When a customer has an open pending_booking
// preview and starts discussing a DIFFERENT service, tools.ts's own "vorige_boeking_nog_open"
// guard asks a confirm-or-abandon question: confirm the OLD preview, or abandon it and book the
// NEW one. R104 found EVERY explicit customer answer (both directions) failed to resolve this,
// re-asking the same question turn after turn. Two separate root causes, fixed here:
//
// (1) DECLINE direction (drop the old preview, proceed with the new one). index.ts's original
// ABANDON_PREVIOUS_PREVIEW_RE required the filler between the article ("laat de ...") and the verb
// ("... vervallen") to be EMPTY or exactly "vorige"/"eerste" -- it had no tolerance for the most
// natural real phrasing, where the customer names the actual service instead ("laat de Manicure
// vervallen", "laat die Manicure preview vervallen"). Both R104 decline messages used this exact
// shape and neither matched, so abandonPreviousPreview stayed false and tools.ts's guard fired
// again unchanged. Fix: matchesAbandonPreviousPreview allows a bounded (<=40 char) filler of any
// words (a service name, "preview", etc.) between the article/verb anchors, for the Dutch variants
// where a live repro exists. The English variants are left as an exact list (no live repro to
// generalize from; over-broadening those on zero evidence would be a shot in the dark).
//
// (2) CONFIRM-OLD direction (confirm the still-open preview as-is). index.ts's confirmBook signal
// requires !ambiguousConfirm, and ambiguousConfirm trips on ANY day/time-shift-shaped mention
// (DAY_OR_TIME_SHIFT_RE) on the theory that a customer restating a day/time might be requesting a
// DIFFERENT one. But the most natural way to answer "which of the two do you mean" is to restate
// the OLD preview's own day/time as proof of which one ("Ja, bevestig de Manicure preview op
// vrijdag 14 augustus om 10:00 bij Bo") -- exactly the same structural gap R150 already found and
// fixed for identity-verification markers (ambiguousConfirmForVerification), just never extended to
// the plain pending_booking confirm path. Fix: messageRestatesPendingBookTime detects when the
// message's day-name + time exactly match the CURRENTLY-stored pendingBook.start_time (a
// restatement, not a shift); index.ts uses this to swap in the narrower
// ambiguousConfirmForVerification-style check (still catches price/hedge/conditional/vague/
// rejection) instead of the full ambiguousConfirm, ONLY for that one turn.

const ABANDON_FILLER = "[\\p{L}\\p{N}' -]{0,40}?";

export function matchesAbandonPreviousPreview(raw: string): boolean {
  const re = new RegExp(
    "\\b(" +
      `laat\\s+(?:die|de|het)?\\s*${ABANDON_FILLER}\\s*(?:maar\\s+)?(?:vervallen|zitten|schieten)` +
      `|vergeet\\s+(?:die|de)\\s*${ABANDON_FILLER}\\s*maar` +
      `|sla\\s+(?:die|de)\\s*${ABANDON_FILLER}\\s*(?:maar\\s+)?over` +
      "|die\\s+hoeft\\s+niet\\s+meer" +
      "|let\\s+it\\s+(?:lapse|go)" +
      "|forget\\s+the\\s+(?:previous|first|other)\\s+one" +
      "|skip\\s+that\\s+one" +
      "|never\\s?mind\\s+the\\s+(?:first|previous|other)\\s+one" +
      "|drop\\s+the\\s+(?:other|first|previous)\\s+one" +
    ")\\b",
    "iu",
  );
  return re.test(String(raw ?? ""));
}

// True iff the raw message restates BOTH the weekday name AND the HH:MM time of the currently
// stored pending_booking.start_time (Europe/Amsterdam wall-clock), the exact shape a customer uses
// to disambiguate "confirm the OLD one" from a competing preview question. Requires BOTH pieces
// (not just a bare day/time mention) to keep this narrow and deliberate -- a message that merely
// contains some unrelated day/time word does not satisfy this.
export function messageRestatesPendingBookTime(
  pendingStartTimeISO: string | null | undefined,
  rawMessage: string | undefined | null,
): boolean {
  if (!pendingStartTimeISO) return false;
  const d = new Date(pendingStartTimeISO);
  if (Number.isNaN(d.getTime())) return false;
  const msg = String(rawMessage ?? "").toLowerCase();
  const weekday = d.toLocaleDateString("nl-NL", { weekday: "long", timeZone: "Europe/Amsterdam" }).toLowerCase();
  const hhmm = d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Amsterdam",
  });
  const timeDigits = hhmm.replace(/[^0-9:]/g, "");
  if (!timeDigits.includes(":")) return false;
  const timeRe = new RegExp(`\\b${timeDigits.replace(":", "[:.]")}\\b`);
  return msg.includes(weekday) && timeRe.test(msg);
}
