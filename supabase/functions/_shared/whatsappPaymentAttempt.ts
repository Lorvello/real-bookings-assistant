export interface StoredWhatsappPaymentSession {
  paymentSessionId: string;
  stripeSessionId: string;
  paymentUrl: string;
  createdAt: string;
  amountCents: number;
  paymentStatus: "pending" | "processing";
  attemptGeneration: number;
}

export type WhatsappPaymentAttemptClaim =
  | {
    outcome: "claimed";
    claimToken: string;
    requestFingerprint: string;
    attemptGeneration: number;
  }
  | ({ outcome: "replay" } & StoredWhatsappPaymentSession)
  | ({
    outcome: "reconcile";
    requestFingerprint: string;
    providerOwnershipVersion: number;
  } & StoredWhatsappPaymentSession)
  | {
    outcome: "in_progress" | "blocked" | "conflict";
    code: string;
    retainedBalanceCents?: number;
  };

export interface WhatsappPaymentStripeSession {
  id: string;
  url: string | null;
}

export interface WhatsappPaymentStripeSessionState {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired";
  paymentStatus: "paid" | "unpaid" | "no_payment_required";
  expiresAt: string;
  metadata: Record<string, string>;
}

export interface WhatsappPaymentStripeTransport<CreateParams> {
  createCheckoutSession(
    params: CreateParams,
    options: {
      idempotencyKey: string;
      attemptGeneration: number;
      requestFingerprint: string;
    },
  ): Promise<WhatsappPaymentStripeSession>;
  retrieveCheckoutSession?(
    sessionId: string,
  ): Promise<WhatsappPaymentStripeSessionState>;
  expireCheckoutSession?(sessionId: string): Promise<void>;
}

export class WhatsappPaymentAttemptError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly bookingDisposition: "preserve" | "cancel_safe";
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    httpStatus = 409,
    options: {
      bookingDisposition?: "preserve" | "cancel_safe";
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "WhatsappPaymentAttemptError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.bookingDisposition = options.bookingDisposition ?? "preserve";
    this.retryable = options.retryable ?? false;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MAX_STRIPE_IDEMPOTENCY_KEY_LENGTH = 255;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_WHATSAPP_PAYMENT_ATTEMPT_RESULT");
  }
  return value as Record<string, unknown>;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function parseStoredSession(
  value: Record<string, unknown>,
): StoredWhatsappPaymentSession {
  const paymentSessionId = value.payment_session_id;
  const stripeSessionId = value.stripe_session_id;
  const paymentUrl = value.payment_url;
  const createdAt = value.created_at;
  const amountCents = value.amount_cents;
  const paymentStatus = value.payment_status;
  const attemptGeneration = value.attempt_generation;

  if (
    typeof paymentSessionId !== "string" ||
    !UUID_PATTERN.test(paymentSessionId) ||
    typeof stripeSessionId !== "string" ||
    stripeSessionId.trim().length === 0 ||
    typeof paymentUrl !== "string" ||
    !paymentUrl.startsWith("https://") ||
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof amountCents !== "number" ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    (paymentStatus !== "pending" && paymentStatus !== "processing") ||
    !isPositiveSafeInteger(attemptGeneration)
  ) {
    throw new Error("INVALID_WHATSAPP_PAYMENT_STORED_SESSION");
  }

  return {
    paymentSessionId,
    stripeSessionId,
    paymentUrl,
    createdAt,
    amountCents,
    paymentStatus,
    attemptGeneration,
  };
}

