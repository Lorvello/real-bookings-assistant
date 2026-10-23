// R83/R84 (S01 + S18, actual staging run 2026-09-08): pure opening-hours questions got no answer.
// S01 "hoi! do 17 september open? en hoe laat dan" received the generic "geen bevestigde informatie"
// fallback although the calendar is open Thursday 09:00-17:00; S18 "what are ur opening hours btw"
// received a Dutch owner-contact refusal. No deterministic hours route existed: the reply depended
// on free model text plus the grounding classifiers.
//
// This module answers ONLY an unambiguous, information-only hours question, from hours it actually
// read: the default schedule's rules plus an exact-date override (override wins). Any read error,
// malformed row or duplicate override makes that calendar "unknown" and the reply says so honestly;
// a failed read never turns into "closed" or into ordinary weekly hours. No booking, slot lookup,
// name or service question happens here. Read-only: no insert/update/delete/RPC paths.
import { extractRelativeDayHint } from "./relativeDateHint.ts";

type Window = { start: string; end: string };
type Calendar = { id: string; name: string };
export type HoursQuestion = { language: "en" | "nl"; date: string | null };
export type HoursSource =
  | { calendar: Calendar; status: "known"; days: Record<number, Window[]>; date: string | null; dateWindows: Window[] | null }
  | { calendar: Calendar; status: "unknown" };
export type HoursAnswer = { kind: "authoritative_opening_hours"; text: string; sources: HoursSource[] };

// Information only. The rest of a dated question must be empty or the weekday of that same date.
export function openingHoursQuestion(message: string, now: Date): HoursQuestion | null {
  const text = message.trim().toLowerCase();
  if (
    /\b(?:book\w*|appointment\w*|slot\w*|available|availability|free|afspraak\w*|boek\w*|beschikbaar\w*|plek\w*|prijs\w*|cost\w*|price\w*|cancel\w*|annul\w*|verzet\w*|niet|geen|not|except|behalve)\b/
      .test(text)
  ) return null;
  const generalEN =
    /^(?:(?:hi|hello|hey)[!,]?\s*)?(?:what are|what're)\s+(?:ur|your|the)\s+opening hours(?:\s+(?:btw|please))?[?!.\s]*$/;
  const generalNL = /^(?:(?:hoi|hallo)[!,]?\s*)?(?:wat zijn (?:jullie|de)|wat zijn uw) openingstijden[?!.\s]*$/;
  if (generalEN.test(text)) return { language: "en", date: null };
  if (generalNL.test(text)) return { language: "nl", date: null };
  let dateText: string | undefined;
  let language: "en" | "nl" = "nl";
  const nl =
    /^(?:(?:hoi|hallo)[!,.]?\s*)?(.+?)\s+(?:open|gesloten|dicht)\s*\?(?:\s*en hoe laat(?: dan)?[?!.\s]*)?$/i.exec(text);
  const en = /^(?:are you open|what are your opening hours)\s+(?:on\s+)?(.+?)[?!.\s]*$/i.exec(text);
  if (nl) dateText = nl[1];
  else if (en) {
    dateText = en[1];
    language = "en";
  } else return null;
  const hint = extractRelativeDayHint(dateText, now);
  if (!hint) return null;
  // R84 review: "friday open?" matches the shorter Dutch shape; an English weekday, an English-only
  // month name or today/tomorrow makes it an English question (september/november/december and
  // "open" are the same word in both languages and decide nothing).
  if (
    /\b(?:monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thur|thurs|friday|fri|saturday|sat|sunday|sun|today|tomorrow|january|february|march|may|june|july|august|october)\b/
      .test(dateText)
  ) language = "en";
  const escape = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rest = dateText.replace(new RegExp(escape(hint.matchedPhrase), "i"), "").trim();
  if (rest) {
    const names = [
      ["zondag", "zo", "sunday", "sun"],
      ["maandag", "ma", "monday", "mon"],
      ["dinsdag", "di", "tuesday", "tue"],
      ["woensdag", "wo", "wednesday", "wed"],
      ["donderdag", "do", "thursday", "thu"],
      ["vrijdag", "vr", "friday", "fri"],
      ["zaterdag", "za", "saturday", "sat"],
    ];
    if (!names[new Date(hint.iso + "T12:00:00Z").getUTCDay()].includes(rest)) return null;
  }
  return { language, date: hint.iso };
}

function clock(value: unknown, end = false): string | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{2}):([0-5]\d)(?::00)?$/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  return hour < 24 || (end && hour === 24 && m[2] === "00") ? m[1] + ":" + m[2] : null;
}

// Validated, sorted, merged windows. Overlapping or adjacent windows merge; a real break stays
// visible as two windows. Invalid or cross-midnight intervals return null (unknown).
function windows(rows: Array<{ start_time?: unknown; end_time?: unknown }>): Window[] | null {
  const result: Window[] = [];
  for (const row of rows) {
    const start = clock(row.start_time), end = clock(row.end_time, true);
    if (!start || !end || start >= end) return null;
    result.push({ start, end });
  }
  result.sort((a, b) => a.start.localeCompare(b.start));
  const merged: Window[] = [];
  for (const row of result) {
    const last = merged.at(-1);
    if (last && row.start <= last.end) {
      if (row.end > last.end) last.end = row.end;
    } else merged.push({ ...row });
  }
  return merged;
}

