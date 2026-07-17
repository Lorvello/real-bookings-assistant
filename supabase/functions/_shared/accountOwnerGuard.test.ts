import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.190.0/testing/asserts.ts";
import {
  ACCOUNT_OWNER_REQUIRED_CODE,
  AccountOwnerRequiredError,
  isAccountOwnerRequiredError,
  requireAccountOwner,
} from "./accountOwnerGuard.ts";

Deno.test("requireAccountOwner returns the authenticated owner id for a null parent", () => {
  assertEquals(
    requireAccountOwner(null, "11111111-1111-4111-8111-111111111111"),
    "11111111-1111-4111-8111-111111111111",
  );
});

for (
  const accountOwnerId of [
    "11111111-1111-4111-8111-111111111111",
    undefined,
  ]
) {
  Deno.test(`requireAccountOwner fails closed for ${String(accountOwnerId)}`, () => {
    const error = assertThrows(
      () =>
        requireAccountOwner(
          accountOwnerId,
          "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
        ),
      AccountOwnerRequiredError,
    );

    assertEquals(error.status, 403);
    assertEquals(error.code, ACCOUNT_OWNER_REQUIRED_CODE);
    assertEquals(isAccountOwnerRequiredError(error), true);
  });
}
