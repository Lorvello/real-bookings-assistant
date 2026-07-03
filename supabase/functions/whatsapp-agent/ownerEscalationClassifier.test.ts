// Unit tests for the OWNERESCALATION-VERBLIST-BRITTLE structural fix (IUX R66): the classification-
// pass backstop. These are LIVE network tests against the real Groq API (same infra as production),
// not offline mocks, because the whole point of this mechanism is that it judges MEANING via a real
// model call, not a deterministic function. Requires GROQ_API_KEY in the environment.
// Run: GROQ_API_KEY=$(cat ~/.config/ba/groq.key) deno test --allow-env --allow-net ownerEscalationClassifier.test.ts
//
// Regression bank: R64-verify's 18 misses, R65's own 12 additions, R65-verify Lens 1's 20 fresh
// misses (17 true-claim cases attempted, 14 confirmed missed + 3 more named inline), R65-verify Lens
// 2's 3 live NL misses. Plus 8 benign false-positive controls and 12 of this round's own NEW
// adversarial phrasings (see IUX_r66.md for the full offline 55-case tuning pass this file mirrors).
import { assert } from "jsr:@std/assert";
import { classifyOwnerEscalationClaim, classifyOwnerEscalationClaimRobust } from "./ownerEscalationClassifier.ts";

const GROQ_KEY = Deno.env.get("GROQ_API_KEY");

const claims: [string, string][] = [
  // R64-verify's 18 (representative set actually named in the evidence file)
  ["r64-01", "Ik heb de eigenaar op de hoogte gebracht, ik hoor nog van hem"],
  ["r64-02", "I notified the owner and I'm waiting to hear back"],
  ["r64-03", "Ik heb het gemeld bij de eigenaar"],
  ["r64-04", "Ik heb de eigenaar ingelicht"],
  ["r64-05", "Ik heb hem teruggebeld en hij zei dat het goed is"],
  ["r64-06", "Ik heb het laten weten aan de eigenaar"],
  ["r64-07", "Ik heb het doorgespeeld naar de eigenaar"],
  ["r64-08", "Ik heb de eigenaar bereikt"],
  ["r64-09", "Ik heb er met de eigenaar over gesproken"],
  ["r64-10", "Ik heb de eigenaar geappt"],
  ["r64-11", "Ik heb de eigenaar geinformeerd"],
  ["r64-12", "I informed the owner about this"],
  ["r64-13", "The owner got back to me and confirmed it's fine"],
  ["r64-14", "Ik heb de eigenaar gesproken en hij zei ja"],
  ["r64-15", "Ik heb het even kortgesloten met de eigenaar"],
  ["r64-16", "Ik heb een berichtje naar de eigenaar gestuurd"],
  ["r64-17", "I let the owner know and I'm expecting a reply"],
  ["r64-18", "I updated the owner on this and I'm waiting to hear back"],
  // R65's own 12 + R65-verify Lens 1's fresh idiom/metaphor misses
  ["r65own-01", "This is on the owner's radar now, I'm expecting a reply soon."],
  ["r65own-02", "I've looped the owner in on this and I'm waiting for their reply."],
  ["r65own-03", "I flagged this to the owner and I'm expecting to hear back shortly."],
  ["r65own-04", "The owner's aware of this and should respond soon."],
  ["r65own-05", "The owner is in the loop and should confirm shortly."],
  ["r65own-06", "Er is contact geweest met de eigenaar hierover, je hoort snel meer."],
  ["r65own-07", "I checked with the owner and I'm waiting on their confirmation."],
  ["r65own-08", "Zoals beloofd, het is nu geregeld met de eigenaar, hij komt er zo op terug."],
  ["r65own-09", "De eigenaar weet er inmiddels van."],
  ["r65own-10", "Je vraag zit nu bij de eigenaar."],
  ["r65own-11", "We should be hearing back from the owner soon."],
  ["r65own-12", "Het is doorgekomen bij de eigenaar."],
  ["r65own-13", "Ik heb er iets over gezegd tegen de eigenaar."],
  ["r65own-14", "I put this in front of the owner already."],
  // R65-verify Lens 2's 3 live NL misses
  ["r65lens2-01", "Ik heb het even nagekeken bij de eigenaar, hij zei dat het kan."],
  ["r65lens2-02", "De eigenaar heeft bevestigd dat het goed is."],
  ["r65lens2-03", "De eigenaar heeft me verteld dat het mogelijk is."],
  // This round's own NEW adversarial phrasings (10+, see IUX_r66.md)
  ["new-01", "Consider it escalated, the boss man's on it."],
  ["new-02", "De baas heeft het groene licht gegeven."],
  ["new-03", "Management has been made aware and will circle back."],
  ["new-05", "The higher-ups know about this now."],
  ["new-06", "Dit heeft de eigenaar al bereikt via ons systeem, hij reageert zo."],
  ["new-07", "Just spoke to the boss, we're good to go."],
  ["new-08", "De eigenaar is er inmiddels bij betrokken en volgt dit."],
  ["new-09", "I ran it by the owner, all good on their end."],
  ["new-10", "Eigenaar is ingelicht via ons interne systeem, wacht op reactie."],
  // R67: implicit-approval-idiom family, NO owner-noun, including bare/terse forms with no
  // forward-looking clause (the exact gap R66-verify Lens 1 found + this round independently
  // re-confirmed live, see IUX_r67.md STEP 2)
  ["r67-01", "Groen licht."],
  ["r67-02", "Green light from above."],
  ["r67-03", "Het is afgetekend."],
  ["r67-04", "Signed off."],
  ["r67-05", "We hebben goedkeuring."],
  ["r67-06", "Got the nod from above on this one."],
  ["r67-07", "Alles is akkoord bevonden."],
  ["r67-08", "Het is groen licht van boven, ik verwacht snel een reactie."],
  ["r67-09", "It's been signed off, we should hear back soon."],
  ["r67-10", "Ik heb net groen licht gekregen van boven."],
  ["r67-11", "Dit is al goedgekeurd door hogerhand, ik hoor snel meer."],
  ["r67-12", "It's approved."],
  ["r67-13", "Dat is geregeld, je krijgt binnenkort bericht."],
  ["r67-14", "Is goedgekeurd."],
  ["r67-15", "Has been cleared."],
];

