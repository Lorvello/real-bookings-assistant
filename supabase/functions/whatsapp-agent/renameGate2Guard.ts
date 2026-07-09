// R59 (RENAME-GATE2-MISS-LOOPBACK fix, FINDINGS LEDGER R58/R59). Pure, unit-testable predicate
// extracted out of tools.ts's update_booking_name handler, same "compute in code, don't trust
// the model's judgement, and make it testable in isolation" pattern hardConfirmGate.ts /
// identityDisambiguationGuard.ts already use in this file.
//
// Root cause this closes (see FINDINGS LEDGER R58 for the full live-repro writeup): Gate 2 (the
// plain preview-confirm question, "Wil je dat veranderen naar X?") only commits on a strict
// hardConfirm bar. A MISS on that bar used to fall straight into a full re-preview (a fresh
// resolveTarget() call that recomputes crossIdentityRisk from scratch), re-triggering Gate 1 (the
// cross-identity check) even though Gate 1 was already satisfied when this Gate-2 marker was
// first written. Live-reproduced: 4 full Gate1-Gate2-Gate1-Gate2 cycles, 8 turns, zero progress,
// escaping only via a bare curated hardConfirm word.
//
// This predicate answers ONE question: given the pending_rename marker already on file and this
// turn's raw args.new_name, should a Gate-2 miss be treated as a RETRY of the SAME pending rename
// (re-ask Gate 2 only, tools.ts's caller never touches resolveTarget/crossIdentityRisk) rather
// than a brand-new request that must fall through to a fresh preview? True only when the marker
// is fresh AND the model did not supply a genuinely DIFFERENT proposed name this turn (a real
// correction, e.g. "nee, dan toch Karim", is never swallowed here, it still falls through to a
// normal fresh preview, exactly as before this fix).

export const RENAME_MARKER_FRESH_WINDOW_MS = 15 * 60 * 1000;

export interface PendingRenameLike {
  booking_id?: string;
  new_name?: string;
  at?: number;
}

function isRealNameValue(n: unknown): boolean {
  const t = String(n ?? "").trim().toLowerCase();
  return t !== "" && t !== "privé" && t !== "prive";
}

export function isRenameGate2Retry(
  pendingRename: PendingRenameLike | undefined,
  argsNewNameRaw: string,
  now: number,
): boolean {
  if (!pendingRename?.booking_id || !isRealNameValue(pendingRename?.new_name)) return false;
  const at = pendingRename.at;
  const fresh = typeof at === "number" && (now - at) < RENAME_MARKER_FRESH_WINDOW_MS;
  if (!fresh) return false;
  const trimmed = argsNewNameRaw.trim();
  if (!trimmed) return true;
  return trimmed.toLowerCase() === String(pendingRename.new_name ?? "").trim().toLowerCase();
}
