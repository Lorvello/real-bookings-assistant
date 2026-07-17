import { z } from "https://esm.sh/zod@3.23.8";

const requestSchema = z.object({
  request_id: z.string().uuid(),
  calendar_id: z.string().uuid(),
  email: z.string().trim().email().max(254).transform((value) =>
    value.toLowerCase()
  ),
  full_name: z.string().trim().max(100).default(""),
  role: z.enum(["editor", "viewer"]),
}).strict();

export type TeamInvitationRequest = z.infer<typeof requestSchema>;

export interface TeamInvitationClaim {
  claimed: true;
  status: "sending";
  claim_token: string;
  request_id: string;
  invitation_id: string;
  recipient_email: string;
  invitee_name: string;
  role: "editor" | "viewer";
  invitation_token: string;
  business_name: string;
  calendar_name: string;
  locale: "nl" | "en";
  app_base_url: string;
  attempt_count: number;
}

export interface TeamInvitationEmail {
  fromName: string;
  recipient: string;
  subject: string;
  html: string;
  text: string;
  requestId: string;
  invitationId: string;
}

export type TeamInvitationDeliveryConfig =
  | {
    mode: "record-only";
    appEnv: "local" | "test";
    appBaseUrl: string;
  }
  | {
    mode: "send";
    appBaseUrl: string;
    apiKey: string;
    fromEmail: string;
  };

export interface TeamInvitationDeliveryResult {
  mode: TeamInvitationDeliveryConfig["mode"];
  providerMessageId: string | null;
}

export class TeamInvitationConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamInvitationConfigurationError";
  }
}

export class TeamInvitationProviderError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(code: string, status: number | null = null) {
    super(code);
    this.name = "TeamInvitationProviderError";
    this.code = code;
    this.status = status;
  }
}

type Environment = Record<string, string | undefined>;
type Fetch = typeof fetch;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTeamInvitationRequest(
  value: unknown,
): TeamInvitationRequest {
  return requestSchema.parse(value);
}

export function isTeamInvitationClaim(
  value: unknown,
): value is TeamInvitationClaim {
  if (!isRecord(value)) return false;
  return value.claimed === true &&
    value.status === "sending" &&
    typeof value.claim_token === "string" &&
    UUID_PATTERN.test(value.claim_token) &&
    typeof value.request_id === "string" &&
    UUID_PATTERN.test(value.request_id) &&
    typeof value.invitation_id === "string" &&
    UUID_PATTERN.test(value.invitation_id) &&
    typeof value.recipient_email === "string" &&
    typeof value.invitee_name === "string" &&
    (value.role === "editor" || value.role === "viewer") &&
    typeof value.invitation_token === "string" &&
    value.invitation_token.length >= 20 &&
    typeof value.business_name === "string" &&
    typeof value.calendar_name === "string" &&
    (value.locale === "nl" || value.locale === "en") &&
    typeof value.app_base_url === "string" &&
    typeof value.attempt_count === "number" &&
    Number.isInteger(value.attempt_count) &&
    value.attempt_count >= 1;
}

function requiredEnvironmentValue(env: Environment, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new TeamInvitationConfigurationError(`${key}_required`);
  }
  return value;
}

function resolveAppBaseUrl(rawUrl: string, appEnv: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new TeamInvitationConfigurationError("APP_URL_invalid");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new TeamInvitationConfigurationError("APP_URL_invalid");
  }
  if (url.pathname !== "/") {
    throw new TeamInvitationConfigurationError("APP_URL_must_be_origin");
  }
  if (appEnv === "local" || appEnv === "test") {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new TeamInvitationConfigurationError("APP_URL_invalid_protocol");
    }
  } else if (url.protocol !== "https:") {
    throw new TeamInvitationConfigurationError("APP_URL_https_required");
  }
  return url.origin;
}

