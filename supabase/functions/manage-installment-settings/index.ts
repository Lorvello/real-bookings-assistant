import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.45.0";
import { z } from "npm:zod@3.23.8";
import {
  calculateInstallmentSchedule,
  installmentPlanSchema,
  planFromStoredInstallmentConfig,
} from "../_shared/installmentPlan.ts";
import {
  isAccountOwnerRequiredError,
  requireAccountOwner,
} from "../_shared/accountOwnerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const serviceInstallmentConfigSchema = z.object({
  serviceTypeId: z.string().uuid(),
  enabled: z.boolean(),
  plan: installmentPlanSchema,
  // Accepted for backwards-compatible parsing only. The current product does not
  // expose a consistent customer-choice journey, so saves canonicalize this to false.
  allowCustomerChoice: z.boolean().default(false),
}).strict();

const installmentSettingsRequestSchema = z.object({
  action: z.literal("save").optional(),
  enabled: z.boolean(),
  allowCustomerChoice: z.boolean().default(false),
  defaultPlan: installmentPlanSchema,
  applyToServices: z.enum(["all", "selected"]).default("all"),
  selectedServices: z.array(z.string().uuid()).max(100).optional(),
  serviceConfigs: z.array(serviceInstallmentConfigSchema).max(100).optional(),
  // Backwards-compatible input only. This endpoint no longer touches Stripe,
  // and a request can never choose a provider mode.
  test_mode: z.boolean().optional(),
}).strict();

const installmentSettingsReadSchema = z.object({
  action: z.literal("read"),
}).strict();

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logStep(step: string, details?: Record<string, unknown>) {
  console.log(
    `[MANAGE-INSTALLMENT-SETTINGS] ${step}${
      details ? ` - ${JSON.stringify(details)}` : ""
    }`,
  );
}

function priceCents(raw: unknown): number {
  const price = typeof raw === "number" ? raw : Number(raw);
  const cents = Math.round(price * 100);
  if (!Number.isFinite(cents) || cents <= 0) {
    throw new Error("INSTALLMENT_SERVICE_PRICE_INVALID");
  }
  return cents;
}

