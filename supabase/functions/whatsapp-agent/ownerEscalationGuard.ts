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
//
// STRUCTURAL REWRITE (IUX R65, closes OWNERESCALATION-VERBLIST-BRITTLE): R64-verify Lens 1 ran 18
// natural phrasings for this exact claim through the R64 enumerated-verb version and got 16/18 misses
// ("op de hoogte gebracht", "ingelicht", "laten weten", "bereikt", "geinformeerd", EN "notified",
// "informed", etc, none of which were in the verb list). This is the SAME failure shape the loop
// already hit and had to structurally fix twice before (AFFIRM-CONFIRM R22-R32, WHATSAPP-DUPLICATE-
// CONFIRM-BURST R56-R61): an unbounded natural-language synonym surface cannot be closed by enumerating
// literal verbs, Dutch alone has too many ways to say "I told him", English doubles the space again.
// Per Mathew's own standing directive (state file HUMAN-GATES RESOLVED), this round replaces the
// closed verb ENUMERATION with an open communication-relation SHAPE: match on WORD STEMS (prefixes),
// not full inflected words, so every conjugation/tense/register of a communication verb is covered by
// construction instead of needing its own list entry. A stem like "informeer" alone-matches
// "informeerd", "geinformeerd", "informeren"; "hoor" alone-matches "hoorde", "gehoord", "hoor nog van
// hem"; "contact" alone-matches "contact gehad", "contact opgenomen", "in contact". This is still a
// CODE-LEVEL regex guard (not a prompt instruction) and still requires the same AGENT-SUBJECT +
// OWNER-NOUN anchoring the R64 version used to avoid over-firing (a "the owner heard a noise" style
// unrelated sentence still needs the owner-noun AND the agent/owner-as-subject shape nearby to match),
// it just stops closing the net one verb at a time and instead nets the RELATION itself: "I/we" (or
// "the owner") + any communication-relation stem, physically near the owner noun, in a completed/
// present-claim tense (never a bare future offer, which stays carved out same as before).
//
// Chose the STEM-regex direction over a secondary LLM classification pass (the other candidate
// structural fix) because: (1) latency: the <3s warm p50 gate is already tight on Groq gpt-oss-20b
// (observed p50 ~1.5s with a documented 13.7s tail outlier from prefix-cache-miss variance) and a
// second network round-trip risks compounding exactly that tail, whereas a regex costs microseconds;
// (2) a second LLM call is itself a NEW prompt-injection surface (a crafted customer message could try
// to steer the classifier call itself), while a stem-regex has no model in the loop to manipulate;
// (3) maintainability: the stem approach still needs occasional review (new communication idioms could
// emerge) but each addition is an order of magnitude cheaper than the enumerated-verb version because
// one stem covers dozens of inflections at once, so the "17th gap" failure mode is structurally less
// likely to recur, whereas the literal-verb list guarantees it will.

const B = "(?<![\\p{L}])"; // unicode word-start
const A = "(?![\\p{L}])"; //  unicode word-end

// The "human owner/manager" noun the claim must be anchored to, so a claim about something else
// entirely ("ik geef dit door aan het systeem") never trips this guard. NL + EN.
const OWNER_NOUN = "(eigenaar|eigenaresse|baas|manager|ondernemer|owner|manager)";

// OPEN communication-relation STEM set (prefixes, not full words): any token that STARTS with one of
// these stems counts as "some communication/contact relation occurred", regardless of conjugation,
// tense, or register. This is the structural replacement for the R64 enumerated verb list. Each stem
// below is deliberately a PREFIX (no trailing word-boundary marker `A` on the stem itself) so it
// matches every inflection: "informeer" matches informeerd/geinformeerd/informeren/informeerde;
// "hoor" matches hoor/hoorde/gehoord/horen; "contact" matches contact/contacten/gecontacteerd;
// "bericht" matches bericht/berichtje/berichten/berichtte. NL + EN mixed in one alternation.
const COMM_STEM =
  "(ge)?(informeer|inform|notif|meld|bericht|gestuur|stuur|contact|kortsluit|kortgesloten|gesprek|" +
  "gespro|spra|sprak|hoor|hoord|antwoord|reageer|reager|gereageer|gerea|terugkoppel|teruggekoppel|" +
  "terugbel|teruggebeld|bel(d)?|voorleg|voorgelegd|doorgeef|doorgegeven|doorgestuurd|doorstuur|" +
  "doorgespeeld|doorspeel|bereik|nagepraat|napraat|besproken|bespreek|overlegd|overleg|gecheckt|check|" +
  "geappt|app|gevraagd|vraag|weet|wist|laten\\s+weten|let\\.{0,1}\\.{0,1}know|letting\\s+know|know|" +
  "told|tell|talk|talked|speak|spoke|ask|asked|reach|reached|inform|notif|respond|responded|repl|" +
  "answer|call|called|text|texted|message|messaged|update|updated|hear|heard|made\\s+aware|awaiting)";

