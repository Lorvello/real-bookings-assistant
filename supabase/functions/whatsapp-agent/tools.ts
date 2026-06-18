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

interface UpcomingBooking {
  id: string;
  status: string;
  start_time: string;
  service_type_id: string;
  service_types?: { name?: string } | null;
}

// Find WHICH of the caller's own upcoming active bookings to act on. Always scoped
// by phone + calendar (tenant + customer isolation). With more than one upcoming
// booking we refuse to guess and ask the model to disambiguate (the caller can then
// re-call with match_start_time = the exact start_time from the returned list).
async function resolveTarget(
  supabase: SupabaseClient,
  ctx: ToolContext,
  matchStart?: string,
): Promise<{ booking?: UpcomingBooking; ambiguous?: UpcomingBooking[]; none?: boolean }> {
  const { data } = await supabase
    .from("bookings")
    .select("id, status, start_time, service_type_id, service_types(name)")
    .eq("customer_phone", ctx.phone)
    .eq("calendar_id", ctx.calendarId)
    .in("status", ["confirmed", "pending"])
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);
  const list = ((data as UpcomingBooking[]) ?? []);
  if (list.length === 0) return { none: true };
  if (matchStart) {
    const day = matchStart.slice(0, 10);
    const exact = list.filter((b) => b.start_time === matchStart);
    const byDay = list.filter((b) => b.start_time.slice(0, 10) === day);
    const hits = exact.length ? exact : byDay;
    if (hits.length === 1) return { booking: hits[0] };
    if (hits.length > 1) return { ambiguous: hits };
    // no match on the hint -> fall through
  }
  if (list.length === 1) return { booking: list[0] };
  return { ambiguous: list };
}

// --- get_business_data formatting helpers -------------------------------------

const DUTCH_DAY_ORDER = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

// "09:00:00" -> "09:00"
function hhmm(t: unknown): string {
  return typeof t === "string" ? t.slice(0, 5) : "";
}

// --- NL time formatting for tool RESULTS ---------------------------------------
// DB times are stored in UTC. The model must never have to convert a UTC instant
// itself (it echoed raw UTC on cancel = "12:00" instead of "14:00" NL). These
// helpers render an instant in Europe/Amsterdam so every confirmation the agent
// reads back is already correct local time, DST-safe.
const NL_TZ = "Europe/Amsterdam";
// e.g. "2026-06-23T12:00:00+00:00" -> "14:00"
function nlTimeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: NL_TZ });
}
// e.g. "2026-06-23T12:00:00+00:00" -> "dinsdag 23 juni 14:00"
function nlWhen(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: NL_TZ });
  return `${date} ${nlTimeOnly(iso)}`;
}

// Turn the business_overview_v2.calendars[].opening_hours dict into readable text the
// agent can quote, e.g. "Maandag: 09:00-17:00, Dinsdag: 09:00-17:00, Zondag: gesloten".
// Uses the first (default) calendar. Returns null when no schedule is set.
function formatOpeningHours(calendars: unknown): string | null {
  if (!Array.isArray(calendars) || calendars.length === 0) return null;
  const oh = (calendars[0] as { opening_hours?: Record<string, { start_time?: string; end_time?: string; is_available?: boolean }> })?.opening_hours;
  if (!oh || typeof oh !== "object") return null;
  const parts: string[] = [];
  for (const day of DUTCH_DAY_ORDER) {
    const d = oh[day];
    if (!d) continue;
    if (d.is_available === false) parts.push(`${day}: gesloten`);
    else if (d.start_time && d.end_time) parts.push(`${day}: ${hhmm(d.start_time)}-${hhmm(d.end_time)}`);
  }
  return parts.length ? parts.join(", ") : null;
}