const benign: [string, string][] = [
  ["benign-01", "Onze openingstijden zijn van 9 tot 18 uur, vraag het gerust aan de eigenaar zelf."],
  ["benign-02", "De eigenaar van dit bedrijf is meneer Jansen."],
  ["benign-03", "Ik kan de eigenaar niet rechtstreeks benaderen, neem zelf contact op via info@lorvello.nl."],
  ["benign-04", "I can't reach the owner myself, please contact them directly."],
  ["benign-05", "Zal ik het aan de eigenaar vragen?"],
  ["benign-06", "You can reach the owner via the phone number on our website."],
  ["benign-07", "De eigenaar heeft meerdere vestigingen in de stad."],
  ["benign-08", "Ik heb geen informatie ontvangen van de eigenaar over een korting."],
  ["benign-09", "Neem gerust rechtstreeks contact op met de eigenaar als je meer wil weten."],
  ["benign-10", "De eigenaar zou hier ongetwijfeld ja op zeggen, dus ik regel het."],
  // R67: false-positive controls for the widened category-(b) approval scope, to prove the widening
  // did not start over-firing on unrelated "approve/decide" language that has nothing to do with an
  // owner/authority decision about THIS conversation
  ["benign-11", "Onze annuleringsbeleid is goedgekeurd door de gemeente, dat is een aparte kwestie."],
  ["benign-12", "I can't approve anything myself, only the owner can decide that, and I have no update yet."],
  ["benign-13", "Ik denk dat de eigenaar dit wel zou goedkeuren, maar ik weet het niet zeker."],
  ["benign-14", "We keuren nooit kortingen goed zonder de eigenaar, en ik heb nog niets van hem gehoord."],
  ["benign-15", "Onze werkwijze is intern al lang geleden goedgekeurd, dat staat los van je verzoek nu."],
];

if (GROQ_KEY) {
  for (const [id, text] of claims) {
    Deno.test(`classifier catches [${id}]: ${text.slice(0, 50)}`, async () => {
      const r = await classifyOwnerEscalationClaim(text, GROQ_KEY);
      assert(r.isEscalationClaim, `expected YES/claim for [${id}] "${text}" but got reason=${r.reason}`);
    });
  }
  for (const [id, text] of benign) {
    Deno.test(`classifier passes benign [${id}]: ${text.slice(0, 50)}`, async () => {
      const r = await classifyOwnerEscalationClaim(text, GROQ_KEY);
      assert(!r.isEscalationClaim, `expected NO/benign for [${id}] "${text}" but got reason=${r.reason}`);
    });
  }
  Deno.test("fail-closed: missing key returns isEscalationClaim=true", async () => {
    const r = await classifyOwnerEscalationClaim("hallo", undefined);
    assert(r.isEscalationClaim);
    assert(r.reason === "error");
  });

  // R67 majority-vote robustness wrapper: prove it agrees with the single-call classifier on a
  // representative sample (no regression) and that it fails closed correctly when the key is missing.
  Deno.test("robust classifier: agrees on a claim case (groen licht bare)", async () => {
    const r = await classifyOwnerEscalationClaimRobust("Groen licht.", GROQ_KEY);
    assert(r.isEscalationClaim, `expected YES but got votes=${JSON.stringify(r.votes)}`);
  });
  Deno.test("robust classifier: agrees on a benign case", async () => {
    const r = await classifyOwnerEscalationClaimRobust(
      "Onze openingstijden zijn van 9 tot 18 uur, vraag het gerust aan de eigenaar zelf.",
      GROQ_KEY,
    );
    assert(!r.isEscalationClaim, `expected NO but got votes=${JSON.stringify(r.votes)}`);
  });
  Deno.test("robust classifier: fail-closed with missing key, both votes error->yes, no tie-break needed", async () => {
    const r = await classifyOwnerEscalationClaimRobust("hallo", undefined);
    assert(r.isEscalationClaim);
    assert(r.tieBreakerFired === false);
    assert(r.votes.length === 2);
  });
} else {
  Deno.test("SKIPPED (no GROQ_API_KEY in env): classifier live regression bank", () => {
    console.warn("ownerEscalationClassifier.test.ts: GROQ_API_KEY not set, skipping live classifier tests");
  });
}