// A single "no sentence-boundary crossing" gap class used everywhere below: excludes `.`, `!`, `?`
// AND `;`/newline, so two independently-true clauses joined by a semicolon (a common safe-reply shape,
// "ik heb geen directe informatie van de eigenaar; hij heeft nog niet geantwoord" meaning two SEPARATE
// facts, not one claim) are never bridged into a false match. Loop-invariant, unrelated to ReDoS
// (still a plain bounded negated character class, same complexity class as the original `[^.!?]`).
const G = "[^.!?;\\n]";

// A CLAIM (not a bare referral, not a refusal) that the agent itself performed or is performing a
// contact/escalation action toward the owner, OR that the owner has already communicated back.
// Anchored on an AGENT-SUBJECT ("ik"/"we"/"I") + an explicit PAST-TENSE auxiliary ("heb"/"hebben"/
// "have"/"has") or present-claim verb, near a communication-relation STEM, near the owner noun (noun
// OR the owner-referring pronoun "hij"/"zij"/"hem"/"haar"/"him"/"her"/"them" when the owner was already
// named earlier in the same reply, matching the R64 "nagepraat...hij heeft nog geen antwoord" shape).
// Never a bare future offer ("ik laat het je weten zodra de eigenaar reageert" has no heb/have
// auxiliary + completed-stem pairing and is correctly left alone).
const OWNER_OR_PRONOUN = `(${OWNER_NOUN}|hij|zij|hem|haar|him|her|them|they)`;

