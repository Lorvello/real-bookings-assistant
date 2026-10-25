// Deterministic unit tests for the pending-proposal time guard (R84, Mathieu 25-10-2026: "Ja, bouw het
// tijdvangnet nu, vóór de grote test van dinsdag."). The table mirrors
// launch-ready-loop/ONTWERP_TIJDVANGNET_2026-10-25.md. A proposal sentence that names another time or day
// than the stored pending_booking must be caught; every other sentence, and the guard's own fallback
// text, must never be. Run: deno test pendingTimeGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { countCustomerQuestions } from "../_shared/sanitizeReply.ts";
import {
  findProposalMismatch,
  hasProposalMention,
  pendingDriftNudge,
  restatePendingProposal,
} from "./pendingTimeGuard.ts";

// Wednesday 4 November 2026 15:00 in Amsterdam (CET, UTC+1).
const STORED = "2026-11-04T14:00:00+00:00";
// Tuesday 3 November 2026, 11:00 in Amsterdam.
const NOW = new Date("2026-11-03T10:00:00Z");

const TABLE: Array<[string, string, { times?: string[]; days?: string[] } | null]> = [
  ["D09 (Haiku without thinking, 24-10)", "Dat kan ik nakijken. Ik boek dan Knippen Heren op woensdag 4 november om 16:00 op naam Joris, klopt dat?", { times: ["16:00"] }],
  ["the deterministic preview of the stored slot", "Ik zet Knippen Heren op woensdag 4 november 15:00 op naam Joris, klopt dat?", null],
  ["another weekday", "Ik zet Knippen Heren op donderdag 4 november 15:00, klopt dat?", { days: ["donderdag"] }],
  ["another date", "Ik zet Knippen Heren op woensdag 11 november 15:00, klopt dat?", { days: ["11 november"] }],
  ["English, another time", "I'll put you down for Knippen Heren on Wednesday 4 November 16:00. Is that correct?", { times: ["16:00"] }],
  ["English 4pm", "Shall I book Knippen Heren for 4pm on Wednesday?", { times: ["16:00"] }],
  ["English 3pm", "Shall I book Knippen Heren for 3pm on Wednesday?", null],
  ["om 4 uur", "Ik zet het op woensdag om 4 uur, klopt dat?", { times: ["16:00"] }],
  ["om 3 uur", "Ik zet het op woensdag om 3 uur, klopt dat?", null],
  ["a range counts its start only", "Ik zet Knippen Heren op woensdag 4 november van 15:00 tot 15:30, klopt dat?", null],
  ["a dash range counts its start only", "Ik zet Knippen Heren op woensdag 4 november 15:00-15:30, klopt dat?", null],
  ["a dash range with another start", "Ik zet Knippen Heren op woensdag 4 november 16:00-16:30, klopt dat?", { times: ["16:00"] }],
  ["an info sentence is no proposal", "We zijn woensdag open tot 18:00.", null],
  ["only the proposal sentence counts", "Je andere afspraak staat op dinsdag 10:00. Ik zet Knippen Heren op woensdag 4 november 15:00, klopt dat?", null],
  ["a price is no time", "Ik zet Knippen Heren op woensdag 4 november 15:00 (€15.50), klopt dat?", null],
  ["a price in euro words is no time", "Ik zet Knippen Heren op woensdag 4 november 15:00 voor 16.50 euro, klopt dat?", null],
  ["a reschedule sentence is skipped", "Ik verzet je afspraak naar donderdag 16:00, klopt dat?", null],
  ["a cancel sentence is skipped", "Ik annuleer je afspraak van dinsdag 10:00, klopt dat?", null],
  ["today while the slot is tomorrow", "Ik zet je vandaag om 15:00, klopt dat?", { days: ["vandaag"] }],
  ["tomorrow is the stored day", "Ik zet je morgen om 15:00, klopt dat?", null],
  ["the day after tomorrow", "Ik zet je overmorgen om 15:00, klopt dat?", { days: ["overmorgen"] }],
  ["16.00 notation", "Ik boek Knippen Heren om 16.00, is dat goed?", { times: ["16:00"] }],
  ["zal ik ... boeken", "Zal ik Knippen Heren op woensdag 4 november om 16:00 voor je boeken?", { times: ["16:00"] }],
  ["two times, one of them stored", "Ik zet je op woensdag 15:00 of 16:00, klopt dat?", { times: ["16:00"] }],
  ["German", "Soll ich Herrenhaarschnitt am Mittwoch um 16:00 buchen?", { times: ["16:00"] }],
  ["German, stored weekday and time", "Soll ich Herrenhaarschnitt am Mittwoch um 15:00 buchen?", null],
  ["French 16h30", "Je vous réserve Coupe homme mercredi à 16h30, c'est correct ?", { times: ["16:30"] }],
  // Live on v50 (25-10, D09 try 8, Haiku without thinking, no tool call): a question for a "ja" to another time.
  ["D09 try 8: a one-time question without booking words", "Dat kan ik nakijken. Wil je dan Knippen Heren op woensdag 4 november om 16:00, op naam Joris?", { times: ["16:00"] }],
  ["a one-time offer is a question for a ja too", "Wil je liever 16:00?", { times: ["16:00"] }],
  ["is 16:00 ook goed", "Is 16:00 ook goed?", { times: ["16:00"] }],
  ["a one-time question on the stored time", "Wil je 15:00 houden?", null],
  ["a one-time question with another day", "Wil je dan donderdag om 15:00?", { days: ["donderdag"] }],
  ["an either/or offer is no proposal", "16:00 of 17:00 is nog vrij, welke wil je?", null],
  ["an opening-hours question is no proposal", "We sluiten woensdag om 18:00, wil je nog iets weten?", null],
  ["a day-only question is out of scope", "Wil je liever donderdag?", null],
  // Independent review of e418c561: split sentences, lists, more time forms, prices and end times.
  ["verb-first order, confirm in its own sentence", "Dan zet ik je op woensdag 4 november om 16:00. Klopt dat?", { times: ["16:00"] }],
  ["no booking verb, confirm in its own sentence", "Woensdag 4 november om 16:00 op naam Joris. Klopt dat?", { times: ["16:00"] }],
  ["a list ending in a confirm question", "Ik heb dit genoteerd:\n- Dienst: Knippen Heren\n- Datum: woensdag 4 november\n- Tijd: 16:00\nKlopt dat?", { times: ["16:00"] }],
  ["a list with the stored slot", "Ik heb dit genoteerd:\n- Dienst: Knippen Heren\n- Datum: woensdag 4 november\n- Tijd: 15:00\nKlopt dat?", null],
  ["a bare confirm covers one sentence only", "Je andere afspraak staat op dinsdag 10:00. Woensdag 4 november om 15:00. Klopt dat?", null],
  ["EUR before a price", "Ik zet Knippen Heren op woensdag 4 november 15:00 voor EUR 16.50, klopt dat?", null],
  ["kost before a price", "Ik zet Knippen Heren op woensdag 4 november 15:00, dat kost 16.50, klopt dat?", null],
  ["an end time is no start", "Ik zet je op woensdag 15:00, we zijn open tot 18:00, klopt dat?", null],
  ["a range with uur", "Ik zet Knippen Heren op woensdag 4 november van 15:00 uur tot 15:30 uur, klopt dat?", null],
  ["16 uur without om", "Ik zet je woensdag 16 uur, klopt dat?", { times: ["16:00"] }],
  ["16u30", "Ik zet je woensdag 16u30, klopt dat?", { times: ["16:30"] }],
  ["half 5", "Ik zet je woensdag half 5, klopt dat?", { times: ["16:30"] }],
  ["English at 4", "I'll put you down at 4 on Wednesday. Is that correct?", { times: ["16:00"] }],
  ["German 16 Uhr", "Soll ich Sie am Mittwoch 16 Uhr eintragen?", { times: ["16:00"] }],
  ["French 16h", "Je vous réserve mercredi 16h, c'est correct ?", { times: ["16:00"] }],
  ["Spanish a las 4", "¿Te reservo el miércoles a las 4?", { times: ["16:00"] }],
  ["a duration is no time", "Ik zet Balayage (2 uur) op woensdag 4 november 15:00, klopt dat?", null],
  ["Jan 2 is no date", "Shall I book you and Jan 2 slots on Wednesday 4 November at 15:00?", null],
  ["English date order", "I'll put you down for Knippen Heren on November 11 at 15:00. Is that correct?", { days: ["November 11"] }],
  ["goedemorgen is not tomorrow", "Goedemorgen! Ik zet Knippen Heren op woensdag 4 november 15:00, klopt dat?", null],
];

