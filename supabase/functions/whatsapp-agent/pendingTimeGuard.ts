// ---------------------------------------------------------------------------
// R84 PENDING-PROPOSAL TIME GUARD ("tijdvangnet"; Mathieu 25-10-2026: "Ja, bouw het tijdvangnet nu, vóór de
// grote test van dinsdag."). Design and case table: launch-ready-loop/ONTWERP_TIJDVANGNET_2026-10-25.md (hub).
//
// A customer's "ja" commits the SERVER-stored pending_booking, never the text it answered. On a preview turn
// deterministicPreview (index.ts, ITEM 12) already templates that text from the stored proposal. On a turn
// WITHOUT a new preview the reply is model prose, and nothing compared its time with the stored slot:
// bookPreviewMissed is off while a fresh proposal exists (!pendingBookFresh), and slotOfferGuard skips a time
// the customer named and only engages after a slots query this turn. Measured 24-10 (duel V2, D09, Haiku
// without thinking): preview 15:00, then "oh wacht, kan het om 16:00?", no tool call, reply "Ik boek dan
// Knippen Heren op woensdag 4 november om 16:00 op naam Joris, klopt dat?" while 15:00 stayed stored.
//
// findProposalMismatch reads only PROPOSAL sentences (booking or confirm-question words, or a question naming
// exactly one clock time; never a reschedule or cancel sentence, which is about an existing appointment) and
// returns the clock times and day mentions in them that differ from the stored slot in Europe/Amsterdam.
// Live on v50 (25-10, D09 try 8, Haiku without thinking, no tool call): "Wil je dan Knippen Heren op woensdag
// 4 november om 16:00, op naam Joris?" carries no booking word yet asks for a "ja" to another time than the
// stored 15:00, so a one-time question counts too. An either/or offer ("16:00 of 17:00?") and an opening-hours
// sentence do not. index.ts uses it twice: as a one-shot nudge
// (pendingDriftNudge) and, when the final reply still drifts and the proposal is still stored, to replace the
// reply with restatePendingProposal, whose one question is answered by "ja" with exactly the slot the customer
// reads. Text only: nothing here writes pending_booking. Pure module, unit-tested in pendingTimeGuard.test.ts.

const TZ = "Europe/Amsterdam";

// Booking or confirm-question words (NL first, then EN, DE, FR, ES). Mirrors index.ts's bookPreviewLang plus the
// confirm questions deterministicPreview itself ends with ("klopt dat?", "Is that correct?").
const PROPOSAL_RE = new RegExp(
  [
    "\\bik (?:zet|boek|plan|reserveer|noteer)\\b",
    "\\bzal ik\\b[^?!\\n]{0,80}\\b(?:boeken|inplannen|reserveren|vastzetten|vastleggen|noteren|zetten)\\b",
    "\\bklopt dat\\b",
    "\\bis dat (?:goed|oké|oke|ok|akkoord)",
    "\\bi['’]?ll (?:put|book|pencil|schedule|reserve)\\b",
    "\\b(?:shall|should) i (?:book|put|reserve|schedule)\\b",
    "\\bis that (?:correct|right|ok|okay|alright|fine)\\b",
    "\\b(?:do you want|would you like) me to (?:book|reserve)\\b",
    "\\bsoll ich\\b[^?!\\n]{0,80}\\b(?:buchen|eintragen|reservieren)\\b",
    "\\bich (?:trage|buche|reserviere)\\b",
    "\\b(?:passt|stimmt) das\\b",
    "\\bist das (?:richtig|korrekt|ok|in ordnung)\\b",
    "\\bje (?:vous |te )?(?:réserve|note|inscris|mets)",
    "\\b(?:c['’]est|est-ce) (?:correct|bon|d['’]accord)",
    "(?:^|\\s)ça vous (?:va|convient)",
    "\\b(?:te|le) (?:reservo|apunto|anoto)\\b",
    "\\b(?:es|está) (?:correcto|bien)\\b",
    "\\bte parece bien\\b",
  ].join("|"),
  "i",
);
// Prefix matches, like index.ts's reschedLang ("verzet", "verzetten", "verschoven").
const RESCHED_RE = /\b(?:verzet|verschuif|verplaats|schuif|opschuif|verschoven|reschedul|verschieb|déplac|reprogram)/i;
const CANCEL_RE = /\b(?:annuleer|annuleren|annulering|geannuleerd|afzeggen|cancel|stornier|annul)/i;
const HOURS_RE =
  /\b(?:open|geopend|opent|sluit|sluiten|dicht|gesloten|openingstijden?|opening hours|closes?|closed|geöffnet|ouvert|abierto|cerrado)\b/i;

const pad = (n: number) => String(n).padStart(2, "0");

interface ClockMention {
  label: string;
  candidates: string[];
}