// day_of_week in availability_rules: 1=Monday .. 7=Sunday (ISO), same as getCalendarWeeklyHours.
function isoWeekday(date: string): number {
  return new Date(date + "T12:00:00Z").getUTCDay() || 7;
}

// Supabase-compatible read-only client. No mutation methods are used by this module.
// deno-lint-ignore no-explicit-any
export async function readOpeningHours(client: any, calendar: Calendar, date: string | null): Promise<HoursSource> {
  const unknown: HoursSource = { calendar, status: "unknown" };
  try {
    // Only the DEFAULT schedule counts, the same one get_available_slots uses (is_default = true).
    // Two defaults or none is not knowable, so unknown, never "some" schedule's hours.
    const schedules = await client.from("availability_schedules").select("id,is_default,created_at")
      .eq("calendar_id", calendar.id).eq("is_default", true)
      .order("created_at", { ascending: true }).limit(2);
    if (
      schedules.error || !Array.isArray(schedules.data) || schedules.data.length !== 1 ||
      typeof schedules.data[0].id !== "string"
    ) return unknown;
    const rules = await client.from("availability_rules").select("day_of_week,start_time,end_time,is_available")
      .eq("schedule_id", schedules.data[0].id);
    if (rules.error || !Array.isArray(rules.data)) return unknown;
    const days: Record<number, Window[]> = {};
    for (const row of rules.data) {
      if (
        !Number.isInteger(row.day_of_week) || row.day_of_week < 1 || row.day_of_week > 7 ||
        typeof row.is_available !== "boolean"
      ) return unknown;
    }
    for (let day = 1; day <= 7; day++) {
      // deno-lint-ignore no-explicit-any
      const parsed = windows(rules.data.filter((row: any) => row.day_of_week === day && row.is_available === true));
      if (!parsed) return unknown;
      days[day] = parsed;
    }
    let dateWindows: Window[] | null = null;
    if (date) {
      const override = await client.from("availability_overrides").select("date,is_available,start_time,end_time")
        .eq("calendar_id", calendar.id).eq("date", date);
      if (override.error || !Array.isArray(override.data) || override.data.length > 1) return unknown;
      const row = override.data[0];
      if (row) {
        if (row.date !== date) return unknown;
        if (row.is_available === false || row.is_available === null) dateWindows = [];
        else if (row.is_available === true) {
          if (row.start_time == null && row.end_time == null) dateWindows = days[isoWeekday(date)];
          else {
            dateWindows = windows([row]);
            if (!dateWindows) return unknown;
          }
        } else return unknown;
      } else dateWindows = days[isoWeekday(date)];
    }
    return { calendar, status: "known", days, date, dateWindows };
  } catch {
    return unknown;
  }
}

function dateLabel(date: string, en: boolean): string {
  return new Date(date + "T12:00:00Z").toLocaleDateString(en ? "en-GB" : "nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  });
}

// "09:00 tot 17:00" for the weekly list; "van 09:00 tot 12:00 en van 13:00 tot 17:00" in a sentence.
function spans(list: Window[], en: boolean, inSentence = false): string {
  return list.map((w) =>
    en
      ? `${inSentence ? "from " : ""}${w.start} to ${w.end}`
      : `${inSentence ? "van " : ""}${w.start} tot ${w.end}`
  ).join(en ? " and " : " en ");
}

// deno-lint-ignore no-explicit-any
export async function answerOpeningHours(client: any, question: HoursQuestion, calendars: Calendar[]): Promise<HoursAnswer> {
  const en = question.language === "en";
  if (!calendars.length || calendars.length > 10) {
    return {
      kind: "authoritative_opening_hours",
      text: en ? "Which person or location do you mean?" : "Welke medewerker of locatie bedoel je?",
      sources: [],
    };
  }
  const sources: HoursSource[] = [];
  for (const calendar of calendars) sources.push(await readOpeningHours(client, calendar, question.date));
  const multi = calendars.length > 1;
  const dayNames = en
    ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    : ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
  const blocks = sources.map((source) => {
    const who = multi ? `${source.calendar.name}: ` : "";
    if (source.status === "unknown") {
      return who + (en
        ? "I couldn't check the opening hours right now. Please try again in a moment."
        : "Ik kon de openingstijden nu niet controleren. Probeer het zo nog eens.");
    }
    if (question.date) {
      const label = dateLabel(question.date, en);
      const list = source.dateWindows ?? [];
      if (en) {
        return list.length
          ? `${who}On ${label} ${multi ? "open" : "we're open"} ${spans(list, true, true)}.`
          : `${who}On ${label} ${multi ? "closed" : "we're closed"}.`;
      }
      return list.length
        ? `${who}Op ${label} ${multi ? "open" : "zijn we open"} ${spans(list, false, true)}.`
        : `${who}Op ${label} ${multi ? "gesloten" : "zijn we gesloten"}.`;
    }
    const lines = dayNames.map((name, i) => {
      const list = source.days[i + 1];
      return `${name} ${list.length ? spans(list, en) : en ? "closed" : "gesloten"}`;
    });
    const head = multi ? source.calendar.name : en ? "Our regular opening hours" : "Onze vaste openingstijden";
    return `${head}:\n${lines.join("\n")}`;
  });
  return { kind: "authoritative_opening_hours", text: blocks.join("\n\n"), sources };
}
