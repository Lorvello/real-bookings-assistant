
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { validateStripeMode } from "../_shared/stripeValidation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-ONBOARD] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Stripe mode is the SERVER's source of truth (STRIPE_MODE), never the client
    // body: `body.test_mode || false` previously defaulted to LIVE whenever the flag
    // was absent, which could create a real live Connect account out of band.
    // validateStripeMode() defaults to test when STRIPE_MODE is unset.
    const testMode = validateStripeMode().mode === 'test';
    const environment = testMode ? 'test' : 'live';
    logStep("Request parsed", { testMode, environment });

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user's business data for prefilling
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select(`
        business_name, business_email, business_phone, business_street, 
        business_number, business_postal, business_city, business_country,
        business_description, full_name, email, phone, website, account_owner_id
      `)
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      throw new Error('Could not load business data for onboarding');
    }

    logStep("User data for prefilling", userData ? 'Data found' : null);
    
    const prefillData = {
      business_name: userData?.business_name,
      business_email: userData?.business_email,
      business_phone: userData?.business_phone,
      business_address: userData?.business_street && userData?.business_city ? 
        `${userData.business_street} ${userData.business_number || ''}`.trim() : null,
      business_city: userData?.business_city,
      business_postal: userData?.business_postal,
      website: userData?.website,
      description: userData?.business_description
    };
    
    if (userData) {
      logStep("Prefill data available", {
        business_name: !!prefillData.business_name,
        business_email: !!prefillData.business_email,
        business_phone: !!prefillData.business_phone,
        business_address: !!prefillData.business_address,
        website: !!prefillData.website,
        description: !!prefillData.description
      });
    }

    // Initialize Stripe
    const stripeSecretKey = testMode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${testMode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
    
    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    
    logStep("Stripe initialized", { 
      testMode, 
      keyConfigured: !!(testMode ? Deno.env.get("STRIPE_SECRET_KEY_TEST") : Deno.env.get("STRIPE_SECRET_KEY_LIVE")),
      platformAccountId,
      environment
    });

    // Check if user is account owner
    const accountOwnerId = userData.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Only account owners can onboard Stripe
    if (userData.account_owner_id !== null) {
      throw new Error('Only account owners can set up Stripe Connect');
    }

    // FIXED: Use proper query to check for existing account with environment filter
    let { data: existingAccounts, error: accountError } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (accountError) {
      logStep("Error checking existing accounts", accountError);
      throw new Error(`Database error: ${accountError.message}`);
    }

    let stripeAccountId: string;
    const existingAccount = existingAccounts && existingAccounts.length > 0 ? existingAccounts[0] : null;
    
    if (existingAccount) {
      stripeAccountId = existingAccount.stripe_account_id;
      logStep("Using existing account", { stripeAccountId, platformAccountId });
      
      // Test account accessibility
      try {
        await stripe.accounts.retrieve(stripeAccountId);
        logStep("Account accessible");
      } catch (accessError) {
        const accErr = accessError as { statusCode?: number; message?: string };
        if (accErr.statusCode === 403 || accErr.statusCode === 404) {
          logStep("Account not accessible, creating new one", { error: accErr.message });
          // Account exists in DB but not accessible via this platform - create new one
          stripeAccountId = await createNewStripeAccount(stripe, user, prefillData);
          
          // Update existing record instead of creating new one
          await supabaseClient
            .from('business_stripe_accounts')
            .update({
              stripe_account_id: stripeAccountId,
              platform_account_id: platformAccountId,
              environment,
              account_status: 'pending',
              onboarding_completed: false,
              charges_enabled: false,
              payouts_enabled: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingAccount.id);
          
          logStep("Updated existing record with new account", { stripeAccountId });
        } else {
          throw accessError;
        }
      }
    } else {
      // ONLY create new account if NO account exists for this environment/platform
      logStep("No existing account found - creating new Stripe account");
      stripeAccountId = await createNewStripeAccount(stripe, user, prefillData);
      
      // Store in database
      const { error: insertError } = await supabaseClient
        .from('business_stripe_accounts')
        .insert({
          account_owner_id: accountOwnerId,
          user_id: user.id,
          stripe_account_id: stripeAccountId,
          platform_account_id: platformAccountId,
          environment,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false
        });
      
      if (insertError) {
        logStep("Error storing new account", insertError);
        throw new Error(`Failed to store account: ${insertError.message}`);
      }
      
      logStep("Account stored in database", { stripeAccountId, platformAccountId });
    }

    // Get base URL with robust resolution
    const appBaseUrl = Deno.env.get('APP_BASE_URL');
    const appEnv = Deno.env.get('APP_ENV') || 'development';
    
    let baseUrl: string;
    if (appBaseUrl && appBaseUrl.startsWith('http')) {
      baseUrl = appBaseUrl;
    } else if (appEnv === 'production' || appEnv.includes('bookingsassistant.com')) {
      baseUrl = 'https://bookingsassistant.com';
    } else {
      baseUrl = 'https://bookingsassistant.com';
    }

    // Create onboarding link with fixed URLs
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/settings?tab=payments&refresh=true`,
      return_url: `${baseUrl}/settings?tab=payments&success=true`,
      type: 'account_onboarding',
    });

    logStep("Onboarding link created", { 
      url: 'generated', 
      expires_at: accountLink.expires_at,
      baseUrl,
      userId: user.id
    });

    return new Response(
      JSON.stringify({
        url: accountLink.url,
        expires_at: accountLink.expires_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

// Stripe rejects business_profile.url unless it is a valid URL. A merchant who saved
// junk in the website field (e.g. " v v") must NOT be blocked from onboarding, so we
// validate and skip an invalid value instead of passing it through.
function sanitizeWebsiteUrl(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || /\s/.test(s) || !s.includes('.')) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if ((u.protocol !== 'http:' && u.protocol !== 'https:') || !u.hostname.includes('.')) return null;
    return u.href;
  } catch {
    return null;
  }
}

// Stripe rejects business_profile.support_phone when it is not a plausible phone number.
// A merchant who saved junk (letters, too few digits) in the phone field must NOT be blocked
// from onboarding (same failure class as the website field), so we validate and skip an
// invalid value instead of passing it through. Returns the trimmed phone or null to skip.
function sanitizePhone(raw: any): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().replace(/\s+/g, ' ');
  if (!s) return null;
  const digits = (s.match(/\d/g) ?? []).length;
  // Only phone punctuation + at least 7 digits; rejects letters/junk, accepts common formats.
  if (!/^[+\d\s().-]+$/.test(s) || digits < 7) return null;
  return s;
}

async function createNewStripeAccount(stripe: any, user: any, prefillData: any): Promise<string> {
  const accountData: any = {
    type: 'express',
    country: 'NL', // Default to Netherlands
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    }
  };
  
  // Only add non-restricted prefill data for new accounts. Skip a malformed phone so a junk
  // value can never block account creation (mirrors the website sanitize below).
  const safePhone = sanitizePhone(prefillData.business_phone);
  if (safePhone) {
    accountData.business_profile = {
      support_phone: safePhone
    };
  }
  
  const safeWebsite = sanitizeWebsiteUrl(prefillData.website);
  if (safeWebsite) {
    accountData.business_profile = accountData.business_profile || {};
    accountData.business_profile.url = safeWebsite;
  }
  
  const stripeAccount = await stripe.accounts.create(accountData);
  console.log(`[STRIPE-CONNECT-ONBOARD] Created new Stripe account: ${stripeAccount.id}`);
  
  return stripeAccount.id;
}
