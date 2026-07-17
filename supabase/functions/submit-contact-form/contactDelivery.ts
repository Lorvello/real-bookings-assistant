import type { ContactEmailContent } from "./contactSubmission.ts";

export class ContactDeliveryConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactDeliveryConfigurationError";
  }
}

export class ContactDeliveryProviderError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "ContactDeliveryProviderError";
    this.status = status;
  }
}

export type ContactDeliveryConfig =
  | {
    mode: "record-only";
    appEnv: "local" | "test";
  }
  | {
    mode: "send";
    apiKey: string;
    from: string;
    to: string[];
  };

export interface ContactDeliveryResult {
  mode: ContactDeliveryConfig["mode"];
  providerMessageId: string | null;
}

type Environment = Record<string, string | undefined>;
type Fetch = typeof fetch;

function requiredEnvironmentValue(env: Environment, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new ContactDeliveryConfigurationError(
      `${key} is required for contact delivery`,
    );
  }
  return value;
}

export function resolveContactDeliveryConfig(
  env: Environment,
): ContactDeliveryConfig {
  const appEnv = env.APP_ENV?.trim().toLowerCase() || "production";
  const mode = env.CONTACT_FORM_DELIVERY_MODE?.trim().toLowerCase() || "send";

  if (mode === "record-only") {
    if (appEnv !== "local" && appEnv !== "test") {
      throw new ContactDeliveryConfigurationError(
        "record-only contact delivery is allowed only in local or test environments",
      );
    }
    return { mode, appEnv };
  }

  if (mode !== "send") {
    throw new ContactDeliveryConfigurationError(
      `Unsupported CONTACT_FORM_DELIVERY_MODE: ${mode}`,
    );
  }

  const to = requiredEnvironmentValue(env, "CONTACT_FORM_TO_EMAIL")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (to.length === 0) {
    throw new ContactDeliveryConfigurationError(
      "CONTACT_FORM_TO_EMAIL must contain at least one destination",
    );
  }

  return {
    mode,
    apiKey: requiredEnvironmentValue(env, "RESEND_API_KEY"),
    from: requiredEnvironmentValue(env, "CONTACT_FORM_FROM_EMAIL"),
    to,
  };
}

export async function deliverContactSubmission(
  config: ContactDeliveryConfig,
  email: ContactEmailContent,
  fetchImpl?: Fetch,
  timeoutMs = 10_000,
): Promise<ContactDeliveryResult> {
  if (config.mode === "record-only") {
    return { mode: config.mode, providerMessageId: null };
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    let response: Response;
    try {
      const requestInit: RequestInit = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `contact-form/${email.submissionId}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: config.to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          reply_to: email.replyTo,
        }),
        signal: abortController.signal,
      };
      response = fetchImpl
        ? await fetchImpl("https://api.resend.com/emails", requestInit)
        : await fetch("https://api.resend.com/emails", requestInit);
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Contact delivery timed out"
          : "Contact delivery request failed";
      throw new ContactDeliveryProviderError(message);
    }

    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      // A malformed provider response is handled below as a fail-closed error.
    }

    if (!response.ok) {
      throw new ContactDeliveryProviderError(
        `Contact provider rejected the request with status ${response.status}`,
        response.status,
      );
    }

    const providerMessageId = typeof responseBody === "object" &&
        responseBody !== null &&
        "id" in responseBody &&
        typeof responseBody.id === "string" &&
        responseBody.id.length > 0
      ? responseBody.id
      : null;

    if (!providerMessageId) {
      throw new ContactDeliveryProviderError(
        "Contact provider returned success without a message ID",
        response.status,
      );
    }

    return { mode: config.mode, providerMessageId };
  } finally {
    clearTimeout(timeout);
  }
}