for (const [label, reply, want] of TABLE) {
  Deno.test(`R84 tijdvangnet: ${label}`, () => {
    const got = findProposalMismatch(reply, STORED, NOW);
    if (want === null) {
      assertEquals(got, null);
    } else {
      assert(got !== null, "expected a mismatch");
      assertEquals(got.times, want.times ?? []);
      assertEquals(got.days, want.days ?? []);
    }
  });
}

Deno.test("R84 tijdvangnet: no stored slot, an invalid one, or an empty reply never fires", () => {
  const reply = "Ik boek dan Knippen Heren op woensdag 4 november om 16:00, klopt dat?";
  assertEquals(findProposalMismatch(reply, null, NOW), null);
  assertEquals(findProposalMismatch(reply, "geen datum", NOW), null);
  assertEquals(findProposalMismatch("", STORED, NOW), null);
});

Deno.test("R84 tijdvangnet: both sides of the switch to winter time (25-10-2026)", () => {
  // Friday 23 October 15:00 CEST (UTC+2) and Friday 30 October 14:00 CET (UTC+1).
  const summer = "2026-10-23T13:00:00+00:00";
  const winter = "2026-10-30T13:00:00+00:00";
  const now = new Date("2026-10-22T08:00:00Z");
  assertEquals(findProposalMismatch("Ik zet Knippen op vrijdag 23 oktober 15:00, klopt dat?", summer, now), null);
  assertEquals(findProposalMismatch("Ik zet Knippen op vrijdag 23 oktober 14:00, klopt dat?", summer, now)?.times, ["14:00"]);
  assertEquals(findProposalMismatch("Ik zet Knippen op vrijdag 30 oktober 14:00, klopt dat?", winter, now), null);
  assertEquals(findProposalMismatch("Ik zet Knippen op vrijdag 30 oktober 15:00, klopt dat?", winter, now)?.times, ["15:00"]);
});

