import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-CONNECT-RESET] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Parse request - calendar_id is now optional as we work with account_owner_id
    const body = await req.json();
    logStep("Request parsed", body);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }

    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get user data to determine account owner
    const { data: userAccountData, error: userAccountError } = await supabaseClient
      .from('users')
      .select('account_owner_id')
      .eq('id', user.id)
      .single();

    if (userAccountError) {
      throw new Error(`Failed to fetch user data: ${userAccountError.message}`);
    }

    const accountOwnerId = userAccountData.account_owner_id || user.id;
    logStep("Account owner determined", { accountOwnerId });

    // Delete Stripe account record by account_owner_id
    const { error: deleteError } = await supabaseClient
      .from('business_stripe_accounts')
      .delete()
      .eq('account_owner_id', accountOwnerId);

    if (deleteError) {
      logStep("Error deleting account", { error: deleteError.message });
      throw new Error(`Failed to reset account: ${deleteError.message}`);
    }

    logStep("Account reset successfully");

    return new Response(JSON.stringify({
      success: true,
      message: "Stripe Connect account reset successfully",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});