import { assertEquals } from "jsr:@std/assert@1.0.19";
import { parseReminderProcessRequest } from "./request.ts";

Deno.test("empty reminder request intentionally selects a bounded batch", () => {
  assertEquals(parseReminderProcessRequest({}), { bookingId: null });
});

Deno.test("reminder request accepts one valid scoped booking id", () => {
  assertEquals(
    parseReminderProcessRequest({
      booking_id: "60000000-0000-4000-8000-000000000001",
    }),
    { bookingId: "60000000-0000-4000-8000-000000000001" },
  );
});

Deno.test("malformed, empty, and surprising reminder requests fail closed", () => {
  for (
    const value of [
      null,
      [],
      { booking_id: "" },
      { booking_id: "not-a-uuid" },
      { booking_id: "60000000-0000-4000-8000-000000000001", all: true },
    ]
  ) {
    assertEquals(parseReminderProcessRequest(value), null);
  }
});
