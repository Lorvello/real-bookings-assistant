// Agent tools — thin wrappers over EXISTING Supabase infra (no new business logic).
// calendar_id + phone are BOUND from the webhook (never LLM-controlled) so the model
// can't book/cancel/reschedule for another calendar/customer. The LLM only supplies
// service/time/name. cancel/reschedule always act on THIS phone's own upcoming
// booking (looked up server-side), never an id the model picks.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import type { ToolDecl, ToolExecutor } from "./llm.ts";

export interface ToolContext {
  calendarId: string;
  phone: string; // customer's wa_id
  businessUserId: string; // owner user_id (for business_overview_v2 KB)
  conversationId: string | null; // whatsapp_conversations.id (needed for pay-and-book links)
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
        'Maakt de ECHTE boeking. Roep pas aan als dienst, een beschikbare tijd én een naam (of "Privé") bekend zijn. ' +
        "Als dit bedrijf vooruitbetaling vereist, geeft deze tool een betaallink terug (payment_url) en blijft de afspraak gereserveerd tot de klant betaalt — stuur die link en zeg dat de plek gereserveerd is tot betaling.",
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
    {
      name: "cancel_appointment",
      description:
        "Annuleert de eerstvolgende aankomende afspraak van DEZE klant (op telefoonnummer). " +
        "Roep aan als de klant duidelijk wil annuleren. Bevestig daarna kort wat geannuleerd is.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "reschedule_appointment",
      description:
        "Verzet de eerstvolgende aankomende afspraak van DEZE klant naar een nieuwe tijd. " +
        "De DIENST blijft hetzelfde — vraag die NIET opnieuw. Geef alleen de nieuwe start- en eindtijd. " +
        "De tool controleert zelf of die tijd vrij is en geeft 'niet_beschikbaar' terug als dat niet zo is; " +
        "gebruik dan get_available_slots om een ander tijdstip voor te stellen.",
      parameters: {
        type: "object",
        properties: {
          start_time: { type: "string", description: "Nieuwe starttijd, ISO 8601 met tijdzone." },
          end_time: { type: "string", description: "Nieuwe eindtijd = start_time + dezelfde dienstduur als de bestaande afspraak." },
          service_type_id: { type: "string", description: "Alleen meegeven als de klant óók van dienst wisselt (zeldzaam)." },
        },
        required: ["start_time", "end_time"],
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

        // Does this calendar require up-front payment? (secure payments on AND
        // payment required for booking). Decided server-side, never by the LLM.
        const { data: ps } = await supabase
          .from("payment_settings")
          .select("secure_payments_enabled, payment_required_for_booking")
          .eq("calendar_id", ctx.calendarId)
          .maybeSingle();
        const paymentRequired = !!(
          (ps as { secure_payments_enabled?: boolean; payment_required_for_booking?: boolean } | null)
            ?.secure_payments_enabled &&
          (ps as { payment_required_for_booking?: boolean } | null)?.payment_required_for_booking
        );

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

        // Pay-and-book reserves the slot as pending until payment; a normal booking
        // is confirmed immediately. A pending booking still occupies the slot
        // (availability + bookings_no_overlap count status IN confirmed,pending).
        const insertRow: Record<string, unknown> = {
          calendar_id: ctx.calendarId,
          service_type_id: serviceId,
          customer_name: String(args.customer_name),
          customer_phone: ctx.phone,
          start_time: start,
          end_time: end,
          status: paymentRequired ? "pending" : "confirmed",
        };
        if (paymentRequired) insertRow.payment_status = "pending";

        const { data: booking, error: insErr } = await supabase
          .from("bookings")
          .insert(insertRow)
          .select("id, start_time")
          .single();
        if (insErr) {
          if (insErr.code === "23P01" || /no_overlap|exclusion/i.test(insErr.message || "")) {
            return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          }
          return { error: insErr.message };
        }

        if (!paymentRequired) {
          return { ok: true, booking_id: booking.id, start_time: booking.start_time };
        }

        // Pay-and-book: mint a hosted Stripe payment link tied to THIS booking via
        // the existing whatsapp-payment-handler (internal, shared-secret). bookingId
        // flows into the Checkout metadata so the stripe-webhook confirms exactly
        // this booking on payment. Mode follows the server's STRIPE_MODE (test until
        // the live-flip), never a client value.
        if (!ctx.conversationId) {
          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
          return {
            error: "payment_setup_failed",
            message: "Ik kon de betaling nu niet opzetten. Probeer het zo nog eens.",
          };
        }
        const secret = Deno.env.get("INTERNAL_FUNCTION_SECRET");
        const testMode = Deno.env.get("STRIPE_MODE") !== "live";
        const { data: pay, error: payErr } = await supabase.functions.invoke("whatsapp-payment-handler", {
          body: {
            conversationId: ctx.conversationId,
            serviceTypeId: serviceId,
            bookingId: booking.id,
            testMode,
            paymentTiming: "pay_now",
            paymentMethod: "ideal",
          },
          headers: secret ? { "x-internal-secret": secret } : undefined,
        });
        const payUrl = (pay as { payment_url?: string } | null)?.payment_url ?? null;
        if (payErr || !payUrl) {
          // No link → don't leave a stuck pending booking holding the slot.
          await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
          return {
            error: "payment_setup_failed",
            message: "Het lukte niet een betaallink te maken. Probeer het later opnieuw of neem contact op.",
          };
        }
        return {
          ok: true,
          booking_id: booking.id,
          start_time: booking.start_time,
          payment_required: true,
          payment_url: payUrl,
        };
      }

      case "cancel_appointment": {
        // The customer's own next upcoming active booking (server-side lookup;
        // the model never supplies an id).
        const { data: b } = await supabase
          .from("bookings")
          .select("id, start_time, service_types(name)")
          .eq("customer_phone", ctx.phone)
          .eq("calendar_id", ctx.calendarId)
          .in("status", ["confirmed", "pending"])
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!b) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te annuleren." };
        }
        const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", (b as { id: string }).id);
        if (error) return { error: error.message };
        return {
          ok: true,
          cancelled: {
            service: (b as { service_types?: { name?: string } }).service_types?.name ?? null,
            start_time: (b as { start_time: string }).start_time,
          },
        };
      }

      case "reschedule_appointment": {
        const newStart = String(args.start_time);
        const newEnd = String(args.end_time);
        const { data: b } = await supabase
          .from("bookings")
          .select("id, service_type_id, start_time")
          .eq("customer_phone", ctx.phone)
          .eq("calendar_id", ctx.calendarId)
          .in("status", ["confirmed", "pending"])
          .gt("start_time", new Date().toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!b) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te verzetten." };
        }
        const serviceId = args.service_type_id
          ? String(args.service_type_id)
          : (b as { service_type_id: string }).service_type_id;

        const { data: valid, error: valErr } = await supabase.rpc("validate_booking_security", {
          p_calendar_id: ctx.calendarId,
          p_service_type_id: serviceId,
          p_start_time: newStart,
          p_end_time: newEnd,
          p_customer_email: null,
        });
        if (valErr) return { error: valErr.message };
        if (valid !== true) return { error: "niet_beschikbaar", message: "Dat nieuwe tijdstip is niet beschikbaar." };

        const upd: Record<string, unknown> = { start_time: newStart, end_time: newEnd };
        if (args.service_type_id) upd.service_type_id = serviceId;
        const { error: updErr } = await supabase.from("bookings").update(upd).eq("id", (b as { id: string }).id);
        if (updErr) {
          if (updErr.code === "23P01" || /no_overlap|exclusion/i.test(updErr.message || "")) {
            return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          }
          return { error: updErr.message };
        }
        return { ok: true, rescheduled: { from: (b as { start_time: string }).start_time, to: newStart } };
      }

      default:
        return { error: `onbekende tool ${name}` };
    }
  };

  return { decls, execute };
}
