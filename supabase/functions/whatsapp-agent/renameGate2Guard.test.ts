// R59 (RENAME-GATE2-MISS-LOOPBACK fix, FINDINGS LEDGER R58/R59) unit tests.
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { isRenameGate2Retry, RENAME_MARKER_FRESH_WINDOW_MS } from "./renameGate2Guard.ts";

const NOW = 1_700_000_000_000;

Deno.test("R59: fresh marker + no args.new_name (the exact R58 repro shape) -> retry Gate 2 only", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2", at: NOW - 60_000 };
  assertEquals(isRenameGate2Retry(pendingRename, "", NOW), true);
});

Deno.test("R59: fresh marker + args.new_name textually SAME target (case/whitespace-insensitive) -> retry Gate 2 only", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2", at: NOW - 60_000 };
  assertEquals(isRenameGate2Retry(pendingRename, "  renameprober58v2  ", NOW), true);
});

Deno.test("R59: fresh marker + args.new_name is a GENUINE correction (different name) -> NOT a Gate-2 retry, must fall through to a fresh preview", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2", at: NOW - 60_000 };
  assertEquals(isRenameGate2Retry(pendingRename, "Karim de Vries", NOW), false);
});

Deno.test("R59: marker older than the 15-minute freshness window -> NOT a retry, falls through", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2", at: NOW - (RENAME_MARKER_FRESH_WINDOW_MS + 1) };
  assertEquals(isRenameGate2Retry(pendingRename, "", NOW), false);
});

Deno.test("R59: marker exactly at the freshness boundary (just inside) -> still a retry", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2", at: NOW - (RENAME_MARKER_FRESH_WINDOW_MS - 1) };
  assertEquals(isRenameGate2Retry(pendingRename, "", NOW), true);
});

Deno.test("R59: no pending_rename marker at all -> never a retry (nothing to re-ask)", () => {
  assertEquals(isRenameGate2Retry(undefined, "", NOW), false);
});

Deno.test("R59: marker with no booking_id -> never a retry (malformed/incomplete marker)", () => {
  const pendingRename = { new_name: "RenameProbeR58v2", at: NOW - 60_000 };
  assertEquals(isRenameGate2Retry(pendingRename, "", NOW), false);
});

Deno.test("R59: marker's own new_name is not a real name (empty/Privé) -> never a retry", () => {
  const pendingRenameEmpty = { booking_id: "b1", new_name: "", at: NOW - 60_000 };
  const pendingRenamePrive = { booking_id: "b1", new_name: "Privé", at: NOW - 60_000 };
  assertEquals(isRenameGate2Retry(pendingRenameEmpty, "", NOW), false);
  assertEquals(isRenameGate2Retry(pendingRenamePrive, "", NOW), false);
});

Deno.test("R59: marker with no `at` timestamp at all -> treated as not fresh, never a retry", () => {
  const pendingRename = { booking_id: "b1", new_name: "RenameProbeR58v2" };
  assertEquals(isRenameGate2Retry(pendingRename, "", NOW), false);
});