Deno.test("R84 tijdvangnet: the fallback text names the stored slot, asks one question, and never fires itself", () => {
  const nl = restatePendingProposal("Knippen Heren", "woensdag 4 november 15:00", "Wednesday 4 November 15:00", "Joris", false);
  assertEquals(
    nl,
    "Even voor de duidelijkheid: ik heb nu Knippen Heren op woensdag 4 november 15:00 op naam Joris staan, klopt dat? Wil je liever een andere tijd, noem die dan, dan kijk ik of die vrij is.",
  );
  const nlNoSvc = restatePendingProposal(null, "woensdag 4 november 15:00", "Wednesday 4 November 15:00", null, false);
  assertEquals(
    nlNoSvc,
    "Even voor de duidelijkheid: ik heb je nu op woensdag 4 november 15:00 staan, klopt dat? Wil je liever een andere tijd, noem die dan, dan kijk ik of die vrij is.",
  );
  const en = restatePendingProposal("Knippen Heren", "woensdag 4 november 15:00", "Wednesday 4 November 15:00", "Joris", true);
  assertEquals(
    en,
    "Just to be clear: I currently have Knippen Heren on Wednesday 4 November 15:00 in the name of Joris, is that correct? If you'd prefer another time, just tell me which one and I'll check if it's free.",
  );
  const enNoSvc = restatePendingProposal(null, "woensdag 4 november 15:00", "Wednesday 4 November 15:00", null, true);
  assertEquals(
    enNoSvc,
    "Just to be clear: I currently have you down for Wednesday 4 November 15:00, is that correct? If you'd prefer another time, just tell me which one and I'll check if it's free.",
  );
  for (const text of [nl, nlNoSvc, en, enNoSvc]) {
    assertEquals(countCustomerQuestions(text), 1);
    assertEquals(findProposalMismatch(text, STORED, NOW), null);
  }
});

Deno.test("R84 tijdvangnet: the nudge names what the reply said and what is stored", () => {
  const mismatch = findProposalMismatch(
    "Ik boek dan Knippen Heren op woensdag 4 november om 16:00 op naam Joris, klopt dat?",
    STORED,
    NOW,
  );
  assert(mismatch !== null);
  const nudge = pendingDriftNudge(mismatch, "Knippen Heren", "woensdag 4 november 15:00");
  assert(nudge.startsWith("[systeem] "));
  assert(nudge.includes("16:00"));
  assert(nudge.includes("Knippen Heren op woensdag 4 november 15:00"));
  assert(nudge.includes("book_appointment"));
});

Deno.test("R84 tijdvangnet: a one-time question on a real free slot of this turn is an offer, not drift", () => {
  const offer = "Op donderdag is alleen 10:00 nog vrij, wil je die?";
  assertEquals(findProposalMismatch(offer, STORED, NOW, new Set(["10:00"])), null);
  assertEquals(findProposalMismatch(offer, STORED, NOW)?.times, ["10:00"]);
  // Booking words keep counting, even on a real free slot: a "ja, voor Joris" would commit the stored slot.
  assertEquals(
    findProposalMismatch("Op donderdag is 10:00 vrij, zal ik die voor je vastzetten?", STORED, NOW, new Set(["10:00"]))?.times,
    ["10:00"],
  );
});

Deno.test("R84 tijdvangnet: hasProposalMention decides whether the stored proposal is read at all", () => {
  assert(hasProposalMention("Dat kan ik nakijken. Ik boek dan Knippen Heren op woensdag 4 november om 16:00 op naam Joris, klopt dat?"));
  assert(hasProposalMention("Woensdag 4 november om 16:00. Klopt dat?"));
  assert(!hasProposalMention("We zijn woensdag open tot 18:00."));
  assert(!hasProposalMention("Op donderdag is alleen 10:00 nog vrij, wil je die?", new Set(["10:00"])));
  assert(!hasProposalMention(""));
});

Deno.test("R84 tijdvangnet: por la mañana is the morning, not tomorrow", () => {
  // Monday 2 November: "mañana" read as tomorrow would be Tuesday, not the stored Wednesday.
  const monday = new Date("2026-11-02T10:00:00Z");
  assertEquals(findProposalMismatch("Te reservo el miércoles por la mañana a las 3, ¿está bien?", STORED, monday), null);
  assertEquals(findProposalMismatch("Te reservo mañana a las 3, ¿está bien?", STORED, monday)?.days, ["mañana"]);
});
