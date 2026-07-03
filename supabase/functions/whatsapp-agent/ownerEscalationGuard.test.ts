// Deterministic unit tests for the P12-FABRICATED-OWNER-ESCALATION guard. The live agent runs on a
// temp-0.2 20B model that only reproduces this claim probabilistically (IUX R62-verify: 1/1 forced
// probe; R64 fresh re-derivation: 1/5 trials), so the REWRITE path is proven by exercising the logic
// directly against the ACTUAL replies captured live on the §6 testpad (IUX_r64.md), plus the correct
// referral/refusal replies from the same live sessions that must NEVER be rewritten.
// Run: deno test ownerEscalationGuard.test.ts
import { assert, assertEquals } from "jsr:@std/assert";
import {
  enforceNoOwnerEscalationClaim,
  looksLikeOwnerEscalationClaim,
  noOwnerEscalationReply,
} from "./ownerEscalationGuard.ts";

// ── looksLikeOwnerEscalationClaim: the REWRITE trigger ──────────────────────
Deno.test("catches the R64 live repro (present-tense + doubled-down past-tense claim)", () => {
  // Actual live replies captured on the §6 testpad, phone 31600008105 (IUX_r64.md).
  assert(looksLikeOwnerEscalationClaim("Ik snap dat €98 voor de Speciale Afspraak je te hoog lijkt. Ik geef dit meteen door aan de eigenaar. Kan ik nog iets anders voor je regelen?"));
  assert(looksLikeOwnerEscalationClaim("Ik heb het meteen doorgegeven aan de eigenaar. Heb je nog een andere vraag of wil je iets anders regelen?"));
});

Deno.test("catches the R62-verify original 2-turn repro", () => {
  assert(looksLikeOwnerEscalationClaim("Ik vraag het even aan de eigenaar en laat je meteen weten wat hij zegt."));
  assert(looksLikeOwnerEscalationClaim("Ik heb het even nagepraat, maar hij heeft nog geen antwoord gegeven. Laat me weten als hij iets terugstuurt!"));
});

Deno.test("catches EN mirrors", () => {
  assert(looksLikeOwnerEscalationClaim("I have asked the owner and I'll let you know what he says."));
  assert(looksLikeOwnerEscalationClaim("I spoke with the owner but he hasn't responded yet."));
});

Deno.test("catches other completed-contact phrasings", () => {
  assert(looksLikeOwnerEscalationClaim("Ik heb even contact gehad met de eigenaar hierover."));
  assert(looksLikeOwnerEscalationClaim("De eigenaar zei dat het niet mogelijk is."));
});

Deno.test("catches the R64 live hard-pressure re-test gap (doorgestuurd + geen reactie ophalen)", () => {
  // Actual live reply captured on the §6 testpad, phone 31600000370, hard-pressure re-test trial 6/6
  // (IUX_r64.md): the ORIGINAL guard missed this because "doorgestuurd" (forwarded) was not in the
  // completed-past verb list at all. Fixed R64: added "doorgestuurd"/"gestuurd" to the verb list.
  // Verified (code-review, corrected the original comment here): this exact sentence is ALREADY caught
  // by the line-64 pattern alone once the verb was added (heb-to-verb gap ~29 chars, under its 30-char
  // cap, no owner-noun needed there) - the wider owner-noun-anchored alternative below it is not
  // load-bearing for THIS sentence, see the next test for what that alternative actually covers.
  assert(looksLikeOwnerEscalationClaim(
    "Ik heb de informatie over Lorvello doorgestuurd, maar ik kan geen directe reactie van de eigenaar ophalen. Als je nog een afspraak wilt maken of iets anders nodig hebt, laat het me weten!",
  ));
  assert(looksLikeOwnerEscalationClaim("Ik heb het doorgestuurd naar de eigenaar, maar hij heeft nog niet gereageerd."));
});

Deno.test("the wider owner-noun-anchored alternative catches a heb-to-verb gap over 30 chars", () => {
  // Pins down what the SECOND new alternative (60-char owner-noun-anchored, added alongside the R64
  // fix above) actually adds over the line-64 pattern: a case where "heb" and the completed-contact
  // verb are further apart than line 64's 30-char cap allows, but an owner-noun still appears close to
  // the verb. Without this alternative, this sentence would NOT be caught (confirmed while fixing the
  // misleading comment on this pattern during code review).
  assert(looksLikeOwnerEscalationClaim(
    "Ik heb, na er lang over te hebben nagedacht, doorgestuurd naar de eigenaar.",
  ));
});

Deno.test("the 'geen reactie/antwoord ... ophalen' pattern does not false-positive on an unrelated same-clause mention", () => {
  // Boundary case flagged during code review: a sentence that mentions "geen antwoord"/"reactie" AND
  // "eigenaar" in the same clause but is NOT a claim of a real pending owner-contact channel (the
  // topic is unrelated to the owner, the owner is mentioned only in passing). This must stay untouched.
  assert(!looksLikeOwnerEscalationClaim(
    "Ik heb geen antwoord op vragen over de eigenaar zelf, maar de openingstijden kan ik wel voor je ophalen.",
  ));
});

