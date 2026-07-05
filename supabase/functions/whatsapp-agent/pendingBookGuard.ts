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
