// Unit test for the extracted refund classifier. 10/10 representative policies (mirrors AS-3-V1 §3c).
import { assert, assertEquals } from "jsr:@std/assert";
import { classifyRefundDisposition } from "./refundClassifier.ts";

const cases: [string, "granted" | "denied" | "unknown"][] = [
  ["Geen terugbetaling. Alle boekingen zijn definitief.", "denied"],
  ["Gratis annuleren tot 48 uur voor de afspraak. Daarna geen terugbetaling.", "denied"],
  ["Volledige terugbetaling tot 72 uur voor je afspraak, daarna 50 procent terug.", "granted"],
  ["No refunds, all sales final.", "denied"],
  ["You get a full refund if you cancel.", "granted"],
  ["Non-refundable booking.", "denied"],
  ["Je krijgt je geld terug bij tijdige annulering.", "granted"],
  ["Betaling gaat vooraf online.", "unknown"],
  ["Neem voor vragen contact op met de balie.", "unknown"],
  ["", "unknown"],
];
for (const [text, want] of cases) {
  Deno.test(`classify: ${text.slice(0, 32) || "(empty)"} => ${want}`, () =>
    assertEquals(classifyRefundDisposition(text), want));
}
