import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getCorsHeaders, validateOriginOrFail } from "../_shared/headers.ts";
import { RateLimiter, getClientIp } from "../_shared/rateLimit.ts";

// n8n test-agent webhook moved to an env var (config, not code). Falls back to the
// previously hardcoded URL so an unset secret doesn't break the dev test page.
const N8N_WEBHOOK_URL = Deno.env.get("N8N_TEST_AGENT_URL")
  || "https://n8n-yls3.onrender.com/webhook/5045530b-186b-48e8-b350-fa67dbbc20ba";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // CORS allowlist: reject browser requests from non-allowed origins.
  const originBlock = validateOriginOrFail(req);
  if (originBlock) return originBlock;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // AUTH: this was a public, unauthenticated, rate-limit-less proxy to n8n
    // (cost/DoS amplification). Require an authenticated user now.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: authData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authErr || !authData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // RATE LIMIT: per IP + user. Caps amplification against n8n + the LLM.
    const ip = getClientIp(req);
    const limiter = new RateLimiter(supabase, {
      endpoint: "test-ai-agent",
      maxRequests: 20,
      windowSeconds: 60,
      blockDurationSeconds: 300,
    });
    const rl = await limiter.checkLimit(ip, authData.user.id);
    if (!rl.allowed) {
      return RateLimiter.createRateLimitResponse(rl, corsHeaders);
    }

    let parsed;
    try {
      parsed = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { message, conversation_history } = parsed;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Received message length:", message.length);
    console.log("Conversation history length:", conversation_history?.length || 0);

    // Forward to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversation_history,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.error("n8n webhook error:", response.status, await response.text());
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    const data = await response.json();

    // Extract the reply from n8n response
    const reply = data.reply || data.message || data.output || data.response || JSON.stringify(data);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("test-ai-agent error:", error);
    return new Response(JSON.stringify({
      error: (error as Error)?.message,
      reply: "Sorry, er ging iets mis met de AI. Probeer het later opnieuw.",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
