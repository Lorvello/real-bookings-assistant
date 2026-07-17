function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const checkSubscriptionSource = await Deno.readTextFile(
  new URL("../check-subscription/index.ts", import.meta.url),
);

Deno.test("check-subscription is an exact, read-only provider projection", () => {
  assert(
    /stripe\.subscriptions\.retrieve\(\s*subscriber\.stripe_subscription_id\s*,?\s*\)/m
      .test(checkSubscriptionSource),
    "polling must retrieve the exact durable subscription id",
  );
  assert(
    !checkSubscriptionSource.includes("stripe.customers.list("),
    "polling must not select an arbitrary customer by email",
  );
  assert(
    !checkSubscriptionSource.includes("stripe.subscriptions.list("),
    "polling must not select an arbitrary subscription from a customer list",
  );
  assert(
    !/\.from\(["'](?:users|subscribers)["']\)[\s\S]{0,160}?\.(?:update|upsert|insert|delete)\(/m
      .test(checkSubscriptionSource),
    "polling must not mutate users or subscribers entitlement state",
  );
  assert(
    !checkSubscriptionSource.includes("supabaseClient.rpc("),
    "polling must not route around the read-only contract through an RPC",
  );
  for (
    const marker of [
      '.eq("stripe_mode", stripeMode)',
      "subscription.livemode !== expectedLivemode",
      "customerId !== subscriber.stripe_customer_id",
    ]
  ) {
    assert(
      checkSubscriptionSource.includes(marker),
      `polling identity contract is missing: ${marker}`,
    );
  }
  assert(
    checkSubscriptionSource.includes("stripe_status:"),
    "the response must expose the exact provider status",
  );
});

Deno.test("R43 installs global subscription order and deleted-booking terminal guards", async () => {
  const migration = await Deno.readTextFile(
    new URL(
      "../../migrations/20260717037000_R43_subscription_global_order_and_deleted_booking_payment.sql",
      import.meta.url,
    ),
  );

  for (
    const marker of [
      "subscription_event_high_water_marks",
      "PRIMARY KEY (user_id, stripe_mode)",
      "last_event_precedence",
      "last_event_kind_precedence",
      "stale_user_mode_event_ignored",
      'COLLATE "C"',
      "state.superseded IS NOT TRUE",
      "OR state.stripe_subscription_id = p_subscription_id",
      "v_current.last_event_created",
      "v_current.last_event_kind_precedence",
      "COALESCE(v_booking.is_deleted, false)",
      "FROM PUBLIC, anon, authenticated",
      "TO service_role",
    ]
  ) {
    assert(migration.includes(marker), `R43 migration is missing: ${marker}`);
  }

  const subscriptionStart = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_event",
  );
  const invoiceStart = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public.apply_stripe_subscription_invoice_event",
  );
  const paymentStart = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public.finalize_booking_payment_success",
  );
  const subscriptionTransition = migration.slice(
    subscriptionStart,
    invoiceStart,
  );
  const invoiceTransition = migration.slice(invoiceStart, paymentStart);
  for (
    const [name, source] of [
      ["subscription", subscriptionTransition],
      ["invoice", invoiceTransition],
    ] as const
  ) {
    const userLock = source.indexOf("'stripe-subscription-user:'");
    const subscriptionLock = source.indexOf("'stripe-subscription:'");
    assert(userLock >= 0, `${name} transition is missing the user+mode lock`);
    assert(
      subscriptionLock > userLock,
      `${name} transition must lock user+mode before subscription id`,
    );
  }
});
