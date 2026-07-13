import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

// MONITORING/ALERTS ITEM 4 (see ../../../Bookings Assistant/launch-ready-loop/
// MONITORING_ALERTS_DESIGN.md section 4, and GOAL_PROMPT_BA_MONITORING_ALERTS.md backlog Item 4).
//
// Delivery-only. Deliberately its own deploy unit, separate from whatsapp-agent's detection code
// (monitoringAlerts.ts / index.ts), per the run-spec's explicit decoupling rule: detection writes
// to monitoring_alerts, this function reads unnotified rows and sends, so a delivery failure
// (Resend outage, bad address) can never block or slow the live agent turn, and a detection bug
// can never suppress an already-written alert. Invoked on its own pg_cron schedule via pg_net,
// mirroring process-booking-reminders/index.ts's own cron-invoked shape (see the schedule
// migration next to this file). Gated by x-internal-secret since a SQL cron caller cannot mint a
// JWT (same posture as process-booking-reminders and whatsapp-payment-handler); fails closed if
// the secret is absent or wrong, never sends unguarded.

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

interface MonitoringAlertRow {
  id: string;
  failure_class: string;
  conversation_id: string | null;
  contact_phone: string | null;
  turn_id: string | null;
  details: Record<string, unknown>;
  detected_by: string;
  created_at: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderAlertHtml(alert: MonitoringAlertRow): string {
  const detailsJson = escapeHtml(JSON.stringify(alert.details, null, 2));
  const rows: Array<[string, string]> = [
    ["Failure class", alert.failure_class],
    ["Detected by", alert.detected_by],
    ["Conversation ID", alert.conversation_id ?? "(unknown)"],
    ["Contact phone", alert.contact_phone ?? "(unknown)"],
    ["Turn ID", alert.turn_id ?? "(unknown)"],
    ["Detected at", alert.created_at],
  ];
  const rowsHtml = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;color:#6b7280;">${escapeHtml(label)}</td>` +
        `<td style="padding:6px 12px;font-weight:600;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `
    <!DOCTYPE html><html><head><meta charset="utf-8"></head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
      <div style="max-width:600px;margin:0 auto;background:#fff;">
        <div style="background:#b91c1c;color:#fff;padding:24px 24px;">
          <h1 style="margin:0;font-size:20px;">Bookings Assistant monitoring alert</h1>
          <p style="margin:6px 0 0;opacity:.9;">${escapeHtml(alert.failure_class)}</p>
        </div>
        <div style="padding:24px 24px;color:#111827;">
          <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">${rowsHtml}</table>
          <p style="color:#6b7280;font-size:13px;margin:0 0 6px;">Details:</p>
          <pre style="background:#f3f4f6;padding:12px;border-radius:6px;font-size:12px;overflow-x:auto;white-space:pre-wrap;">${detailsJson}</pre>
        </div>
      </div>
    </body></html>`;
}

// R17 GAP B FIX (see _BA_MONITORING_ALERTS_STATE.md R17 finding): the heartbeat's own
// `config_disabled` self-alert (migration 20260713150000_MONITEM3_R9_gap4_heartbeat.sql) exists
// specifically to warn that monitoring_alert_config.enabled has gone false - but the enabled-gate
// short-circuit below returns before ever reading pending rows, so that exact row could never be
// delivered, a dead-man's-switch that could never actually go off. Fix: fetch and dispatch this
// one specific heartbeat reason BEFORE the enabled-gate check, independent of it. Every other
// alert type/reason keeps the existing enabled-gate behavior unchanged.
const CONFIG_DISABLED_FAILURE_CLASS = "monitor_heartbeat_missing";
const CONFIG_DISABLED_REASON = "config_disabled";

async function dispatchConfigDisabledHeartbeatAlerts(
  alertEmail: string | null | undefined,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  if (!alertEmail) return { sent, failed };

  const { data: pending, error: pendingErr } = await supabase
    .from("monitoring_alerts")
    .select("id, failure_class, conversation_id, contact_phone, turn_id, details, detected_by, created_at")
    .is("notified_at", null)
    .eq("failure_class", CONFIG_DISABLED_FAILURE_CLASS)
    .eq("details->>reason", CONFIG_DISABLED_REASON)
    .order("created_at", { ascending: true })
    .limit(20);

  if (pendingErr || !pending) return { sent, failed };

  for (const alert of pending as MonitoringAlertRow[]) {
    try {
      const emailResp = await resend.emails.send({
        from: "Bookings Assistant Monitoring <noreply@bookingsassistant.com>",
        to: [alertEmail],
        subject: `BA monitoring alert: ${alert.failure_class}`,
        html: renderAlertHtml(alert),
      });
      if (emailResp.error) {
        failed++;
        console.error("monitoring-alert-dispatcher config_disabled send error:", alert.id, emailResp.error);
        continue;
      }
      const { error: updateErr } = await supabase
        .from("monitoring_alerts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", alert.id)
        .is("notified_at", null);
      if (updateErr) {
        failed++;
        console.error("monitoring-alert-dispatcher config_disabled stamp error:", alert.id, updateErr);
        continue;
      }
      sent++;
    } catch (e) {
      failed++;
      console.error("monitoring-alert-dispatcher config_disabled unexpected error:", alert.id, e);
    }
  }

  return { sent, failed };
}

async function dispatchPendingAlerts(): Promise<{
  enabled: boolean;
  checked: number;
  sent: number;
  failed: number;
}> {
  const { data: config, error: configErr } = await supabase
    .from("monitoring_alert_config")
    .select("alert_email, enabled")
    .limit(1)
    .maybeSingle();

  // The config_disabled heartbeat alert must still be able to reach the inbox even while
  // enabled=false (that is precisely the condition it exists to surface) - dispatch it
  // independent of, and before, the normal enabled-gate short-circuit below. Everything else
  // about the gating stays exactly as it was.
  const heartbeatResult = await dispatchConfigDisabledHeartbeatAlerts(config?.alert_email);

  if (configErr || !config || !config.enabled || !config.alert_email) {
    return {
      enabled: !!config?.enabled,
      checked: heartbeatResult.sent + heartbeatResult.failed,
      sent: heartbeatResult.sent,
      failed: heartbeatResult.failed,
    };
  }

  const { data: pending, error: pendingErr } = await supabase
    .from("monitoring_alerts")
    .select("id, failure_class, conversation_id, contact_phone, turn_id, details, detected_by, created_at")
    .is("notified_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (pendingErr || !pending) {
    return {
      enabled: true,
      checked: heartbeatResult.sent + heartbeatResult.failed,
      sent: heartbeatResult.sent,
      failed: heartbeatResult.failed,
    };
  }

  let sent = heartbeatResult.sent;
  let failed = heartbeatResult.failed;

  for (const alert of pending as MonitoringAlertRow[]) {
    if (alert.failure_class === CONFIG_DISABLED_FAILURE_CLASS && (alert.details as Record<string, unknown>)?.reason === CONFIG_DISABLED_REASON) {
      // Already handled by dispatchConfigDisabledHeartbeatAlerts above; skip to avoid a double-send.
      continue;
    }
    try {
      const emailResp = await resend.emails.send({
        from: "Bookings Assistant Monitoring <noreply@bookingsassistant.com>",
        to: [config.alert_email],
        subject: `BA monitoring alert: ${alert.failure_class}`,
        html: renderAlertHtml(alert),
      });
      if (emailResp.error) {
        failed++;
        console.error("monitoring-alert-dispatcher send error:", alert.id, emailResp.error);
        continue;
      }
      const { error: updateErr } = await supabase
        .from("monitoring_alerts")
        .update({ notified_at: new Date().toISOString() })
        .eq("id", alert.id)
        .is("notified_at", null);
      if (updateErr) {
        failed++;
        console.error("monitoring-alert-dispatcher stamp error:", alert.id, updateErr);
        continue;
      }
      sent++;
    } catch (e) {
      failed++;
      console.error("monitoring-alert-dispatcher unexpected error:", alert.id, e);
    }
  }

  return { enabled: true, checked: pending.length + heartbeatResult.sent + heartbeatResult.failed, sent, failed };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const expectedSecret = Deno.env.get("MONITORING_ALERT_DISPATCH_SECRET");
  if (!expectedSecret || req.headers.get("x-internal-secret") !== expectedSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const result = await dispatchPendingAlerts();
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("monitoring-alert-dispatcher error:", error);
    return new Response(JSON.stringify({ error: error.message, success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
