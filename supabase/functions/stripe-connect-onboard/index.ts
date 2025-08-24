import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { calendar_id, test_mode } = await req.json();

    // Verify user owns the calendar and fetch user business data
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('calendars')
      .select('id, name')
      .eq('id', calendar_id)
      .eq('user_id', user.id)
      .single();

    if (calendarError || !calendar) {
      throw new Error('Calendar not found or access denied');
    }

    // Fetch user business data for prefilling
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select(`
        business_name, business_email, business_phone, business_street, 
        business_number, business_postal, business_city, business_country,
        business_description, full_name, email, phone, website
      `)
      .eq('id', user.id)
      .single();

    console.log('[STRIPE-CONNECT-ONBOARD] User data for prefilling:', userData ? 'Data found' : 'No data', userDataError);
    
    if (userData) {
      console.log('[STRIPE-CONNECT-ONBOARD] Prefill data available:', {
        business_name: !!userData.business_name,
        business_email: !!userData.business_email,
        business_phone: !!userData.business_phone,
        business_address: !!(userData.business_street && userData.business_city),
        website: !!userData.website,
        description: !!userData.business_description
      });
    }

    // Initialize Stripe with correct secret key based on mode
    const stripeSecretKey = test_mode 
      ? Deno.env.get('STRIPE_TEST_SECRET_KEY') 
      : Deno.env.get('STRIPE_LIVE_SECRET_KEY');
    
    console.log('[STRIPE-CONNECT-ONBOARD] Stripe initialized:', { testMode: test_mode, keyConfigured: !!stripeSecretKey });
    
    if (!stripeSecretKey) {
      throw new Error(`Stripe ${test_mode ? 'test' : 'live'} secret key not configured`);
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    // Check if account already exists
    let { data: existingAccount } = await supabaseClient
      .from('business_stripe_accounts')
      .select('stripe_account_id')
      .eq('calendar_id', calendar_id)
      .single();

    let stripeAccountId: string;

    if (existingAccount?.stripe_account_id) {
      stripeAccountId = existingAccount.stripe_account_id;
      
      // Update existing account with latest user data
      if (userData) {
        const updateData: any = {
          email: userData.business_email || user.email,
          metadata: {
            calendar_id: calendar_id,
            business_name: userData.business_name || calendar.name,
          },
        };

        // Add business profile if we have business data
        if (userData.business_name) {
          updateData.business_type = 'company';
          updateData.company = {
            name: userData.business_name,
          };
          
          if (userData.business_street && userData.business_city) {
            updateData.company.address = {
              line1: `${userData.business_street} ${userData.business_number || ''}`.trim(),
              city: userData.business_city,
              postal_code: userData.business_postal,
              country: 'NL',
            };
          }
        }

        // Add business profile
        if (userData.business_email || userData.business_phone || userData.business_description) {
          updateData.business_profile = {
            support_email: userData.business_email || user.email,
            support_phone: userData.business_phone,
            product_description: userData.business_description || 'Professional booking services',
          };
          
          if (userData.website) {
            updateData.business_profile.url = userData.website;
          }
        }

        try {
          await stripe.accounts.update(stripeAccountId, updateData);
        } catch (updateError) {
          console.log('Could not update account with prefill data:', updateError);
        }
      }
    } else {
      // Create new Stripe Connect account with prefilled data
      const accountData: any = {
        type: 'express',
        country: 'NL',
        default_currency: 'eur',
        email: userData?.business_email || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          calendar_id: calendar_id,
          business_name: userData?.business_name || calendar.name,
        },
      };

      // Determine business type and add company info
      if (userData?.business_name) {
        accountData.business_type = 'company';
        accountData.company = {
          name: userData.business_name,
        };
        
        // Add business address if available
        if (userData.business_street && userData.business_city) {
          accountData.company.address = {
            line1: `${userData.business_street} ${userData.business_number || ''}`.trim(),
            city: userData.business_city,
            postal_code: userData.business_postal,
            country: 'NL',
          };
        }
      } else {
        accountData.business_type = 'individual';
        // Add individual info if available
        if (userData?.full_name) {
          accountData.individual = {
            first_name: userData.full_name.split(' ')[0],
            last_name: userData.full_name.split(' ').slice(1).join(' ') || userData.full_name.split(' ')[0],
            email: user.email,
          };
        }
      }

      // Add business profile
      if (userData?.business_email || userData?.business_phone || userData?.business_description) {
        accountData.business_profile = {
          support_email: userData?.business_email || user.email,
          support_phone: userData?.business_phone,
          product_description: userData?.business_description || 'Professional booking services',
        };
        
        if (userData?.website) {
          accountData.business_profile.url = userData.website;
        }
      }

      console.log('[STRIPE-CONNECT-ONBOARD] Creating new Stripe account with data:', {
        business_type: accountData.business_type,
        has_company_info: !!accountData.company,
        has_individual_info: !!accountData.individual,
        has_business_profile: !!accountData.business_profile
      });

      const account = await stripe.accounts.create(accountData);
      stripeAccountId = account.id;

      console.log('[STRIPE-CONNECT-ONBOARD] Stripe account created:', { accountId: stripeAccountId });

      // Store account in database with proper upsert using unique constraint
      const { error: insertError } = await supabaseClient
        .from('business_stripe_accounts')
        .upsert({
          calendar_id: calendar_id,
          stripe_account_id: stripeAccountId,
          account_status: 'pending',
          onboarding_completed: false,
          charges_enabled: false,
          payouts_enabled: false,
          account_type: 'express',
          country: 'NL',
          currency: 'eur',
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[STRIPE-CONNECT-ONBOARD] Database error:', insertError);
        throw new Error(`Failed to save account: ${insertError.message}`);
      }

      console.log('[STRIPE-CONNECT-ONBOARD] Account stored in database');
    }

    // Get base URL from environment
    const appEnv = Deno.env.get('APP_ENV') || 'development';
    const baseUrl = appEnv === 'production' 
      ? 'https://brandevolves.lovable.app'
      : 'https://3461320d-933f-4e55-89c4-11076909a36e.sandbox.lovable.dev';

    // Create onboarding link with fixed URLs
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/settings?tab=payments&refresh=true`,
      return_url: `${baseUrl}/settings?tab=payments&success=true`,
      type: 'account_onboarding',
    });

    console.log('[STRIPE-CONNECT-ONBOARD] Onboarding link created:', { 
      url: 'generated', 
      expires_at: accountLink.expires_at 
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
    console.error('Error in stripe-connect-onboard:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});