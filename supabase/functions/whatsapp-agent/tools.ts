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
  // Server-detected: the customer's CURRENT message affirms a pending cancel preview from a
  // previous turn. Drives the cancel COMMIT deterministically instead of trusting the small
  // model to set confirmed:true (which it does not do reliably). Set in index.ts each turn.
  confirmCancel?: boolean;
  // Same idea for a NEW booking: the customer affirms a pending booking proposal from a
  // previous turn. Drives the book COMMIT deterministically (and from the SERVER-stored exact
  // start_time, so the model's time-reconstruction can't book the wrong hour).
  confirmBook?: boolean;
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

export interface DayHours { open: boolean; start?: string; end?: string; }

// Structured opening hours for ALL 7 days (a day absent from the dict OR is_available:false
// counts as CLOSED). The first (default) calendar. Returns null when no schedule is set.
// index.ts uses this to build a deterministic concrete-date calendar so the model never has
// to compute "is Sunday open?" or resolve a relative date itself.
export function openingHoursByDay(calendars: unknown): Record<string, DayHours> | null {
  if (!Array.isArray(calendars) || calendars.length === 0) return null;
  const oh = (calendars[0] as { opening_hours?: Record<string, { start_time?: string; end_time?: string; is_available?: boolean }> })?.opening_hours;
  if (!oh || typeof oh !== "object") return null;
  const out: Record<string, DayHours> = {};
  for (const day of DUTCH_DAY_ORDER) {
    const d = oh[day];
    if (d && d.is_available !== false && d.start_time && d.end_time) {
      out[day] = { open: true, start: hhmm(d.start_time), end: hhmm(d.end_time) };
    } else {
      out[day] = { open: false };
    }
  }
  return out;
}

// Readable opening-hours text, with consecutive same-status days COLLAPSED into ranges so
// the model can't mis-summarise a 5-day list (observed: it rendered Mon-Fri as "Maandag,
// Vrijdag", silently dropping the middle days). E.g. "Maandag t/m vrijdag 09:00-17:00,
// zaterdag en zondag gesloten". Returns null when no schedule is set.
function formatOpeningHoursFromByDay(byDay: Record<string, DayHours> | null): string | null {
  if (!byDay) return null;
  const keyOf = (d: DayHours) => (d.open ? `${d.start}-${d.end}` : "gesloten");
  const segs: string[] = [];
  let i = 0;
  while (i < DUTCH_DAY_ORDER.length) {
    const start = DUTCH_DAY_ORDER[i];
    const key = keyOf(byDay[start]);
    let j = i;
    while (j + 1 < DUTCH_DAY_ORDER.length && keyOf(byDay[DUTCH_DAY_ORDER[j + 1]]) === key) j++;
    const label = i === j
      ? start
      : (j === i + 1 ? `${start} en ${DUTCH_DAY_ORDER[j]}` : `${start} t/m ${DUTCH_DAY_ORDER[j]}`);
    segs.push(byDay[start].open ? `${label} ${key}` : `${label} gesloten`);
    i = j + 1;
  }
  return segs.length ? segs.join(", ") : null;
}
function formatOpeningHours(calendars: unknown): string | null {
  return formatOpeningHoursFromByDay(openingHoursByDay(calendars));
}

