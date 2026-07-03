// ---------------------------------------------------------------------------
// P12-HALLUCINATED-LOYALTY-POLICY / P12-CONFIRMED-FALSE-SOCIAL-PROOF-DISCOUNT GUARD (the "never
// assert a discount/loyalty MECHANISM the data forbids" guarantee, in CODE, narrow by design).
//
// Background (IUX R62/R62-verify, extended R64): under sustained discount pressure, the 20B model
// sometimes invents a plausible-sounding but entirely fake loyalty/discount MECHANISM (a "spaaractie"
// buy-10-get-11th-free stamp card, a tiered-visit scheme, an ad-hoc bundle discount), or worse,
// CONFIRMS a customer's own fabricated premise ("my friend got EUR10 off") as true and then invents a
// detailed eligibility mechanism for the fake discount. Schema-confirmed (information_schema grep,
// R62-verify): there is NO discount/loyalty/coupon/promo column or table anywhere in this database, so
// ANY such claim is, by construction, false; there is no legitimate mechanism it could correctly be
// describing. R64 re-derived this live: 1/3 fresh loyalty-policy trials and 1/3 fresh false-social-proof
// trials hit it (IUX_r64.md), consistent with the prior ~1-in-3-to-1-in-4 read.
//
// UNLIKE the price guard (a bare euro amount is easy to pattern-match against a known-good set), a
// policy-MECHANISM claim has no single canonical shape: "spaaractie", "na tien bezoeken gratis",
// "eerste-klant-korting", "bundelkorting" are all different words for the same underlying lie. A fully
// general "is this sentence describing a discount mechanism" classifier would need an LLM call (extra
// latency, another probabilistic step) or a huge keyword net (high false-positive risk: "de korting van
// 10 procent BTW" or "geen kortingen" would need careful negation handling, same class of complexity as
// refundGuard's negation logic but on fuzzier ground). We deliberately choose the NARROWER, more
// honest-and-robust option here: this guard targets the SPECIFIC, HIGH-CONFIDENCE shape both real
// findings share, an AFFIRMATIVE claim that ties a discount/loyalty word to a concrete MECHANISM detail
// (a percentage, a visit-count, a fixed euro-off, or an eligibility condition like "eerste afspraak"/
// "vaste klant"), while a plain "we hebben geen kortingen" refusal (the correct, common answer) is
// explicitly carved out via a NEGATION check mirroring refundGuard's NEGATED_REFUND_RE. This is layered
// UNDERNEATH a prompt-level reinforcement (prompt.ts explicitly lists what the agent may state about
// discounts: nothing, unless the exact business_data fields say so) which is the first, honest line of
// defense for the harder-to-pattern-match cases; this code guard is defense-in-depth for the
// high-confidence mechanism-detail shape, the same layering discipline as every other *Guard.ts module.
//
// Extracted into its own module so the pure guard logic is unit-testable without importing index.ts.
// index.ts imports `enforceNoPolicyHallucination`; the test imports the internals
// (POLICY_MECHANISM_CLAIM_RE, NEGATED_POLICY_RE, looksLikePolicyHallucination, noPolicyReply).
// dash-free of em dashes per house rule.

const B = "(?<![\\p{L}])";
const A = "(?![\\p{L}])";

// A discount/loyalty/promo NOUN or VERB, NL + EN.
const DISCOUNT_WORD = "(korting|kortingen|spaaractie|stempelkaart|actie|aanbieding|bundelkorting|loyaliteitsprogramma|discount|promo|promotion|loyalty|bundle\\s+deal|deal)";

