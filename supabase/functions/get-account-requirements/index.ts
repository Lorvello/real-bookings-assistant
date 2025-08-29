import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-ACCOUNT-REQUIREMENTS] ${step}${detailsStr}`);
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

    const { test_mode = true } = await req.json();

    // Check user's subscription tier
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('subscription_tier, account_owner_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    // Only Professional and Enterprise users can access account requirements
    if (!userData?.subscription_tier || !['professional', 'enterprise'].includes(userData.subscription_tier)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'UPGRADE_REQUIRED',
          error: 'Account requirements monitoring requires Professional or Enterprise subscription' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const accountOwnerId = userData.account_owner_id || user.id;

    // Initialize Stripe
    const stripeSecretKey = test_mode 
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY_LIVE");
    
    if (!stripeSecretKey) {
      throw new Error(`Missing Stripe secret key for ${test_mode ? 'test' : 'live'} mode`);
    }
    
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Get platform account
    const platformAccount = await stripe.accounts.retrieve();
    const platformAccountId = platformAccount.id;
    const environment = test_mode ? 'test' : 'live';

    // Get user's Stripe account
    const { data: stripeAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('*')
      .eq('account_owner_id', accountOwnerId)
      .eq('environment', environment)
      .eq('platform_account_id', platformAccountId)
      .single();

    if (!stripeAccount) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          code: 'NO_ACCOUNT',
          error: 'No Stripe account found. Please complete Stripe onboarding first.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    logStep('Found Stripe account', { accountId: stripeAccount.stripe_account_id });

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(stripeAccount.stripe_account_id);

    logStep('Retrieved account details', { 
      accountId: account.id, 
      currentlyDue: account.requirements?.currently_due?.length || 0,
      eventuallyDue: account.requirements?.eventually_due?.length || 0
    });

    // Format requirements for frontend
    const formatRequirement = (requirement: string) => {
      // Convert Stripe requirement names to user-friendly descriptions
      const requirementMap: { [key: string]: string } = {
        'external_account': 'Bank account information',
        'business_profile.url': 'Business website',
        'business_profile.support_phone': 'Business phone number',
        'business_profile.support_email': 'Business email address',
        'business_profile.product_description': 'Business description',
        'individual.id_number': 'ID number verification',
        'individual.verification.document': 'Identity document upload',
        'individual.verification.additional_document': 'Additional identity document',
        'company.verification.document': 'Company verification document',
        'company.tax_id': 'Company tax ID',
        'tos_acceptance.date': 'Terms of service acceptance',
        'representative.verification.document': 'Representative verification',
        'business_type': 'Business type selection',
        'company.address.line1': 'Company address',
        'company.address.city': 'Company city',
        'company.address.postal_code': 'Company postal code',
        'individual.address.line1': 'Personal address',
        'individual.address.city': 'Personal city',
        'individual.address.postal_code': 'Personal postal code',
        'individual.dob.day': 'Date of birth - day',
        'individual.dob.month': 'Date of birth - month',
        'individual.dob.year': 'Date of birth - year',
        'individual.first_name': 'First name',
        'individual.last_name': 'Last name',
        'individual.email': 'Email address',
        'individual.phone': 'Phone number'
      };

      return requirementMap[requirement] || requirement.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const currentlyDue = (account.requirements?.currently_due || []).map(req => ({
      field: req,
      description: formatRequirement(req),
      priority: 'high',
      deadline: account.requirements?.current_deadline ? new Date(account.requirements.current_deadline * 1000).toISOString() : null
    }));

    const eventuallyDue = (account.requirements?.eventually_due || []).map(req => ({
      field: req,
      description: formatRequirement(req),
      priority: 'medium',
      deadline: null
    }));

    // Check if account is restricted
    const isRestricted = account.requirements?.disabled_reason !== null;
    const restrictionReason = account.requirements?.disabled_reason;

    return new Response(
      JSON.stringify({
        success: true,
        accountStatus: {
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
          isRestricted,
          restrictionReason
        },
        requirements: {
          currentlyDue,
          eventuallyDue,
          pastDue: account.requirements?.past_due || [],
          currentDeadline: account.requirements?.current_deadline ? 
            new Date(account.requirements.current_deadline * 1000).toISOString() : null
        },
        lastUpdated: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    logStep('ERROR', { message: error.message });
    return new Response(
      JSON.stringify({ 
        success: false, 
        code: 'SERVER_ERROR',
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});