// Deterministic unit tests for the R71 (R70-3 fix) service-disambiguation guard. Pins the exact
// false-negative (must block) and false-positive (must NOT block) shapes proven live this round.
// Run: deno test serviceDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import { shouldBlockForMissingServiceChoice } from "./serviceDisambiguationGuard.ts";

const THREE_BRANCH = [
  { name: "R71 Centrum", services: [{ name: "Knipbeurt Dames" }] },
  { name: "R71 Noord", services: [{ name: "Knipbeurt Dames" }] },
  { name: "R71 Zuid", services: [{ name: "Baard Trim" }] },
];

// ── must BLOCK: no service, no branch named anywhere ────────────────────────
Deno.test("blocks: bare availability question, first contact", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["heb je morgen nog plek?"] }),
    true,
  );
});

Deno.test("blocks: 'ik wil een afspraak maken' with no service/branch anywhere in history", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["hoi", "ik wil graag een afspraak maken"],
    }),
    true,
  );
});

Deno.test("blocks: English phrasing, no service/branch named", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["do you have any availability tomorrow?"] }),
    true,
  );
});

// ── must NOT block: a service or branch WAS named (this turn or earlier) ───
Deno.test("does not block: full service name mentioned in an earlier turn", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["ik wil graag een Baard Trim boeken", "wat kost dat", "heb je morgen nog plek?"],
    }),
    false,
  );
});

Deno.test("does not block: branch named by its distinguishing word only ('Zuid', not 'R71 Zuid')", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: ["heb je morgen nog plek bij Zuid?"] }),
    false,
  );
});

Deno.test("does not block: explicit branch + service named up front", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: THREE_BRANCH,
      inboundTexts: ["ik wil een baard trim bij Zuid, wat kan er morgen?"],
    }),
    false,
  );
});

Deno.test("does not block: service named many turns earlier, well beyond a short window", () => {
  const longHistory = [
    "ik wil graag een Baard Trim boeken",
    "wat kost dat",
    "ok en hoe lang duurt het",
    "oke goed",
    "kan het ook op zaterdag",
    "en zondag",
    "hmm ok",
    "wat zijn de openingstijden",
    "oke",
    "en hebben jullie ook andere diensten",
    "aha ok",
    "heb je morgen nog plek?",
  ];
  assertEquals(shouldBlockForMissingServiceChoice({ calendars: THREE_BRANCH, inboundTexts: longHistory }), false);
});

// ── must NOT block: no real ambiguity exists (single-calendar / same-one-service) ──
Deno.test("does not block: single-calendar tenant (guard never applicable)", () => {
  assertEquals(
    shouldBlockForMissingServiceChoice({
      calendars: [{ name: "Solo Salon", services: [{ name: "Knipbeurt" }] }],
      inboundTexts: ["heb je morgen nog plek?"],
    }),
    false,
  );
});

Deno.test("does not block: multi-calendar but every branch offers the identical one service", () => {
  const sameServiceEverywhere = [
    { name: "Jan", services: [{ name: "Knipbeurt" }] },
    { name: "Tim", services: [{ name: "Knipbeurt" }] },
  ];
  assertEquals(
    shouldBlockForMissingServiceChoice({ calendars: sameServiceEverywhere, inboundTexts: ["heb je morgen nog plek?"] }),
    false,
  );
});

Deno.test("does not block: no calendars (defensive empty-array shape)", () => {
  assertEquals(shouldBlockForMissingServiceChoice({ calendars: [], inboundTexts: ["heb je morgen nog plek?"] }), false);
});
