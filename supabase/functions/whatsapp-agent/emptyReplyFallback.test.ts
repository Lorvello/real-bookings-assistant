import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { EMPTY_REPLY_FALLBACK_NL, emptyReplyFallback } from "./emptyReplyFallback.ts";

// Staging 2026-10-27, duel D06: "hi, can I book highlights with Milan ..." ended with an empty reply
// and the customer got "Sorry, daar ging even iets mis. ...". customerLanguage is null for Dutch and
// a language label otherwise (the same convention as every other `customerLanguage ? EN : NL` reply).
Deno.test("empty-reply fallback: an English customer gets English", () => {
  const line = emptyReplyFallback("het Engels");
  assert(!/daar ging|sturen/i.test(line), `still Dutch: ${line}`);
  assert(/something went wrong/i.test(line), `not the English line: ${line}`);
});

Deno.test("empty-reply fallback: any non-Dutch customer gets the English line, as the other replies do", () => {
  assertEquals(emptyReplyFallback("het Duits"), emptyReplyFallback("het Engels"));
});

Deno.test("empty-reply fallback: a Dutch customer keeps the existing line byte for byte", () => {
  assertEquals(emptyReplyFallback(null), EMPTY_REPLY_FALLBACK_NL);
  assertEquals(EMPTY_REPLY_FALLBACK_NL, "Sorry, daar ging even iets mis. Kun je het nog een keer sturen? 🙏");
});

Deno.test("empty-reply fallback: index.ts uses this module, no hard-coded Dutch line left at the send", () => {
  const src = Deno.readTextFileSync(new URL("./index.ts", import.meta.url));
  assert(!src.includes('"Sorry, daar ging even iets mis.'), "index.ts still carries the hard-coded Dutch line");
  assert(src.includes("emptyReplyFallback(customerLanguage)"), "index.ts does not call emptyReplyFallback(customerLanguage)");
});