// "om 4 uur" / "um 4 Uhr" can mean 04:00 or 16:00; the label is the reading inside opening-hours range.
function ambiguousHour(h: number): ClockMention {
  const candidates = [`${pad(h)}:00`];
  if (h >= 1 && h <= 11) candidates.push(`${pad(h + 12)}:00`);
  const label = candidates.find((c) => c >= "07:00" && c < "22:00") ?? candidates[0];
  return { label, candidates };
}

const DASH = "[-\\u2010-\\u2015]";
// A range counts with its start only ("15:00 tot 15:30", "15:00-15:30").
const RANGE_RE = new RegExp(
  `\\b(\\d{1,2}[:.]\\d{2})\\s*(?:${DASH}|t\\/m|tot|to|until|bis|à|a|hasta)\\s*\\d{1,2}[:.]\\d{2}\\b`,
  "gi",
);

function clockMentions(sentence: string): ClockMention[] {
  const out: ClockMention[] = [];
  let s = sentence.replace(RANGE_RE, "$1");
  const take = (re: RegExp, toMention: (m: RegExpMatchArray) => ClockMention | null) => {
    s = s.replace(re, (...args) => {
      const mention = toMention(args as unknown as RegExpMatchArray);
      if (mention) out.push(mention);
      return " ";
    });
  };
  // 4pm, 4:30 pm, 12am
  take(/\b(1[0-2]|0?[1-9])(?:[:.]([0-5]\d))?\s?([ap])\.?m\b\.?/gi, (m) => {
    const h = Number(m[1]) % 12 + (m[3].toLowerCase() === "p" ? 12 : 0);
    const t = `${pad(h)}:${m[2] ?? "00"}`;
    return { label: t, candidates: [t] };
  });
  // om 4 uur, um 4 Uhr
  take(/\b(?:om|um)\s+([01]?\d|2[0-3])\s?(?:uur|uhr)\b/gi, (m) => ambiguousHour(Number(m[1])));
  // 16h30, à 16h
  take(/\b([01]?\d|2[0-3])h([0-5]\d)\b/gi, (m) => {
    const t = `${pad(Number(m[1]))}:${m[2]}`;
    return { label: t, candidates: [t] };
  });
  take(/(?:^|\s)à\s+([01]?\d|2[0-3])h(?![a-z\d])/gi, (m) => {
    const t = `${pad(Number(m[1]))}:00`;
    return { label: t, candidates: [t] };
  });
  // 16:00 / 16.00, never a price ("€15.50", "25.00 euro") or part of a longer number.
  take(/(?<![€$£]\s?)(?<![\d.,:])\b([01]?\d|2[0-3])[:.]([0-5]\d)\b(?![.,:]?\d)(?!\s?(?:euro|eur)\b)/gi, (m) => {
    const t = `${pad(Number(m[1]))}:${m[2]}`;
    return { label: t, candidates: [t] };
  });
  return out;
}

const WEEKDAYS: Record<string, number> = {
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
  dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6,
  domingo: 0, lunes: 1, martes: 2, "miércoles": 3, miercoles: 3, jueves: 4, viernes: 5, "sábado": 6, sabado: 6,
};
const MONTHS: Record<string, number> = {
  januari: 1, january: 1, jan: 1, februari: 2, february: 2, feb: 2, maart: 3, march: 3, mrt: 3, mar: 3,
  april: 4, apr: 4, mei: 5, may: 5, juni: 6, june: 6, jun: 6, juli: 7, july: 7, jul: 7, augustus: 8,
  august: 8, aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, october: 10, okt: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};
// Word boundaries that know accented letters ("miércoles", "goedemorgen" is not "morgen").
const word = (alts: string) => `(?<![\\p{L}\\p{N}])(?:${alts})(?![\\p{L}\\p{N}])`;
const byLength = (o: Record<string, number>) => Object.keys(o).sort((a, b) => b.length - a.length).join("|");
const WEEKDAY_RE = new RegExp(word(byLength(WEEKDAYS)), "giu");
const DAY_MONTH_RE = new RegExp(
  `(?<![\\p{N}:.])(\\d{1,2})(?:e|ste|de|st|nd|rd|th)?\\.?\\s+(${byLength(MONTHS)})(?![\\p{L}])`,
  "giu",
);
const MONTH_DAY_RE = new RegExp(
  `(?<![\\p{L}])(${byLength(MONTHS)})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\p{N}:.])`,
  "giu",
);
// Longest first, removed once read, so "overmorgen" or "pasado mañana" never also count as "morgen"/"mañana".
const RELATIVE: Array<[RegExp, number]> = [
  [new RegExp(word("overmorgen|übermorgen|après-demain|pasado mañana|day after tomorrow"), "giu"), 2],
  [new RegExp(word("morgen|tomorrow|demain|mañana|manana"), "giu"), 1],
  [new RegExp(word("vandaag|today|heute|aujourd['’]hui|hoy"), "giu"), 0],
];

