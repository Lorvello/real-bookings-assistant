import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { executeClaimedCheckout, guardClaimedScan, guardReplayScan, scanCustomerSubscriptions } from './checkoutSubscriptionScan.ts';

const row = (id: string, status = 'canceled') => ({
  id, status, customer: 'cus_owner', livemode: false, metadata: { user_id: 'owner' },
});
const base = { customerId: 'cus_owner', ownerId: 'owner', liveMode: false };

Deno.test('empty and terminal owned pages are clear, but every unsafe status blocks', async () => {
  assertEquals(await scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve({ data: [], has_more: false }) }), false);
  for (const status of ['canceled', 'incomplete_expired']) {
    assertEquals(await scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve({ data: [row('sub_1', status)], has_more: false }) }), false);
  }
  for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused', 'unknown_future']) {
    assertEquals(await scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve({ data: [row('sub_1', status)], has_more: false }) }), true);
  }
});

Deno.test('an eleventh subscription is scanned and blocks; page cursor is exact', async () => {
  const cursors: (string | undefined)[] = [];
  const listPage = (params: { starting_after?: string }) => {
    cursors.push(params.starting_after);
    return Promise.resolve(cursors.length === 1
      ? { data: Array.from({ length: 10 }, (_, i) => row(`sub_${i}`)), has_more: true }
      : { data: [row('sub_10', 'active')], has_more: false });
  };
  assertEquals(await scanCustomerSubscriptions({ ...base, listPage }), true);
  assertEquals(cursors, [undefined, 'sub_9']);
});

Deno.test('two clear pages must both complete', async () => {
  let calls = 0;
  assertEquals(await scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve(++calls === 1
    ? { data: [row('sub_1')], has_more: true }
    : { data: [row('sub_2')], has_more: false }) }), false);
  assertEquals(calls, 2);
});

Deno.test('invalid, mismatched or incomplete pages fail closed', async () => {
  const invalid = [
    { data: [], has_more: true },
    { data: [row('')], has_more: false },
    { data: [{ ...row('sub_1'), customer: 'cus_other' }], has_more: false },
    { data: [{ ...row('sub_1'), livemode: true }], has_more: false },
    { data: [{ ...row('sub_1'), metadata: {} }], has_more: false },
    { data: [{ ...row('sub_1'), metadata: { user_id: 'other' } }], has_more: false },
    { data: [row('sub_1')], has_more: 'false' },
    { data: null, has_more: false },
  ];
  for (const page of invalid) {
    await assertRejects(() => scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve(page) }));
  }
});

Deno.test('duplicate IDs, a provider error and reaching the page cap fail closed', async () => {
  let calls = 0;
  await assertRejects(() => scanCustomerSubscriptions({ ...base, listPage: () => Promise.resolve(++calls === 1
    ? { data: [row('sub_1')], has_more: true } : { data: [row('sub_1')], has_more: false }) }));
  calls = 0;
  await assertRejects(() => scanCustomerSubscriptions({ ...base, listPage: () => ++calls === 1
    ? Promise.resolve({ data: [row('sub_1')], has_more: true }) : Promise.reject(new Error('page_2_failed')) }));
  calls = 0;
  await assertRejects(() => scanCustomerSubscriptions({ ...base, maxPages: 2, listPage: () => Promise.resolve({ data: [row(`sub_${++calls}`)], has_more: true }) }));
  assertEquals(calls, 2);
});

Deno.test('a hanging provider request times out instead of returning a clear result', async () => {
  await assertRejects(() => scanCustomerSubscriptions({ ...base, timeoutMs: 20, listPage: () => new Promise(() => {}) }), Error, 'SUBSCRIPTION_SCAN_TIMEOUT');
});

Deno.test('a deadline passed after the response but before the final decision fails closed', async () => {
  let tick = 0;
  await assertRejects(() => scanCustomerSubscriptions({ ...base, timeoutMs: 50, now: () => ++tick >= 4 ? 100 : 0, listPage: () => Promise.resolve({ data: [], has_more: false }) }), Error, 'SUBSCRIPTION_SCAN_TIMEOUT');
});

Deno.test('invalid or backwards clocks do not produce a clear verdict', async () => {
  await assertRejects(() => scanCustomerSubscriptions({ ...base, now: () => Number.NaN, listPage: () => Promise.resolve({ data: [], has_more: false }) }), Error, 'SUBSCRIPTION_SCAN_CLOCK_INVALID');
  let tick = 1;
  await assertRejects(() => scanCustomerSubscriptions({ ...base, now: () => tick--, listPage: () => Promise.resolve({ data: [], has_more: false }) }), Error, 'SUBSCRIPTION_SCAN_CLOCK_INVALID');
});