export function parseWhatsappPaymentAttemptClaim(
  value: unknown,
): WhatsappPaymentAttemptClaim {
  const claim = asRecord(value);

  if (
    claim.outcome === "claimed" &&
    typeof claim.claim_token === "string" &&
    UUID_PATTERN.test(claim.claim_token) &&
    typeof claim.request_fingerprint === "string" &&
    SHA256_PATTERN.test(claim.request_fingerprint) &&
    isPositiveSafeInteger(claim.attempt_generation)
  ) {
    return {
      outcome: "claimed",
      claimToken: claim.claim_token,
      requestFingerprint: claim.request_fingerprint,
      attemptGeneration: claim.attempt_generation,
    };
  }

  if (claim.outcome === "replay") {
    return { outcome: "replay", ...parseStoredSession(claim) };
  }

  if (
    claim.outcome === "reconcile" &&
    typeof claim.request_fingerprint === "string" &&
    SHA256_PATTERN.test(claim.request_fingerprint) &&
    isPositiveSafeInteger(claim.provider_ownership_version)
  ) {
    return {
      outcome: "reconcile",
      ...parseStoredSession(claim),
      requestFingerprint: claim.request_fingerprint,
      providerOwnershipVersion: claim.provider_ownership_version,
    };
  }

  if (
    ["in_progress", "blocked", "conflict"].includes(
      String(claim.outcome),
    ) &&
    typeof claim.code === "string" &&
    claim.code.length > 0
  ) {
    const retainedBalanceCents = claim.retained_balance_cents;
    if (
      retainedBalanceCents !== undefined &&
      (typeof retainedBalanceCents !== "number" ||
        !Number.isSafeInteger(retainedBalanceCents) ||
        retainedBalanceCents < 0)
    ) {
      throw new Error("INVALID_WHATSAPP_PAYMENT_ATTEMPT_RESULT");
    }
    return {
      outcome: claim.outcome as "in_progress" | "blocked" | "conflict",
      code: claim.code,
      ...(typeof retainedBalanceCents === "number"
        ? { retainedBalanceCents }
        : {}),
    };
  }

  throw new Error("INVALID_WHATSAPP_PAYMENT_ATTEMPT_RESULT");
}

