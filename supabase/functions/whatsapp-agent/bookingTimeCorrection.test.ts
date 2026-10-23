// R84: recognition of a time-only correction on a pending booking preview (S08).
// Run: deno test bookingTimeCorrection.test.ts
import { assertEquals } from "jsr:@std/assert@1.0.19";
import { correctedPreviewHours } from "./bookingTimeCorrection.ts";

Deno.test("R84 exact S08 sentence gives both readings of 3", () => {
  assertEquals(correctedPreviewHours("yeah fine. can we do 3 instead tho?"), ["03:00", "15:00"]);
});

Deno.test("R84 explicit pm and 24h times give one reading", () => {
  assertEquals(correctedPreviewHours("could you do 4pm instead"), ["16:00"]);
  assertEquals(correctedPreviewHours("make it 15:30 instead"), ["15:30"]);
});

Deno.test("R84 Dutch correction markers", () => {
  assertEquals(correctedPreviewHours("kan het toch om 3 uur?"), ["03:00", "15:00"]);
  assertEquals(correctedPreviewHours("liever om 15:00"), ["15:00"]);
  assertEquals(correctedPreviewHours("doe toch maar 3 uur"), ["03:00", "15:00"]);
  assertEquals(correctedPreviewHours("ja, kan het om 16.30 in plaats daarvan?"), ["16:30"]);
});

Deno.test("R84 messages with a day, service, name or no correction marker do not match", () => {
  assertEquals(correctedPreviewHours("can we do thursday 3 instead?"), null);
  assertEquals(correctedPreviewHours("kan het donderdag om 3 uur?"), null);
  assertEquals(correctedPreviewHours("liever knippen om 3 uur"), null);
  assertEquals(correctedPreviewHours("kan het om 3 uur?"), null);
  assertEquals(correctedPreviewHours("ja"), null);
  assertEquals(correctedPreviewHours("3"), null);
});

Deno.test("R84 impossible hours do not match", () => {
  assertEquals(correctedPreviewHours("make it 25 instead"), null);
  assertEquals(correctedPreviewHours("make it 13pm instead"), null);
});