// Bookable weekly hours for a SPECIFIC calendar, derived from the REAL availability schedule
// (availability_schedules + availability_rules) — the SAME source get_available_slots uses. This
// is the booking TRUTH, so the agent's spoken opening hours + the concrete-date <kalender> match
// exactly what it can actually book. We deliberately do NOT use business_overview_v2.calendars[0]
// .opening_hours: that JSON is a separate, often-stale field AND is calendars[0], not necessarily
// THIS calendar (a business with >1 calendar would otherwise speak the wrong one's hours). Observed
// live: the agent said "Maandag gesloten" from that stale JSON, then booked Monday via the real
// schedule. day_of_week: 1=Monday .. 7=Sunday (ISO); a day absent or is_available:false = closed.
const DOW_TO_DUTCH: Record<number, string> = {
  1: "Maandag", 2: "Dinsdag", 3: "Woensdag", 4: "Donderdag", 5: "Vrijdag", 6: "Zaterdag", 7: "Zondag",
};
export async function getCalendarWeeklyHours(
  supabase: SupabaseClient,
  calendarId: string,
): Promise<{ byDay: Record<string, DayHours>; text: string | null } | null> {
  // The default schedule (fallback: earliest-created) for this calendar.
  const { data: scheds } = await supabase
    .from("availability_schedules")
    .select("id, is_default, created_at")
    .eq("calendar_id", calendarId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  const schedule = (scheds as Array<{ id: string }> | null)?.[0];
  if (!schedule) return null;
  const { data: rules } = await supabase
    .from("availability_rules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("schedule_id", schedule.id);
  const ruleList =
    (rules as Array<{ day_of_week: number; start_time: string; end_time: string; is_available: boolean }> | null) ?? [];
  // A day can carry multiple windows; for the spoken summary take the earliest start + latest end
  // of its available windows. Absent / is_available:false day = closed.
  const byNum: Record<number, { start: string; end: string }> = {};
  for (const r of ruleList) {
    if (r.is_available === false || !r.start_time || !r.end_time) continue;
    const s = hhmm(r.start_time), e = hhmm(r.end_time);
    const cur = byNum[r.day_of_week];
    if (!cur) byNum[r.day_of_week] = { start: s, end: e };
    else { if (s < cur.start) cur.start = s; if (e > cur.end) cur.end = e; }
  }
  const byDay: Record<string, DayHours> = {};
  for (let d = 1; d <= 7; d++) {
    const nm = DOW_TO_DUTCH[d];
    byDay[nm] = byNum[d] ? { open: true, start: byNum[d].start, end: byNum[d].end } : { open: false };
  }
  return { byDay, text: formatOpeningHoursFromByDay(byDay) };
}

// Service duration (minutes) for end-time computation; default 30 when unknown.
async function serviceDuration(supabase: SupabaseClient, serviceId: string): Promise<number> {
  const { data } = await supabase.from("service_types").select("duration").eq("id", serviceId).maybeSingle();
  const d = (data as { duration?: number } | null)?.duration;
  return typeof d === "number" && d > 0 ? d : 30;
}

// Resolve a customer-named clock time (date=YYYY-MM-DD, time=HH:MM in Amsterdam local) to the EXACT
// slot ISO instant SERVER-SIDE, so book/reschedule can act on a named time in ONE tool call — no
// separate get_available_slots LLM round-trip, which is the dominant per-turn latency cost (~3s).
// Reuses the very RPC the slots tool uses, so a booked time is always a real grid slot, DST-safe.
// Returns the free times when the requested one isn't available, so the model offers an alternative
// in the SAME turn (a round-trip happens only when the time is genuinely taken, which is correct).
async function resolveSlotForTime(
  supabase: SupabaseClient,
  calendarId: string,
  serviceId: string,
  date: string,
  time: string,
  durationMin: number,
): Promise<{ start: string; end: string } | { unavailable: true; available: string[] } | { error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "bad_date" };
  const m = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return { error: "bad_time" };
  const want = `${m[1].padStart(2, "0")}:${m[2]}`;
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_calendar_id: calendarId, p_service_type_id: serviceId, p_date: date,
  });
  if (error) return { error: error.message };
  const free = ((data as Array<{ slot_start: string; is_available: boolean }>) ?? []).filter((s) => s.is_available);
  const match = free.find((s) => nlTimeOnly(s.slot_start).slice(0, 5) === want);
  if (match) {
    const end = new Date(new Date(match.slot_start).getTime() + durationMin * 60000).toISOString();
    return { start: match.slot_start, end };
  }
  return { unavailable: true, available: free.slice(0, 12).map((s) => nlTimeOnly(s.slot_start)) };
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