function canonicalize(value: unknown): unknown {
  if (
    value === null || typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("WHATSAPP_PAYMENT_FINGERPRINT_NON_FINITE_NUMBER");
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  throw new Error("WHATSAPP_PAYMENT_FINGERPRINT_UNSUPPORTED_VALUE");
}

export async function fingerprintWhatsappPaymentAttempt(
  value: unknown,
): Promise<string> {
  const serialized = JSON.stringify(canonicalize(value));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(serialized),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

interface RunWhatsappPaymentAttemptOptions<CreateParams> {
  claim: unknown;
  transport: WhatsappPaymentStripeTransport<CreateParams>;
  createParams: CreateParams;
  idempotencyKey: string;
  providerBookingId?: string;
  reconcile?: (input: {
    attemptGeneration: number;
    requestFingerprint: string;
    stripeSessionId: string;
    providerStatus: "open" | "complete" | "expired";
    providerPaymentStatus: "paid" | "unpaid" | "no_payment_required";
    providerExpiresAt: string;
    paymentUrl: string | null;
  }) => Promise<unknown>;
  finalize: (input: {
    claimToken: string;
    requestFingerprint: string;
    attemptGeneration: number;
    stripeSessionId: string;
    paymentUrl: string;
  }) => Promise<unknown>;
}

async function expireCheckoutSessionBestEffort<CreateParams>(
  transport: WhatsappPaymentStripeTransport<CreateParams>,
  sessionId: string,
): Promise<void> {
  try {
    await transport.expireCheckoutSession?.(sessionId);
  } catch {
    // Cleanup remains best effort. The ledger decision and original conflict are
    // authoritative even when Stripe is temporarily unavailable.
  }
}

function generationIdempotencyKey(base: string, generation: number): string {
  const key = `${base}:generation:${generation}`;
  if (key.length > MAX_STRIPE_IDEMPOTENCY_KEY_LENGTH) {
    throw new WhatsappPaymentAttemptError(
      "WHATSAPP_PAYMENT_IDEMPOTENCY_KEY_TOO_LONG",
      "The payment-attempt idempotency key is invalid.",
      500,
    );
  }
  return key;
}

function parseProviderSession(
  value: unknown,
  expected: {
    storedSessionId: string;
    bookingId: string;
    attemptGeneration: number;
    requestFingerprint: string;
    providerOwnershipVersion: number;
  },
): WhatsappPaymentStripeSessionState {
  let session: Record<string, unknown>;
  let metadataRaw: Record<string, unknown>;
  try {
    session = asRecord(value);
    metadataRaw = asRecord(session.metadata);
  } catch {
    throw new WhatsappPaymentAttemptError(
      "STRIPE_CHECKOUT_SESSION_INVALID",
      "Stripe returned an invalid Checkout session state.",
      502,
    );
  }
  const metadata: Record<string, string> = {};
  for (const [key, entry] of Object.entries(metadataRaw)) {
    if (typeof entry !== "string") {
      throw new WhatsappPaymentAttemptError(
        "STRIPE_CHECKOUT_SESSION_INVALID",
        "Stripe returned invalid Checkout ownership metadata.",
        502,
      );
    }
    metadata[key] = entry;
  }

  const id = session.id;
  const url = session.url;
  const status = session.status;
  const paymentStatus = session.paymentStatus;
  const expiresAt = session.expiresAt;
  if (
    typeof id !== "string" || id !== expected.storedSessionId ||
    (url !== null &&
      (typeof url !== "string" || !url.startsWith("https://"))) ||
    !["open", "complete", "expired"].includes(String(status)) ||
    !["paid", "unpaid", "no_payment_required"].includes(
      String(paymentStatus),
    ) ||
    typeof expiresAt !== "string" ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    (status === "open" && typeof url !== "string")
  ) {
    throw new WhatsappPaymentAttemptError(
      "STRIPE_CHECKOUT_SESSION_INVALID",
      "Stripe returned an invalid Checkout session state.",
      502,
    );
  }

  const generationMetadata = metadata.whatsapp_payment_attempt_generation;
  const fingerprintMetadata = metadata.whatsapp_payment_request_fingerprint;
  const strictOwnership = expected.providerOwnershipVersion >= 2;
  if (
    metadata.booking_id !== expected.bookingId ||
    (strictOwnership &&
      (generationMetadata !== String(expected.attemptGeneration) ||
        fingerprintMetadata !== expected.requestFingerprint)) ||
    (!strictOwnership && generationMetadata !== undefined &&
      generationMetadata !== String(expected.attemptGeneration)) ||
    (!strictOwnership && fingerprintMetadata !== undefined &&
      fingerprintMetadata !== expected.requestFingerprint)
  ) {
    throw new WhatsappPaymentAttemptError(
      "WHATSAPP_PAYMENT_PROVIDER_OWNERSHIP_MISMATCH",
      "The Stripe session is not owned by this payment-attempt generation.",
    );
  }

  return {
    id,
    url: url as string | null,
    status: status as "open" | "complete" | "expired",
    paymentStatus: paymentStatus as
      | "paid"
      | "unpaid"
      | "no_payment_required",
    expiresAt,
    metadata,
  };
}

function throwForNonClaimed(
  claim: Extract<
    WhatsappPaymentAttemptClaim,
    { outcome: "in_progress" | "blocked" | "conflict" }
  >,
): never {
  throw new WhatsappPaymentAttemptError(
    claim.code,
    claim.outcome === "in_progress"
      ? "A payment link is already being created for this booking."
      : "This booking cannot start a new payment attempt.",
    claim.outcome === "in_progress" ? 409 : 409,
    {
      bookingDisposition: "preserve",
      retryable: claim.outcome === "in_progress" ||
        claim.code === "WHATSAPP_PAYMENT_PROVIDER_COMPLETION_PENDING" ||
        claim.code === "WHATSAPP_PAYMENT_ATTEMPT_IN_PROGRESS",
    },
  );
}

export async function runWhatsappPaymentAttempt<CreateParams>(
  options: RunWhatsappPaymentAttemptOptions<CreateParams>,
): Promise<StoredWhatsappPaymentSession & { replayed: boolean }> {
  let claim = parseWhatsappPaymentAttemptClaim(options.claim);

  if (claim.outcome === "reconcile") {
    if (
      !options.providerBookingId ||
      !options.transport.retrieveCheckoutSession ||
      !options.reconcile
    ) {
      throw new WhatsappPaymentAttemptError(
        "WHATSAPP_PAYMENT_RECONCILIATION_UNAVAILABLE",
        "The stored payment session cannot be safely reconciled.",
        500,
        { retryable: true },
      );
    }

    let providerRaw: WhatsappPaymentStripeSessionState;
    try {
      providerRaw = await options.transport.retrieveCheckoutSession(
        claim.stripeSessionId,
      );
    } catch {
      throw new WhatsappPaymentAttemptError(
        "STRIPE_CHECKOUT_SESSION_RETRIEVE_FAILED",
        "The stored Stripe session could not be verified.",
        502,
        { retryable: true },
      );
    }
    const provider = parseProviderSession(providerRaw, {
      storedSessionId: claim.stripeSessionId,
      bookingId: options.providerBookingId,
      attemptGeneration: claim.attemptGeneration,
      requestFingerprint: claim.requestFingerprint,
      providerOwnershipVersion: claim.providerOwnershipVersion,
    });
    claim = parseWhatsappPaymentAttemptClaim(
      await options.reconcile({
        attemptGeneration: claim.attemptGeneration,
        requestFingerprint: claim.requestFingerprint,
        stripeSessionId: provider.id,
        providerStatus: provider.status,
        providerPaymentStatus: provider.paymentStatus,
        providerExpiresAt: provider.expiresAt,
        paymentUrl: provider.url,
      }),
    );
    if (claim.outcome === "reconcile") {
      throw new WhatsappPaymentAttemptError(
        "WHATSAPP_PAYMENT_RECONCILIATION_LOOP",
        "The stored payment session reconciliation did not settle.",
        500,
        { retryable: true },
      );
    }
  }

  if (claim.outcome === "replay") {
    return { ...claim, replayed: true };
  }
  if (claim.outcome !== "claimed") {
    throwForNonClaimed(claim);
  }

  const providerSession = await options.transport.createCheckoutSession(
    options.createParams,
    {
      idempotencyKey: generationIdempotencyKey(
        options.idempotencyKey,
        claim.attemptGeneration,
      ),
      attemptGeneration: claim.attemptGeneration,
      requestFingerprint: claim.requestFingerprint,
    },
  );
  if (
    !providerSession || typeof providerSession.id !== "string" ||
    providerSession.id.trim().length === 0 ||
    typeof providerSession.url !== "string" ||
    !providerSession.url.startsWith("https://")
  ) {
    throw new WhatsappPaymentAttemptError(
      "STRIPE_CHECKOUT_SESSION_INVALID",
      "Stripe did not return a valid Checkout session.",
      502,
    );
  }

  const finalizedRaw = await options.finalize({
    claimToken: claim.claimToken,
    requestFingerprint: claim.requestFingerprint,
    attemptGeneration: claim.attemptGeneration,
    stripeSessionId: providerSession.id,
    paymentUrl: providerSession.url,
  });
  const finalizedRecord = asRecord(finalizedRaw);
  if (
    finalizedRecord.outcome !== "created" &&
    finalizedRecord.outcome !== "replay"
  ) {
    if (finalizedRecord.provider_cleanup === "expire") {
      await expireCheckoutSessionBestEffort(
        options.transport,
        providerSession.id,
      );
    }
    const code = typeof finalizedRecord.code === "string"
      ? finalizedRecord.code
      : "WHATSAPP_PAYMENT_ATTEMPT_FINALIZE_CONFLICT";
    throw new WhatsappPaymentAttemptError(
      code,
      "The Stripe session was not durably recorded.",
      409,
    );
  }

  const stored = parseStoredSession(finalizedRecord);
  if (
    stored.stripeSessionId !== providerSession.id ||
    stored.paymentUrl !== providerSession.url ||
    stored.attemptGeneration !== claim.attemptGeneration
  ) {
    if (finalizedRecord.provider_cleanup === "expire") {
      await expireCheckoutSessionBestEffort(
        options.transport,
        providerSession.id,
      );
    }
    throw new WhatsappPaymentAttemptError(
      "WHATSAPP_PAYMENT_ATTEMPT_PERSISTED_SESSION_MISMATCH",
      "The stored payment session does not match the provider session.",
      409,
    );
  }

  return {
    ...stored,
    replayed: finalizedRecord.outcome === "replay",
  };
}
