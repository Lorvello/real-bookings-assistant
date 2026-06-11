import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = "https://n8n-yls3.onrender.com/webhook/5045530b-186b-48e8-b350-fa67dbbc20ba";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let parsed;
    try {
      parsed = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const { message, conversation_history } = parsed;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Received message:", message);
    console.log("Conversation history length:", conversation_history?.length || 0);

    // Forward to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
    console.log("n8n response:", data);

    // Extract the reply from n8n response (adjust based on your n8n workflow output)
    const reply = data.reply || data.message || data.output || data.response || JSON.stringify(data);

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("test-ai-agent error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      reply: "Sorry, er ging iets mis met de AI. Probeer het later opnieuw."
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
