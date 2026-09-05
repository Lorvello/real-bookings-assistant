import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.19";

const migration = await Deno.readTextFile(
  new URL(
    "../../migrations/20260717003000_R19_atomic_installment_settings_contract.sql",
    import.meta.url,
  ),
);
const edge = await Deno.readTextFile(
  new URL("../manage-installment-settings/index.ts", import.meta.url),
);

Deno.test("unsupported delayed installment plans fail before R19 rewrites state", () => {
  const preflight = migration.indexOf(
    "INSTALLMENT_LEGACY_PLAN_REQUIRES_EXPLICIT_RECONCILIATION",
  );
  const normalization = migration.indexOf(
    "UPDATE public.users\nSET default_installment_plan",
  );

  assert(preflight >= 0, "missing explicit legacy-plan preflight");
  assert(
    normalization > preflight,
    "legacy-plan preflight must run before installment normalization",
  );
  assertStringIncludes(
    migration,
    "v_preset NOT IN ('100_at_booking', '50_50', 'fixed_deposit')",
  );
  assertStringIncludes(
    migration,
    "preset_plan IN ('100_at_booking', '50_50', 'fixed_deposit')",
  );
  assertStringIncludes(migration, '@.timing == "hours_after"');
  assertEquals(migration.includes("SET preset_plan = '50_50'"), false);
});

Deno.test("the unimplemented customer-choice capability remains fail-closed", () => {
  assertStringIncludes(
    migration,
    "CHECK (allow_customer_installment_choice IS FALSE)",
  );
  assertStringIncludes(
    migration,
    "CHECK (allow_customer_choice IS FALSE)",
  );
  assertStringIncludes(
    migration,
    "allow_customer_installment_choice = false",
  );
  assertStringIncludes(edge, "p_allow_customer_choice: false");
  assertStringIncludes(edge, "allowCustomerChoice: false");
});