// A concrete MECHANISM detail: a percentage, "na X bezoeken/keer", a fixed euro-off tied to a
// condition, or an eligibility condition phrase. This is what separates a HALLUCINATED mechanism claim
// ("de elfde behandeling gratis", "10% na 5 bezoeken", "geldt voor eerste afspraak") from a vague,
// harmless non-answer ("ik weet niet zeker of er een korting is").
export const MECHANISM_DETAIL_RE = new RegExp(
  [
    // percentage tied to a discount context ("10% korting", "10 procent korting")
    `\\d{1,2}\\s*(%|procent)`,
    // "na X bezoeken/keer/behandelingen" (visit-count tiers)
    `${B}na${A}[^.!?]{0,15}${B}(bezoek|bezoeken|keer|behandeling|behandelingen|visits?)${A}`,
    // "elfde/tiende/Xe (behandeling) gratis" (stamp-card free-after-N)
    `${B}(elfde|tiende|\\d+e)${A}[^.!?]{0,20}${B}gratis${A}`,
    // "eerste afspraak/klant/boeking" eligibility condition tied to a discount word nearby (handled by
    // the outer AND with DISCOUNT_WORD, this just supplies the condition detail)
    `${B}(eerste|nieuwe)${A}[^.!?]{0,10}${B}(afspraak|klant|boeking|behandeling)${A}`,
    // "vaste klant" eligibility condition
    `${B}vaste${A}[^.!?]{0,6}${B}klant${A}`,
    // a fixed euro-off amount NOT already caught by priceGuard's positive-price matcher (this guard
    // fires on the MECHANISM description, priceGuard fires separately on any bare price claim)
    `(€|eur|euro)\\s*\\d{1,3}[^.!?]{0,15}${B}(korting|off|discount)${A}`,
    `${B}(korting|discount)${A}[^.!?]{0,15}(€|eur|euro)\\s*\\d{1,3}`,
  ].join("|"),
  "iu",
);

// The reply must ALSO contain a discount/loyalty word for this to be a policy-mechanism claim (a
// mechanism detail alone, e.g. "10%" in an unrelated context like a tax rate, must not trip this).
export const HAS_DISCOUNT_WORD_RE = new RegExp(`${B}${DISCOUNT_WORD}${A}`, "iu");

// A confirmation of the customer's fabricated premise ("dat klopt", "that's right", "ja, dat is zo")
// appearing near a discount word - the R62-verify trial-C / R64 false-social-proof shape, arguably
// worse than an unprompted invention because it validates the customer's manipulation attempt.
export const PREMISE_CONFIRM_RE = new RegExp(
  [
    `${B}(dat|dit)${A}[^.!?]{0,4}${B}(klopt|is\\s+zo|is\\s+waar)${A}`,
    `${B}(ja,?\\s+)?(dat|that)${A}[^.!?]{0,10}${B}(klopt|correct|right)${A}`,
    `${B}goede${A}[^.!?]{0,4}${B}vraag${A}`,
  ].join("|"),
  "iu",
);

// NEGATION carve-out, mirrors refundGuard's NEGATED_REFUND_RE: "we hebben GEEN kortingen", "there
// IS NO discount", "kan geen korting geven" is the CORRECT common refusal and must never be rewritten
// even though it contains a discount word. Deliberately checked PER-CLAUSE (split on .!?,;:), not
// reply-wide: a reply can correctly negate ONE discount word in one clause ("we hebben geen extra
// kortingen") while ALSO asserting a fabricated mechanism in the very next clause ("maar na tien
// bezoeken krijg je de elfde behandeling gratis"), so a reply-wide (or whole-sentence-wide, comma
// included) negation check would wrongly clear the entire reply just because SOME clause in it
// contains a negated discount word. Each MECHANISM-bearing clause is judged on its own local negation.
const NEG_NEAR = "geen|niet|nooit|no|not|non|never|don't|do not|doesn't|does not|cannot|can't|won't|will not|unable|helaas\\s+niet";
export const NEGATED_POLICY_RE = new RegExp(
  [
    `${B}(${NEG_NEAR})${A}[^.!?,;:]{0,30}${B}${DISCOUNT_WORD}${A}`,
    `${B}${DISCOUNT_WORD}${A}[^.!?,;:]{0,30}${B}(${NEG_NEAR})${A}`,
  ].join("|"),
  "iu",
);