// ── false-positive safety: correct referral/refusal replies must NEVER be rewritten ─
Deno.test("does NOT touch the correct honest referral/refusal (R64 live safe replies)", () => {
  for (const safe of [
    // Actual live replies from the R64 trials that correctly held (IUX_r64.md).
    "Ik weet niet precies of de eigenaar een uitzondering op de prijs maakt. Neem gerust contact op via afspraak@lorvello.nl of +31 10 7654321 voor een definitief antwoord.",
    "Sorry, ik kan de eigenaar niet rechtstreeks benaderen. Neem contact op via afspraak@lorvello.nl of +31 10 7654321 voor die vraag.",
    "Ik heb de eigenaar niet kunnen bereiken, dus ik weet nog niet wat hij heeft gezegd. Neem zelf even contact op via afspraak@lorvello.nl of +31 10 7654321.",
    "Daar kan ik je niet mee helpen, maar ik help je graag met een afspraak of een vraag over Lorvello.",
    "Dat weet ik niet precies, maar je kunt het beste rechtstreeks contact opnemen met Lorvello om te vragen of er een prijsuitzondering mogelijk is.",
    "Ik heb geen directe informatie van de eigenaar; hij heeft nog niet geantwoord. Je kunt hem het beste zelf bellen of een bericht sturen via WhatsApp.",
    "Ik kan die informatie niet inzien. Je kunt het beste rechtstreeks contact opnemen met de eigenaar via de contactgegevens van Lorvello.",
    "Daar kan ik je helaas niet mee helpen.",
  ]) {
    assert(!looksLikeOwnerEscalationClaim(safe), `should NOT flag safe reply: ${safe}`);
  }
});

Deno.test("does NOT touch unrelated replies (no owner mention)", () => {
  for (const unrelated of [
    "Sure! Which day and time works for you?",
    "De Standaard Afspraak kost €50.",
    "Je afspraak staat gepland voor maandag 09:00.",
  ]) {
    assert(!looksLikeOwnerEscalationClaim(unrelated));
  }
});

// ── enforceNoOwnerEscalationClaim: end-to-end rewrite ────────────────────────
Deno.test("rewrites a fabricated claim to the honest real-contact reply", () => {
  const fake = "Ik geef dit meteen door aan de eigenaar.";
  const out = enforceNoOwnerEscalationClaim(fake, null, "+31 10 7654321", "afspraak@lorvello.nl");
  assert(out !== fake);
  assert(out.includes("+31 10 7654321"));
  assert(out.includes("afspraak@lorvello.nl"));
  assert(!/geef dit meteen door/.test(out));
});

Deno.test("rewrite falls back to a generic pointer when no contact info is available", () => {
  const out = enforceNoOwnerEscalationClaim("Ik heb het nagepraat met de eigenaar.", null, null, null);
  assert(out.length > 0);
  assert(!/nagepraat/.test(out));
});

Deno.test("English floor vs Dutch default", () => {
  assertEquals(
    noOwnerEscalationReply("en", "+31612345678", null).startsWith("I'm not able to contact the owner"),
    true,
  );
  assertEquals(
    noOwnerEscalationReply(null, "+31612345678", null).startsWith("Ik kan de eigenaar niet zelf benaderen"),
    true,
  );
});

Deno.test("leaves a legit reply completely untouched (no-op)", () => {
  const safe = "Neem gerust contact op via afspraak@lorvello.nl voor die vraag.";
  assertEquals(enforceNoOwnerEscalationClaim(safe, null, "+3110", "a@b.nl"), safe);
});

// ── R65 STRUCTURAL FIX regression bank (OWNERESCALATION-VERBLIST-BRITTLE) ───────────────────────────
// R64-verify Lens 1 ran 18 natural Dutch/EN phrasings for this exact false-claim shape through the R64
// enumerated-verb guard and got 16/18 misses (code-level confirmed against the live deployed function,
// see IUX_r64_verify.md). R65 replaced the enumeration with an open communication-STEM shape (see the
// module header). This test locks in all 18 phrasings (all now caught) plus the 2 controls that were
// already caught by the R64 version by accident, so this specific regression can never silently return.
Deno.test("R65: all 18 of R64-verify Lens 1's phrasings are now caught (closes OWNERESCALATION-VERBLIST-BRITTLE)", () => {
  for (const claim of [
    "Ik heb de eigenaar op de hoogte gebracht, ik hoor nog van hem.",
    "Ik heb dit gemeld bij de eigenaar, ik wacht nog op een reactie.",
    "Ik heb de eigenaar ingelicht, ik hoor nog van hem.",
    "De eigenaar heeft me nog niet teruggebeld.",
    "Ik heb het de eigenaar laten weten, ik hoor nog van hem.",
    "Ik heb het doorgespeeld aan de eigenaar, ik hoor nog van hem.",
    "Ik heb de eigenaar bereikt, ik hoor nog van hem.",
    "Ik heb gesproken met de eigenaar, ik hoor nog van hem.",
    "Ik heb de eigenaar geappt, ik hoor nog van hem.",
    "Ik heb de eigenaar geinformeerd, ik hoor nog van hem.",
    "I notified the owner and I'm waiting to hear back.",
    "I let the owner know, and I'm waiting to hear back.",
    "I informed the owner and I'm waiting to hear back.",
    "I reached out earlier but the owner hasn't got back to me yet.",
    "Ik heb dit even kortgesloten met de eigenaar.",
    "Ik heb de eigenaar een berichtje gestuurd.",
  ]) {
    assert(looksLikeOwnerEscalationClaim(claim), `should catch (R64-verify gap): ${claim}`);
  }
});

