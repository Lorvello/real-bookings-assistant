// ---------------------------------------------------------------------------
// P12-FABRICATED-OWNER-ESCALATION GUARD (the "never claim a human owner was contacted" guarantee, in
// CODE not prompt).
//
// Background (IUX R62-verify, extended R64): under an escalate-to-owner probe ("vraag het aan de
// eigenaar en laat me weten wat hij zegt"), the agent sometimes claims (present tense) it is actively
// contacting the owner ("Ik geef dit meteen door aan de eigenaar"), then on a forced follow-up DOUBLES
// DOWN claiming a COMPLETED real-time interaction ("Ik heb het meteen doorgegeven aan de eigenaar" /
// "hij heeft nog geen antwoord gegeven") that never happened and structurally CANNOT happen: grepped
// the full tool list in tools.ts (get_business_data, get_my_appointments, get_available_slots,
// update_lead, book_appointment, cancel_appointment, reschedule_appointment, update_booking_name) -
// there is no owner-notify / escalate / human-handoff tool anywhere in the codebase. R64 re-derived
// this live: 1/5 fresh trials hit it (phone 31600008105, IUX_r64.md), confirming it is real and
// recurring, not a one-off.
//
// This is a MATERIALLY WORSE failure shape than a false PRICE or POLICY claim: it is a false claim of
// a completed real-world ACTION/EVENT involving a human, not a false static fact. A customer told "I
// asked the owner and he hasn't answered yet" will reasonably wait for a callback that will never
// arrive. Because NO tool exists to make this claim true even accidentally, the guard can be
// CATEGORICAL (unlike the fuzzier policy-mechanism guard in policyClaimGuard.ts): on a model-prose
// turn, ANY reply that asserts (in present OR past tense) that the agent has contacted, is contacting,
// consulted, or received/is awaiting a response from a human owner/manager is by construction FALSE
// (no code path can make it true) and is rewritten to an honest "I can't reach the owner myself, here
// is how to reach them directly" reply built from the business's REAL contact info.
//
// Deliberately narrow on what it does NOT catch, to avoid over-blocking a legitimate answer:
//   - a plain REFERRAL to the owner/business for the customer to contact THEMSELVES ("neem contact op
//     met de eigenaar", "you can reach the owner via...") is fine and untouched: it is not a claim that
//     THIS agent contacted anyone;
//   - a plain REFUSAL ("ik kan de eigenaar niet rechtstreeks benaderen", "ik kan dat niet regelen") is
//     fine and untouched: it is the CORRECT honest answer, not a false claim;
//   - a future/offer OFFER phrased as a genuine question ("zal ik het vragen?") is left alone by the
//     TENSE requirement below (present/past claims only, not a bare offer-question); in practice the
//     model's false claims are declarative, matching the price/refund/confirmation guards' convention.
//
// Extracted into its own module so the pure guard logic is unit-testable without importing index.ts
// (whose top-level Deno.serve would start a server). index.ts imports `enforceNoOwnerEscalationClaim`;
// the test imports the internals (OWNER_ESCALATION_CLAIM_RE, looksLikeOwnerEscalationClaim,
// noOwnerEscalationReply). dash-free of em dashes per house rule.

const B = "(?<![\\p{L}])"; // unicode word-start
const A = "(?![\\p{L}])"; //  unicode word-end

// The "human owner/manager" noun the claim must be anchored to, so a claim about something else
// entirely ("ik geef dit door aan het systeem") never trips this guard. NL + EN.
const OWNER_NOUN = "(eigenaar|eigenaresse|baas|manager|ondernemer|owner|manager)";

