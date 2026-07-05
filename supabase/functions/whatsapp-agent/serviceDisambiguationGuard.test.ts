// Deterministic unit tests for the R71 (R70-3 fix) + R72 (SAME-SERVICE-MULTI-BRANCH-SILENT-DEFAULT
// fix) service-disambiguation guard. Pins the exact false-negative (must block) and false-positive
// (must NOT block) shapes proven live each round.
// Run: deno test serviceDisambiguationGuard.test.ts
import { assertEquals } from "jsr:@std/assert";
import { shouldBlockForMissingServiceChoice, shouldBlockForAmbiguousBranch, findDistinctServiceForReschedule, shouldBlockReturningServiceDefault, mentionsAnyServiceName, enforceReturningServiceDisclosure, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE, findServiceSwitchForPendingPreview, type RecencyWindowMessage } from "./serviceDisambiguationGuard.ts";

// R98 helper: build an all-inbound recency window from plain strings (the common case for tests
// that only care about customer messages, matching the pre-R98 test convention).
function inbound(...texts: string[]): RecencyWindowMessage[] {
  return texts.map((content) => ({ direction: "inbound" as const, content }));
}

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
      recentMessages: inbound("En nu ook nog de Speciale Afspraak graag, wanneer kan dat deze week?"),
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
      recentMessages: inbound("kan het een uur later, om 10:00?"),
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
      recentMessages: inbound("en nu de Speciale Afspraak graag"),
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
      recentMessages: inbound("kan het een uur later"),
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
      recentMessages: inbound(
        "ik had ooit gevraagd naar de Speciale Afspraak maar toen niet geboekt",
        "kan mijn Standaard Afspraak een uur later, om 10:00?",
      ),
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
      recentMessages: inbound("also book me the Speciale Afspraak, what times work?"),
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
      recentMessages: inbound("kan het een uur later"),
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

// ── R98 DIRECTION-CONFUSION regression suite (3rd bug in this function, R97-verify finding) ──
// Pins the exact bug: the early-break must ONLY fire on an INBOUND (customer) message mentioning
// the current service. An OUTBOUND (agent) message mentioning the current service must NEVER
// break the scan, even when it is the newest message in the window and even when it separates the
// customer's real distinct-service request from the rest of the window.

Deno.test("R98-1 blocks: agent's own confused reply mentions current service, must not break before reaching customer's real request (the exact R97-verify shape)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "Kan ik ook een Speciale Afspraak boeken, zelfde dag graag?" },
        { direction: "outbound", content: "Schikt 12:30 of 13:00?" },
        { direction: "inbound", content: "Oke doe dan 12:30" },
        { direction: "outbound", content: "Ik zie dat je al een Standaard Afspraak hebt op 12:00. Wil je die verzetten of een tweede afspraak maken?" },
        { direction: "inbound", content: "Ja klopt" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-2 blocks: agent mentions distinct service in its OWN reply BEFORE customer confirms (agent echo must still count as antecedent, per R96-SELFTEST GAP)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "wat kan er nog bij vandaag" },
        { direction: "outbound", content: "Wil je de Speciale Afspraak voor dezelfde persoon of iemand anders?" },
        { direction: "inbound", content: "zelfde persoon" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-3 blocks: multiple back-and-forth confusions, agent repeatedly mentions current service, customer's distinct request survives at the far end of the window", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "kan er ook nog een Speciale Afspraak bij?" },
        { direction: "outbound", content: "Je hebt al een Standaard Afspraak, bedoel je die verzetten?" },
        { direction: "inbound", content: "nee gewoon erbij" },
        { direction: "outbound", content: "oke, en je Standaard Afspraak blijft dan gewoon staan?" },
        { direction: "inbound", content: "ja" },
        { direction: "outbound", content: "voor je Standaard Afspraak, welke tijd wil je?" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-4 blocks: long conversation, many agent replies mentioning EITHER service, customer's real distinct request is the oldest message still in-window", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "ik wil ook een Speciale Afspraak" },
        { direction: "outbound", content: "voor de Speciale Afspraak, welke dag komt uit?" },
        { direction: "inbound", content: "deze week nog" },
        { direction: "outbound", content: "en klopt het dat je Standaard Afspraak blijft staan?" },
        { direction: "inbound", content: "ja" },
        { direction: "outbound", content: "top, dan kijk ik naar tijden voor je Standaard Afspraak" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-5 does not block: customer THEMSELVES re-confirms the current service most recently, no distinct service anywhere (genuine same-service reschedule, must still work)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "outbound", content: "Wil je je Standaard Afspraak verzetten naar een andere tijd?" },
        { direction: "inbound", content: "ja, mijn Standaard Afspraak graag een uur later" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R98-6 does not block: customer genuinely re-confirms current service AFTER an earlier, now-stale, distinct-service mention (customer's own re-confirmation is real evidence and must still gate)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "ik had ooit gevraagd naar de Speciale Afspraak maar toen niet geboekt" },
        { direction: "outbound", content: "geen probleem, waar kan ik je mee helpen?" },
        { direction: "inbound", content: "kan mijn Standaard Afspraak een uur later, om 10:00?" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

Deno.test("R98-7 blocks: agent's confused reply is the ONLY message in the window besides the customer's request (2-message window, agent reply newest)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "en ook nog een Speciale Afspraak graag" },
        { direction: "outbound", content: "Ik zie een bestaande Standaard Afspraak, zal ik die verplaatsen?" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-8 blocks: agent's confused reply mentions current service AND asks about the distinct one in the SAME message (still must not count as customer re-confirmation)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "kan er een Speciale Afspraak bij, zelfde dag" },
        { direction: "outbound", content: "Je hebt al een Standaard Afspraak, wil je in plaats daarvan de Speciale Afspraak, of allebei?" },
        { direction: "inbound", content: "allebei graag" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-9 blocks: EN phrasing, agent's own confused reply in English mentions current service, must not break before customer's real request", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "inbound", content: "can I also book the Speciale Afspraak, same day?" },
        { direction: "outbound", content: "I see you already have a Standaard Afspraak, do you want to move that instead?" },
        { direction: "inbound", content: "no just add it" },
      ],
      modelSuppliedServiceId: false,
    }),
    "Speciale Afspraak",
  );
});

Deno.test("R98-10 does not block: agent's confused reply mentions current service, customer's OWN most recent message ALSO re-confirms current service (genuine dead-end, no distinct request survives)", () => {
  assertEquals(
    findDistinctServiceForReschedule({
      allServiceNames: TWO_SERVICES,
      currentServiceName: "Standaard Afspraak",
      recentMessages: [
        { direction: "outbound", content: "Ik zie een bestaande Standaard Afspraak, zal ik die verplaatsen?" },
        { direction: "inbound", content: "ja graag, mijn Standaard Afspraak een uur later" },
      ],
      modelSuppliedServiceId: false,
    }),
    null,
  );
});

// ── R111 RETURNING-SERVICE-DEFAULT-BLEED tests (closes R107-RETURNING-DEFAULT-BLEED) ──────────
const AFSPRAAK_SERVICES = ["Speciale Afspraak", "Standaard Afspraak"];

Deno.test("R111-1 blocks: returning customer, bare unspecified booking request, no service named", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil weer een afspraak maken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    true,
  );
});

Deno.test("R111-2 (regression pin, live-reproduced false negative) blocks: 'gewoon weer een afspraak zoals de vorige keer' must NOT be treated as naming 'Speciale Afspraak' via the shared generic word 'afspraak'", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "gewoon weer een afspraak zoals de vorige keer",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    true,
  );
  assertEquals(mentionsAnyServiceName("gewoon weer een afspraak zoals de vorige keer", AFSPRAAK_SERVICES), false);
});

