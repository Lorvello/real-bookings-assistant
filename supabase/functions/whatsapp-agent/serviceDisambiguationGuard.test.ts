// Deterministic unit tests for the R71 (R70-3 fix) + R72 (SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT
// fix) service-disambiguation guard. Pins the exact false-negative (must block) and false-positive
// (must NOT block) shapes proven live each round.
// Run: deno test serviceDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import { shouldBlockForMissingServiceChoice, shouldBlockForAmbiguousBranch, findDistinctServiceForReschedule } from "./serviceDisambiguationGuard.ts";

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

// ── R72 shouldBlockForAmbiguousBranch: SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT fix ──────────

const R72_FIXTURE = [
  { name: "R72 Oost", services: [{ name: "Massage", price: 60, durationMin: 60 }] },
  { name: "R72 West", services: [{ name: "Massage", price: 40, durationMin: 45 }] },
  { name: "R72 Zuid", services: [{ name: "Manicure", price: 25, durationMin: 30 }] },
];

Deno.test("R72 blocks: service named, ambiguous across 2 differently-priced branches, no branch named", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil graag een massage boeken"] }),
    true,
  );
});

Deno.test("R72 blocks: bare service mention mid-conversation, no branch anywhere", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["hoi", "heb je nog plek voor een massage deze week?"],
    }),
    true,
  );
});

Deno.test("R72 does not block: branch named alongside the ambiguous service", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik wil een massage boeken bij West"],
    }),
    false,
  );
});

Deno.test("R72 does not block: branch named in an earlier turn, service named later", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik kom graag bij Oost langs", "kan ik een massage boeken?"],
    }),
    false,
  );
});

Deno.test("R72 does not block: named service exists at only ONE calendar (no branch ambiguity)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil een manicure boeken"] }),
    false,
  );
});

Deno.test("R72 does not block: multi-branch service with the IDENTICAL price+duration everywhere", () => {
  const sameServiceSamePrice = [
    { name: "Jan", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
    { name: "Tim", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
  ];
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: sameServiceSamePrice, inboundTexts: ["ik wil een knipbeurt boeken"] }),
    false,
  );
});

Deno.test("R72 does not block: no service named at all (that's shouldBlockForMissingServiceChoice's job)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["heb je morgen nog plek?"] }),
    false,
  );
});

Deno.test("R72 does not block: single-calendar tenant (guard never applicable)", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: [{ name: "Solo Salon", services: [{ name: "Massage", price: 60, durationMin: 60 }] }],
      inboundTexts: ["ik wil een massage boeken"],
    }),
    false,
  );
});

Deno.test("R72 blocks: only price differs (same duration)", () => {
  const priceOnlyDiff = [
    { name: "A", services: [{ name: "Knipbeurt", price: 30, durationMin: 30 }] },
    { name: "B", services: [{ name: "Knipbeurt", price: 45, durationMin: 30 }] },
  ];
  assertEquals(shouldBlockForAmbiguousBranch({ calendars: priceOnlyDiff, inboundTexts: ["ik wil een knipbeurt"] }), true);
});

Deno.test("R72 blocks: only duration differs (same price)", () => {
  const durationOnlyDiff = [
    { name: "A", services: [{ name: "Knipbeurt", price: 30, durationMin: 20 }] },
    { name: "B", services: [{ name: "Knipbeurt", price: 30, durationMin: 40 }] },
  ];
  assertEquals(shouldBlockForAmbiguousBranch({ calendars: durationOnlyDiff, inboundTexts: ["ik wil een knipbeurt"] }), true);
});

Deno.test("R72 does not block: two services named, ambiguous one absent from this business", () => {
  // Sanity: naming a service that does not exist at all should never crash or false-block.
  assertEquals(
    shouldBlockForAmbiguousBranch({ calendars: R72_FIXTURE, inboundTexts: ["ik wil een pedicure boeken"] }),
    false,
  );
});

Deno.test("R72 blocks: one of two named services is ambiguous, the other is not", () => {
  assertEquals(
    shouldBlockForAmbiguousBranch({
      calendars: R72_FIXTURE,
      inboundTexts: ["ik wil een manicure of een massage boeken"],
    }),
    true,
  );
});

// ── R96 RESCHEDULE-HIJACK guard (findDistinctServiceForReschedule) ──────────
// Pins R95-1's exact live-reproduced shape: a customer with an existing "Standaard Afspraak"
// booking names the DISTINCT "Speciale Afspraak" and gives a time, without the model itself
// resolving/passing a service_type_id.
const TWO_SERVICES = ["Speciale Afspraak", "Standaard Afspraak"];

Deno.test("R96 blocks: customer just named a distinct service, no model-supplied service_type_id", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: ["En nu ook nog de Speciale Afspraak graag, wanneer kan dat deze week?"],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R96 does not block: genuine same-service reschedule, no new service ever named", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: ["kan het een uur later, om 10:00?"],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 does not block: model explicitly supplied service_type_id (a reviewed switch)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: ["en nu de Speciale Afspraak graag"],
      modelSuppliedServiceId: true,
    }),
    null,
  );
});

Deno.test("R96 does not block: only one service exists (nothing to confuse)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: ["Standaard Afspraak"],
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: ["kan het een uur later"],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 does not block: a distinct service was named MANY turns ago, current turn re-confirms existing service", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: [
        "ik had ooit gevraagd naar de Speciale Afspraak maar toen niet geboekt",
        "kan mijn Standaard Afspraak een uur later, om 10:00?",
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R96 blocks: EN phrasing, distinct service named most recently", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentInboundTexts: ["also book me the Speciale Afspraak, what times work?"],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R96 does not block: no distinct service names configured (defensive empty case)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: [],
      currentServiceName: null,
      recentInboundTexts: ["kan het een uur later"],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});