// A CLAIM (not a bare referral, not a refusal) that the agent itself performed or is performing a
// contact/escalation action toward the owner. Anchored on an AGENT-SUBJECT verb ("ik" / "we") + a
// contact/relay verb, in present-continuous-as-claim OR completed-past form, near the owner noun.
// NL forms: "ik vraag het (even) aan de eigenaar", "ik geef dit door aan de eigenaar", "ik heb het
// (even) nagepraat/doorgegeven/gevraagd aan de eigenaar", "de eigenaar heeft (nog) geen antwoord
// gegeven" (implies a real pending question was actually posed), "ik heb contact gehad met de
// eigenaar", "ik laat het je weten zodra de eigenaar reageert" is NOT matched (a genuine future offer,
// no claim of an already-initiated real contact) - only fires on an ALREADY-DOING or ALREADY-DONE claim.
export const OWNER_ESCALATION_CLAIM_RE = new RegExp(
  [
    // "ik vraag/geef/leg dit (nu/meteen/even) voor aan de eigenaar" (present-tense active claim)
    `${B}(ik|we|wij)${A}[^.!?]{0,10}${B}(vraag|geef|leg|heb\\s+gevraagd|stuur)${A}[^.!?]{0,40}${B}${OWNER_NOUN}${A}`,
    // "ik heb het (even) nagepraat/doorgegeven/doorgestuurd/gevraagd/besproken (met de eigenaar)"
    // (completed-past claim). Owner-noun NOT required here (unchanged from the original): a reply like
    // "ik heb het nagepraat, maar HIJ heeft nog geen antwoord gegeven" refers to the owner via a pronoun
    // from context (the customer's own preceding message), not a fresh noun, and must still be caught.
    `${B}(ik|we|wij)${A}[^.!?]{0,6}${B}heb(ben)?${A}[^.!?]{0,30}${B}(nagepraat|doorgegeven|doorgestuurd|gestuurd|gevraagd|besproken|overlegd|gecheckt)${A}`,
    // same verb set, but OWNER-NOUN-ANCHORED at a wider distance. NOTE (corrected during code review):
    // the line-64 pattern above ALSO already catches the R64 trial-6/6 test-case sentence on its own
    // once "doorgestuurd" was added to its verb list (heb-to-verb gap there is ~29 chars, under the
    // 30-char cap above; the owner-noun is not required by line 64 at all). This alternative is NOT
    // needed for THAT specific sentence; it is kept because it covers a DIFFERENT, wider-gap shape
    // line 64 cannot: a heb-to-verb gap over 30 chars (e.g. "Ik heb, na er lang over te hebben
    // nagedacht, doorgestuurd naar de eigenaar", gap ~56 chars), which still needs an owner-noun
    // anchor nearby to stay precise (an unanchored 60-char cap would be too loose). Both orderings
    // (verb-before-noun, noun-before-verb) are covered so word order does not matter.
    `${B}(ik|we|wij)${A}[^.!?]{0,6}${B}heb(ben)?${A}[^.!?]{0,60}${B}(nagepraat|doorgegeven|doorgestuurd|gestuurd|gevraagd|besproken|overlegd|gecheckt)${A}[^.!?]{0,60}${B}${OWNER_NOUN}${A}`,
    `${B}(ik|we|wij)${A}[^.!?]{0,6}${B}heb(ben)?${A}[^.!?]{0,20}${B}${OWNER_NOUN}${A}[^.!?]{0,20}${B}(nagepraat|doorgegeven|doorgestuurd|gestuurd|gevraagd|besproken|overlegd|gecheckt)${A}`,
    // "de eigenaar heeft (nog) geen antwoord gegeven / heeft gereageerd / zei" (implies a real question
    // was actually put to a real human and a real reply channel is open)
    `${B}${OWNER_NOUN}${A}[^.!?]{0,20}${B}(heeft|had)${A}[^.!?]{0,20}${B}(nog\\s+)?(geen\\s+)?(antwoord|gereageerd|gezegd|teruggekoppeld)${A}`,
    `${B}${OWNER_NOUN}${A}[^.!?]{0,10}${B}(zei|zegt|antwoordde|reageerde)${A}`,
    // R64 LIVE GAP (trial 6/6, hard-pressure re-test): "ik kan geen (directe) reactie/antwoord van de
    // eigenaar ophalen/krijgen/hebben" - phrased as the AGENT's own inability to fetch a reply rather
    // than the owner's silence, but it still implies a real pending question was posed to a real human
    // and a real reply channel exists to poll, which is exactly as false as the owner-silence phrasing
    // above (no such channel exists). Anchored on "geen" + reactie/antwoord + owner-noun + a
    // fetch/receive verb so a plain "ik heb geen informatie" (unrelated to the owner) never matches.
    `${B}geen${A}[^.!?]{0,15}${B}(directe\\s+)?(reactie|antwoord|terugkoppeling)${A}[^.!?]{0,20}${B}${OWNER_NOUN}${A}[^.!?]{0,20}${B}(ophalen|krijgen|gehad|ontvangen)${A}`,
    // "ik heb contact (gehad) met de eigenaar"
    `${B}(ik|we|wij)${A}[^.!?]{0,10}${B}(heb(ben)?\\s+)?contact${A}[^.!?]{0,15}${B}(gehad\\s+)?${B}(met\\s+)?${OWNER_NOUN}${A}`,
    // EN mirrors
    `${B}(i|we)${A}[^.!?]{0,10}${B}(am\\s+asking|asked|will\\s+let\\s+you\\s+know|have\\s+asked|passed\\s+(this|it)\\s+on|reached\\s+out|talked\\s+to|spoke\\s+(to|with))${A}[^.!?]{0,30}${B}${OWNER_NOUN}${A}`,
    `${B}${OWNER_NOUN}${A}[^.!?]{0,20}${B}(hasn'?t|has\\s+not|hasn't\\s+yet)${A}[^.!?]{0,15}${B}(replied|responded|answered)${A}`,
  ].join("|"),
  "iu",
);

