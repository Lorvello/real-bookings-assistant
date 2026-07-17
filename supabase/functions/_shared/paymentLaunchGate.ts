export type PaymentPath = "booking" | "subscription";
export type PaymentGateState =
  | "DISABLED"
  | "CONTROLLED_TENANT"
  | "PUBLIC";

export type PaymentGateCode =
  | "PAYMENT_GATE_ALLOWED"
  | "PAYMENT_PATH_DISABLED"
  | "PAYMENT_GATE_CONFIG_INVALID"
  | "PAYMENT_TENANT_NOT_ALLOWED";

export interface PaymentGateDecision {
  allowed: boolean;
  path: PaymentPath;
  state: PaymentGateState;
  code: PaymentGateCode;
  reason: string;
  configurationHash: string;
}

type ReadEnv = (name: string) => string | undefined;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ENV_KEYS: Record<
  PaymentPath,
  { state: string; controlledTenants: string }
> = {
  booking: {
    state: "STRIPE_BOOKING_PAYMENT_GATE_STATE",
    controlledTenants: "STRIPE_BOOKING_PAYMENT_CONTROLLED_TENANTS",
  },
  subscription: {
    state: "STRIPE_SUBSCRIPTION_GATE_STATE",
    controlledTenants: "STRIPE_SUBSCRIPTION_CONTROLLED_TENANTS",
  },
};

const defaultReadEnv: ReadEnv = (name) => Deno.env.get(name);

function parseState(raw: string | undefined): {
  state: PaymentGateState;
  valid: boolean;
} {
  const normalized = (raw ?? "DISABLED").trim().toUpperCase();
  if (
    normalized === "DISABLED" ||
    normalized === "CONTROLLED_TENANT" ||
    normalized === "PUBLIC"
  ) {
    return { state: normalized, valid: true };
  }
  return { state: "DISABLED", valid: false };
}

function parseControlledTenants(raw: string | undefined): {
  tenantIds: string[];
  valid: boolean;
} {
  const parts = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const tenantIds = [...new Set(parts)].sort();
  return {
    tenantIds,
    valid: tenantIds.every((value) => UUID_PATTERN.test(value)),
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function evaluatePaymentLaunchGate(
  path: PaymentPath,
  tenantId: string,
  readEnv: ReadEnv = defaultReadEnv,
): Promise<PaymentGateDecision> {
  const keys = ENV_KEYS[path];
  const parsedState = parseState(readEnv(keys.state));
  const controlled = parseControlledTenants(readEnv(keys.controlledTenants));
  const normalizedTenantId = (tenantId ?? "").trim().toLowerCase();
  const tenantValid = UUID_PATTERN.test(normalizedTenantId);
  const configurationHash = await sha256(JSON.stringify({
    path,
    state: parsedState.state,
    controlledTenants: controlled.tenantIds,
  }));

  if (!parsedState.valid || !controlled.valid || !tenantValid) {
    return {
      allowed: false,
      path,
      state: "DISABLED",
      code: "PAYMENT_GATE_CONFIG_INVALID",
      reason: "Payment launch gate configuration is invalid.",
      configurationHash,
    };
  }

  if (parsedState.state === "DISABLED") {
    return {
      allowed: false,
      path,
      state: parsedState.state,
      code: "PAYMENT_PATH_DISABLED",
      reason: "This payment path is not enabled.",
      configurationHash,
    };
  }

  if (parsedState.state === "CONTROLLED_TENANT") {
    if (
      controlled.tenantIds.length === 0 ||
      !controlled.tenantIds.includes(normalizedTenantId)
    ) {
      return {
        allowed: false,
        path,
        state: parsedState.state,
        code: "PAYMENT_TENANT_NOT_ALLOWED",
        reason: "This tenant is not enabled for the controlled payment path.",
        configurationHash,
      };
    }
  }

  return {
    allowed: true,
    path,
    state: parsedState.state,
    code: "PAYMENT_GATE_ALLOWED",
    reason: "Payment launch gate allows this tenant.",
    configurationHash,
  };
}