Deno.test('the stored subscription must match ID, owner, customer and mode; missing retrieval fails', async () => {
  const good = { ...base, localSubscriptionId: 'sub_own', retrieve: () => Promise.resolve(row('sub_own')), listPage: () => Promise.resolve({ data: [row('sub_own')], has_more: false }) };
  assertEquals(await scanCustomerSubscriptions(good), false);
  for (const invalid of [row('sub_other'), { ...row('sub_own'), customer: 'cus_other' }, { ...row('sub_own'), livemode: true }, { ...row('sub_own'), metadata: {} }]) {
    await assertRejects(() => scanCustomerSubscriptions({ ...good, retrieve: () => Promise.resolve(invalid) }));
  }
  await assertRejects(() => scanCustomerSubscriptions({ ...good, retrieve: () => Promise.reject(new Error('resource_missing')) }));
  await assertRejects(() => scanCustomerSubscriptions({ ...good, listPage: () => Promise.resolve({ data: [], has_more: false }) }), Error, 'SUBSCRIPTION_SCAN_LOCAL_MISSING');
  await assertRejects(() => scanCustomerSubscriptions({ ...good, listPage: () => Promise.resolve({ data: [row('sub_own', 'incomplete_expired')], has_more: false }) }), Error, 'SUBSCRIPTION_SCAN_STATUS_CHANGED');
  await assertRejects(() => scanCustomerSubscriptions({ ...good, localSubscriptionId: '' }));
  await assertRejects(() => scanCustomerSubscriptions({ ...good, localSubscriptionId: '   ' }));
  await assertRejects(() => scanCustomerSubscriptions({ ...good, customerId: '   ' }));
  await assertRejects(() => scanCustomerSubscriptions({ ...good, ownerId: '   ' }));
});

Deno.test('claimed guard releases only its own claim when blocked or when a scan fails', async () => {
  const reasons: string[] = [];
  const release = (reason: string) => { reasons.push(reason); return Promise.resolve(true); };
  assertEquals(await guardClaimedScan({ startedAt: 0, now: () => 1, scan: () => Promise.resolve(true), release }), 'blocked');
  assertEquals(reasons, ['existing_subscription']);
  reasons.length = 0;
  await assertRejects(() => guardClaimedScan({ startedAt: 0, now: () => 1, scan: () => Promise.reject(new Error('scan_failed')), release }));
  assertEquals(reasons, ['subscription_scan_failed']);
  reasons.length = 0;
  assertEquals(await guardClaimedScan({ startedAt: 0, now: () => 1, scan: () => Promise.resolve(false), release }), 'clear');
  assertEquals(reasons, []);
});

Deno.test('a failed or non-confirmed claim release prevents further work', async () => {
  for (const result of [false, null, undefined]) {
    await assertRejects(() => guardClaimedScan({ startedAt: 0, now: () => 1, scan: () => Promise.resolve(true), release: () => Promise.resolve(result) }), Error, 'SUBSCRIPTION_CLAIM_RELEASE_UNCONFIRMED');
  }
  await assertRejects(() => guardClaimedScan({ startedAt: 0, now: () => 1, scan: () => Promise.resolve(true), release: () => Promise.reject(new Error('database_failure')) }), Error, 'database_failure');
});

Deno.test('a stale, reversed or expired claim timer releases and never returns clear', async () => {
  for (const now of [() => 31_000, () => -1, () => Number.NaN]) {
    const reasons: string[] = [];
    await assertRejects(() => guardClaimedScan({ startedAt: 0, now, scan: () => Promise.resolve(false), release: (reason: string) => { reasons.push(reason); return Promise.resolve(true); } }));
    assertEquals(reasons, ['subscription_scan_failed']);
  }
});

Deno.test('claim expiry during a slow scan prevents a clear verdict and releases the claim', async () => {
  let current = 1;
  const reasons: string[] = [];
  await assertRejects(() => guardClaimedScan({
    startedAt: 0,
    now: () => current,
    scan: () => { current = 30_001; return Promise.resolve(false); },
    release: (reason: string) => { reasons.push(reason); return Promise.resolve(true); },
  }), Error, 'SUBSCRIPTION_CLAIM_WINDOW_INVALID');
  assertEquals(reasons, ['subscription_scan_failed']);
});