export const OWNER_ESCALATION_CLAIM_RE = new RegExp(
  [
    // AGENT-SUBJECT + "heb(ben)/have/has" + communication-stem, OWNER-NOUN anchored nearby in either
    // order (covers "ik heb de eigenaar geinformeerd", "ik heb dit gemeld bij de eigenaar", "ik heb het
    // even nagepraat" + a later pronoun-only owner reference in the SAME clause window). The stem is
    // NEGATIVE-LOOKBEHIND-GUARDED against an immediately preceding "geen"/"no" (false-positive fix,
    // R65): "ik heb GEEN antwoord ... over de eigenaar" is a NOUN-OBJECT-OF-LACK statement (the agent
    // lacks information), not a claim of a completed communication action, and must not match; "ik heb
    // ... geantwoord aan de eigenaar" (an actual completed-action claim) has no "geen" immediately
    // before the stem and is unaffected.
    `${B}(ik|we|wij|i)${A}${G}{0,10}${B}(heb(ben)?|have|has)${A}${G}{0,60}(?<!geen\\s{1,3})(?<!geen\\s\\w{0,12}\\s)(?<!no\\s{1,3})${B}${COMM_STEM}(?!atie${A})${G}{0,40}${B}${OWNER_OR_PRONOUN}${A}`,
    `${B}(ik|we|wij|i)${A}${G}{0,10}${B}(heb(ben)?|have|has)${A}${G}{0,60}${B}${OWNER_OR_PRONOUN}${A}${G}{0,40}(?<!geen\\s{1,3})(?<!geen\\s\\w{0,12}\\s)(?<!no\\s{1,3})${B}${COMM_STEM}(?!atie${A})`,
    // AGENT-SUBJECT + present-tense active claim verb OR EN simple-past claim verb (EN has no separate
    // "heb" auxiliary for simple past: "I notified/informed/updated/texted/called the owner" is a
    // complete completed-past claim on its own): "ik geef dit door aan de eigenaar", "ik vraag het aan
    // de eigenaar", "I notified/informed/updated/texted/called/told/passed... the owner"
    `${B}(ik|we|wij|i)${A}${G}{0,15}${B}(geef|leg|vraag|stuur|bel|app|meld|informeer|notify|notified|ask|asked|tell|told|text|texted|message|messaged|call|called|inform|informed|update|updated|reach|reached|pass(ed)?|let)${A}${G}{0,40}${B}${OWNER_NOUN}${A}${G}{0,15}${B}know${A}`,
    `${B}(ik|we|wij|i)${A}${G}{0,15}${B}(geef|leg|vraag|stuur|bel|app|meld|informeer|notify|notified|ask|asked|tell|told|text|texted|message|messaged|call|called|inform|informed|update|updated|reach|reached|pass(ed)?)${A}${G}{0,40}${B}${OWNER_NOUN}${A}`,
    // explicit idiom not reducible to a single stem: "op de hoogte (gebracht/gesteld)", subject may be
    // the agent OR the owner-noun itself as the sentence subject ("onze eigenaar is hiervan op de
    // hoogte"); either ordering, owner-noun always required so it never fires on an unrelated topic.
    `${B}${OWNER_NOUN}${A}${G}{0,20}${B}op\\s+de\\s+hoogte${A}`,
    `${B}op\\s+de\\s+hoogte${A}${G}{0,30}${B}${OWNER_NOUN}${A}`,
    // "I'm waiting to hear from / awaiting a reply from the owner" (present-claim pending-reply, no
    // "heb"/"have" auxiliary needed in this EN progressive form)
    `${B}(waiting|awaiting)${A}${G}{0,25}${B}(hear|reply|response)${A}${G}{0,25}${B}${OWNER_OR_PRONOUN}${A}`,
    // OWNER-AS-SUBJECT + explicit "heeft/had/hasn't/has not" auxiliary + communication-stem (implies a
    // real pending question was actually posed to a real human and a real reply channel is open).
    // Requires the auxiliary so a bare "geen antwoord ... eigenaar" mention without any verb (e.g. "ik
    // heb geen antwoord op vragen OVER de eigenaar") cannot match. The "(?!atie)" guard blocks
    // "informatie" (a NOUN, not the "informeren" VERB) from matching via the "inform" stem (found during
    // /code-review, R65: "de eigenaar heeft nog geen informatie ontvangen" is an UNRELATED statement
    // about the owner lacking information, not a claim of a completed reply/response, and must not fire).
    `${B}${OWNER_NOUN}${A}${G}{0,30}${B}(heeft|had|hasn'?t|has\\s+not)${A}${G}{0,30}${B}(nog\\s+)?(niet\\s+)?(geen\\s+)?${COMM_STEM}(?!atie${A})`,
    `${B}${OWNER_NOUN}${A}${G}{0,15}${B}(zei|zegt|antwoordde|reageerde|said|replied|responded|answered)${A}`,
    // "ik hoor nog van hem/de eigenaar" / "I'm waiting to hear back" (present-claim pending-reply form,
    // still implies a real question was actually posed)
    `${B}(ik|i)${A}${G}{0,10}${B}(hoor|hear)${A}${G}{0,20}(nog\\s+van|back\\s+from)${A}`,
    // "ik kan geen (directe) reactie/antwoord van de eigenaar ophalen/krijgen" (R64 hard-pressure gap,
    // preserved): the agent's own inability to fetch a reply still implies a real pending channel
    // exists. Requires the fetch/receive VERB (ophalen/krijgen/get/got/...) so a bare "geen antwoord...
    // eigenaar" mention alone (no verb) does not match, same discipline as the owner-as-subject line.
    `${B}geen${A}${G}{0,15}${B}(directe\\s+)?(reactie|antwoord|terugkoppeling|response|reply)${A}${G}{0,20}${B}${OWNER_NOUN}${A}${G}{0,20}${B}(ophalen|krijgen|gehad|ontvangen|get|got|receive|received)${A}`,
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
