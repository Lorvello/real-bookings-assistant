type PageRequest = {
  customer: string;
  status: 'all';
  limit: number;
  starting_after?: string;
};

type ScanOptions = {
  customerId: string;
  ownerId: string;
  liveMode: boolean;
  listPage: (request: PageRequest) => Promise<unknown>;
  localSubscriptionId?: string | null;
  retrieve?: (id: string) => Promise<unknown>;
  maxPages?: number;
  timeoutMs?: number;
  now?: () => number;
};

const TERMINAL_STATUSES = new Set(['canceled', 'incomplete_expired']);
const PAGE_SIZE = 100;

type ClaimedScanOptions = {
  startedAt: number;
  scan: () => Promise<boolean>;
  release: (reason: string) => Promise<unknown>;
  now?: () => number;
  maxElapsedMs?: number;
};

type ReplayScanOptions = {
  customerId: string | undefined;
  ownerId: string;
  liveMode: boolean;
  sessionId: string;
  checkoutUrl: string;
  tierName: string;
  isAnnual: boolean;
  authoritativePriceId: string;
  retrieveSession: (id: string) => Promise<unknown>;
  scan: () => Promise<boolean>;
  timeoutMs?: number;
  nowEpochSeconds?: () => number;
};

export async function guardReplayScan(options: ReplayScanOptions): Promise<boolean> {
  const { customerId, ownerId, liveMode, sessionId, checkoutUrl, tierName, isAnnual, authoritativePriceId, retrieveSession, scan } = options;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const epoch = options.nowEpochSeconds ?? (() => Date.now() / 1000);
  if (typeof customerId !== 'string' || !customerId.trim() || customerId !== customerId.trim() ||
      typeof ownerId !== 'string' || !ownerId.trim() || ownerId !== ownerId.trim() ||
      typeof sessionId !== 'string' || !sessionId.trim() || sessionId !== sessionId.trim() ||
      typeof checkoutUrl !== 'string' || !checkoutUrl || typeof liveMode !== 'boolean' ||
      typeof tierName !== 'string' || !tierName.trim() || tierName !== tierName.trim() ||
      typeof authoritativePriceId !== 'string' || !authoritativePriceId.trim() || authoritativePriceId !== authoritativePriceId.trim() ||
      typeof isAnnual !== 'boolean' ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('SUBSCRIPTION_REPLAY_IDENTITY_UNVERIFIED');
  }
  const start = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let raw: unknown;
  try {
    raw = await Promise.race([
      Promise.resolve().then(() => retrieveSession(sessionId)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('SUBSCRIPTION_REPLAY_TIMEOUT')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
  if (performance.now() - start >= timeoutMs || !raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('SUBSCRIPTION_REPLAY_IDENTITY_UNVERIFIED');
  }
  const session = raw as Record<string, unknown>;
  const customer = typeof session.customer === 'string' ? session.customer :
    (session.customer && typeof session.customer === 'object' && !Array.isArray(session.customer)
      ? (session.customer as Record<string, unknown>).id : undefined);
  const metadata = session.metadata && typeof session.metadata === 'object' && !Array.isArray(session.metadata)
    ? session.metadata as Record<string, unknown> : undefined;
  const lines = session.line_items && typeof session.line_items === 'object' && !Array.isArray(session.line_items)
    ? session.line_items as Record<string, unknown> : undefined;
  const line = Array.isArray(lines?.data) && lines.data.length === 1 && lines.data[0] && typeof lines.data[0] === 'object'
    ? lines.data[0] as Record<string, unknown> : undefined;
  const price = typeof line?.price === 'string' ? line.price :
    (line?.price && typeof line.price === 'object' && !Array.isArray(line.price)
      ? (line.price as Record<string, unknown>).id : undefined);
  const now = epoch();
  if (session.id !== sessionId || session.livemode !== liveMode || session.mode !== 'subscription' ||
      session.status !== 'open' || session.client_reference_id !== ownerId || customer !== customerId ||
      metadata?.user_id !== ownerId || metadata?.stripe_mode !== (liveMode ? 'live' : 'test') ||
      metadata?.tier_name !== tierName || metadata?.is_annual !== String(isAnnual) ||
      (session.payment_status !== 'unpaid' && session.payment_status !== 'no_payment_required') ||
      lines?.has_more !== false || line?.quantity !== 1 || price !== authoritativePriceId ||
      session.url !== checkoutUrl || typeof session.expires_at !== 'number' ||
      !Number.isFinite(session.expires_at) || !Number.isFinite(now) || session.expires_at <= now) {
    throw new Error('SUBSCRIPTION_REPLAY_IDENTITY_UNVERIFIED');
  }
  const verdict = await scan();
  if (typeof verdict !== 'boolean') throw new Error('SUBSCRIPTION_SCAN_INVALID_VERDICT');
  const afterScan = epoch();
  if (!Number.isFinite(afterScan) || session.expires_at <= afterScan) throw new Error('SUBSCRIPTION_REPLAY_EXPIRED');
  return verdict;
}

export async function guardClaimedScan(options: ClaimedScanOptions): Promise<'clear' | 'blocked'> {
  const now = options.now ?? (() => performance.now());
  const maxElapsed = options.maxElapsedMs ?? 30_000;
  let previous = options.startedAt;
  const assertWindow = () => {
    const current = now();
    if (!Number.isFinite(options.startedAt) || !Number.isFinite(current) ||
        !Number.isFinite(maxElapsed) || maxElapsed <= 0 || current < previous ||
        current - options.startedAt >= maxElapsed) {
      throw new Error('SUBSCRIPTION_CLAIM_WINDOW_INVALID');
    }
    previous = current;
  };
  const releaseConfirmed = async (reason: string) => {
    if (await options.release(reason) !== true) throw new Error('SUBSCRIPTION_CLAIM_RELEASE_UNCONFIRMED');
  };

  let blocked: boolean;
  try {
    assertWindow();
    blocked = await options.scan();
    if (typeof blocked !== 'boolean') throw new Error('SUBSCRIPTION_SCAN_INVALID_VERDICT');
    assertWindow();
  } catch (error) {
    await releaseConfirmed('subscription_scan_failed');
    throw error;
  }
  if (blocked) {
    await releaseConfirmed('existing_subscription');
    return 'blocked';
  }
  return 'clear';
}

/** This protects creation at the local decision point; it is not provider-side fencing. */
export async function executeClaimedCheckout<T>(options: ClaimedScanOptions & {
  create: () => Promise<T>;
}): Promise<{ kind: 'blocked' } | { kind: 'created'; value: T }> {
  if (await guardClaimedScan(options) === 'blocked') return { kind: 'blocked' };
  await guardClaimedScan({ ...options, scan: () => Promise.resolve(false) });
  return { kind: 'created', value: await options.create() };
}

/** A clear result checks subscription metadata, not exclusive ownership of the customer. */
export async function scanCustomerSubscriptions(options: ScanOptions): Promise<boolean> {
  const { customerId, ownerId, liveMode, listPage, localSubscriptionId, retrieve } = options;
  const maxPages = options.maxPages ?? 20;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const now = options.now ?? (() => performance.now());
  if (typeof customerId !== 'string' || !customerId.trim() || customerId !== customerId.trim() ||
      typeof ownerId !== 'string' || !ownerId.trim() || ownerId !== ownerId.trim() ||
      (localSubscriptionId != null && (typeof localSubscriptionId !== 'string' || !localSubscriptionId.trim() || localSubscriptionId !== localSubscriptionId.trim())) ||
      typeof liveMode !== 'boolean' ||
      !Number.isInteger(maxPages) || maxPages < 1 ||
      !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('SUBSCRIPTION_SCAN_INVALID_CONFIGURATION');
  }
  let previousTime = -Infinity;
  const readTime = (): number => {
    const value = now();
    if (!Number.isFinite(value) || value < previousTime) throw new Error('SUBSCRIPTION_SCAN_CLOCK_INVALID');
    previousTime = value;
    return value;
  };
  const deadline = readTime() + timeoutMs;

  const withinDeadline = async (request: () => Promise<unknown>): Promise<unknown> => {
    const remaining = deadline - readTime();
    if (remaining <= 0) throw new Error('SUBSCRIPTION_SCAN_TIMEOUT');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Promise.resolve().then(request),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('SUBSCRIPTION_SCAN_TIMEOUT')), remaining);
        }),
      ]);
      if (readTime() >= deadline) throw new Error('SUBSCRIPTION_SCAN_TIMEOUT');
      return result;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  };

  const inspect = (value: unknown, expectedId?: string): { id: string; status: string; blocked: boolean } => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('SUBSCRIPTION_SCAN_INVALID_ROW');
    const sub = value as Record<string, unknown>;
    const id = sub.id;
    const customer = typeof sub.customer === 'string' ? sub.customer :
      (sub.customer && typeof sub.customer === 'object' && !Array.isArray(sub.customer)
        ? (sub.customer as Record<string, unknown>).id : undefined);
    const metadata = sub.metadata && typeof sub.metadata === 'object' && !Array.isArray(sub.metadata)
      ? sub.metadata as Record<string, unknown> : undefined;
    if (typeof id !== 'string' || !id || id !== id.trim() ||
        (expectedId !== undefined && id !== expectedId) || customer !== customerId ||
        sub.livemode !== liveMode || metadata?.user_id !== ownerId ||
        typeof sub.status !== 'string' || !sub.status) {
      throw new Error('SUBSCRIPTION_SCAN_IDENTITY_MISMATCH');
    }
    return { id, status: sub.status, blocked: !TERMINAL_STATUSES.has(sub.status) };
  };

  let localStatus: string | undefined;
  if (localSubscriptionId != null) {
    if (!retrieve) throw new Error('SUBSCRIPTION_SCAN_RETRIEVER_MISSING');
    const local = inspect(await withinDeadline(() => retrieve(localSubscriptionId)), localSubscriptionId);
    if (local.blocked) return true;
    localStatus = local.status;
  }

  const seen = new Set<string>();
  let cursor: string | undefined;
  for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
    const request: PageRequest = { customer: customerId, status: 'all', limit: PAGE_SIZE };
    if (cursor !== undefined) request.starting_after = cursor;
    const response = await withinDeadline(() => listPage(request));
    if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('SUBSCRIPTION_SCAN_INVALID_PAGE');
    const page = response as Record<string, unknown>;
    if (!Array.isArray(page.data) || page.data.length > PAGE_SIZE || typeof page.has_more !== 'boolean') {
      throw new Error('SUBSCRIPTION_SCAN_INVALID_PAGE');
    }
    if (page.has_more && page.data.length === 0) throw new Error('SUBSCRIPTION_SCAN_INCOMPLETE_PAGE');
    for (const raw of page.data) {
      const sub = inspect(raw);
      if (seen.has(sub.id)) throw new Error('SUBSCRIPTION_SCAN_DUPLICATE_ID');
      seen.add(sub.id);
      if (sub.id === localSubscriptionId && sub.status !== localStatus) throw new Error('SUBSCRIPTION_SCAN_STATUS_CHANGED');
      if (sub.blocked) return true;
      cursor = sub.id;
    }
    if (!page.has_more) {
      if (localSubscriptionId != null && !seen.has(localSubscriptionId)) throw new Error('SUBSCRIPTION_SCAN_LOCAL_MISSING');
      if (readTime() >= deadline) throw new Error('SUBSCRIPTION_SCAN_TIMEOUT');
      return false;
    }
  }
  throw new Error('SUBSCRIPTION_SCAN_PAGE_LIMIT');
}
