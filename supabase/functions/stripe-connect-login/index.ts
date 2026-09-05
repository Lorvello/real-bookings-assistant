import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";
import {
  isAccountOwnerRequiredError,
  requireAccountOwner,
} from "../_shared/accountOwnerGuard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-CONNECT-LOGIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    // Authenticate the user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth
      .getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // SECURITY (F-V01): pin Stripe mode to the server's STRIPE_MODE, never the client
    // body. This fn previously read `test_mode` from the request body, so an authed
    // user could send test_mode:false in a TEST run and make this fn create a LIVE
    // dashboard login link. validateStripeMode() defaults to test when STRIPE_MODE
    // is unset.
    const test_mode = validateStripeMode().mode === "test";
    const environment = test_mode ? "test" : "live";
    logStep("Request parameters", { test_mode, environment });

    // Get user data and verify account ownership
    const { data: userData, error: userDataError } = await supabaseClient
      .from("users")
      .select("account_owner_id")
      .eq("id", user.id)
      .single();

    if (userDataError) {
      logStep("Failed to fetch user data", userDataError);
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    const accountOwnerId = requireAccountOwner(
      userData.account_owner_id,
      user.id,
    );

    // A calendar is optional here and is used only for a server-written cache
    // refresh after the authoritative tenant-scoped account lookup succeeds.
    // The cache is never an authorization or routing source.
    const { data: calendarData } = await supabaseClient
      .from("calendars")
      .select("id")
      .eq("user_id", accountOwnerId)
      .eq("is_active", true)
      .limit(1)
      .single();

    logStep("Calendar cache target check", { hasCalendar: !!calendarData });

    // Initialize Stripe with correct secret key based on mode
    const stripeSecretKey = test_mode
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");

    if (!stripeSecretKey) {
      logStep("Missing Stripe secret key", {
        test_mode,
        hasTestKey: !!Deno.env.get("STRIPE_SECRET_KEY_TEST"),
        hasLiveKey: !!Deno.env.get("STRIPE_SECRET_KEY_LIVE"),
      });
      throw new Error(
        `Missing Stripe secret key for ${
          test_mode ? "test" : "live"
        } mode. Please configure STRIPE_SECRET_KEY_${
          test_mode ? "TEST" : "LIVE"
        } in Edge Function secrets.`,
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;

    logStep("Stripe initialized", {
      testMode: test_mode,
      keyConfigured: !!stripeSecretKey,
      platformAccountId,
    });

    // Resolve the account only through the owner/environment/platform-scoped
    // authority. A browser-writable or stale cache must never select a Stripe
    // account for a privileged dashboard login link.
    type StripeAccountCandidate = {
      stripe_account_id: string;
      onboarding_completed: boolean | null;
      charges_enabled: boolean | null;
      payouts_enabled: boolean | null;
      created_at?: string | null;
      updated_at?: string | null;
    };
    let accounts: StripeAccountCandidate[] = [];
    logStep("Querying database for Stripe accounts", {
      accountOwnerId,
      environment,
      platformAccountId,
    });

    // Get ALL accounts for this owner/environment/platform and sort by priority.
    const { data: allAccounts, error: dbError } = await supabaseClient
      .from("business_stripe_accounts")
      .select(
        "stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled, created_at, updated_at",
      )
      .eq("account_owner_id", accountOwnerId)
      .eq("environment", environment)
      .eq("platform_account_id", platformAccountId)
      .order("updated_at", { ascending: false });

    logStep("Database query result", {
      accountCount: allAccounts?.length || 0,
      error: dbError?.message,
      accounts: allAccounts?.map((acc) => ({
        id: acc.stripe_account_id,
        onboarding_completed: acc.onboarding_completed,
        charges_enabled: acc.charges_enabled,
        payouts_enabled: acc.payouts_enabled,
      })),
    });

    if (dbError) {
      logStep("Account lookup error", { error: dbError.message });
      throw new Error("Database error while looking up Stripe account");
    } else if (allAccounts && allAccounts.length > 0) {
      // Prioritize accounts in this order:
      // 1. Fully completed (onboarding_completed AND charges_enabled)
      // 2. Onboarding completed but charges not enabled yet
      // 3. Any other account (newest first)

      const fullyCompleted = allAccounts.filter((acc) =>
        acc.onboarding_completed && acc.charges_enabled
      );
      const onboardingCompleted = allAccounts.filter((acc) =>
        acc.onboarding_completed && !acc.charges_enabled
      );
      const others = allAccounts.filter((acc) => !acc.onboarding_completed);

      logStep("Account prioritization", {
        fullyCompleted: fullyCompleted.length,
        onboardingCompleted: onboardingCompleted.length,
        others: others.length,
      });

      // Pick the best account available
      if (fullyCompleted.length > 0) {
        accounts = [fullyCompleted[0]]; // Use most recent fully completed
        logStep("Selected fully completed account", {
          accountId: fullyCompleted[0].stripe_account_id,
        });
      } else if (onboardingCompleted.length > 0) {
        accounts = [onboardingCompleted[0]]; // Use most recent onboarding completed
        logStep("Selected onboarding completed account", {
          accountId: onboardingCompleted[0].stripe_account_id,
        });
      } else if (others.length > 0) {
        accounts = [others[0]]; // Use most recent account
        logStep("Selected newest available account", {
          accountId: others[0].stripe_account_id,
        });
      } else {
        accounts = [];
      }
    } else {
      accounts = [];
    }

    if (!accounts || accounts.length === 0) {
      logStep("No account found", {
        accountOwnerId,
        environment,
        platformAccountId,
      });
      return new Response(
        JSON.stringify({ error: "NO_CONNECTED_ACCOUNT" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        },
      );
    }

    const account = accounts[0];
    logStep("Found account", {
      accountId: account.stripe_account_id,
      onboarding_completed: account.onboarding_completed,
      charges_enabled: account.charges_enabled,
    });

    // Fetch latest account details from Stripe to verify status
    const stripeAccount = await stripe.accounts.retrieve(
      account.stripe_account_id,
    );

    // Update database with latest status (NO new account creation here!)
    await supabaseClient
      .from("business_stripe_accounts")
      .update({
        onboarding_completed: stripeAccount.details_submitted || false,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        account_status:
          stripeAccount.charges_enabled && stripeAccount.payouts_enabled
            ? "active"
            : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", account.stripe_account_id);

    // Update cache in calendar_settings if we have a calendar and account ID
    if (calendarData && account.stripe_account_id) {
      await supabaseClient
        .from("calendar_settings")
        .upsert({
          calendar_id: calendarData.id,
          stripe_connect_account_id: account.stripe_account_id,
        }, { onConflict: "calendar_id" });
      logStep("Updated cached account ID in calendar_settings", {
        calendarId: calendarData.id,
        accountId: account.stripe_account_id,
      });
    }

    // ALWAYS try to create login link for existing accounts first
    // Even if not fully onboarded, let users access their Stripe dashboard
    try {
      const loginLink = await stripe.accounts.createLoginLink(
        account.stripe_account_id,
      );

      logStep("Login link created for existing account", {
        accountId: account.stripe_account_id,
        details_submitted: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled,
      });

      return new Response(
        JSON.stringify({
          url: loginLink.url,
          type: "login_link",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } catch (loginError) {
      const loginErrorMessage = loginError instanceof Error
        ? loginError.message
        : String(loginError);
      logStep("Login link creation failed", { error: loginErrorMessage });

      // Return error instead of falling back to onboarding
      // Dashboard route should only create login links, not new accounts
      return new Response(
        JSON.stringify({
          error: "Failed to create login link for existing account",
          details: loginErrorMessage,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        },
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const ownerDenied = isAccountOwnerRequiredError(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({
        error: errorMessage,
        ...(ownerDenied ? { code: error.code } : {}),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: ownerDenied ? error.status : 400,
      },
    );
  }
});
