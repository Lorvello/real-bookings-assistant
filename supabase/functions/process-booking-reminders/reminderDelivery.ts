export type ReminderDeliveryMode = "send" | "record-only";
export type ReminderChannel = "email" | "whatsapp";

import { composeAbortSignal } from "../_shared/abortSignal.ts";

type Environment = Record<string, string | undefined>;
type Fetch = typeof fetch;

export interface AbortablePromiseLike<T> extends PromiseLike<T> {
  abortSignal?: (signal: AbortSignal) => PromiseLike<T>;
}

export class ReminderDeliveryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderDeliveryConfigurationError";
  }
}

export class ReminderDeliveryProviderError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ReminderDeliveryProviderError";
    this.status = status;
  }
}

export class ReminderResultPersistenceError extends Error {
  constructor() {
    super("REMINDER_RESULT_PERSISTENCE_FAILED");
    this.name = "ReminderResultPersistenceError";
  }
}

export class ReminderProviderAttemptPersistenceError extends Error {
  constructor() {
    super("REMINDER_PROVIDER_ATTEMPT_PERSISTENCE_FAILED");
    this.name = "ReminderProviderAttemptPersistenceError";
  }
}

export class ReminderProcessingDeadlineError extends Error {
  readonly stage: string;

  constructor(stage: string) {
    super(`REMINDER_PROCESSING_DEADLINE_EXCEEDED:${stage}`);
    this.name = "ReminderProcessingDeadlineError";
    this.stage = stage;
  }
}

export function withReminderAbortSignal<T>(
  request: AbortablePromiseLike<T>,
  signal: AbortSignal,
): PromiseLike<T> {
  return typeof request.abortSignal === "function"
    ? request.abortSignal(signal)
    : request;
}

// Every database/provider stage gets the same absolute handler deadline. The abort signal
// stops PostgREST/fetch work when supported; Promise.race is the final bound for test doubles
// or SDKs that cannot consume AbortSignal themselves.
export async function runReminderStage<T>(
  operation: (signal: AbortSignal) => PromiseLike<T>,
  deadlineAtMs: number,
  stage: string,
  maxStageMs = Number.POSITIVE_INFINITY,
): Promise<T> {
  const remainingMs = Math.min(deadlineAtMs - Date.now(), maxStageMs);
  if (
    !Number.isFinite(remainingMs) && remainingMs !== Number.POSITIVE_INFINITY
  ) {
    throw new ReminderProcessingDeadlineError(stage);
  }
  if (remainingMs <= 0) {
    throw new ReminderProcessingDeadlineError(stage);
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new ReminderProcessingDeadlineError(stage));
    }, remainingMs);
  });

  try {
    return await Promise.race([
      Promise.resolve(operation(controller.signal)),
      timeoutPromise,
    ]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export function resolveReminderDeliveryMode(
  env: Environment,
): ReminderDeliveryMode {
  const appEnv = env.APP_ENV?.trim().toLowerCase() || "production";
  const mode = env.REMINDER_DELIVERY_MODE?.trim().toLowerCase() || "send";

  if (mode === "record-only") {
    if (appEnv !== "local" && appEnv !== "test") {
      throw new ReminderDeliveryConfigurationError(
        "record_only_forbidden_outside_local_or_test",
      );
    }
    return mode;
  }
  if (mode !== "send") {
    throw new ReminderDeliveryConfigurationError("delivery_mode_invalid");
  }
  return mode;
}

export function reminderDeliveryKey(
  bookingId: string,
  reminderNumber: number,
  channel: ReminderChannel,
  scheduleGeneration: string,
): string {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    throw new ReminderDeliveryConfigurationError("booking_id_invalid");
  }
  if (reminderNumber !== 1 && reminderNumber !== 2) {
    throw new ReminderDeliveryConfigurationError("reminder_number_invalid");
  }
  if (!/^[0-9a-f-]{36}$/i.test(scheduleGeneration)) {
    throw new ReminderDeliveryConfigurationError("schedule_generation_invalid");
  }
  return `booking-reminder/${bookingId}/${reminderNumber}/${channel}/${scheduleGeneration}`;
}

export interface ReminderEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  bookingId: string;
  reminderNumber: number;
  scheduleGeneration: string;
}

