import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";

const source = await Deno.readTextFile(
  new URL("../whatsapp-agent/tools.ts", import.meta.url),
);
const cancelStart = source.indexOf('case "cancel_appointment"');
const cancelEnd = source.indexOf('case "reschedule_appointment"', cancelStart);
const cancelPath = source.slice(cancelStart, cancelEnd);

Deno.test("WhatsApp cancellation commits through the captured-payment-safe RPC", () => {
  assert(cancelStart >= 0 && cancelEnd > cancelStart);
  assertStringIncludes(cancelPath, '"cancel_booking_for_agent"');
  assertStringIncludes(cancelPath, "p_booking_id: b.id");
  assertStringIncludes(cancelPath, "p_phone: ctx.phone");
  assertEquals(
    cancelPath.includes('.update({\n              status: "cancelled"'),
    false,
  );
});
