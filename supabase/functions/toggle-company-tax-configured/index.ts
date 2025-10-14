import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { createPreflightResponse, createErrorResponse, createSuccessResponse } from '../_shared/headers.ts'

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TOGGLE-COMPANY-TAX-CONFIGURED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return createPreflightResponse(req);
  }

  try {
    logStep("Function started");
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Authenticate user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Authentication failed");
    }
    logStep("User authenticated", { userId: userData.user.id });

    const { configured } = await req.json();
    logStep("Request data parsed", { configured });

    if (typeof configured !== 'boolean') {
      throw new Error("Invalid 'configured' parameter - must be boolean");
    }

    // Update user's tax_configured status
    const { data: updatedUser, error: updateError } = await supabaseClient
      .from('users')
      .update({ 
        tax_configured: configured,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.user.id)
      .select()
      .single();

    if (updateError) {
      logStep("Error updating user tax configuration", updateError);
      throw new Error('Failed to update tax configuration: ' + updateError.message);
    }

    logStep("Tax configuration updated successfully", { 
      userId: userData.user.id, 
      tax_configured: configured 
    });

    return createSuccessResponse(req, {
      tax_configured: configured,
      message: configured 
        ? 'Tax configuration marked as complete' 
        : 'Tax configuration marked as incomplete'
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return createErrorResponse(req, error.message, 500);
  }
})