// Trim and drop empty; keep internal spaces (phone numbers like "+31 6 1234 5678").
function nonEmpty(raw: unknown): string | null {
  const v = (typeof raw === "string" ? raw : "").trim();
  return v ? v : null;
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

// Fetch + format ALL business info the agent may share, nulls stripped. Shared by the
// get_business_data tool AND index.ts, which injects the result into the system prompt
// EVERY turn — so the agent always has the truth in context and can't skip the tool and
// then guess (observed: false "no info" on set fields + a hallucinated Instagram handle
// when it answered without calling the tool). Returns null when no business row exists.
export async function fetchBusinessData(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown> | null> {
  // Only the fields the CURRENT settings UI actually supports (AIKnowledgeTab): the 5
  // social platforms (instagram/facebook/linkedin/tiktok/youtube/x) were removed as orphan
  // fields, so we no longer project them — otherwise the agent quotes stale values the
  // owner can no longer see or edit (observed live: a removed Instagram/Facebook link).
  // Website stays (still an editable link field).
  const { data } = await supabase
    .from("business_overview_v2")
    .select(
      "business_name, business_type, business_description, cancellation_policy, payment_info, parking_info, public_transport_info, accessibility_info, preparation_info, other_info, business_email, business_phone, business_whatsapp, business_street, business_number, business_postal, business_city, business_country, website, calendars",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  // Resolve a "other" business type to the free text the owner typed.
  let businessType: string | null = (data.business_type as string | null) ?? null;
  if (businessType === "other") {
    const { data: u } = await supabase
      .from("users").select("business_type_other").eq("id", userId).maybeSingle();
    businessType = ((u?.business_type_other as string | null) || "").trim() || null;
  }

  const out: Record<string, unknown> = {
    business_name: data.business_name,
    business_type: businessType,
    business_description: data.business_description,
    address: formatAddress(data),
    website: cleanWebsite(data.website),
    opening_hours: formatOpeningHours(data.calendars),
    // Structured per-day hours for index.ts's concrete-date calendar (not rendered into the
    // prompt text by renderBusinessData — it only renders string fields).
    opening_hours_struct: openingHoursByDay(data.calendars),
    business_email: data.business_email,
    business_phone: data.business_phone,
    business_whatsapp: nonEmpty(data.business_whatsapp),
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

export function createTools(
  supabase: SupabaseClient,
  ctx: ToolContext,
): { decls: ToolDecl[]; execute: ToolExecutor } {
  const decls: ToolDecl[] = [
    {
      name: "get_business_data",
      description:
        "Bedrijfsinfo en beleid: adres/locatie, website, openingstijden, annuleringsbeleid, betaalinfo, parkeren/OV, toegankelijkheid, voorbereiding en contact (e-mail/telefoon/WhatsApp-nummer). Gebruik bij vragen over het bedrijf, waar ze zitten, wanneer ze open zijn, of hoe je ze bereikt.",
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
        "Boekt een NIEUWE afspraak in TWEE stappen (net als annuleren, zodat de klant eerst kan bevestigen). " +
        "STAP 1 (preview): heeft de klant een concrete dag + tijd genoemd? Roep dan METEEN aan met service_type_id + date (YYYY-MM-DD uit de <kalender>) + time (HH:MM) + naam — je hoeft get_available_slots NIET apart aan te roepen, de tool zoekt zelf het exacte vrije slot voor die tijd. De tool boekt dan NIETS en geeft 'needs_confirmation' terug met dienst, tijd en naam; vat die kort samen en vraag of het klopt. Is die tijd niet vrij, dan geeft de tool 'niet_beschikbaar' + de vrije tijden terug; stel er meteen een voor. " +
        "STAP 2 (commit): roep PAS NA de bevestiging van de klant opnieuw aan (alleen confirmed:true volstaat, de tool gebruikt de in stap 1 opgeslagen tijd). " +
        'Zonder naam weigert de tool de boeking, tenzij de klant expliciet weigerde (update_lead met name_refused: true, dan customer_name "Privé"). ' +
        "Vereist dit bedrijf vooruitbetaling, dan geeft stap 2 een betaallink (payment_url) terug; stuur die en zeg dat de plek gereserveerd is tot betaling.",
      parameters: {
        type: "object",
        properties: {
          service_type_id: { type: "string" },
          date: { type: "string", description: "Datum YYYY-MM-DD (uit de <kalender>). Geef date + time door als de klant een concrete tijd noemde; de tool zoekt zelf het exacte slot (sneller, geen aparte get_available_slots nodig)." },
          time: { type: "string", description: "Kloktijd HH:MM (Amsterdamse tijd) die de klant koos, bv '14:00'. Samen met date de voorkeursmanier om te boeken." },
          start_time: { type: "string", description: "ALTERNATIEF voor date+time: de exacte 'start'-waarde (ISO 8601) van een slot uit get_available_slots, ongewijzigd gekopieerd. Gebruik date+time als je die hebt; val alleen op start_time terug als je al een ISO-slot uit get_available_slots koos. Reconstrueer een ISO-tijd NOOIT zelf." },
          end_time: { type: "string", description: "Alleen nodig bij start_time: ISO 8601 = start_time + de dienstduur. Bij date+time berekent de tool de eindtijd zelf." },
          customer_name: { type: "string", description: 'Naam van de klant, of "Privé".' },
          confirmed: { type: "boolean", description: "Laat WEG of false bij de eerste (preview) aanroep. Zet op true bij de tweede aanroep, NADAT de klant de samenvatting bevestigde, om echt te boeken." },
          confirm_second_booking: { type: "boolean", description: "Alleen op true zetten als de klant ECHT een TWEEDE, losse afspraak naast een bestaande wil. Voor 'een ander tijdstip' gebruik je reschedule_appointment, niet dit." },
        },
        required: ["service_type_id", "customer_name"],
      },
    },
    {
      name: "cancel_appointment",
      description:
        "Annuleert de aankomende afspraak van DEZE klant in TWEE stappen (annuleren is destructief → altijd één bevestiging). " +
        "Stap 1: roep aan ZONDER confirmed → de tool annuleert NIETS en geeft 'needs_confirmation' + de afspraak (dienst + when) terug; lees die terug, vraag of je echt mag annuleren, en bied aan om in plaats daarvan te verzetten. " +
        "Stap 2: pas NADAT de klant bevestigt, roep opnieuw aan met confirmed:true → dan annuleert de tool. Bij meerdere afspraken geeft stap 1 'meerdere_afspraken' terug; vraag welke en geef match_start_time mee.",
      parameters: {
        type: "object",
        properties: {
          confirmed: {
            type: "boolean",
            description: "Alleen op true zetten NADAT de klant expliciet bevestigde dat de afspraak geannuleerd mag worden. Zonder confirmed:true annuleert de tool niets (alleen preview).",
          },
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
        "Verzet de eerstvolgende aankomende afspraak van DEZE klant naar een nieuwe tijd, in ÉÉN stap. " +
        "De DIENST blijft hetzelfde — vraag die NIET opnieuw. De nieuwe tijd die de klant noemt IS de bevestiging: " +
        "roep METEEN aan met date (YYYY-MM-DD uit de <kalender>) + time (HH:MM); de tool zoekt zelf het exacte slot, " +
        "checkt of het vrij is en verzet direct. Vraag NIET 'klopt dat?' en kondig niets aan. Is die tijd niet vrij, " +
        "dan geeft de tool 'niet_beschikbaar' + de vrije tijden terug; stel er meteen een voor (geen aparte get_available_slots nodig).",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Nieuwe datum YYYY-MM-DD (uit de <kalender>). Voorkeursmanier samen met time." },
          time: { type: "string", description: "Nieuwe kloktijd HH:MM (Amsterdamse tijd), bv '14:00'." },
          start_time: { type: "string", description: "ALTERNATIEF voor date+time: nieuwe starttijd als exacte ISO 8601 uit get_available_slots. Gebruik bij voorkeur date+time." },
          end_time: { type: "string", description: "Alleen bij start_time: nieuwe eindtijd = start_time + dezelfde dienstduur. Bij date+time rekent de tool dit zelf." },
          service_type_id: { type: "string", description: "Alleen meegeven als de klant óók van dienst wisselt (zeldzaam)." },
          match_start_time: {
            type: "string",
            description: "Alleen bij meerdere afspraken: de exacte start_time van de te verzetten afspraak (uit de eerder teruggegeven lijst).",
          },
        },
      },
    },
  ];

  const execute: ToolExecutor = async (name, args) => {
    switch (name) {
      case "get_business_data": {
        const out = await fetchBusinessData(supabase, ctx.businessUserId);
        return out ?? { error: "geen bedrijfsdata" };
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
        const first = String(args.first_name ?? "").trim();
        const refused = args.name_refused === true;
        // Keep the global contacts row updated for the dashboard contacts list (display only).
        const update: Record<string, unknown> = { first_name: first || "Privé" };
        if (args.last_name) update.last_name = String(args.last_name);
        const { error } = await supabase
          .from("whatsapp_contacts")
          .update(update)
          .eq("phone_number", ctx.phone);
        if (error) return { error: error.message };
        // Tenant-scoped source of truth for the booking name: the conversation context (per
        // calendar_id + contact), NOT the globally-unique contact row. This is what the agent
        // reads as knownName next turn, so a name given at THIS business never bleeds to
        // another (R3). The name_refused flag also lets book_appointment tell a genuine
        // declined "Privé" apart from a premature placeholder.
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          const context = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
          const next: Record<string, unknown> = { ...context };
          if (refused) {
            next.name_refused = true;
            delete next.booking_name;
          } else if (first) {
            next.booking_name = first;
            next.name_refused = false;
          }
          await supabase.from("whatsapp_conversations").update({ context: next }).eq("id", ctx.conversationId);
        }
        return { ok: true };
      }

      case "book_appointment": {
        // Server-driven TWO-PHASE booking (mirrors cancel_appointment): the first call only
        // PREVIEWS (stores a pending_booking proposal, NO insert), the customer confirms, then
        // the COMMIT inserts using the SERVER-STORED exact values. This makes an accidental
        // immediate booking impossible, lets the customer correct the name/time, and removes
        // the model's time-reconstruction from the insert (it once booked 12:00 for a
        // confirmed 10:00 — the stored start_time is now authoritative).
        let bookCtx: Record<string, unknown> = {};
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          bookCtx = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
        }
        const pendingBook = bookCtx.pending_booking as
          { service_type_id?: string; start_time?: string; end_time?: string; customer_name?: string } | undefined;
        const clearPendingBook = async () => {
          if (!ctx.conversationId) return;
          const { pending_booking: _drop, ...rest } = bookCtx;
          await supabase.from("whatsapp_conversations").update({ context: rest }).eq("id", ctx.conversationId);
        };
        // COMMIT only when a proposal was previewed in a previous turn AND the customer
        // confirmed (server-detected ctx.confirmBook, or the model's confirmed flag). On
        // commit we use the STORED proposal, never the model's (possibly mis-reconstructed) args.
        const committing = (args.confirmed === true || ctx.confirmBook === true) && !!pendingBook?.start_time;

        const serviceId = String((committing ? pendingBook!.service_type_id : args.service_type_id) ?? "");
        let start = String((committing ? pendingBook!.start_time : args.start_time) ?? "");
        let end = String((committing ? pendingBook!.end_time : args.end_time) ?? "");

        // FAST PATH (preview only): the customer named a concrete date+time, so resolve the EXACT
        // slot SERVER-SIDE rather than forcing a separate get_available_slots LLM round-trip (the
        // dominant per-turn latency cost ~3s). On commit we always use the stored pending_booking,
        // so this runs only for a fresh preview. If the named time isn't free, return the free times
        // so the model proposes an alternative in the SAME turn.
        if (!committing && serviceId && (!start || !/^\d{4}-\d{2}-\d{2}T/.test(start)) && args.date && args.time) {
          const dur = await serviceDuration(supabase, serviceId);
          const r = await resolveSlotForTime(supabase, ctx.calendarId, serviceId, String(args.date), String(args.time), dur);
          if ("error" in r) {
            return { error: "ongeldige_tijd", message: "Ik kon die datum/tijd niet verwerken. Vraag de klant kort de gewenste dag en tijd." };
          }
          if ("unavailable" in r) {
            return {
              error: "niet_beschikbaar",
              available_slots: r.available,
              message: r.available.length
                ? `Die tijd is niet vrij. Stel een van deze vrije tijden voor: ${r.available.join(", ")}.`
                : "Die dag heeft geen vrije tijden. Stel vriendelijk een andere dag voor.",
            };
          }
          start = r.start; end = r.end;
        }
        // Safety: end_time is no longer a required param (date+time computes it). If the model used
        // the legacy start_time path and gave a valid ISO start but NO end, derive end from the
        // service duration so we never insert a booking with an empty end_time.
        if (!committing && start && /^\d{4}-\d{2}-\d{2}T/.test(start) && !end && serviceId) {
          const dur = await serviceDuration(supabase, serviceId);
          end = new Date(new Date(start).getTime() + dur * 60000).toISOString();
        }

        // NAME GATE: never create a nameless booking. The model must collect a real name
        // first, OR the customer must have EXPLICITLY refused (update_lead name_refused:true,
        // recorded in the conversation context). A bare "Privé"/empty without a recorded
        // refusal means the model jumped to booking before asking — refuse and make it ask.
        // This is a server-side guard because the LLM (temp 0.2) otherwise satisfies the
        // required customer_name param with a premature placeholder.
        const rawName = String((committing ? pendingBook!.customer_name : args.customer_name) ?? "").trim();
        const nameMissing = rawName === "" || rawName.toLowerCase() === "privé" || rawName.toLowerCase() === "prive";
        const refused = nameMissing && bookCtx.name_refused === true;
        if (nameMissing && !refused) {
          return {
            error: "naam_ontbreekt",
            message: "Boek niet zonder naam: gebruik de bekende WhatsApp-naam of vraag eerst kort de naam, en boek pas daarna.",
          };
        }
        const customerName = nameMissing ? "Privé" : rawName;
        if (!start || !serviceId) {
          return { error: "ontbrekende_gegevens", message: "Dienst en starttijd zijn nodig om te boeken." };
        }

        // DUPLICATE GUARD: prevent an accidental DOUBLE booking. Observed: for "kan het
        // een uur later?" the model calls book_appointment (a 2nd booking) instead of
        // reschedule_appointment, leaving the original AND a new row. If this customer
        // already has an upcoming active booking on this calendar, refuse and route to
        // reschedule — unless they EXPLICITLY want a second one (confirm_second_booking).
        if (args.confirm_second_booking !== true) {
          const { data: existing } = await supabase
            .from("bookings")
            .select("start_time")
            .eq("customer_phone", ctx.phone)
            .eq("calendar_id", ctx.calendarId)
            .in("status", ["confirmed", "pending"])
            .gt("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (existing) {
            return {
              error: "bestaande_afspraak",
              message:
                `De klant heeft al een aankomende afspraak op ${nlWhen((existing as { start_time: string }).start_time)}. ` +
                "Wil de klant een ANDER tijdstip? Gebruik reschedule_appointment (NIET book_appointment — dat maakt een tweede afspraak). " +
                "Alleen als de klant ECHT een losse, extra afspraak ernaast wil: roep book_appointment opnieuw aan met confirm_second_booking=true.",
            };
          }
        }

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

        // PREVIEW phase: every guard passed, but DON'T insert yet. Store the proposal and ask
        // the customer to confirm; the next affirm turn commits THIS exact proposal.
        if (!committing) {
          const { data: stRow } = await supabase
            .from("service_types").select("name").eq("id", serviceId).maybeSingle();
          const svcName = (stRow as { name?: string } | null)?.name ?? null;
          if (ctx.conversationId) {
            await supabase.from("whatsapp_conversations").update({
              context: {
                ...bookCtx,
                pending_booking: { service_type_id: serviceId, start_time: start, end_time: end, customer_name: customerName, at: Date.now() },
              },
            }).eq("id", ctx.conversationId);
          }
          return {
            needs_confirmation: true,
            proposal: { service: svcName, when: nlWhen(start), customer_name: customerName === "Privé" ? null : customerName },
            message: "NOG NIET geboekt. Vat dienst + tijd + de naam waaronder je boekt kort samen en vraag of het klopt ('..., klopt dat?'). Pas NA de bevestiging van de klant roep je book_appointment opnieuw aan om echt te boeken.",
          };
        }

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
          await clearPendingBook();
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
        await clearPendingBook();
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
        // Two-phase confirm (council A8 verdict): cancelling is destructive, so the tool NEVER
        // mutates without an explicit confirmation. Determinism lives here, not in the prompt:
        // a temp-0.2 model cannot be the transaction boundary (cf. the name-gate + announce net).
        const confirmed = args.confirmed === true;
        let cancelCtx: Record<string, unknown> = {};
        if (ctx.conversationId) {
          const { data: conv } = await supabase
            .from("whatsapp_conversations").select("context").eq("id", ctx.conversationId).maybeSingle();
          cancelCtx = ((conv as { context?: Record<string, unknown> } | null)?.context) ?? {};
        }
        const pending = cancelCtx.pending_cancel as { booking_id?: string; start_time?: string } | undefined;
        const clearPending = async () => {
          if (!ctx.conversationId) return;
          const { pending_cancel: _drop, ...rest } = cancelCtx;
          await supabase.from("whatsapp_conversations").update({ context: rest }).eq("id", ctx.conversationId);
        };

        // COMMIT phase: only when a preview was taken in a PREVIOUS turn AND the customer confirmed.
        // Confirmation is detected server-side (ctx.confirmCancel) OR via the model's confirmed flag.
        // We re-resolve the previewed appointment fresh so a since-changed/cancelled booking is caught
        // (the Contrarian's race window: re-validate at execution, not at confirmation).
        if ((confirmed || ctx.confirmCancel === true) && pending?.start_time) {
          const target = await resolveTarget(supabase, ctx, pending.start_time);
          if (target.none || target.ambiguous) {
            await clearPending();
            return { error: "geen_boeking", message: "Die afspraak kan ik niet meer vinden om te annuleren (mogelijk al weg). Vraag de klant of er nog iets is." };
          }
          const b = target.booking!;
          const policy = await getCalendarPolicy(supabase, ctx.calendarId);
          if (!policy.allowCancellations) {
            await clearPending();
            return { error: "annuleren_niet_toegestaan", message: "Annuleren kan bij dit bedrijf niet via de assistent. Verwijs naar het annuleringsbeleid." };
          }
          if (policy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < policy.cancellationDeadlineHours) {
            await clearPending();
            return { error: "te_laat_annuleren", message: `Annuleren kan tot ${policy.cancellationDeadlineHours} uur van tevoren. Voor deze afspraak is dat niet meer mogelijk; verwijs naar het annuleringsbeleid.` };
          }
          const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", b.id);
          if (error) return { error: error.message };
          await clearPending();
          return { ok: true, cancelled: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time } };
        }

        // PREVIEW phase (default; also where a stray confirmed:true WITHOUT a preview lands, so an
        // accidental immediate cancel is impossible). Resolve + policy-check, record the pending
        // marker, return the appointment to read back. NOTHING is cancelled here.
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

        // Honour the "Allow cancellations" + "Cancellation deadline" Operations settings before
        // offering to cancel (so we never ask to confirm something that can't be cancelled).
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

        if (ctx.conversationId) {
          await supabase
            .from("whatsapp_conversations")
            .update({ context: { ...cancelCtx, pending_cancel: { booking_id: b.id, start_time: b.start_time, at: Date.now() } } })
            .eq("id", ctx.conversationId);
        }
        return {
          needs_confirmation: true,
          appointment: { service: b.service_types?.name ?? null, when: nlWhen(b.start_time), start_time: b.start_time },
          message: "NIET geannuleerd. Lees dienst + tijd terug en vraag of je de afspraak echt zult annuleren; bied ook aan om in plaats daarvan een andere tijd te zoeken. Pas NA de bevestiging van de klant: roep cancel_appointment opnieuw aan met confirmed:true.",
        };
      }

      case "reschedule_appointment": {
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

        // Resolve the new time. FAST PATH: the customer named a date+time, so resolve the EXACT slot
        // server-side (no separate get_available_slots LLM round-trip). Else fall back to an ISO
        // start_time. If the named time isn't free, return the free times so the model offers one now.
        let newStart = String(args.start_time ?? "");
        let newEnd = String(args.end_time ?? "");
        if ((!newStart || !/^\d{4}-\d{2}-\d{2}T/.test(newStart)) && args.date && args.time) {
          const dur = await serviceDuration(supabase, serviceId);
          const r = await resolveSlotForTime(supabase, ctx.calendarId, serviceId, String(args.date), String(args.time), dur);
          if ("error" in r) {
            return { error: "ongeldige_tijd", message: "Ik kon die datum/tijd niet verwerken. Vraag kort de gewenste dag en tijd." };
          }
          if ("unavailable" in r) {
            return {
              error: "niet_beschikbaar",
              available_slots: r.available,
              message: r.available.length
                ? `Dat nieuwe tijdstip is niet vrij. Stel een van deze vrije tijden voor: ${r.available.join(", ")}.`
                : "Die dag heeft geen vrije tijden. Stel vriendelijk een andere dag voor.",
            };
          }
          newStart = r.start; newEnd = r.end;
        }
        // Safety (legacy start_time path): derive end from the service duration if a valid ISO start
        // was given without an end, so a reschedule is never refused for a missing end the model
        // simply didn't pass (end_time is no longer required).
        if (newStart && /^\d{4}-\d{2}-\d{2}T/.test(newStart) && !newEnd) {
          const dur = await serviceDuration(supabase, serviceId);
          newEnd = new Date(new Date(newStart).getTime() + dur * 60000).toISOString();
        }
        if (!newStart || !newEnd) {
          return { error: "ontbrekende_tijd", message: "Geef de nieuwe dag en tijd om naar te verzetten." };
        }

        // Honour the "Cancellation deadline" Operations setting for reschedules too
        // (a reschedule frees the original slot, so the same lead-time rule applies).
        const reschedPolicy = await getCalendarPolicy(supabase, ctx.calendarId);
        if (reschedPolicy.cancellationDeadlineHours != null && hoursUntil(b.start_time) < reschedPolicy.cancellationDeadlineHours) {
          return {
            error: "te_laat_verzetten",
            message: `Verzetten kan tot ${reschedPolicy.cancellationDeadlineHours} uur van tevoren. Voor deze afspraak is dat niet meer mogelijk.`,
          };
        }

        // Atomic reschedule (free-slot -> validate -> move) in ONE transaction via
        // reschedule_booking_atomic. Previously these were 3 separate edge-fn calls
        // with restore-on-failure only in the JS error branches: a crash/timeout
        // between freeing the slot and moving it left the booking cancelled with no
        // replacement and no trace. The RPC rolls back EVERYTHING on any failure, so
        // the booking always keeps its original time + status if it cannot move.
        const { data: rr, error: rrErr } = await supabase.rpc("reschedule_booking_atomic", {
          p_booking_id: b.id,
          p_new_start: newStart,
          p_new_end: newEnd,
          p_service_type_id: args.service_type_id ? serviceId : null,
        });
        if (rrErr) return { error: rrErr.message };
        const rres = rr as { ok?: boolean; error?: string } | null;
        if (!rres?.ok) {
          if (rres?.error === "slot_taken") return { error: "slot_taken", message: "Dat tijdslot is net bezet geraakt." };
          if (rres?.error === "in_verleden") return { error: "in_verleden", message: "Je kunt een afspraak niet naar het verleden verzetten." };
          if (rres?.error === "niet_beschikbaar") return { error: "niet_beschikbaar", message: "Dat nieuwe tijdstip is niet beschikbaar." };
          if (rres?.error === "geen_boeking") return { error: "geen_boeking", message: "Ik kan geen aankomende afspraak vinden om te verzetten." };
          return { error: rres?.error || "verzetten_mislukt", message: "Het verzetten lukte niet. Probeer een ander tijdstip." };
        }
        return { ok: true, rescheduled: { from: nlWhen(b.start_time), to: nlWhen(newStart), to_start_time: newStart } };
      }

      default:
        return { error: `onbekende tool ${name}` };
    }
  };

  return { decls, execute };
}