export function resolveTeamInvitationDeliveryConfig(
  env: Environment,
): TeamInvitationDeliveryConfig {
  const appEnv = env.APP_ENV?.trim().toLowerCase() || "production";
  const mode = env.TEAM_INVITATION_DELIVERY_MODE?.trim().toLowerCase() ||
    "send";
  const appBaseUrl = resolveAppBaseUrl(
    requiredEnvironmentValue(env, "APP_URL"),
    appEnv,
  );

  if (mode === "record-only") {
    if (appEnv !== "local" && appEnv !== "test") {
      throw new TeamInvitationConfigurationError(
        "record_only_forbidden_in_production",
      );
    }
    return { mode, appEnv, appBaseUrl };
  }
  if (mode !== "send") {
    throw new TeamInvitationConfigurationError("delivery_mode_invalid");
  }

  const fromEmail = requiredEnvironmentValue(
    env,
    "TEAM_INVITATION_FROM_EMAIL",
  ).toLowerCase();
  if (!z.string().email().safeParse(fromEmail).success) {
    throw new TeamInvitationConfigurationError(
      "TEAM_INVITATION_FROM_EMAIL_invalid",
    );
  }

  return {
    mode,
    appBaseUrl,
    apiKey: requiredEnvironmentValue(env, "RESEND_API_KEY"),
    fromEmail,
  };
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function sanitizeHeaderText(value: string): string {
  const withoutControls = Array.from(value, (character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 31 || codePoint === 127 ? " " : character;
  }).join("");
  return withoutControls
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function buildTeamInvitationEmail(
  claim: TeamInvitationClaim,
): TeamInvitationEmail {
  const businessName = sanitizeHeaderText(claim.business_name) || "Team";
  const calendarName = claim.calendar_name.trim() || "Calendar";
  const inviteeName = claim.invitee_name.trim() ||
    claim.recipient_email.split("@")[0] ||
    (claim.locale === "en" ? "there" : "daar");
  const inviteUrl = `${claim.app_base_url}/team-invite?token=${
    encodeURIComponent(claim.invitation_token)
  }`;

  const copy = claim.locale === "en"
    ? {
      subject: `Team invitation from ${businessName}`,
      title: "Team invitation",
      hello: `Hi ${inviteeName},`,
      intro: `${businessName} invited you to the calendar ${calendarName}.`,
      role: claim.role === "editor"
        ? "Editor — can manage appointments"
        : "Viewer — can view appointments",
      expiry: "This invitation expires in 48 hours.",
      button: "Accept invitation",
      ignore:
        "If you did not expect this invitation, you can ignore this email.",
    }
    : {
      subject: `Teamuitnodiging van ${businessName}`,
      title: "Teamuitnodiging",
      hello: `Hoi ${inviteeName},`,
      intro: `${businessName} nodigt je uit voor de agenda ${calendarName}.`,
      role: claim.role === "editor"
        ? "Bewerker — kan afspraken beheren"
        : "Lezer — kan afspraken bekijken",
      expiry: "Deze uitnodiging verloopt over 48 uur.",
      button: "Uitnodiging accepteren",
      ignore:
        "Verwachtte je deze uitnodiging niet? Dan kun je deze e-mail negeren.",
    };

  const html = `
<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:#1a7f4d;color:#fff;padding:36px 30px;text-align:center;">
        <h1 style="margin:0;font-size:28px;">${escapeHtml(copy.title)}</h1>
      </div>
      <div style="padding:36px 30px;color:#111827;">
        <p>${escapeHtml(copy.hello)}</p>
        <p>${escapeHtml(copy.intro)}</p>
        <p><strong>${escapeHtml(copy.role)}</strong></p>
        <p style="color:#92400e;">${escapeHtml(copy.expiry)}</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${
    escapeHtml(inviteUrl)
  }" style="display:inline-block;background:#1a7f4d;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${
    escapeHtml(copy.button)
  }</a>
        </p>
        <p style="font-size:13px;color:#6b7280;word-break:break-all;">${
    escapeHtml(inviteUrl)
  }</p>
        <p style="font-size:13px;color:#6b7280;">${escapeHtml(copy.ignore)}</p>
      </div>
    </div>
  </body>
</html>`.trim();

  const text = [
    copy.hello,
    "",
    copy.intro,
    copy.role,
    copy.expiry,
    "",
    `${copy.button}: ${inviteUrl}`,
    "",
    copy.ignore,
  ].join("\n");

  return {
    fromName: businessName,
    recipient: claim.recipient_email,
    subject: sanitizeHeaderText(copy.subject),
    html,
    text,
    requestId: claim.request_id,
    invitationId: claim.invitation_id,
  };
}

export async function deliverTeamInvitation(
  config: TeamInvitationDeliveryConfig,
  email: TeamInvitationEmail,
  fetchImpl?: Fetch,
  timeoutMs = 10_000,
): Promise<TeamInvitationDeliveryResult> {
  if (config.mode === "record-only") {
    return { mode: config.mode, providerMessageId: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await (fetchImpl ?? fetch)("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `team-invitation/${email.requestId}`,
        },
        body: JSON.stringify({
          from: `${email.fromName} <${config.fromEmail}>`,
          to: [email.recipient],
          subject: email.subject,
          html: email.html,
          text: email.text,
          tags: [
            { name: "invitation_id", value: email.invitationId },
            { name: "request_id", value: email.requestId },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const timedOut = controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError");
      throw new TeamInvitationProviderError(
        timedOut ? "provider_timeout" : "provider_network_error",
      );
    }

    const body = await response.json().catch(() => null);
    const providerMessageId = isRecord(body) && typeof body.id === "string" &&
        body.id.length > 0
      ? body.id
      : null;
    if (!response.ok || !providerMessageId) {
      throw new TeamInvitationProviderError(
        `provider_http_${response.status}`,
        response.status,
      );
    }

    return { mode: config.mode, providerMessageId };
  } finally {
    clearTimeout(timeout);
  }
}
