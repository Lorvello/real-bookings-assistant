// accept-team-invitation — completes a team invite for an invitee who has NO account yet.
//
// Why an edge fn: a team member's public.users row REQUIRES a matching auth.users row
// (public.users.id -> auth.users.id), and only the auth admin API can create an auth user. So the
// old DB-only accept (which fabricated a public.users id) always failed with a FK violation. Here we
// create the auth user with the service role, then call accept_team_invitation_for_user to do the
// FK-safe linking (personal calendar + calendar_members), then email the member a set-password link.
//
// The invitee is ANONYMOUS; the unguessable token in the body is the capability (same model as the
// get_team_invitation_by_token read RPC). Body: { token: string }.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const APP_URL = Deno.env.get("APP_URL") || "https://bookingsassistant.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ success: false, error: "token required" }, 400);

    // 1. Validate the invitation (service role bypasses RLS; token is the capability).
    const { data: inv } = await admin
      .from("team_invitations")
      .select("id, email, full_name, role, calendar_id, status, expires_at")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!inv) return json({ success: false, error: "Invitation not found or expired" }, 400);

    const email = String(inv.email).trim();

    // 2. Find the existing user for this email, else create the auth user (handle_new_user trigger
    //    then creates public.users). public.users.id === auth.users.id, so an existing public.users
    //    row means the auth user exists with that id.
    let userId: string | null = null;
    let isNewUser = false;
    const { data: existing } = await admin.from("users").select("id").ilike("email", email).maybeSingle();
    if (existing?.id) {
      userId = existing.id as string;
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: inv.full_name },
      });
      if (createErr || !created?.user?.id) {
        // Rare: an auth user exists for this email but no public.users row (inconsistent state).
        const already = String(createErr?.message || "").toLowerCase().includes("already");
        return json({
          success: false,
          error: already
            ? "This email already has an account. Please log in, then open the invitation link again."
            : `Could not create the team member: ${createErr?.message ?? "unknown error"}`,
        }, 400);
      }
      userId = created.user.id;
      isNewUser = true;
    }

    // 3. FK-safe linking (personal calendar + calendar_members + mark accepted) with the real user id.
    const { data: linkRes, error: linkErr } = await admin.rpc("accept_team_invitation_for_user", {
      p_token: token,
      p_user_id: userId,
    });
    const link = linkRes as { success?: boolean; error?: string; error_code?: string } | null;
    if (linkErr || !link || link.success !== true) {
      return json({ success: false, error: link?.error || linkErr?.message || "Failed to accept invitation", error_code: link?.error_code ?? null }, 400);
    }

    // 4. Email the member a set-password link so they can log in (best-effort; never fail the accept).
    if (isNewUser) {
      try {
        const { data: linkData } = await admin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${APP_URL}/reset-password` },
        });
        const actionLink = (linkData as { properties?: { action_link?: string } } | null)?.properties?.action_link;
        if (actionLink) {
          await resend.emails.send({
            from: "Bookings Assistant <noreply@bookingsassistant.com>",
            to: [email],
            subject: "Set your password to join the team",
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111827">
                <h2 style="color:#111827">You're in! 🎉</h2>
                <p>Hi ${inv.full_name || email.split("@")[0]}, your team access is set up. Choose a password to log in:</p>
                <p style="text-align:center;margin:28px 0">
                  <a href="${actionLink}" style="display:inline-block;background:#1A7F4D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Set my password</a>
                </p>
                <p style="color:#6B7280;font-size:13px">If the button doesn't work, copy this link into your browser:<br><a href="${actionLink}" style="color:#1A7F4D;word-break:break-all">${actionLink}</a></p>
              </div>`,
          });
        }
      } catch (mailErr) {
        console.error("set-password email failed (non-fatal):", mailErr);
      }
    }

    return json({ success: true, user_id: userId, is_new_user: isNewUser });
  } catch (e) {
    console.error("accept-team-invitation error:", e);
    return json({ success: false, error: String((e as Error)?.message || e) }, 500);
  }
});