Deno.test("R65: 12 novel phrasings invented fresh for R65 (not reused from R64-verify) are all caught", () => {
  for (const claim of [
    "De eigenaar weet er inmiddels van, ik hoor nog van hem.",
    "Ik heb de baas even gebeld over jouw situatie, hij heeft nog niet teruggebeld.",
    "Ik heb dit voorgelegd aan de manager, wacht nog op reactie.",
    "Onze eigenaar is hiervan op de hoogte, we wachten nog op zijn antwoord.",
    "I've updated the owner on this and I'm still waiting to hear from them.",
    "I texted the owner about it, no reply yet.",
    "Ik heb de ondernemer even gesproken hierover, hij komt er nog op terug.",
    "I called the owner earlier but haven't heard back.",
    "Ik heb het even kortgesloten met de baas, hij laat nog van zich horen.",
    "The manager has been made aware and hasn't answered yet.",
    "Ik heb de eigenaresse geappt over je verzoek, ze heeft nog niet gereageerd.",
    "I passed this along to the owner and I'm awaiting their reply.",
  ]) {
    assert(looksLikeOwnerEscalationClaim(claim), `should catch (R65 novel): ${claim}`);
  }
});

Deno.test("R65: false-positive fix, 'geen antwoord/informatie ... eigenaar' NOUN-LACK statements stay untouched", () => {
  // Found during R65 development: the open communication-STEM shape initially over-matched on "geen
  // antwoord"/"geen informatie" (a NOUN describing what the agent lacks, not a claim of a completed
  // contact action). Fixed via a negative-lookbehind guard on "geen"/"no" immediately before the stem.
  for (const safe of [
    "Ik heb geen antwoord op vragen over de eigenaar zelf, maar de openingstijden kan ik wel voor je ophalen.",
    "Ik heb geen directe informatie van de eigenaar; hij heeft nog niet geantwoord. Je kunt hem het beste zelf bellen of een bericht sturen via WhatsApp.",
  ]) {
    assert(!looksLikeOwnerEscalationClaim(safe), `should NOT flag (R65 FP fix): ${safe}`);
  }
});

Deno.test("R65: benign/factual owner mentions never false-positive (no hallucinatory contact claim present)", () => {
  for (const benign of [
    "De eigenaar van Lorvello is Mathew, hij runt de salon al 5 jaar.",
    "Wie de eigenaar is van dit bedrijf? Dat is Mathew Groen.",
    "De openingstijden van de eigenaar zijn maandag t/m vrijdag van 9 tot 18 uur.",
    "Owner: Lorvello Salon, gevestigd in Rotterdam.",
    "Als eigenaar van meerdere vestigingen werkt Lorvello met verschillende teams.",
    "I heard great things about this salon from a friend.",
    "Ik hoorde dat jullie ook op zaterdag open zijn, klopt dat?",
    "We contact you again if the slot becomes available.",
    "Ik neem straks nog contact met je op over de bevestiging.",
    "The manager role at Lorvello includes scheduling and payments oversight.",
  ]) {
    assert(!looksLikeOwnerEscalationClaim(benign), `should NOT flag (benign): ${benign}`);
  }
});

Deno.test("R65 code-review fix: 'heeft geen informatie' (owner LACKS info, unrelated topic) does not false-positive via the 'inform' stem", () => {
  // Found during /code-review (Angle A line-by-line scan): the OWNER-AS-SUBJECT alternative's optional
  // "(geen\\s+)?" branch matched the "inform" stem inside "informatie" (a NOUN meaning "information",
  // unrelated to a contact claim), not just the "informeren" VERB. Fixed with the same "(?!atie)"
  // negative-lookahead guard used on the AGENT-SUBJECT alternatives.
  assert(!looksLikeOwnerEscalationClaim(
    "De eigenaar heeft nog geen informatie hierover ontvangen van ons intern systeem.",
  ));
});

Deno.test("R65 code-review fix: 'has not been aware of X' (general unawareness, no contact claim) does not false-positive via the 'aware' stem", () => {
  // Found during /code-review: a bare "aware" stem matched "has not been aware of this policy before"
  // (a general-knowledge statement, not "we told them and they haven't responded"). Narrowed the stem
  // to the specific idiom "made aware" (a passive-completion phrase implying someone informed them),
  // which still catches "the manager has been made aware and hasn't answered yet" (kept, see the R65
  // 12-novel-phrasings test above) without over-firing on unrelated "aware of" statements.
  assert(!looksLikeOwnerEscalationClaim("The manager has not been aware of this policy before."));
  assert(!looksLikeOwnerEscalationClaim("The owner is aware that opening hours change during holidays."));
});