Deno.test("R111-3 does not block: customer names the full returning service themselves", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil graag de Speciale Afspraak boeken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-4 does not block: customer names a DIFFERENT real service than their history", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "ik wil deze keer de Standaard Afspraak",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-5 does not block: customer names only the distinguishing word ('Speciale', not the full name)", () => {
  assertEquals(mentionsAnyServiceName("doe mij maar de Speciale", AFSPRAAK_SERVICES), true);
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "doe mij maar de Speciale",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-6 does not block: no booking history at all (fresh customer)", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: null,
      currentMessage: "ik wil een afspraak maken",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: false,
    }),
    false,
  );
});

Deno.test("R111-7 does not block: conversation already confirmed the returning-service assumption", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Speciale Afspraak",
      currentMessage: "kan het ook om 14:00?",
      allServiceNames: AFSPRAAK_SERVICES,
      returningServiceConfirmed: true,
    }),
    false,
  );
});

Deno.test("R111-8 blocks: single-service catalog, bare request, still fires (returning-default is about DISCLOSURE, not just disambiguation)", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knipbeurt",
      currentMessage: "ik wil weer een afspraak maken",
      allServiceNames: ["Knipbeurt"],
      returningServiceConfirmed: false,
    }),
    true,
  );
});

Deno.test("R111-9 does not block: single-service catalog, customer's message contains the service's own (only) word", () => {
  assertEquals(
    shouldBlockReturningServiceDefault({
      lastService: "Knipbeurt",
      currentMessage: "ik wil een knipbeurt boeken",
      allServiceNames: ["Knipbeurt"],
      returningServiceConfirmed: false,
    }),
    false,
  );
});

// ── R113 enforceReturningServiceDisclosure (closes R111-verify's TOOL-CALL-GATE-ONLY gap) ──────
// Live-reproduced on the S6 testpad (fresh fixture phones, real future booking history, same
// tenant/service-catalog shape as R111's own fixture): "ik wil weer een afspraak inplannen" and
// "hoi, ik wil een afspraak" (both verbatim from prompt.ts's own trigger-phrase list) made the
// model compose a reply with ZERO tool calls, so tools.ts's "bevestig_terugkerende_dienst" refusal
// (and its message) never fired even though blockForReturningServiceDefaultEffective was true.

