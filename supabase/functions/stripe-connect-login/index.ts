import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-LOGIN] ${step}${detailsStr}`);
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

    // Authenticate the user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parse request body to get test_mode (default to test for safety)
    let test_mode = true;
    try {
      const body = await req.json();
      test_mode = body.test_mode !== false; // Default to test mode
    } catch {
      // If no body, default to test mode
    }
    const environment = test_mode ? 'test' : 'live';
    logStep("Request parameters", { test_mode, environment });

    // Get user data and verify account ownership
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      logStep('Failed to fetch user data', userDataError);
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only account owners can access Stripe dashboard
    const accountOwnerId = userData.account_owner_id || user.id;
    if (userData.account_owner_id !== null) {
      logStep('User is not account owner', { userId: user.id, accountOwnerId: userData.account_owner_id });
      throw new Error('Only account owners can access Stripe dashboard');
    }

    // Try to get cached account ID from calendar_settings first
    const { data: calendarData } = await supabaseClient
      .from('calendars')
      .select('id')
      .eq('user_id', accountOwnerId)
      .eq('is_active', true)
      .limit(1)
      .single();

    let cachedAccountId = null;
    if (calendarData) {
      const { data: calendarSettings } = await supabaseClient
        .from('calendar_settings')
        .select('stripe_connect_account_id')
        .eq('calendar_id', calendarData.id)
        .single();
      
      cachedAccountId = calendarSettings?.stripe_connect_account_id;
    }
    logStep("Cached account ID check", { cachedAccountId, hasCalendar: !!calendarData });

    // Initialize Stripe with correct secret key based on mode
    const stripeSecretKey = test_mode 
      ? Deno.env.get('STRIPE_SECRET_KEY_TEST') 
      : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
    
    if (!stripeSecretKey) {
      logStep('Missing Stripe secret key', { test_mode, hasTestKey: !!Deno.env.get('STRIPE_SECRET_KEY_TEST'), hasLiveKey: !!Deno.env.get('STRIPE_SECRET_KEY_LIVE') });
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode. Please configure STRIPE_SECRET_KEY_${test_mode ? 'TEST' : 'LIVE'} in Edge Function secrets.`);
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Get platform account ID to track which Stripe account we're using
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    
    logStep("Stripe initialized", { testMode: test_mode, keyConfigured: !!stripeSecretKey, platformAccountId });

    // First try to use cached account ID, then query the database
    let accounts = [];
    let accountError = null;

    if (cachedAccountId) {
      logStep("Using cached account ID", { cachedAccountId });
      // Query by cached account ID directly
      const { data: cachedAccounts, error: cachedError } = await supabaseClient
        .from('business_stripe_accounts')
        .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
        .eq('stripe_account_id', cachedAccountId)
        .eq('environment', environment)
        .limit(1);
      
      if (cachedAccounts && cachedAccounts.length > 0) {
        accounts = cachedAccounts;
      } else {
        logStep("Cached account not found, falling back to database query", { cachedError });
      }
    }

    // Fallback to database query if no cached account found
    if (accounts.length === 0) {
      // First try to get a completed account
      let { data: dbAccounts, error: dbError } = await supabaseClient
        .from('business_stripe_accounts')
        .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
        .eq('account_owner_id', accountOwnerId)
        .eq('environment', environment)
        .eq('platform_account_id', platformAccountId)
        .eq('onboarding_completed', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (dbError || !dbAccounts || dbAccounts.length === 0) {
        // If no completed account, try any account for this environment/platform
        const fallbackQuery = await supabaseClient
          .from('business_stripe_accounts')
          .select('stripe_account_id, onboarding_completed, charges_enabled, payouts_enabled')
          .eq('account_owner_id', accountOwnerId)
          .eq('environment', environment)
          .eq('platform_account_id', platformAccountId)
          .order('updated_at', { ascending: false })
          .limit(1);
        
        dbAccounts = fallbackQuery.data;
        dbError = fallbackQuery.error;
      }

      accounts = dbAccounts || [];
      accountError = dbError;
    }

    if (accountError) {
      logStep('Account lookup error', accountError);
      throw new Error('Database error while looking up Stripe account');
    }

    if (!accounts || accounts.length === 0) {
      logStep('No account found', { accountOwnerId, environment, platformAccountId });
      return new Response(
        JSON.stringify({ error: 'NO_CONNECTED_ACCOUNT' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const account = accounts[0];
    logStep('Found account', { 
      accountId: account.stripe_account_id, 
      onboarding_completed: account.onboarding_completed,
      charges_enabled: account.charges_enabled 
    });

    // Fetch latest account details from Stripe to verify status
    const stripeAccount = await stripe.accounts.retrieve(account.stripe_account_id);
    
    // Update database with latest status (NO new account creation here!)
    await supabaseClient
      .from('business_stripe_accounts')
      .update({
        onboarding_completed: stripeAccount.details_submitted || false,
        charges_enabled: stripeAccount.charges_enabled || false,
        payouts_enabled: stripeAccount.payouts_enabled || false,
        account_status: stripeAccount.charges_enabled && stripeAccount.payouts_enabled ? 'active' : 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', account.stripe_account_id);

    // Update cache in calendar_settings if we have a calendar and account ID
    if (calendarData && account.stripe_account_id) {
      await supabaseClient
        .from('calendar_settings')
        .upsert({
          calendar_id: calendarData.id,
          stripe_connect_account_id: account.stripe_account_id
        }, { onConflict: 'calendar_id' });
      logStep("Updated cached account ID in calendar_settings", { 
        calendarId: calendarData.id, 
        accountId: account.stripe_account_id 
      });
    }

    // ALWAYS try to create login link for existing accounts first
    // Even if not fully onboarded, let users access their Stripe dashboard
    try {
      const loginLink = await stripe.accounts.createLoginLink(account.stripe_account_id);
      
      logStep('Login link created for existing account', { 
        accountId: account.stripe_account_id,
        details_submitted: stripeAccount.details_submitted,
        charges_enabled: stripeAccount.charges_enabled
      });
      
      return new Response(
        JSON.stringify({
          url: loginLink.url,
          type: 'login_link'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (loginError) {
      logStep('Login link creation failed', { error: loginError.message });
      
      // Return error instead of falling back to onboarding
      // Dashboard route should only create login links, not new accounts
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create login link for existing account',
          details: loginError.message 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }
  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});