// Split into clauses on sentence AND clause boundaries (.!?,;: followed by whitespace) so negation
// scope stays local to the clause it actually negates (see comment above).
function splitClauses(reply: string): string[] {
  return reply.split(/(?<=[.!?,;:])\s+/).filter((s) => s.trim().length > 0);
}

// True iff the reply asserts a concrete, fabricated discount/loyalty MECHANISM (a percentage, a
// visit-tier, a stamp-card, an eligibility condition tied to a discount word) that is not locally
// negated (a correct "geen extra kortingen" refusal in a DIFFERENT clause must not mask a fabricated
// mechanism asserted elsewhere), OR the reply CONFIRMS a customer's fabricated discount premise
// ("dat klopt" / "goede vraag") ANYWHERE in the reply while the reply overall still mentions a
// discount word (the confirmation and the discount word are often in adjacent clauses/sentences, e.g.
// "Ja, dat klopt. Bij Lorvello bieden we soms een korting..."), unless that premise-confirmation is
// itself clearly followed by an outright negation of the same discount claim.
export function looksLikePolicyHallucination(reply: string): boolean {
  if (!HAS_DISCOUNT_WORD_RE.test(reply)) return false;
  // 1) Per-clause mechanism check: a fabricated mechanism detail not locally negated in its own clause.
  for (const clause of splitClauses(reply)) {
    if (!MECHANISM_DETAIL_RE.test(clause)) continue;
    if (!HAS_DISCOUNT_WORD_RE.test(clause) && !HAS_DISCOUNT_WORD_RE.test(reply)) continue;
    if (NEGATED_POLICY_RE.test(clause)) continue; // this clause's own negation covers it
    return true;
  }
  // 2) Reply-wide premise-confirmation check: "dat klopt" / "goede vraag" anywhere, reply overall
  // mentions a discount word, and the reply as a WHOLE is not a clean negated refusal (a reply that
  // both confirms the premise conversationally AND then firmly negates the actual discount, e.g. a
  // polite "goede vraag, maar we hebben geen kortingen", must not be flagged).
  if (PREMISE_CONFIRM_RE.test(reply) && !NEGATED_POLICY_RE.test(reply)) return true;
  return false;
}

// Honest replacement: no fabricated mechanism, defer to the owner for anything not in real
// business_data. Matches the prompt's own "ik weet het niet, verzin niets, verwijs naar rechtstreeks
// contact" convention used everywhere else in this codebase (refundGuard / priceGuard siblings).
export function noPolicyHallucinationReply(customerLanguage: string | null): string {
  const en = customerLanguage != null;
  return en
    ? "I don't have information about a specific discount or loyalty offer, so I won't guess. I can note your interest, but for a definite answer please contact us directly."
    : "Ik heb geen informatie over een specifieke korting of spaaractie, dus ik ga daar niet naar gokken. Ik kan je interesse wel noteren, maar voor een definitief antwoord kun je het beste rechtstreeks contact opnemen.";
}

// THE guarantee (narrow, defense-in-depth layer under the prompt-level reinforcement): on a
// model-prose turn, if the reply asserts a concrete fabricated discount/loyalty mechanism (or confirms
// a customer's fabricated discount premise) and is not a clear negation/refusal, REWRITE it to the
// honest no-guessing reply. No-op on the common correct "we don't have discounts" answer and on any
// reply that does not mention a discount/loyalty word at all.
export function enforceNoPolicyHallucination(
  replyText: string,
  customerLanguage: string | null,
): string {
  if (!looksLikePolicyHallucination(replyText)) return replyText;
  console.warn(
    `policy-claim-guard: rewrote a fabricated discount/loyalty policy claim:`,
    JSON.stringify(replyText),
  );
  return noPolicyHallucinationReply(customerLanguage);
}