export interface ReminderEmailDeliveryResult {
  mode: ReminderDeliveryMode;
  providerMessageId: string | null;
  deliveryKey: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function deliverReminderEmail(
  mode: ReminderDeliveryMode,
  apiKey: string | undefined,
  email: ReminderEmail,
  fetchImpl?: Fetch,
  timeoutMs = 10_000,
  parentSignal?: AbortSignal,
): Promise<ReminderEmailDeliveryResult> {
  const deliveryKey = reminderDeliveryKey(
    email.bookingId,
    email.reminderNumber,
    "email",
    email.scheduleGeneration,
  );
  if (mode === "record-only") {
    return { mode, providerMessageId: null, deliveryKey };
  }

  const key = apiKey?.trim();
  if (!key) {
    throw new ReminderDeliveryConfigurationError("RESEND_API_KEY_required");
  }

  const composed = composeAbortSignal(parentSignal, timeoutMs);
  try {
    let response: Response;
    try {
      response = await (fetchImpl ?? fetch)("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": deliveryKey,
        },
        body: JSON.stringify({
          from: email.from,
          to: [email.to],
          subject: email.subject,
          html: email.html,
          tags: [
            { name: "booking_id", value: email.bookingId },
            { name: "reminder_number", value: String(email.reminderNumber) },
          ],
        }),
        signal: composed.signal,
      });
    } catch (error) {
      const timedOut = composed.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError");
      throw new ReminderDeliveryProviderError(
        timedOut ? "provider_timeout" : "provider_network_error",
      );
    }

    const body = await response.json().catch(() => null);
    const providerMessageId = isRecord(body) && typeof body.id === "string" &&
        body.id.length > 0
      ? body.id
      : null;
    if (!response.ok || !providerMessageId) {
      throw new ReminderDeliveryProviderError(
        `provider_http_${response.status}`,
        response.status,
      );
    }
    return { mode, providerMessageId, deliveryKey };
  } finally {
    composed.dispose();
  }
}

export interface ReminderResultArgs {
  p_booking_id: string;
  p_reminder_number: number;
  p_schedule_generation: string;
  p_claim_token: string;
  p_provider_accepted: boolean;
  p_max_attempts: number;
  p_failure_reason: string | null;
  p_channel: ReminderChannel;
  p_delivery_mode: ReminderDeliveryMode;
  p_provider_message_id: string | null;
  p_delivery_key: string;
}

export interface ReminderProviderAttemptArgs {
  p_booking_id: string;
  p_reminder_number: number;
  p_schedule_generation: string;
  p_claim_token: string;
  p_channel: ReminderChannel;
  p_delivery_mode: ReminderDeliveryMode;
  p_delivery_key: string;
}

interface ReminderProviderAttemptRpcClient {
  rpc(
    name: "begin_booking_reminder_attempt_v2",
    args: ReminderProviderAttemptArgs,
  ): AbortablePromiseLike<{ data: boolean | null; error: unknown }>;
}

export async function beginReminderProviderAttemptOrThrow(
  client: ReminderProviderAttemptRpcClient,
  args: ReminderProviderAttemptArgs,
  deadlineAtMs: number,
): Promise<void> {
  const { data, error } = await runReminderStage(
    (signal) =>
      withReminderAbortSignal(
        client.rpc("begin_booking_reminder_attempt_v2", args),
        signal,
      ),
    deadlineAtMs,
    "provider_begin_rpc",
  );
  if (error || data !== true) {
    throw new ReminderProviderAttemptPersistenceError();
  }
}

export interface ReminderResultRow {
  attempt_count: number;
  status: string;
}

interface ReminderRpcClient {
  rpc(
    name: "record_booking_reminder_result_v2",
    args: ReminderResultArgs,
  ): AbortablePromiseLike<{
    data: ReminderResultRow[] | null;
    error: unknown;
  }>;
}

export async function recordReminderResultOrThrow(
  client: ReminderRpcClient,
  args: ReminderResultArgs,
  deadlineAtMs: number,
): Promise<ReminderResultRow> {
  const { data, error } = await runReminderStage(
    (signal) =>
      withReminderAbortSignal(
        client.rpc("record_booking_reminder_result_v2", args),
        signal,
      ),
    deadlineAtMs,
    "result_rpc",
  );
  const result = data?.[0];
  if (error || !result) {
    throw new ReminderResultPersistenceError();
  }
  return result;
}