Deno.test('a replay validates the exact stored session and blocks if the subscription scan blocks', async () => {
  let scans = 0;
  const session = { id: 'cs_owner', customer: 'cus_owner', livemode: false, mode: 'subscription', status: 'open', payment_status: 'unpaid', client_reference_id: 'owner', metadata: { user_id: 'owner', stripe_mode: 'test', tier_name: 'starter', is_annual: 'false' }, line_items: { data: [{ quantity: 1, price: { id: 'price_starter_month' } }], has_more: false }, url: 'https://checkout.example.test/one', expires_at: 2000 };
  const baseReplay = { customerId: 'cus_owner', ownerId: 'owner', liveMode: false, sessionId: 'cs_owner', checkoutUrl: session.url, tierName: 'starter', isAnnual: false, authoritativePriceId: 'price_starter_month', nowEpochSeconds: () => 1000, retrieveSession: () => Promise.resolve(session), scan: () => { scans++; return Promise.resolve(true); } };
  assertEquals(await guardReplayScan(baseReplay), true);
  assertEquals(scans, 1);
  const invalidSessions = [
    { ...session, customer: 'cus_other' }, { ...session, id: 'cs_other' }, { ...session, livemode: true },
    { ...session, mode: 'payment' }, { ...session, status: 'complete' }, { ...session, client_reference_id: 'other' },
    { ...session, metadata: {} }, { ...session, metadata: { user_id: 'owner', stripe_mode: 'live' } },
    { ...session, url: 'https://checkout.example.test/other' }, { ...session, expires_at: 999 },
    { ...session, metadata: { ...session.metadata, tier_name: 'professional' } },
    { ...session, metadata: { ...session.metadata, is_annual: 'true' } },
    { ...session, line_items: { data: [{ quantity: 1, price: { id: 'price_other' } }], has_more: false } },
    { ...session, line_items: { data: [{ quantity: 2, price: { id: 'price_starter_month' } }], has_more: false } },
    { ...session, line_items: { data: [{ quantity: 1, price: { id: 'price_starter_month' } }], has_more: true } },
    { ...session, line_items: { data: [], has_more: false } },
    { ...session, payment_status: 'paid' },
  ];
  for (const invalid of invalidSessions) {
    const before = scans;
    await assertRejects(() => guardReplayScan({ ...baseReplay, retrieveSession: () => Promise.resolve(invalid) }));
    assertEquals(scans, before);
  }
  await assertRejects(() => guardReplayScan({ ...baseReplay, customerId: undefined }));
  await assertRejects(() => guardReplayScan({ ...baseReplay, customerId: '  ' }));
  await assertRejects(() => guardReplayScan({ ...baseReplay, retrieveSession: () => Promise.reject(new Error('provider_unavailable')) }));
  await assertRejects(() => guardReplayScan({ ...baseReplay, scan: () => Promise.reject(new Error('provider_unavailable')) }));
  await assertRejects(() => guardReplayScan({ ...baseReplay, timeoutMs: 20, retrieveSession: () => new Promise(() => {}) }), Error, 'SUBSCRIPTION_REPLAY_TIMEOUT');
  assertEquals(await guardReplayScan({ ...baseReplay, scan: () => Promise.resolve(false) }), false);
  let epoch = 1000;
  await assertRejects(() => guardReplayScan({ ...baseReplay, nowEpochSeconds: () => epoch, scan: () => { epoch = 2001; return Promise.resolve(false); } }), Error, 'SUBSCRIPTION_REPLAY_EXPIRED');
});

Deno.test('claimed checkout invokes provider creation only after a clear, current scan', async () => {
  let calls = 0;
  let clock = 100;
  const released: string[] = [];
  const base = {
    startedAt: 100,
    now: () => clock,
    scan: () => Promise.resolve(false),
    release: (reason: string) => { released.push(reason); return Promise.resolve(true); },
    create: () => { calls++; return Promise.resolve('fake_session'); },
  };
  assertEquals(await executeClaimedCheckout({ ...base, scan: () => Promise.resolve(true) }), { kind: 'blocked' });
  assertEquals(calls, 0);
  await assertRejects(() => executeClaimedCheckout({ ...base, scan: () => Promise.reject(new Error('provider unavailable')) }));
  await assertRejects(() => executeClaimedCheckout({ ...base, release: () => Promise.resolve(false), scan: () => Promise.resolve(true) }));
  assertEquals(calls, 0);
  clock = 30_100;
  await assertRejects(() => executeClaimedCheckout(base));
  assertEquals(calls, 0);
  clock = 100;
  assertEquals(await executeClaimedCheckout(base), { kind: 'created', value: 'fake_session' });
  assertEquals(calls, 1);
  assertEquals(released, ['existing_subscription', 'subscription_scan_failed', 'subscription_scan_failed']);
});