interface LocalSlot {
  ymd: string;
  hhmm: string;
  weekday: number;
  day: number;
  month: number;
}

function localSlot(d: Date): LocalSlot {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    hhmm: `${get("hour")}:${get("minute")}`,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    day: Number(get("day")),
    month: Number(get("month")),
  };
}

function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Day mentions in one sentence that do NOT fit the stored slot.
function dayMismatches(sentence: string, slot: LocalSlot, todayYmd: string): string[] {
  const out: string[] = [];
  let s = sentence;
  for (const [re, offset] of RELATIVE) {
    s = s.replace(re, (m) => {
      if (addDaysYmd(todayYmd, offset) !== slot.ymd) out.push(m);
      return " ";
    });
  }
  for (const m of s.matchAll(WEEKDAY_RE)) {
    if (WEEKDAYS[m[0].toLowerCase()] !== slot.weekday) out.push(m[0]);
  }
  for (const m of s.matchAll(DAY_MONTH_RE)) {
    if (Number(m[1]) !== slot.day || MONTHS[m[2].toLowerCase()] !== slot.month) out.push(m[0].trim());
  }
  for (const m of s.matchAll(MONTH_DAY_RE)) {
    if (Number(m[2]) !== slot.day || MONTHS[m[1].toLowerCase()] !== slot.month) out.push(m[0].trim());
  }
  return out;
}

export interface ProposalMismatch {
  times: string[];
  days: string[];
}

export function findProposalMismatch(
  reply: string,
  storedStartIso: string | null | undefined,
  now: Date,
): ProposalMismatch | null {
  if (!reply || !storedStartIso) return null;
  const stored = new Date(storedStartIso);
  if (Number.isNaN(stored.getTime())) return null;
  const slot = localSlot(stored);
  const todayYmd = localSlot(now).ymd;
  const times: string[] = [];
  const days: string[] = [];
  for (const sentence of reply.split(/(?<=[.!?])\s+|\n+/)) {
    if (RESCHED_RE.test(sentence) || CANCEL_RE.test(sentence)) continue;
    const clocks = clockMentions(sentence);
    const oneTimeQuestion = sentence.includes("?") && clocks.length === 1 && !HOURS_RE.test(sentence);
    if (!PROPOSAL_RE.test(sentence) && !oneTimeQuestion) continue;
    for (const m of clocks) {
      if (!m.candidates.includes(slot.hhmm) && !times.includes(m.label)) times.push(m.label);
    }
    for (const d of dayMismatches(sentence, slot, todayYmd)) {
      if (!days.includes(d)) days.push(d);
    }
  }
  return times.length || days.length ? { times, days } : null;
}

// The one-shot nudge (index.ts nudge layer), in the same "[systeem]" register as its siblings.
export function pendingDriftNudge(
  mismatch: ProposalMismatch,
  serviceName: string | null,
  storedWhenNl: string,
): string {
  const said = [...mismatch.times, ...mismatch.days].join(", ");
  const stored = serviceName ? `${serviceName} op ${storedWhenNl}` : storedWhenNl;
  return `[systeem] Je antwoord noemt ${said} voor de afspraak, maar het voorstel dat in het systeem staat is ${stored}. ` +
    "Een 'ja' van de klant boekt het opgeslagen voorstel, niet wat jij schreef. Wil de klant een andere dag of tijd, " +
    "roep dan NU book_appointment aan (stap 1 / preview) met die nieuwe date (YYYY-MM-DD) + time (HH:MM), zodat het " +
    "voorstel echt wordt bijgewerkt. Wil de klant het opgeslagen voorstel, noem dan precies die dag en tijd. Noem in " +
    "een voorstel nooit een dag of tijd die niet in het systeem staat.";
}

// The deterministic fallback. Its only question is answered by "ja" with exactly the stored slot; it never asks
// "shall I try 16:00?", whose "ja" would commit the stored 15:00. NL default, English floor for any non-Dutch
// customer (the convention of deterministicPreview); `when` strings come from index.ts (nlWhen / enWhen).
export function restatePendingProposal(
  serviceName: string | null,
  whenNl: string,
  whenEn: string,
  customerName: string | null,
  en: boolean,
): string {
  const svc = (serviceName ?? "").trim();
  const who = (customerName ?? "").trim();
  if (en) {
    const head = svc ? `I currently have ${svc} on ${whenEn}` : `I currently have you down for ${whenEn}`;
    return `Just to be clear: ${head}${who ? ` in the name of ${who}` : ""}, is that correct? ` +
      "If you'd prefer another time, just tell me which one and I'll check if it's free.";
  }
  const head = svc ? `ik heb nu ${svc} op ${whenNl}` : `ik heb je nu op ${whenNl}`;
  return `Even voor de duidelijkheid: ${head}${who ? ` op naam ${who}` : ""} staan, klopt dat? ` +
    "Wil je liever een andere tijd, noem die dan, dan kijk ik of die vrij is.";
}
