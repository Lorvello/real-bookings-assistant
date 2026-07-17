import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { oneRelation } from "./postgrestRelation.ts";

Deno.test("oneRelation accepts a to-one PostgREST object", () => {
  assertEquals(oneRelation({ id: "service-1" }), { id: "service-1" });
});

Deno.test("oneRelation accepts array-shaped generated relation data", () => {
  assertEquals(oneRelation([{ id: "service-1" }]), { id: "service-1" });
  assertEquals(oneRelation([]), null);
});

Deno.test("oneRelation preserves a missing relation as null", () => {
  assertEquals(oneRelation(null), null);
  assertEquals(oneRelation(undefined), null);
});