// Compose one human address line from the parts. Drops the country when it is the
// default (Nederland). Returns null when nothing usable is set.
function formatAddress(d: {
  business_street?: string | null; business_number?: string | null;
  business_postal?: string | null; business_city?: string | null; business_country?: string | null;
}): string | null {
  const line1 = [d.business_street, d.business_number].map((s) => (s || "").trim()).filter(Boolean).join(" ");
  const line2 = [d.business_postal, d.business_city].map((s) => (s || "").trim()).filter(Boolean).join(" ");
  const country = (d.business_country || "").trim();
  const segs = [line1, line2, country && country !== "Nederland" ? country : ""].filter(Boolean);
  return segs.length ? segs.join(", ") : null;
}

// Only share a website that actually looks like one (legacy rows can hold junk like
// " v v"). Returns null otherwise so the agent never quotes garbage.
function cleanWebsite(raw: unknown): string | null {
  const v = (typeof raw === "string" ? raw : "").trim();
  if (!v || /\s/.test(v) || !v.includes(".")) return null;
  return v;
}

interface CalendarPolicy {
  allowCancellations: boolean;
  cancellationDeadlineHours: number | null;
  maxBookingsPerDay: number | null;
}

// The Operations settings the agent must honour. Read once per booking/cancel/
// reschedule. Defaults are permissive when no settings row exists.
async function getCalendarPolicy(supabase: SupabaseClient, calendarId: string): Promise<CalendarPolicy> {
  const { data } = await supabase
    .from("calendar_settings")
    .select("allow_cancellations, cancellation_deadline_hours, max_bookings_per_day")
    .eq("calendar_id", calendarId)
    .maybeSingle();
  const row = data as {
    allow_cancellations?: boolean | null;
    cancellation_deadline_hours?: number | null;
    max_bookings_per_day?: number | null;
  } | null;
  return {
    allowCancellations: row?.allow_cancellations ?? true,
    cancellationDeadlineHours: row?.cancellation_deadline_hours ?? null,
    maxBookingsPerDay: row?.max_bookings_per_day ?? null,
  };
}

// Hours from now until a booking starts (negative once it has started).
function hoursUntil(startTime: string): number {
  return (new Date(startTime).getTime() - Date.now()) / 3_600_000;
}