async function loadInstallmentSettings(
  supabaseClient: SupabaseClient,
  ownerId: string,
) {
  const { data: profile, error: profileError } = await supabaseClient
    .from("users")
    .select(
      "installments_enabled,default_installment_plan,allow_customer_installment_choice,installment_scope",
    )
    .eq("id", ownerId)
    .single();
  if (profileError || !profile) {
    throw new Error("INSTALLMENT_PROFILE_MISSING");
  }

  const { data: calendars, error: calendarError } = await supabaseClient
    .from("calendars")
    .select("id")
    .eq("user_id", ownerId);
  if (calendarError) {
    throw new Error("INSTALLMENT_CALENDARS_UNAVAILABLE");
  }
  const calendarIds = (calendars ?? []).map((calendar) => calendar.id);

  const { data: services, error: serviceError } = calendarIds.length > 0
    ? await supabaseClient
      .from("service_types")
      .select("id")
      .in("calendar_id", calendarIds)
    : { data: [], error: null };
  if (serviceError) {
    throw new Error("INSTALLMENT_SERVICES_UNAVAILABLE");
  }
  const serviceIds = (services ?? []).map((service) => service.id);

  const { data: storedConfigs, error: configError } = serviceIds.length > 0
    ? await supabaseClient
      .from("service_installment_configs")
      .select(
        "service_type_id,enabled,plan_type,preset_plan,custom_deposits,fixed_deposit_amount,allow_customer_choice",
      )
      .in("service_type_id", serviceIds)
      .order("service_type_id")
    : { data: [], error: null };
  if (configError) {
    throw new Error("INSTALLMENT_CONFIGS_UNAVAILABLE");
  }

  const serviceConfigs = (storedConfigs ?? []).map((config) => {
    const stored = config as {
      service_type_id: string;
      enabled: boolean | null;
      plan_type: string | null;
      preset_plan: string | null;
      custom_deposits: unknown;
      fixed_deposit_amount: number | string | null;
      allow_customer_choice: boolean | null;
    };
    return {
      serviceTypeId: stored.service_type_id,
      enabled: stored.enabled === true,
      plan: planFromStoredInstallmentConfig(stored),
      allowCustomerChoice: false,
    };
  });

  return {
    enabled: profile.installments_enabled === true,
    allowCustomerChoice: false,
    defaultPlan: installmentPlanSchema.parse(profile.default_installment_plan),
    applyToServices: profile.installment_scope === "selected"
      ? "selected" as const
      : "all" as const,
    selectedServices: serviceConfigs.map((config) => config.serviceTypeId),
    serviceConfigs,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }
    const { data: authData, error: authError } = await supabaseClient.auth
      .getUser(authHeader.slice("Bearer ".length));
    const user = authData.user;
    if (authError || !user?.id) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from("users")
      .select(
        "subscription_tier,grace_period_end,account_owner_id",
      )
      .eq("id", user.id)
      .single();
    if (profileError || !profile) {
      throw new Error("INSTALLMENT_PROFILE_MISSING");
    }
    requireAccountOwner(profile.account_owner_id, user.id);

    const rawBody = await req.json().catch(() => null);
    const readRequest = installmentSettingsReadSchema.safeParse(rawBody);
    if (readRequest.success) {
      return jsonResponse({
        success: true,
        settings: await loadInstallmentSettings(supabaseClient, user.id),
      }, 200);
    }

    const { data: statusValue, error: statusError } = await supabaseClient.rpc(
      "get_user_status_type",
      { p_user_id: user.id },
    );
    if (statusError || typeof statusValue !== "string") {
      throw new Error("INSTALLMENT_ACCESS_STATUS_UNAVAILABLE");
    }

    let effectiveTier = profile.subscription_tier ?? "free";
    if (
      statusValue === "expired_trial" ||
      statusValue === "canceled_and_inactive"
    ) {
      effectiveTier = "free";
    } else if (statusValue === "missed_payment") {
      const graceEnd = profile.grace_period_end
        ? new Date(profile.grace_period_end).getTime()
        : 0;
      if (!Number.isFinite(graceEnd) || graceEnd <= Date.now()) {
        effectiveTier = "free";
      }
    }
    if (!["professional", "enterprise"].includes(effectiveTier)) {
      return jsonResponse({
        success: false,
        error: "tier_required",
        required_tier: "professional",
        message:
          "Installment payments require the Professional plan or higher.",
      }, 403);
    }

    const parsedSettings = installmentSettingsRequestSchema.safeParse(rawBody);
    if (!parsedSettings.success) {
      return jsonResponse({
        success: false,
        error: "invalid_installment_settings",
      }, 400);
    }
    const settings = parsedSettings.data;

    const { data: calendars, error: calendarError } = await supabaseClient
      .from("calendars")
      .select("id")
      .eq("user_id", user.id);
    if (calendarError) {
      throw new Error("INSTALLMENT_CALENDARS_UNAVAILABLE");
    }
    const calendarIds = (calendars ?? []).map((calendar) => calendar.id);

    const { data: services, error: serviceError } = calendarIds.length > 0
      ? await supabaseClient
        .from("service_types")
        .select("id,price")
        .in("calendar_id", calendarIds)
      : { data: [], error: null };
    if (serviceError) {
      throw new Error("INSTALLMENT_SERVICES_UNAVAILABLE");
    }
    const ownedServices = new Map(
      (services ?? []).map((service) => [service.id, service]),
    );

    const selectedConfigs = settings.serviceConfigs ?? [];
    if (
      settings.enabled && settings.applyToServices === "selected" &&
      selectedConfigs.length === 0
    ) {
      return jsonResponse({
        success: false,
        error: "selected_services_required",
      }, 400);
    }

    const seenServiceIds = new Set<string>();
    for (const config of selectedConfigs) {
      if (seenServiceIds.has(config.serviceTypeId)) {
        return jsonResponse({
          success: false,
          error: "duplicate_service_installment_config",
        }, 400);
      }
      seenServiceIds.add(config.serviceTypeId);
      const service = ownedServices.get(config.serviceTypeId);
      if (!service) {
        return jsonResponse({
          success: false,
          error: "service_not_owned",
        }, 403);
      }
      if (settings.enabled && config.enabled) {
        calculateInstallmentSchedule(
          config.plan,
          priceCents(service.price),
        );
      }
    }

    if (settings.enabled && settings.applyToServices === "all") {
      for (const service of ownedServices.values()) {
        const numericPrice = Number(service.price);
        if (Number.isFinite(numericPrice) && numericPrice > 0) {
          calculateInstallmentSchedule(
            settings.defaultPlan,
            priceCents(numericPrice),
          );
        }
      }
    }

    // One service-role-only RPC owns the complete replacement. Postgres executes the
    // service rows, overrides and owner row in one transaction, so any late failure
    // rolls the entire save back instead of exposing a half-switched payment policy.
    const { data: applyResult, error: applyError } = await supabaseClient.rpc(
      "apply_installment_settings",
      {
        p_owner_id: user.id,
        p_enabled: settings.enabled,
        // The legacy field stays in the RPC signature for rolling deployment
        // compatibility, but unsupported customer choice must never be activated.
        p_allow_customer_choice: false,
        p_default_plan: settings.defaultPlan,
        p_apply_to_services: settings.applyToServices,
        p_service_configs: selectedConfigs,
      },
    );
    if (applyError || !applyResult) {
      throw new Error("INSTALLMENT_SETTINGS_ATOMIC_WRITE_FAILED");
    }

    logStep("Settings saved", {
      userId: user.id,
      enabled: settings.enabled,
      scope: settings.applyToServices,
      configuredServices: selectedConfigs.length,
    });
    return jsonResponse({
      success: true,
      message: "Installment settings updated successfully",
      settings: await loadInstallmentSettings(supabaseClient, user.id),
    }, 200);
  } catch (error) {
    if (isAccountOwnerRequiredError(error)) {
      return jsonResponse({
        error: error.message,
        code: error.code,
      }, error.status);
    }
    logStep("Request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return jsonResponse({
      success: false,
      error: "Installment settings could not be updated.",
      code: "INSTALLMENT_SETTINGS_FAILED",
    }, 500);
  }
});
