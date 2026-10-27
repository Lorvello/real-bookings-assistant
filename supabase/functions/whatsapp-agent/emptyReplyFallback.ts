// The line the customer gets when reply assembly ends with an EMPTY reply (index.ts, just before
// the send). Found on staging 2026-10-27 (duel D06, build e6e03e7d): an English customer got the
// Dutch line because it was a single hard-coded Dutch string.
export const EMPTY_REPLY_FALLBACK_NL = "Sorry, daar ging even iets mis. Kun je het nog een keer sturen? 🙏";

// Any non-Dutch customer gets English, the same `customerLanguage ? EN : NL` convention as the
// other server-written replies (KEEP_REPLY_EN, the cancellation and refund lines in index.ts).
export const EMPTY_REPLY_FALLBACK_EN = "Sorry, something went wrong there. Could you send your message again? 🙏";

export function emptyReplyFallback(customerLanguage: string | null): string {
  return customerLanguage ? EMPTY_REPLY_FALLBACK_EN : EMPTY_REPLY_FALLBACK_NL;
}