export function createTools(
  supabase: SupabaseClient,
  ctx: ToolContext,
): { decls: ToolDecl[]; execute: ToolExecutor } {
  const decls: ToolDecl[] = [
    {
      name: "get_business_data",
      description:
        "Bedrijfsinfo en beleid: adres/locatie, website, openingstijden, annuleringsbeleid, betaalinfo, parkeren/OV, toegankelijkheid, voorbereiding, contact (e-mail/telefoon). Gebruik bij vragen over het bedrijf, waar ze zitten, wanneer ze open zijn, of hoe je ze bereikt.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_available_slots",
      description:
        "Geeft ECHTE vrije tijdslots voor een dienst op een datum. Roep aan vóór je een tijd voorstelt of boekt. Verzin nooit zelf tijden. " +
        "Elk slot = { tijd: de kloktijd die je AAN DE KLANT toont (bv '14:00'), start: de exacte ISO-tijd die je ONGEWIJZIGD doorgeeft als book_appointment.start_time }. " +
        "Reken zelf NOOIT tijden om; toon `tijd`, boek met `start`.",
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
      description:
        'Sla de naam van de klant op. Geef name_refused: true ALLEEN mee als de klant expliciet weigert een naam te geven (dan first_name "Privé"). ' +
        "Roep dit pas aan als de klant zelf een naam geeft of weigert — verzin geen naam.",
      parameters: {
        type: "object",
        properties: {
          first_name: { type: "string" },
          last_name: { type: "string" },
          name_refused: { type: "boolean", description: 'true alleen als de klant expliciet GEEN naam wil geven.' },
        },
        required: ["first_name"],
      },
    },
    {
      name: "book_appointment",
      description:
        'Maakt de ECHTE boeking. Roep pas aan als dienst, een beschikbare tijd én een ECHTE naam bekend zijn. ' +
        'Zonder naam weigert deze tool de boeking — tenzij de klant de naam expliciet weigerde (update_lead met name_refused: true, dan customer_name "Privé"). ' +
        "Als dit bedrijf vooruitbetaling vereist, geeft deze tool een betaallink terug (payment_url) en blijft de afspraak gereserveerd tot de klant betaalt — stuur die link en zeg dat de plek gereserveerd is tot betaling.",
      parameters: {
        type: "object",
        properties: {
          service_type_id: { type: "string" },
          start_time: { type: "string", description: "De exacte `start`-waarde (ISO 8601) van het door de klant gekozen slot uit get_available_slots — ongewijzigd doorgeven." },
          end_time: { type: "string", description: "ISO 8601 = start_time + de dienstduur (zelfde tijdzone-offset als start_time)." },
          customer_name: { type: "string", description: 'Naam van de klant, of "Privé".' },
        },
        required: ["service_type_id", "start_time", "end_time", "customer_name"],
      },
    },
    {
      name: "cancel_appointment",
      description:
        "Annuleert de aankomende afspraak van DEZE klant (op telefoonnummer). " +
        "Roep aan als de klant duidelijk wil annuleren. Bij meerdere afspraken geeft de tool 'meerdere_afspraken' " +
        "terug met de lijst — vraag dan welke en roep opnieuw aan met match_start_time. Bevestig daarna kort wat geannuleerd is.",
      parameters: {
        type: "object",
        properties: {
          match_start_time: {
            type: "string",
            description: "Alleen bij meerdere afspraken: de exacte start_time van de gekozen afspraak (uit de eerder teruggegeven lijst).",
          },
        },
      },
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
          match_start_time: {
            type: "string",
            description: "Alleen bij meerdere afspraken: de exacte start_time van de te verzetten afspraak (uit de eerder teruggegeven lijst).",
          },
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
            "business_name, business_type, business_description, cancellation_policy, payment_info, parking_info, public_transport_info, accessibility_info, preparation_info, other_info, business_email, business_phone, business_street, business_number, business_postal, business_city, business_country, website, calendars",
          )
          .eq("user_id", ctx.businessUserId)
          .maybeSingle();
        if (!data) return { error: "geen bedrijfsdata" };

        // Resolve a "other" business type to the free text the owner typed, so the
        // agent never says the literal "other".
        let businessType: string | null = (data.business_type as string | null) ?? null;
        if (businessType === "other") {
          const { data: u } = await supabase
            .from("users").select("business_type_other").eq("id", ctx.businessUserId).maybeSingle();
          businessType = ((u?.business_type_other as string | null) || "").trim() || null;
        }

        // Return only fields the agent should share, with address/website/hours
        // formatted as ready-to-quote text. Omit empty/null so the model doesn't
        // claim to know something that isn't set.
        const out: Record<string, unknown> = {
          business_name: data.business_name,
          business_type: businessType,
          business_description: data.business_description,
          address: formatAddress(data),
          website: cleanWebsite(data.website),
          opening_hours: formatOpeningHours(data.calendars),
          business_email: data.business_email,
          business_phone: data.business_phone,
          cancellation_policy: data.cancellation_policy,
          payment_info: data.payment_info,
          preparation_info: data.preparation_info,
          parking_info: data.parking_info,
          public_transport_info: data.public_transport_info,
          accessibility_info: data.accessibility_info,
          other_info: data.other_info,
        };
        for (const k of Object.keys(out)) {
          if (out[k] === null || out[k] === undefined || out[k] === "") delete out[k];
        }
        return out;
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
        // Each slot carries `tijd` (NL clock time to SHOW the customer) and `start`
        // (the exact ISO instant to pass back as book_appointment.start_time). The
        // model presents `tijd` and books `start`, so it never converts UTC itself.
        return {
          date: args.date,
          available_slots: slots.slice(0, 12).map((s) => ({ tijd: nlTimeOnly(s), start: s })),
          count: slots.length,
        };
      }

      case "update_lead": {
        const update: Record<string, unknown> = { first_name: String(args.first_name) };
        if (args.last_name) update.last_name = String(args.last_name);
        const { error } = await supabase
          .from("whatsapp_contacts")
          .update(update)
          .eq("phone_number", ctx.phone);
        if (error) return { error: error.message };
        // Durably record an EXPLICIT name refusal so book_appointment can tell a genuine
        // "Privé" (customer declined) apart from a premature/placeholder name. Without this
        // flag the model could book a nameless "Privé" appointment before ever asking.
        if (args.name_refused === true && ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          const context = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
          await supabase
            .from("whatsapp_conversations")
            .update({ context: { ...context, name_refused: true } })
            .eq("id", ctx.conversationId);
        }
        return { ok: true };
      }

      case "book_appointment": {
        const start = String(args.start_time);
        const end = String(args.end_time);
        const serviceId = String(args.service_type_id);

        // NAME GATE: never create a nameless booking. The model must collect a real name
        // first, OR the customer must have EXPLICITLY refused (update_lead name_refused:true,
        // recorded in the conversation context). A bare "Privé"/empty without a recorded
        // refusal means the model jumped to booking before asking — refuse and make it ask.
        // This is a server-side guard because the LLM (temp 0.2) otherwise satisfies the
        // required customer_name param with a premature placeholder.
        const rawName = String(args.customer_name ?? "").trim();
        const nameMissing = rawName === "" || rawName.toLowerCase() === "privé" || rawName.toLowerCase() === "prive";
        let refused = false;
        if (nameMissing && ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          refused = ((conv as { context?: Record<string, unknown> } | null)?.context)?.name_refused === true;
        }
        if (nameMissing && !refused) {
          return {
            error: "naam_ontbreekt",
            message: "Boek niet zonder naam: vraag eerst kort de naam van de klant en boek pas daarna.",
          };
        }
        const customerName = nameMissing ? "Privé" : rawName;

        // Enforce the "Max bookings per day" Operations setting (previously saved but
        // never enforced). Count this calendar's confirmed+pending bookings on the
        // requested day; refuse when the cap is reached.
        const bookPolicy = await getCalendarPolicy(supabase, ctx.calendarId);
        if (bookPolicy.maxBookingsPerDay != null) {
          const day = start.slice(0, 10);
          const nextDay = new Date(new Date(`${day}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
          const { count } = await supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("calendar_id", ctx.calendarId)
            .in("status", ["confirmed", "pending"])
            .gte("start_time", `${day}T00:00:00Z`)
            .lt("start_time", `${nextDay}T00:00:00Z`);
          if ((count ?? 0) >= bookPolicy.maxBookingsPerDay) {
            return { error: "dag_vol", message: "Die dag zit vol. Stel de klant een andere dag voor." };
          }
        }

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
          customer_name: customerName,
          customer_phone: ctx.phone,
          start_time: start,
          end_time: end,
          status: paymentRequired ? "pending" : "confirmed",
        };
        if (paymentRequired) {
          // Mirror the web create-booking flow: a pending pay-and-book reservation
          // must carry payment_required + payment_timing so cancel_overdue_unpaid_bookings()
          // (which filters payment_required = true) reclaims the slot if the customer
          // never pays. Without this the pending row would hold the slot forever.
          insertRow.payment_status = "pending";
          insertRow.payment_required = true;
          insertRow.payment_timing = "pay_now";
        }

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
          return { ok: true, booking_id: booking.id, start_time: booking.start_time, when: nlWhen(booking.start_time) };
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
          when: nlWhen(booking.start_time),
          payment_required: true,
          payment_url: payUrl,
        };
      }

      case "cancel_appointment": {
        const target = await resolveTarget(supabase, ctx, args.match_start_time ? String(args.match_start_time) : undefined);
        if (target.none) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te annuleren." };
        }
        if (target.ambiguous) {
          return {
            error: "meerdere_afspraken",
            message: "Je hebt meerdere aankomende afspraken. Vraag welke de klant bedoelt.",
            appointments: target.ambiguous.map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time })),
          };
        }
        const b = target.booking!;

        // Honour the "Allow cancellations" + "Cancellation deadline" Operations
        // settings (previously saved but never enforced).
        const cancelPolicy = await getCalendarPolicy(supabase, ctx.calendarId);
        if (!cancelPolicy.allowCancellations) {
          return {
            error: "annuleren_niet_toegestaan",
            message: "Annuleren kan bij dit bedrijf niet via de assistent. Verwijs naar het annuleringsbeleid of vraag de klant contact op te nemen met het bedrijf.",
          };
        }
        if (cancelPolicy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < cancelPolicy.cancellationDeadlineHours) {
          return {
            error: "te_laat_annuleren",
            message: `Annuleren kan tot ${cancelPolicy.cancellationDeadlineHours} uur van tevoren. Voor deze afspraak is dat niet meer mogelijk; verwijs naar het annuleringsbeleid.`,
          };
        }

        const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
        if (error) return { error: error.message };
        return { ok: true, cancelled: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time } };
      }

      case "reschedule_appointment": {
        const newStart = String(args.start_time);
        const newEnd = String(args.end_time);
        const target = await resolveTarget(supabase, ctx, args.match_start_time ? String(args.match_start_time) : undefined);
        if (target.none) {
          return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te verzetten." };
        }
        if (target.ambiguous) {
          return {
            error: "meerdere_afspraken",
            message: "Je hebt meerdere aankomende afspraken. Vraag welke de klant wil verzetten.",
            appointments: target.ambiguous.map((b) => ({ service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time })),
          };
        }
        const b = target.booking!;
        const serviceId = args.service_type_id ? String(args.service_type_id) : b.service_type_id;

        // Honour the "Cancellation deadline" Operations setting for reschedules too
        // (a reschedule frees the original slot, so the same lead-time rule applies).
        const reschedPolicy = await getCalendarPolicy(supabase, ctx.calendarId);
        if (reschedPolicy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < reschedPolicy.cancellationDeadlineHours) {
          return {
            error: "te_laat_verzetten",
            message: `Verzetten kan tot ${reschedPolicy.cancellationDeadlineHours} uur van tevoren. Voor deze afspraak is dat niet meer mogelijk.`,
          };
        }

        // Free the booking from availability/overlap first so its OWN current slot
        // is not counted as a conflict when validating the new time (otherwise a
        // small shift like +15 min always reads as unavailable). Restore on failure.
        await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);

        const { data: valid, error: valErr } = await supabase.rpc("validate_booking_security", {
          p_calendar_id: ctx.calendarId,
          p_service_type_id: serviceId,
          p_start_time: newStart,
          p_end_time: newEnd,
          p_customer_email: null,
        });
        if (valErr || valid !== true) {
          await supabase.from("bookings").update({ status: b.status }).eq("id", b.id); // restore
          if (valErr) return { error: valErr.message };
          return { error: "niet_beschikbaar", message: "Dat nieuwe tijdstip is niet beschikbaar." };
        }

        const upd: Record<string, unknown> = { start_time: newStart, end_time: newEnd, status: b.status };
        if (args.service_type_id) upd.service_type_id = serviceId;
        const { error: updErr } = await supabase.from("bookings").update(upd).eq("id", b.id);
        if (updErr) {
          await supabase.from("bookings").update({ status: b.status }).eq("id", b.id); // restore old time + status
          if (updErr.code === "23P01" || /no_overlap|exclusion/i.test(updErr.message || "")) {
            return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          }
          return { error: updErr.message };
        }
        return { ok: true, rescheduled: { from: nlWhen(b.start_time), to: nlWhen(newStart), to_start_time: newStart } };
      }

      default:
        return { error: `onbekende tool ${name}` };
    }
  };

  return { decls, execute };
}
