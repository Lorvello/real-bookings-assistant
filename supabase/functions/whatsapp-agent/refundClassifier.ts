// AS-3-V1 refund-policy classifier, extracted from index.ts so it is unit-testable in isolation
// (index.ts cannot be imported by a test: its top-level Deno.serve starts a server) and so the
// AS-Z-guard backstop can verify the full chain "owner policy text -> disposition -> guard rewrite".
//
// classifyRefundDisposition classifies an OWNER-WRITTEN refund policy text as explicitly DENYING a
// refund, explicitly GRANTING one, or silent ("unknown"). This is a structural SIGNAL (not a
// guarantee on its own): it lets the prompt route a vague refund question authoritatively, lets the
// derived cancellation line append a no-money-back clarifier under a no-refund policy, and (AS-Z-guard)
// gates the deterministic refundGuard backstop so it only rewrites a false promise under a DENIED
// policy. Conservative on purpose: only "denied" on clear no-refund / bookings-final wording, only
// "granted" on clear money-back wording; anything ambiguous stays "unknown" so the agent quotes the
// owner's text verbatim and never invents an outcome. EN + NL phrasings covered. Deny is checked
// BEFORE grant because a no-refund text often contains the word "terugbetaling" (e.g. "geen
// terugbetaling") which must not be read as a grant. dash-free of em dashes per house rule.
export function classifyRefundDisposition(text: string): "granted" | "denied" | "unknown" {
  const t = text.toLowerCase();
  // Clear no-refund / final-sale signals (NL + EN). "geen terugbetaling", "niet terugbetaald",
  // "geen restitutie", "definitief/final", "no refund(s)", "non-refundable", "all sales final".
  const denies = /\b(geen\s+(terugbetaling|restitutie|geld\s+terug)|niet\s+(terugbetaald|gerestitueerd|terugbetaalbaar)|geen\s+recht\s+op\s+(terugbetaling|restitutie)|definitief|niet[\s-]?restitueerbaar|no\s+refunds?|non[\s-]?refundable|not\s+refundable|all\s+(sales|bookings)\s+(are\s+)?final)\b/i;
  // Clear money-back grant signals. "volledige terugbetaling", "geld terug", "wordt terugbetaald",
  // "krijg je je geld terug", "full refund", "money back", "you get a refund". Note: a no-refund
  // text containing "geen terugbetaling" must NOT be read as a grant, so check deny FIRST.
  const grants = /\b(volledige?\s+terugbetaling|wordt\s+terugbetaald|je\s+geld\s+terug|recht\s+op\s+(een\s+)?(volledige\s+)?terugbetaling|full\s+refund|money\s+back|you('|’)?ll\s+get\s+(a\s+)?refund|refunded\s+in\s+full)\b/i;
  if (denies.test(t)) return "denied";
  if (grants.test(t)) return "granted";
  return "unknown";
}
