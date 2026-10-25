// Deterministic unit tests for the pending-proposal time guard (R84, Mathieu 25-10-2026: "Ja, bouw het
// tijdvangnet nu, vóór de grote test van dinsdag."). The table mirrors
// launch-ready-loop/ONTWERP_TIJDVANGNET_2026-10-25.md. A proposal sentence that names another time or day
// than the stored pending_booking must be caught; every other sentence, and the guard's own fallback
// text, must never be. Run: deno test pendingTimeGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { countCustomerQuestions } from "../_shared/sanitizeReply.ts";
import {
  findProposalMismatch,
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
  ["an offer without proposal words is out of scope", "Wil je liever 16:00?", null],
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
