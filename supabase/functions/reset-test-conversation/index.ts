// reset-test-conversation — lets a business owner wipe THEIR OWN test conversation
// so the next message they send is a clean first-contact (greeting fires again).
// Authenticates the caller (verify_jwt), reads their owner_test_phone, and deletes
// the whatsapp_messages + whatsapp_conversations for that phone scoped to the
// owner's OWN calendars. The global whatsapp_contacts row is kept (it can belong to
// other businesses); deleting the conversation is enough to reset first-contact.
//
// Deletes run with the service role (the owner lacks client-side RLS to delete
// whatsapp_conversations/_messages), but every row is bound to the authenticated
// user's own calendars, so an owner can only ever reset their own test chat.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalise to wa_id form (country code, digits only). Dutch 06… → 316…; strips +.
function normalizePhone(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("0")) d = "31" + d.slice(1);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "geen autorisatie" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Authenticate the caller against their JWT (anon client).
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ success: false, error: "niet geauthenticeerd" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Service role for the scoped deletes.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: u } = await admin.from("users").select("owner_test_phone").eq("id", userId).maybeSingle();
    const phone = normalizePhone((u as { owner_test_phone?: string } | null)?.owner_test_phone ?? "");
    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "geen_testnummer", message: "Stel eerst je eigen WhatsApp-nummer in om te testen." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cals } = await admin.from("calendars").select("id").eq("user_id", userId);
    const calIds = ((cals as Array<{ id: string }>) ?? []).map((c) => c.id);

    const { data: contact } = await admin.from("whatsapp_contacts").select("id").eq("phone_number", phone).maybeSingle();
    const contactId = (contact as { id?: string } | null)?.id ?? null;

    let cleared = 0;
    if (contactId && calIds.length) {
      const { data: convs } = await admin
        .from("whatsapp_conversations").select("id").eq("contact_id", contactId).in("calendar_id", calIds);
      const convIds = ((convs as Array<{ id: string }>) ?? []).map((c) => c.id);
      if (convIds.length) {
        await admin.from("whatsapp_messages").delete().in("conversation_id", convIds);
        await admin.from("whatsapp_conversations").delete().in("id", convIds);
        cleared = convIds.length;
      }
    }

    return new Response(JSON.stringify({ success: true, cleared, phone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("reset-test-conversation error:", e);
    return new Response(JSON.stringify({ success: false, error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