Deno.test("R113-1 rewrites: guard is effective this turn, model's reply names no service at all (live-reproduced 'get_my_appointments-style' non-sequitur shape)", () => {
  const out = enforceReturningServiceDisclosure(
    "Er staat een afspraak: Speciale Afspraak op zaterdag 1 augustus 11:00 (op naam Fixture Test).",
    true,
    "Speciale Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Speciale Afspraak"));
});

Deno.test("R113-2 rewrites: guard effective, model asks a generic 'which service' WITHOUT naming the last one (live-reproduced shape)", () => {
  const out = enforceReturningServiceDisclosure(
    "Hoi! Welkom bij Lorvello. Welke dienst wil je graag boeken?",
    true,
    "Speciale Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Speciale Afspraak"));
});

Deno.test("R113-3 no-op: guard not effective this turn (fresh customer / already confirmed / customer named a service)", () => {
  const reply = "Welke dienst wil je graag boeken?";
  assertEquals(enforceReturningServiceDisclosure(reply, false, "Speciale Afspraak", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-4 no-op: guard effective but lastService is null/empty (defensive, should never happen alongside effective=true)", () => {
  const reply = "Welke dienst wil je graag boeken?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, null, AFSPRAAK_SERVICES), reply);
  assertEquals(enforceReturningServiceDisclosure(reply, true, "", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-5 no-op: the model's OWN reply already discloses the last service by name (correct disclosure must never be second-guessed)", () => {
  const reply = "Ik ga uit van dezelfde dienst als de vorige keer, Speciale Afspraak, klopt dat?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, "Speciale Afspraak", AFSPRAAK_SERVICES), reply);
});

Deno.test("R113-6 no-op: replyText is empty (nothing to rewrite)", () => {
  assertEquals(enforceReturningServiceDisclosure("", true, "Speciale Afspraak", AFSPRAAK_SERVICES), "");
});

Deno.test("R113-7 rewrites: a tool-call-relayed refusal message the model paraphrased into a non-sequitur (defense in depth even when a tool DID fire but the model still dropped the disclosure)", () => {
  const out = enforceReturningServiceDisclosure(
    "Ik heb op dit moment geen bevestigde informatie daarover, neem contact op met de zaak.",
    true,
    "Standaard Afspraak",
    AFSPRAAK_SERVICES,
  );
  assertEquals(out, BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE("Standaard Afspraak"));
});

Deno.test("R113-8 no-op: single-service catalog, guard effective, reply already mentions the service's own (only) word", () => {
  const reply = "Ik boek de knipbeurt in, voor welke dag wil je?";
  assertEquals(enforceReturningServiceDisclosure(reply, true, "Knipbeurt", ["Knipbeurt"]), reply);
});

// ── R140 (SERVICE-SWITCH-DEAD-END fix): findServiceSwitchForPendingPreview ─────────────────────
// Live-reproduced shape: a customer with an uncommitted SECOND pending_booking preview tries to
// switch that preview's own service to a different, real, configured one.

Deno.test("R140-1 finds the switch: 'wacht, ik wil toch de Standaard Afspraak voor die tweede afspraak van Jan'", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Wacht, ik wil toch de Standaard Afspraak voor die tweede afspraak van Jan",
  });
  assertEquals(out, "Standaard Afspraak");
});

Deno.test("R140-2 finds the switch: EN phrasing", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Standaard Afspraak",
    currentMessage: "Actually, change the second appointment to the Speciale Afspraak instead",
  });
  assertEquals(out, "Speciale Afspraak");
});

Deno.test("R140-3 no switch: customer only re-confirms the PENDING preview's own current service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ja, de Speciale Afspraak klopt, graag bevestigen",
  });
  assertEquals(out, null);
});

Deno.test("R140-4 no switch: message names neither service at all (bare confirm)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ja klopt",
  });
  assertEquals(out, null);
});

Deno.test("R140-5 no switch: only one service exists (nothing to switch to)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: ["Knipbeurt"],
    pendingServiceName: "Knipbeurt",
    currentMessage: "Ik wil toch iets anders",
  });
  assertEquals(out, null);
});

Deno.test("R140-6 still resolves with pendingServiceName null (defensive): message names exactly one configured service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: ["Standaard Afspraak"],
    pendingServiceName: null,
    currentMessage: "Ik wil de Standaard Afspraak",
  });
  assertEquals(out, "Standaard Afspraak");
});

Deno.test("R140-7 finds the switch by distinguishing word only, avoiding the shared 'Afspraak' word false-positive", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Standaard Afspraak",
    currentMessage: "verander de tweede afspraak naar Speciale alsjeblieft",
  });
  assertEquals(out, "Speciale Afspraak");
});

Deno.test("R140-8 no switch: message mentions the shared generic word 'afspraak' only, no distinguishing word for either service", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: AFSPRAAK_SERVICES,
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "ik wil gewoon een afspraak veranderen",
  });
  assertEquals(out, null);
});

Deno.test("R140-9 no switch: empty allServiceNames (defensive)", () => {
  const out = findServiceSwitchForPendingPreview({
    allServiceNames: [],
    pendingServiceName: "Speciale Afspraak",
    currentMessage: "Ik wil de Standaard Afspraak",
  });
  assertEquals(out, null);
});