// A plain REFERRAL ("neem contact op met de eigenaar", "you can reach the owner via...") or REFUSAL
// ("ik kan de eigenaar niet (rechtstreeks) benaderen", "dat kan ik niet regelen", "ik heb geen toegang")
// that must NOT be treated as a false claim, even though it mentions the owner. Mirrors the
// carve-out pattern in refundGuard/priceGuard (a correct honest answer must never be corrupted).
const REFERRAL_OR_REFUSAL_RE = new RegExp(
  [
    `${B}(neem|kun\\s+je|kunt\\s+u)${A}[^.!?]{0,20}${B}(zelf\\s+)?contact${A}`,
    `${B}(kan|kun)${A}[^.!?]{0,20}${B}(niet|geen)${A}[^.!?]{0,30}${B}(benaderen|bereiken|regelen|inzien|beantwoorden)${A}`,
    `${B}(niet|geen)${A}[^.!?]{0,20}${B}(toegang|directe\\s+lijn|rechtstreeks)${A}`,
    `${B}(you|u|je)${A}[^.!?]{0,15}${B}can${A}[^.!?]{0,15}${B}(reach|contact)${A}`,
    `${B}(i|ik)${A}[^.!?]{0,15}${B}(can't|cannot|kan\\s+niet|kan\\s+de)${A}[^.!?]{0,20}${B}(reach|contact|benaderen)${A}`,
  ].join("|"),
  "iu",
);

// True iff the reply CLAIMS an already-initiated or already-completed real contact with the human
// owner (a claim that is categorically false, since no such tool exists). A plain referral/refusal is
// carved out so the correct honest answer is never touched.
export function looksLikeOwnerEscalationClaim(reply: string): boolean {
  if (!OWNER_ESCALATION_CLAIM_RE.test(reply)) return false;
  if (REFERRAL_OR_REFUSAL_RE.test(reply)) return false;
  return true;
}

// Honest replacement: the agent cannot itself contact the owner in real time (no such tool exists),
// so it should say so plainly and point to the business's REAL contact channel. `contactPhone`/
// `contactEmail` are the verbatim business_data values (may be null; fall back to a generic pointer).
export function noOwnerEscalationReply(
  customerLanguage: string | null,
  contactPhone?: string | null,
  contactEmail?: string | null,
): string {
  const en = customerLanguage != null;
  const contacts = [contactPhone, contactEmail].filter((c): c is string => !!c && c.trim().length > 0);
  const contactLine = contacts.length > 0 ? contacts.join(" / ") : null;
  if (en) {
    return contactLine
      ? `I'm not able to contact the owner myself or relay a real-time answer. Please reach out directly via ${contactLine} for that.`
      : `I'm not able to contact the owner myself or relay a real-time answer. Please reach out to them directly for that.`;
  }
  return contactLine
    ? `Ik kan de eigenaar niet zelf benaderen of een antwoord in real time doorgeven. Neem daarvoor rechtstreeks contact op via ${contactLine}.`
    : `Ik kan de eigenaar niet zelf benaderen of een antwoord in real time doorgeven. Neem daarvoor het beste rechtstreeks contact op.`;
}

// THE guarantee: on a model-prose turn, the reply must NEVER claim the agent contacted, is
// contacting, or received a response from a human owner (no such tool exists anywhere in the
// codebase, so ANY such claim is categorically false). If the reply makes that claim, REWRITE it to
// the honest real-contact-info reply. No-op on a plain referral/refusal (the correct answer).
export function enforceNoOwnerEscalationClaim(
  replyText: string,
  customerLanguage: string | null,
  contactPhone?: string | null,
  contactEmail?: string | null,
): string {
  if (!looksLikeOwnerEscalationClaim(replyText)) return replyText;
  console.warn(
    `owner-escalation-guard: rewrote a fabricated owner-contact claim (no such tool exists):`,
    JSON.stringify(replyText),
  );
  return noOwnerEscalationReply(customerLanguage, contactPhone, contactEmail);
}
