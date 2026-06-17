// Agent tools — thin wrappers over EXISTING Supabase infra (no new business logic).
// calendar_id + phone are BOUND from the webhook (never LLM-controlled) so the model
// can't book for another calendar/customer. The LLM only supplies service/time/name.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import type { ToolDecl, ToolExecutor } from "./llm.ts";

export interface ToolContext {
  calendarId: string;
  phone: string; // customer's wa_id
  businessUserId: string; // owner user_id (for business_overview_v2 KB)
}

export function createTools(
  supabase: SupabaseClient,
  ctx: ToolContext,
): { decls: ToolDecl[]; execute: ToolExecutor } {
  const decls: ToolDecl[] = [
    {
      name: "get_business_data",
      description:
        "Bedrijfsinfo en beleid: annuleringsbeleid, betaalinfo, parkeren/OV, toegankelijkheid, voorbereiding, contact. Gebruik bij vragen over het bedrijf.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_available_slots",
      description:
        "Geeft ECHTE vrije tijdslots voor een dienst op een datum. Roep aan vóór je een tijd voorstelt of boekt. Verzin nooit zelf tijden.",
      parameters: {
        type: "object",
        properties: {
          service_type_id: { type: "string", description: "UUID van de dienst (uit de services-lijst)." },
          date: { type: "string", description: "Datum in YYYY-MM-DD." },
        },
        required: ["service_type_id", "date"],
      },
    },
    {
      name: "update_lead",
      description: 'Sla de naam van de klant op. Bij weigering: first_name = "Privé".',
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
        },
        required: ["first_name"],
      },
    },
    {
      name: "book_appointment",
      description:
        'Maakt de ECHTE boeking. Roep pas aan als dienst, een beschikbare tijd én een naam (of "Privé") bekend zijn.',
      parameters: {
        type: "object",
        properties: {
          service_type_id: { type: "string" },
          start_time: { type: "string", description: "ISO 8601 met tijdzone, bv 2026-06-20T14:00:00+02:00" },
          end_time: { type: "string", description: "ISO 8601 = start_time + dienstduur" },
          customer_name: { type: "string", description: 'Naam van de klant, of "Privé".' },
        },
        required: ["service_type_id", "start_time", "end_time", "customer_name"],
      },
    },
  ];

  const execute: ToolExecutor = async (name, args) => {
    switch (name) {
      case "get_business_data": {
        const { data } = await supabase
          .from("business_overview_v2")
          .select(
            "business_name, business_type, business_description, cancellation_policy, payment_info, parking_info, public_transport_info, accessibility_info, preparation_info, other_info, business_email, business_phone",
          )
          .eq("user_id", ctx.businessUserId)
          .maybeSingle();
        return data ?? { error: "geen bedrijfsdata" };
      }

      case "get_available_slots": {
        const { data, error } = await supabase.rpc("get_available_slots", {
          p_calendar_id: ctx.calendarId,
          p_service_type_id: String(args.service_type_id),
          p_date: String(args.date),
        });
        if (error) return { error: error.message };
        const slots = ((data as Array<{ slot_start: string; is_available: boolean }>) ?? [])
          .filter((s) => s.is_available)
          .map((s) => s.slot_start);
        return { date: args.date, available_slots: slots.slice(0, 12), count: slots.length };
      }

      case "update_lead": {
        const update: Record<string, unknown> = { first_name: String(args.first_name) };
        if (args.last_name) update.last_name = String(args.last_name);
        const { error } = await supabase
          .from("whatsapp_contacts")
          .update(update)
          .eq("phone_number", ctx.phone);
        return error ? { error: error.message } : { ok: true };
      }

      case "book_appointment": {
        const start = String(args.start_time);
        const end = String(args.end_time);
        const serviceId = String(args.service_type_id);
        // Same safety layer as create-booking: validate_booking_security (the
        // calendar_id overload returns a boolean, true = ok), then the
        // bookings_no_overlap exclusion constraint catches a race on insert.
        // Email is null for WhatsApp (verified allowed).
        const { data: valid, error: valErr } = await supabase.rpc("validate_booking_security", {
          p_calendar_id: ctx.calendarId,
          p_service_type_id: serviceId,
          p_start_time: start,
          p_end_time: end,
          p_customer_email: null,
        });
        if (valErr) return { error: valErr.message };
        if (valid !== true) return { error: "niet_beschikbaar", message: "Dat tijdstip is niet beschikbaar." };

        const { data: booking, error: insErr } = await supabase
          .from("bookings")
          .insert({
            calendar_id: ctx.calendarId,
            service_type_id: serviceId,
            customer_name: String(args.customer_name),
            customer_phone: ctx.phone,
            start_time: start,
            end_time: end,
            status: "confirmed",
          })
          .select("id, start_time")
          .single();
        if (insErr) {
          if (insErr.code === "23P01" || /no_overlap|exclusion/i.test(insErr.message || "")) {
            return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          }
          return { error: insErr.message };
        }
        return { ok: true, booking_id: booking.id, start_time: booking.start_time };
      }

      default:
        return { error: `onbekende tool ${name}` };
    }
  };

  return { decls, execute };
}
