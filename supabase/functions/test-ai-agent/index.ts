import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { getCorsHeaders, validateOriginOrFail } from "../_shared/headers.ts";
import { RateLimiter, getClientIp } from "../_shared/rateLimit.ts";

// PUBLIC marketing "Test our AI Assistant" demo (How-It-Works page + homepage).
// It is intentionally PUBLIC ("No registration required"); that is the product promise.
// Premium-V2 C5 (2026-06-26): rewired from an n8n proxy to a DIRECT, stateless Groq chat
// completion. WHY the change:
//   1) The old n8n webhook (Luciano's co-owned Render instance) returned only an async ack
//      ("Workflow was started"), never a real reply, so the demo was broken for everyone.
//   2) A prior anti-DoS hardening had bolted a logged-in-USER requirement onto this PUBLIC
//      endpoint (supabase.auth.getUser), so every marketing visitor got 401, and the demo only
//      ever showed the error fallback. That contradicted the "no registration" promise.
// The fix removes the n8n dependency entirely (no co-owned infra, no cold-start flakiness) and
// re-opens public access, with cost/DoS amplification bounded by: the CORS origin allowlist,
// per-IP rate limiting (no user id needed), hard input-size caps, and a bounded max_tokens so
// each call costs at most a small, fixed amount on our own Groq key.
// Reuses the live agent's proven Groq transport (A1c 2026-06-23): Groq LPU, OpenAI-compatible
// Chat Completions, Mozilla UA (Groq is behind Cloudflare, which 1010s a default Deno UA).

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-20b";

// Cost/abuse bounds for a PUBLIC unauthenticated LLM endpoint.
const MAX_MESSAGE_CHARS = 2000;   // a single demo question; longer is rejected
const MAX_HISTORY_TURNS = 10;     // only the last N turns are sent to the model
const MAX_HISTORY_CHARS = 1500;   // each history item is truncated to this
const MAX_REPLY_TOKENS = 500;     // caps spend per call regardless of prompt size

const SYSTEM_PROMPT =
  "You are the demo AI assistant for Bookings Assistant, a WhatsApp-based AI booking " +
  "assistant for appointment-driven businesses (salons, clinics, consultants). This is a " +
  "no-registration public demo so a visitor can feel how naturally the AI handles questions " +
  "about bookings, scheduling, WhatsApp automation, and growing an appointment business. " +
  "Be warm, concise, and genuinely helpful; answer in the visitor's own language (Dutch or " +
  "English). Do not invent specific prices, availability, or customer data. Never use em dashes.";

interface HistoryItem { role?: string; content?: string }

// Direct Groq Chat Completion with a small retry (Groq is behind Cloudflare).
async function groqReply(messages: { role: string; content: string }[]): Promise<string> {
  const key = Deno.env.get("GROQ_API_KEY") ?? "";
  if (!key) throw new Error("GROQ_API_KEY not configured");
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      // Mozilla UA: Groq sits behind Cloudflare, which 403s (code 1010) a default Deno UA.
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "User-Agent": "Mozilla/5.0" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: MAX_REPLY_TOKENS,
      }),
    });
    if (resp.ok) {
      const data = await resp.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (reply) return reply;
      lastErr = "empty completion";
    } else {
      lastErr = `groq ${resp.status}: ${(await resp.text()).slice(0, 200)}`;
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  throw new Error(lastErr || "groq request failed");
}

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

    // RATE LIMIT: per IP (no user; this is a public demo). Backstops cost/DoS amplification.
    const ip = getClientIp(req);
    const limiter = new RateLimiter(supabase, {
      endpoint: "test-ai-agent",
      maxRequests: 15,
      windowSeconds: 60,
      blockDurationSeconds: 300,
    });
    const rl = await limiter.checkLimit(ip);
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

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return new Response(
        JSON.stringify({ error: `message too long (max ${MAX_MESSAGE_CHARS} characters)` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the Chat Completions message array: system + last N history turns + the new message.
    const history: HistoryItem[] = Array.isArray(conversation_history) ? conversation_history : [];
    const trimmedHistory = history
      .slice(-MAX_HISTORY_TURNS)
      .filter((m) => m && typeof m.content === "string" && m.content.trim())
      .map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: String(m.content).slice(0, MAX_HISTORY_CHARS),
      }));

    console.log("test-ai-agent: message length", message.length, "history turns", trimmedHistory.length);

    const reply = await groqReply([
      { role: "system", content: SYSTEM_PROMPT },
      ...trimmedHistory,
      { role: "user", content: message },
    ]);

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
