import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// This duplicate endpoint had no repository callsite and created a Stripe Checkout
// session before its booking/payment ledger existed. It also trusted a client-owned
// installment plan, so malformed plans could undercharge, overcharge or produce a
// negative remainder. The active WhatsApp pay-and-book path now owns installment
// creation, validates the server-side service plan and applies the booking launch gate.
// Keep the old URL fail-closed during the compatibility window instead of leaving an
// unowned money-creation path reachable.
serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      success: false,
      error: "This installment endpoint has been retired.",
      code: "INSTALLMENT_ENDPOINT_RETIRED",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
