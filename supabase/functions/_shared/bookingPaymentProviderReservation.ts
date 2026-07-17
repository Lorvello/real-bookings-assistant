export type BookingDisposition = "preserve" | "cancel_safe";

export type BookingPaymentProviderClaim =
  | {
    outcome: "claimed";
    reservationId: string;
    claimToken: string;
    generation: number;
    requestFingerprint: string;
    idempotencyKey: string;
  }
  | {
    outcome: "reconcile";
    reservationId: string;
    generation: number;
    requestFingerprint: string;
    providerObjectId: string;
    providerUrl: string | null;
    providerExpiresAt: string | null;
  }
  | {
    outcome: "in_progress" | "blocked" | "conflict";
    code: string;
    bookingDisposition: BookingDisposition;
    retryable: boolean;
  };

export interface BookingPaymentProviderOwnership {
  channel: "web" | "whatsapp";
  providerKind: "payment_intent" | "checkout_session";
  generation: number;
  requestFingerprint: string;
}

export class BookingPaymentProviderError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly bookingDisposition: BookingDisposition;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    options: {
      httpStatus?: number;
      bookingDisposition?: BookingDisposition;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "BookingPaymentProviderError";
    this.code = code;
    this.httpStatus = options.httpStatus ?? 409;
    this.bookingDisposition = options.bookingDisposition ?? "preserve";
    this.retryable = options.retryable ?? false;
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("INVALID_BOOKING_PROVIDER_RESERVATION_RESULT");
  }
  return value as Record<string, unknown>;
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function parseBookingPaymentProviderClaim(
  value: unknown,
): BookingPaymentProviderClaim {
  const claim = asRecord(value);
  if (
    claim.outcome === "claimed" &&
    typeof claim.reservation_id === "string" &&
    UUID_PATTERN.test(claim.reservation_id) &&
    typeof claim.claim_token === "string" &&
    UUID_PATTERN.test(claim.claim_token) &&
    positiveInteger(claim.generation) &&
    typeof claim.request_fingerprint === "string" &&
    SHA256_PATTERN.test(claim.request_fingerprint) &&
    typeof claim.idempotency_key === "string" &&
    claim.idempotency_key.length > 0 &&
    claim.idempotency_key.length <= 255
  ) {
    return {
      outcome: "claimed",
      reservationId: claim.reservation_id,
      claimToken: claim.claim_token,
      generation: claim.generation,
      requestFingerprint: claim.request_fingerprint,
      idempotencyKey: claim.idempotency_key,
    };
  }

  if (
    claim.outcome === "reconcile" &&
    typeof claim.reservation_id === "string" &&
    UUID_PATTERN.test(claim.reservation_id) &&
    positiveInteger(claim.generation) &&
    typeof claim.request_fingerprint === "string" &&
    SHA256_PATTERN.test(claim.request_fingerprint) &&
    typeof claim.provider_object_id === "string" &&
    claim.provider_object_id.trim().length > 0 &&
    (claim.provider_url === null ||
      (typeof claim.provider_url === "string" &&
        claim.provider_url.startsWith("https://"))) &&
    (claim.provider_expires_at === null ||
      (typeof claim.provider_expires_at === "string" &&
        Number.isFinite(Date.parse(claim.provider_expires_at))))
  ) {
    return {
      outcome: "reconcile",
      reservationId: claim.reservation_id,
      generation: claim.generation,
      requestFingerprint: claim.request_fingerprint,
      providerObjectId: claim.provider_object_id,
      providerUrl: claim.provider_url,
      providerExpiresAt: claim.provider_expires_at,
    };
  }

  if (
    ["in_progress", "blocked", "conflict"].includes(String(claim.outcome)) &&
    typeof claim.code === "string" && claim.code.length > 0 &&
    (claim.booking_disposition === "preserve" ||
      claim.booking_disposition === "cancel_safe") &&
    typeof claim.retryable === "boolean"
  ) {
    return {
      outcome: claim.outcome as "in_progress" | "blocked" | "conflict",
      code: claim.code,
      bookingDisposition: claim.booking_disposition,
      retryable: claim.retryable,
    };
  }

  throw new Error("INVALID_BOOKING_PROVIDER_RESERVATION_RESULT");
}

export function throwForBookingPaymentProviderClaim(
  claim: Extract<
    BookingPaymentProviderClaim,
    { outcome: "in_progress" | "blocked" | "conflict" }
  >,
): never {
  throw new BookingPaymentProviderError(
    claim.code,
    claim.outcome === "in_progress"
      ? "A payment provider operation is already in progress for this booking."
      : "This booking cannot create another payment provider object.",
    {
      httpStatus: claim.outcome === "in_progress" ? 409 : 409,
      bookingDisposition: claim.bookingDisposition,
      retryable: claim.retryable,
    },
  );
}

function canonicalize(value: unknown): unknown {
  if (
    value === null || typeof value === "string" ||
    typeof value === "boolean"
  ) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("BOOKING_PROVIDER_FINGERPRINT_NON_FINITE_NUMBER");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  throw new Error("BOOKING_PROVIDER_FINGERPRINT_UNSUPPORTED_VALUE");
}

export async function fingerprintBookingPaymentProvider(
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

export function bookingPaymentProviderMetadata(
  ownership: BookingPaymentProviderOwnership,
): Record<string, string> {
  return {
    booking_payment_provider_channel: ownership.channel,
    booking_payment_provider_kind: ownership.providerKind,
    booking_payment_provider_generation: String(ownership.generation),
    booking_payment_provider_fingerprint: ownership.requestFingerprint,
  };
}

export function parseBookingPaymentProviderMetadata(
  metadata: Record<string, string> | null | undefined,
): BookingPaymentProviderOwnership | null {
  if (!metadata) return null;
  const channel = metadata.booking_payment_provider_channel;
  const providerKind = metadata.booking_payment_provider_kind;
  const generation = Number(metadata.booking_payment_provider_generation);
  const requestFingerprint = metadata.booking_payment_provider_fingerprint;
  if (
    (channel !== "web" && channel !== "whatsapp") ||
    (providerKind !== "payment_intent" &&
      providerKind !== "checkout_session") ||
    !positiveInteger(generation) ||
    typeof requestFingerprint !== "string" ||
    !SHA256_PATTERN.test(requestFingerprint)
  ) return null;
  return { channel, providerKind, generation, requestFingerprint };
}
