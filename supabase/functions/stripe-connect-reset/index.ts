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

    // Parse request
    const { calendar_id } = await req.json();
    logStep("Request parsed", { calendar_id });

    if (!calendar_id) {
      throw new Error("Calendar ID is required");
    }

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

    // Verify calendar ownership
    const { data: calendar, error: calendarError } = await supabaseClient
      .from('calendars')
      .select('*')
      .eq('id', calendar_id)
      .eq('user_id', user.id)
      .single();

    if (calendarError || !calendar) {
      throw new Error("Calendar not found or access denied");
    }
    logStep("Calendar verified", { calendarId: calendar.id });

    // Delete Stripe account record
    const { error: deleteError } = await supabaseClient
      .from('business_stripe_accounts')
      .delete()
      .eq('calendar_id', calendar_id);

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