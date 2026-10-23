// R29 RELATIVE-DATE HINT (deterministic pre-parse of the customer's OWN raw message, run BEFORE
// the model ever sees it, to close a real production bug: a bare relative weekday reference
// ("vrijdag", "vrijdag diezelfde week") inside a long/multi-topic message can get resolved by the
// model against a STALE date already sitting in earlier conversation history (an anchoring/
// recency bug), instead of freshly computed from the real server "today" via the <kalender>
// table. R28 (full-journey agent simulation) first found this live: a 200+ word rambling message
// asking to move a booking to "vrijdag diezelfde week" got a false "day fully closed" reply for a
// Friday that genuinely had open slots. R29 reproduced it live and found the true trigger is NOT
// message length per se: even a SHORT, clean, single-sentence "vrijdag deze week" ask on the same
// thread reproduced the identical wrong date (the model echoed a date from several turns earlier
// in conversation history rather than computing fresh). The common factor in every failure is a
// BARE weekday reference with no explicit day-number, which is genuinely ambiguous for the model
// to resolve purely from prose, especially with other concrete dates already in the conversation
// to anchor on.
//
// MECHANISM: extractRelativeDayHint scans the CURRENT customer message only (never history) for
// an explicit relative-weekday phrase ("vandaag", "morgen", "overmorgen", or a bare/qualified
// weekday name, optionally with "aanstaande/komende/deze/volgende/diezelfde/dezelfde week/dag").
// If found, it independently computes the real ISO date from the real server "now" (Amsterdam),
// using the exact same "nearest upcoming occurrence, 'volgende' skips to next week" rule the
// prompt already documents for the <kalender> table (prompt.ts, "Zet ELKE relatieve datum om via
// deze lijst"). index.ts injects the result as an explicit, prominent hint in the system prompt
// FOR THIS TURN ONLY, telling the model this is the one true resolution, overriding any date
// mentioned earlier in conversation history. This is a hint/backstop, not a tool-argument
// override: the model still calls the tools itself (unchanged control flow), but it no longer has
// to freely compute (and potentially mis-anchor) the date on its own.
//
// Only fires on an EXPLICIT day-name match (no guessing on vague "binnenkort"/"snel" style
// phrasing); when nothing explicit is found, returns null and prompt.ts renders nothing extra
// (byte-identical to before this fix).
//
// R54 EXTENSION: an explicit day+month reference ("6 augustus", "6 aug", optionally +year) is
// ALSO now resolved right here, deterministically, using the real server "now" as ground truth,
// instead of being deferred entirely to the model's own arithmetic (the original R29 design).
// index.ts's <kalender> table only renders a 14-day lookahead, so any explicit date beyond that
// window had nothing for the model to read off, and it reproducibly miscomputed the ISO date
// (see FINDINGS LEDGER R53 row for the live repro: a false "already passed" claim for a real,
// bookable, 28-days-out date). This now covers explicit dates near OR far, with no dependence on
// the 14-day window, and wins priority over vandaag/morgen/weekday phrasing (the most specific
// thing the customer could have said). tools.ts already wires the resolved ISO to override
// args.date whenever it disagrees, unchanged from R29's own mechanism.
//
// dash-free of em dashes per house rule.

const NL_WEEKDAYS: Record<string, number> = {
  // JS Date.getDay(): 0=zondag .. 6=zaterdag
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
};

// R140 (LAUNCH-RUN 2026-09 / R6-PRE). ENGELSE WEEKDAGEN EN NEDERLANDSE AFKORTINGEN.
//
// GEMETEN OORZAAK. `NL_WEEKDAYS` hierboven kende alleen de zeven VOLUIT geschreven Nederlandse
// namen. Van de 30 scenario's in de launch-suite noemen er 14 hun dag uitsluitend als een Engelse
// naam ("thursday 2pm", "wednesday", "friday", "tues 10", "sat 10") of als een Nederlandse
// afkorting ("do 2 uur", "di 10 uur", "wo 4 uur", "ma langskomen"). Op al die zinnen gaf
// `extractRelativeDayHint` `null`, waarna `hasDayMentionAnywhere` false werd,
// `index.ts` `blockForNoDayNamed` zette en `tools.ts` ZOWEL `get_available_slots` ALS
// `book_appointment` weigerde met `vraag_dag`. Live gemeten gevolg op de staging-functie: de agent
// antwoordde "Which day would you like?" op een bericht waarin de klant de dag AL had genoemd, en
// er kwam nooit een boeking. Dit is het schoolvoorbeeld van een filter dat de woorden van de
// BOUWER kent en niet die van de wereld.
//
// TWEE VOCABULAIRES, met opzet verschillend streng:
//   STERK      voluit geschreven NL + EN namen, plus de Engelse afkortingen die GEEN gewoon woord
//              zijn (mon/tue/tues/weds/thu/thur/thurs/fri). Die matchen overal, zonder voorwaarde.
//   DUBBELZINNIG  de Nederlandse tweeletterafkortingen (ma/di/wo/do/vr/za/zo) en de Engelse
//              vormen die WEL een gewoon woord zijn (wed/sat/sun). Die draaien pas als de sterke
//              pas niets vond, en dragen per woord een expliciete uitsluiting. Een afkorting die
//              vals matcht is namelijk ERGER dan geen match: hij injecteert via
//              `formatRelativeDateHint` een VERKEERDE datum in de prompt. De suite draagt de
//              tegenvoorbeelden zelf: "hi what do u do and whats the price?" (twee keer het
//              Engelse werkwoord), "can we do 3 instead tho?" (werkwoord met een getal erachter)
//              en "whats the latest u can do me on friday" (werkwoord EN een echte dag in
//              dezelfde zin, waar de sterke pas dus moet winnen).
const EN_WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  // Engelse afkortingen die in geen enkele taal een gewoon woord zijn.
  mon: 1, tue: 2, tues: 2, weds: 3, thu: 4, thur: 4, thurs: 4, fri: 5,
};

// De dubbelzinnige vormen. `deny` is een lijst van (voorafgaand woord | volgend woord)-regels:
// matcht een daarvan, dan telt deze afkorting in DIT bericht niet als weekdag.
const AMBIGUOUS_WEEKDAY_ABBR: Array<
  { word: string; dow: number; prev?: RegExp; next?: RegExp }
> = [
  // "ma" is ook moeder. Blokkeer na een bezittelijk/aanwijzend woord ("mn ma", "je ma").
  { word: "ma", dow: 1, prev: /\b(mn|m'n|mijn|je|jouw|jullie|onze|z'n|zijn|haar|de|die|deze)$/ },
  { word: "di", dow: 2 },
  { word: "wo", dow: 3 },
  // "do" is het Engelse werkwoord. Blokkeer de hulpwerkwoord- en voornaamwoord-omgeving.
  {
    word: "do",
    dow: 4,
    prev: /\b(can|could|would|will|shall|to|what|how|why|when|we|you|u|they|i|it|lets|let's|dont|don't|didnt|didn't|does|did|pls|please|must|should|may|might|cant|can't|gonna|wanna)$/,
    next: /^\s*(you|u|i|we|they|it|this|that|not|n't|so|the|any|some|something|nothing|anything|instead|nails|hair)\b/,
  },
  { word: "vr", dow: 5 },
  { word: "za", dow: 6 },
  // "zo" is het Nederlandse bijwoord ("zo snel mogelijk", "zo laat mogelijk").
  {
    word: "zo",
    dow: 0,
    prev: /\b(is|was|het|dat|hoe|niet)$/,
    next: /^\s*(snel|laat|vroeg|veel|ver|lang|goed|net|meteen|mogelijk|straks|dadelijk|gauw|vlug|druk|duur|erg|graag|even|maar|dat|als|ja|hoor|te|zo)\b/,
  },
  // "wed" is ook het Engelse werkwoord trouwen; "sat"/"sun" zijn gewone Engelse woorden.
  { word: "wed", dow: 3, next: /^\s*(to)\b/ },
  {
    word: "sat",
    dow: 6,
    prev: /\b(i|he|she|we|they|you|u|it|who|everyone|nobody)$/,
    next: /^\s*(down|in|on|there|next|at|through|waiting|for)\b/,
  },
  {
    word: "sun",
    dow: 0,
    prev: /\b(the|a|no)$/,
    next: /^\s*(shine|screen|light|glasses|burn|day|bathing|bed|is|was)\b/,
  },
];

// Share the same semantic exclusions between weekday extraction and qualifier ownership.
// A raw "do"/"zo" token may be an ordinary verb/adverb, not a later weekday.
function isAmbiguousWeekdayContext(
  cand: (typeof AMBIGUOUS_WEEKDAY_ABBR)[number],
  text: string,
  index: number,
): boolean {
  const before = text.slice(0, index).trimEnd();
  const after = text.slice(index + cand.word.length);
  return !(cand.prev?.test(before) || cand.next?.test(after));
}

export interface RelativeDateHint {
  iso: string; // YYYY-MM-DD, Amsterdam-local
  label: string; // "vrijdag 10 juli" (Dutch, matches the <kalender> table's own label style)
  matchedPhrase: string; // the raw phrase that triggered this, for logging/tests
}

// Amsterdam-local YYYY-MM-DD for a given instant (mirrors buildCalendarHint's own tz handling).
function amsterdamISO(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Amsterdam" });
}

function amsterdamWeekday(d: Date): number {
  const label = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "Europe/Amsterdam" });
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[label] ?? d.getDay();
}

function dutchLabel(d: Date): string {
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Amsterdam" });
}

// Nearest occurrence of targetDow on/after `now` (today counts), or, when `skipWeek` is true
// ("volgende [weekday]"), the occurrence in the NEXT full week (matches prompt.ts's own rule:
// "volgende week [weekdag]" = die weekdag in de eerstvolgende hele week).
function resolveWeekday(now: Date, targetDow: number, skipWeek: boolean): Date {
  const todayIso = amsterdamISO(now);
  const [y, m, d] = todayIso.split("-").map(Number);
  const todayDow = amsterdamWeekday(now);
  let offset = (targetDow - todayDow + 7) % 7;
  if (skipWeek) offset += 7;
  return new Date(Date.UTC(y, m - 1, d + offset, 11, 0, 0)); // noon UTC, DST-safe like buildCalendarHint
}

// R84 (original11 S09, run 2026-09-08 22:01 Amsterdam): "di 10 uur knippen? karim" on a Tuesday
// evening resolved to TODAY (resolveWeekday counts today), so get_available_slots read an empty
// evening and the agent told the customer the whole day was full, while next Tuesday had
// 09:00/09:30/10:30 free. When the named weekday is today and the clock time the customer gives FOR
// that day has already passed in EVERY plausible reading, the customer means the next occurrence.
// The plausible readings follow Dutch appointment language (review round 2, 2026-10-23):
// - am/pm, or a daypart near the day or the time ("dinsdagavond", "'s avonds", "evening",
//   "'s middags", "afternoon", "'s ochtends", "morning"), decides the reading;
// - otherwise 1-6 is afternoon ("3 uur" = 15:00), 10-12 is morning or noon ("10 uur" = 10:00),
//   "half een" is 12:30, and 0 and 13-23 are literal;
// - a spoken 7, 8 or 9 ("7 uur", "half 8", "om 8") can be morning or evening (late opening,
//   barbers until 21:00), so the day only rolls once the evening reading has passed too; written
//   with minutes ("8:30", "8.30", "8u30") it is the 24-hour clock and literal.
// Today is kept for "vandaag/today/vanavond/tonight", any this-week wording ("deze week",
// "this week", "deze di", "this tuesday", "diezelfde week") and a message without a clock time.
// Only a real clock time counts: a duration ("duurt dat 1 uur"), a price ("12.50") or a date
// ("15.09") is not one, and a lower bound ("na 5 uur", "after 5pm", "vanaf 6", "ik werk tot 5")
// is not the requested time, because later times today can still fit. When several times appear,
// the one written after the weekday wins ("ik werk tot 5 uur, kan dinsdag om 6 uur?" is 18:00).
function amsterdamMinutesOfDay(d: Date): number {
  const [h, m] = d
    .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Amsterdam" })
    .split(":")
    .map(Number);
  return (h % 24) * 60 + m;
}

const SPOKEN_HOURS: Record<string, number> = {
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12,
};

const KEEP_TODAY_RE =
  /\b(?:vandaag|today|vanavond|tonight|vanmiddag|vanochtend|this (?:morning|afternoon|evening)|deze week|this week|diezelfde week|dezelfde week|die week)\b/i;
const THIS_QUALIFIER_BEFORE_RE = /\b(?:deze|this|diezelfde|dezelfde)\s+$/i;
const DURATION_BEFORE_RE =
  /\b(?:duurt|duur|duren|lang|hoelang|ongeveer|zo'?n|minstens|maximaal|circa|ca\.?|bijna|ruim|takes?|lasts?)\b(?:\s+\S+){0,2}\s*$/i;
const LOWER_BOUND_BEFORE_RE = /\b(?:na|after|vanaf|from|tot|until|till)\s+(?:om\s+|at\s+)?$/i;
// "avond" also matches "dinsdagavond"; "'s morgens" needs its "'s": a bare "morgen" is tomorrow.
const EVENING_RE = /avond|'s\s*avonds|\bsavonds\b|\bevening\b|\bnight\b/i;
const AFTERNOON_RE = /middag|'s\s*middags|\bsmiddags\b|\bafternoon\b/i;
const MORNING_RE = /ochtend|'s\s*ochtends|\bsochtends\b|'s\s*morgens|\bsmorgens\b|\bmorning\b/i;

// spoken: said as an hour ("8 uur", "half 8", "om 8"), not written with minutes ("8:30").
type ClockHit = { index: number; end: number; h: number; min: number; ampm?: string; spoken: boolean };

// The latest plausible minute of day for a clock time (see the header above). The day rolls only
// when even this reading has passed. daypart "pm" = evening or afternoon wording, "am" = morning.
function latestReading(hit: ClockHit, daypart: "am" | "pm" | null): number | null {
  let h = hit.h;
  const marker = hit.ampm?.toLowerCase();
  if (marker === "am" || marker === "pm") {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (marker === "pm" ? 12 : 0);
  } else if (daypart && h >= 1 && h <= 11) {
    if (daypart === "pm") h += 12;
  } else if (h >= 1 && h <= 6) {
    h += 12;
  } else if (hit.spoken && h >= 7 && h <= 9) {
    h += 12;
  }
  return h > 23 ? null : h * 60 + hit.min;
}

// Every clock time in the message, leftmost first, overlaps removed (the longest form at a
// position wins, so "at 2:30" is 14:30 and never "at 2").
function clockTimesIn(s: string): ClockHit[] {
  const cue = String.raw`\b(?:om|at|rond|tegen|vanaf|around|by)\s+`;
  type Read = Omit<ClockHit, "index" | "end">;
  const patterns: Array<{ re: RegExp; read: (m: RegExpExecArray) => Read | null }> = [
    {
      re: /\bhalf\s+(\d{1,2}|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf)\b/gi,
      read: (m) => {
        const n = /^\d+$/.test(m[1]) ? Number(m[1]) : SPOKEN_HOURS[m[1].toLowerCase()];
        if (!(n >= 1 && n <= 24)) return null;
        return { h: n - 1 === 0 ? 12 : n - 1, min: 30, spoken: true };
      },
    },
    {
      re: /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm)?\b/gi,
      read: (m) => ({ h: Number(m[1]), min: Number(m[2]), ampm: m[3], spoken: false }),
    },
    {
      // A dot is a clock time only with a time cue before it or uur/u/am/pm after it:
      // "12.50" (a price) and "15.09" (a date) are not times.
      re: new RegExp(String.raw`(?:${cue})([01]?\d|2[0-3])\.([0-5]\d)\b|\b([01]?\d|2[0-3])\.([0-5]\d)\s*(uur|u|am|pm)\b`, "gi"),
      read: (m) =>
        m[1] !== undefined
          ? { h: Number(m[1]), min: Number(m[2]), spoken: false }
          : { h: Number(m[3]), min: Number(m[4]), ampm: /^(am|pm)$/i.test(m[5]) ? m[5] : undefined, spoken: false },
    },
    { re: /\b([01]?\d|2[0-3])u([0-5]\d)\b/gi, read: (m) => ({ h: Number(m[1]), min: Number(m[2]), spoken: false }) },
    { re: /\b(1[0-2]|0?[1-9])\s*(am|pm)\b/gi, read: (m) => ({ h: Number(m[1]), min: 0, ampm: m[2], spoken: true }) },
    {
      re: /\b([01]?\d|2[0-3])\s*(?:uur|u)\b(?!\s*(?:lang|durend|duren))/gi,
      read: (m) => ({ h: Number(m[1]), min: 0, spoken: true }),
    },
    {
      re: /\b(?:om|at)\s+([01]?\d|2[0-3])\b(?![:.]\d)(?!\s*(?:uur|u\b|am\b|pm\b))/gi,
      read: (m) => ({ h: Number(m[1]), min: 0, spoken: true }),
    },
  ];
  const hits: ClockHit[] = [];
  for (const p of patterns) {
    p.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = p.re.exec(s)) !== null) {
      if (/uur|u\b/i.test(m[0]) && !/[:.]/.test(m[0]) && DURATION_BEFORE_RE.test(s.slice(0, m.index))) continue;
      const read = p.read(m);
      if (!read) continue;
      const hit = { index: m.index, end: m.index + m[0].length, ...read };
      if (latestReading(hit, null) !== null) hits.push(hit);
    }
  }
  hits.sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index));
  const kept: ClockHit[] = [];
  for (const h of hits) {
    const last = kept.at(-1);
    if (last && h.index < last.end) continue;
    kept.push(h);
  }
  return kept;
}

// The time that belongs to the weekday: the first one written after it, otherwise the last one
// before it, read with any daypart near the day or the time. null when the message names no
// requested clock time at all (lower bounds do not count).
function clockTimeForDay(s: string, dayIndex: number): number | null {
  const hits = clockTimesIn(s).filter((h) => !LOWER_BOUND_BEFORE_RE.test(s.slice(Math.max(0, h.index - 16), h.index)));
  // A bare H.MM written right after the weekday ("di 10.30") is a clock time as well. With minutes
  // 13-59 it cannot be a dd.mm date, and a price directly after a weekday would carry "euro".
  const bare = /^[a-z]+\.?\s+(?:om\s+|at\s+)?(([01]?\d|2[0-3])\.([0-5]\d))(?!\d|[.,]\d)(?!\s*(?:euro|eur)\b)/i
    .exec(s.slice(dayIndex));
  if (bare && Number(bare[3]) > 12) {
    const end = dayIndex + bare[0].length;
    const index = end - bare[1].length;
    if (!hits.some((h) => h.index < end && index < h.end)) {
      hits.push({ index, end, h: Number(bare[2]), min: Number(bare[3]), spoken: false });
      hits.sort((a, b) => a.index - b.index);
    }
  }
  if (!hits.length) return null;
  const chosen = hits.find((h) => h.index >= dayIndex) ?? hits[hits.length - 1];
  const near = s.slice(Math.max(0, Math.min(dayIndex, chosen.index) - 12), chosen.end + 25);
  const daypart = EVENING_RE.test(near) || AFTERNOON_RE.test(near) ? "pm" : MORNING_RE.test(near) ? "am" : null;
  return latestReading(chosen, daypart);
}

function resolveWeekdayPastTimeAware(
  now: Date,
  targetDow: number,
  text: string,
  keepToday: boolean,
  dayIndex: number,
): Date {
  const d = resolveWeekday(now, targetDow, false);
  if (amsterdamISO(d) !== amsterdamISO(now)) return d;
  if (keepToday || KEEP_TODAY_RE.test(text) || THIS_QUALIFIER_BEFORE_RE.test(text.slice(0, dayIndex))) return d;
  const asked = clockTimeForDay(text, dayIndex);
  if (asked === null || asked > amsterdamMinutesOfDay(now)) return d;
  return resolveWeekday(now, targetDow, true);
}

// Scans ONLY the given text (the current customer message) for the first explicit relative-date
// phrase. First mention wins (mirrors dateOfferGuard.ts's own "first date named is the one being
// offered" convention).
const NL_MONTH_NAMES =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|" +
  "jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec";

// R54 (real bug: R53 full-journey agent simulation): an explicit "6 augustus" style day+month
// reference used to defer ENTIRELY to the model's own date arithmetic (this module only covered
// bare weekday references, R29). index.ts's <kalender> table only renders a 14-day lookahead, so
// any explicit date beyond that window had nothing for the model to read off, and Groq
// gpt-oss-20b reproducibly (3/3 live) miscomputed the ISO date backward, producing a false
// "already passed" claim for a real, bookable, future date, see FINDINGS LEDGER R53 row for the
// full live repro. Fix: resolve an explicit day+month (optionally +year) reference to a real ISO
// date deterministically, right here, using the real server "now" as ground truth, for EVERY
// explicit date (near or far), not only ones beyond the 14-day table. This removes model
// arithmetic from date resolution entirely, the same "deterministic ground truth over free model
// computation" discipline the bare-weekday hint (R29) already applies, and tools.ts already wires
// ctx.relativeDateHintISO to override args.date whenever it disagrees, so no other call site
// needs to change.
const NL_MONTHS: Record<string, number> = {
  januari: 1, jan: 1,
  februari: 2, feb: 2,
  maart: 3, mrt: 3,
  april: 4, apr: 4,
  mei: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  augustus: 8, aug: 8,
  september: 9, sep: 9,
  oktober: 10, okt: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

// Captures an explicit day+month reference in either NL word order ("6 augustus" or
// "augustus 6"), plus an optional explicit 4-digit year stated right after it ("6 augustus 2026").
const EXPLICIT_DATE_CAPTURE_RE = new RegExp(
  `\\b(?:(\\d{1,2})\\s+(${NL_MONTH_NAMES})|(${NL_MONTH_NAMES})\\s+(\\d{1,2}))\\b(?:\\s+(\\d{4}))?`,
  "i",
);

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

// Resolves an explicit day+month (optionally +year) reference to a real ISO date. When no year
// is stated: nearest occurrence on/after today (today itself counts), rolling into next year if
// the day+month has already passed this year, mirroring resolveWeekday's own "nearest upcoming"
// convention below. When an explicit year IS stated, it is honored literally, the customer's own
// explicit year always wins, this function never overrules it (even into the past: a real past-
// year claim should still surface as a genuine, honest "already passed" reply downstream, that is
// correct behavior, not this bug's class).
function resolveExplicitDayMonth(
  now: Date,
  day: number,
  month: number,
  explicitYear: number | null,
): { iso: string; label: string } | null {
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const todayIso = amsterdamISO(now);
  const todayY = Number(todayIso.split("-")[0]);
  let year = explicitYear ?? todayY;
  let iso = `${year}-${pad2(month)}-${pad2(day)}`;
  if (explicitYear === null && iso < todayIso) {
    year += 1;
    iso = `${year}-${pad2(month)}-${pad2(day)}`;
  }
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return { iso, label: dutchLabel(d) };
}

// R137 (real bug, found by the full-journey agent simulation R136 live repro): "over drie weken"
// ("in three weeks") from a real server "now" of 2026-07-12 (Sunday) got the reply "3 augustus
// 2026" (Monday), when the mathematically correct answer (2026-07-12 + 21 days, verified
// independently via Python date(2026,7,12)+timedelta(days=21)) is 2026-08-02 (Sunday). R137's OWN
// control test (same live simulator, "over twee weken" from the same "now", a phrase that stays
// entirely within July and never crosses a month boundary) found an even worse failure on the
// SAME phrase shape: "26 augustus 2026" instead of the correct 2026-07-26, a wrong MONTH entirely,
// not merely an off-by-one day. That result ruled out a month-boundary-specific root cause: this
// whole "over N dag(en)/week(en)" phrase construct was never covered by extractRelativeDayHint at
// all (only vandaag/morgen/overmorgen, bare/qualified weekday names, and explicit day+month were
// resolved deterministically here). With no code-level hint AND the <kalender> table capped at a
// 14-day lookahead (buildCalendarHint, index.ts), the model had to freely compute an N-week-out
// date entirely unaided, with nothing in the prompt to read it off from, and it reproducibly got
// this wrong, not only at month boundaries. Fix: resolve this phrase shape deterministically here,
// the same "ground truth over free model arithmetic" discipline every other phrase shape in this
// file already applies, using plain Date.UTC day arithmetic (which JS Date itself correctly rolls
// over across month/year boundaries, exactly like resolveWeekday and buildCalendarHint already
// rely on) rather than any manual month/day-of-month component math.
const NL_NUMBER_WORDS: Record<string, number> = {
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10,
  elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17,
  achttien: 18, negentien: 19, twintig: 20,
};
const NL_NUMBER_WORDS_RE = Object.keys(NL_NUMBER_WORDS).join("|");
// R139 (real bug, found by the full-journey agent simulation R138 live repro): "over N maand(en)"
// ("in N months") had ZERO deterministic coverage here, only dag/dagen/week/weken (R137). "over een
// maand" happened to get lucky (correct answer), but "over twee maanden" got an outright stonewall
// refusal ("Ik heb daar geen bevestigde informatie over..."), because the model had nothing at all
// to resolve it from (same root class as R137: no code-level hint, 14-day <kalender> table cap,
// model left to freely compute unaided). Fix: add maand/maanden (and jaar/jaren while in the area,
// same fix shape) to the unit alternation, and resolve months/years with CALENDAR-MONTH arithmetic
// (Date.UTC(y, m-1+N, d, ...)), NOT a naive 30-day multiplication: a month is not a fixed number of
// days (Date.UTC correctly handles both shorter months, e.g. Jan 31 + 1 month rolling into the
// correct end-of-Feb-adjacent date via JS's own day-overflow normalization, and year rollover when
// N crosses into the next year).
//
// Spelling-trap check (the exact class that caused R137's own bug, "weken" not being a prefix-match
// of "week"): "maand" -> "maanden" is a plain suffix add, no vowel shortening (unlike week -> weken,
// w-e-e-k -> w-e-k-e-n). Verified explicitly. Still, this uses exact-match alternation against both
// literal forms below (never startsWith/prefix logic) for both maand-unit and jaar-unit, to stay
// safe regardless.
const RELATIVE_COUNT_RE = new RegExp(
  `\\bover\\s+(\\d{1,3}|${NL_NUMBER_WORDS_RE})\\s+(dag|dagen|week|weken|maand|maanden|jaar|jaren)\\b`,
  "i",
);

// Adds `days` real calendar days to `now` (Amsterdam-local), returning the resulting ISO date +
// Dutch label. Mirrors resolveWeekday's own Date.UTC(y, m-1, d + offset, ...) pattern, which JS
// Date normalizes correctly across month/year boundaries (verified: 2026-07-12 + 21 -> 2026-08-02,
// not any manually-carried month/day component).
function addCalendarDays(now: Date, days: number): { iso: string; label: string } {
  const todayIso = amsterdamISO(now);
  const [y, m, d] = todayIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 11, 0, 0));
  const iso = amsterdamISO(dt);
  return { iso, label: dutchLabel(dt) };
}

// Adds `months` calendar months to `now` (Amsterdam-local), returning the resulting ISO date +
// Dutch label. Uses Date.UTC(y, m-1+months, d, ...) (calendar-month arithmetic, not a fixed-day
// multiplication like 30*N): JS Date.UTC correctly normalizes the month component across year
// boundaries (month index > 11 rolls into the following year(s) automatically) and correctly
// handles a day-of-month that overflows a shorter target month (e.g. 31 Jan + 1 month normalizes
// forward into early March, the same well-defined JS Date overflow behavior resolveWeekday/
// addCalendarDays above already rely on for day overflow, applied here to the month component).
function addCalendarMonths(now: Date, months: number): { iso: string; label: string } {
  const todayIso = amsterdamISO(now);
  const [y, m, d] = todayIso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + months, d, 11, 0, 0));
  const iso = amsterdamISO(dt);
  return { iso, label: dutchLabel(dt) };
}

// Adds `years` calendar years to `now` (Amsterdam-local). Delegates to addCalendarMonths (years *
// 12) so leap-year/day-overflow normalization stays a single code path with the month case above.
function addCalendarYears(now: Date, years: number): { iso: string; label: string } {
  return addCalendarMonths(now, years * 12);
}

export function extractRelativeDayHint(text: string, now: Date): RelativeDateHint | null {
  const s = (text || "").toLowerCase();

  // "over N dag(en)/week(en)" (R137): resolved before everything else below, it is just as
  // explicit/unambiguous as an explicit day+month reference and, unlike weekday/vandaag/morgen
  // phrasing, has ZERO other deterministic coverage in this file without this block.
  const countMatch = RELATIVE_COUNT_RE.exec(s);
  if (countMatch) {
    const rawCount = countMatch[1];
    const count = /^\d+$/.test(rawCount) ? Number(rawCount) : NL_NUMBER_WORDS[rawCount];
    // NB: "weken" (weeks) is NOT a prefix-match of "week" in Dutch spelling (w-e-e-k vs w-e-k-e-n,
    // the singular's double "ee" shortens to a single "e" when pluralized), so this must compare
    // the captured unit word against both exact forms rather than use startsWith("week"), which
    // silently misclassified every plural "weken" match as a 1-day unit (the actual root cause of
    // this round's live bug, not month-boundary arithmetic at all). R139: same exact-match
    // discipline applied to maand/maanden and jaar/jaren (verified no analogous vowel-shortening
    // trap on either, but exact-match alternation is used regardless, never a prefix check).
    const rawUnit = countMatch[2];
    if (count !== undefined && count > 0) {
      if (rawUnit === "maand" || rawUnit === "maanden") {
        const { iso, label } = addCalendarMonths(now, count);
        return { iso, label, matchedPhrase: countMatch[0].trim() };
      }
      if (rawUnit === "jaar" || rawUnit === "jaren") {
        const { iso, label } = addCalendarYears(now, count);
        return { iso, label, matchedPhrase: countMatch[0].trim() };
      }
      const unit = rawUnit === "week" || rawUnit === "weken" ? 7 : 1;
      const { iso, label } = addCalendarDays(now, count * unit);
      return { iso, label, matchedPhrase: countMatch[0].trim() };
    }
  }

  // Explicit day+month wins over everything else (vandaag/morgen/weekday phrasing): it is the
  // most specific, unambiguous thing the customer could have said, and now that it resolves to a
  // real ISO date itself (R54), there is no reason to defer to the model for it at all, near or
  // far. A defensive fallback (match found but resolution somehow fails, should not happen in
  // practice) falls through to the rest of this function rather than throwing.
  const explicitMatch = EXPLICIT_DATE_CAPTURE_RE.exec(s);
  if (explicitMatch) {
    const day = Number(explicitMatch[1] ?? explicitMatch[4]);
    const monthName = explicitMatch[2] ?? explicitMatch[3];
    const month = NL_MONTHS[monthName];
    const explicitYear = explicitMatch[5] ? Number(explicitMatch[5]) : null;
    const resolved = month ? resolveExplicitDayMonth(now, day, month, explicitYear) : null;
    if (resolved) {
      return { iso: resolved.iso, label: resolved.label, matchedPhrase: explicitMatch[0].trim() };
    }
  }

  const todayIso = amsterdamISO(now);
  if (/\bvandaag\b/.test(s)) {
    const d = new Date(`${todayIso}T12:00:00Z`);
    return { iso: todayIso, label: dutchLabel(d), matchedPhrase: "vandaag" };
  }
  if (/\bovermorgen\b/.test(s)) {
    const d = new Date(now.getTime() + 2 * 86_400_000);
    const iso = amsterdamISO(d);
    return { iso, label: dutchLabel(new Date(`${iso}T12:00:00Z`)), matchedPhrase: "overmorgen" };
  }
  if (/\bmorgen\b/.test(s)) {
    const d = new Date(now.getTime() + 1 * 86_400_000);
    const iso = amsterdamISO(d);
    return { iso, label: dutchLabel(new Date(`${iso}T12:00:00Z`)), matchedPhrase: "morgen" };
  }

  // Bare or qualified weekday name, optionally preceded by a qualifier word and optionally
  // followed by "(diezelfde/dezelfde/die) week" or "deze week". "volgende [weekday]" or
  // "[weekday] volgende week" skip to the following full week; every other qualifier (or none)
  // means the nearest upcoming occurrence, matching prompt.ts's documented rule exactly.
  // R140: de sterke pas kent nu OOK de Engelse namen en de niet-dubbelzinnige Engelse
  // afkortingen. Langste eerst, anders knipt "tue" de match van "tuesday" af.
  const strongDays: Record<string, number> = { ...NL_WEEKDAYS, ...EN_WEEKDAYS };
  const dayNames = Object.keys(strongDays)
    .sort((a, b) => b.length - a.length)
    .join("|");
  // R82: a weekday name fused directly onto a daypart word ("dinsdagavond", "vrijdagmiddag",
  // "maandagochtend", zero space, one token) used to fall straight through this whole function
  // (the old regex required a word boundary immediately after the weekday name, so "dinsdagavond"
  // never matched dinsdag at all, only a SPACED "dinsdag avond" ever did). With no hint produced,
  // index.ts injected nothing and the model had to resolve the day entirely on its own, which is
  // the confirmed live root cause of the FINDINGS LEDGER R80 mislabel: "Code: f744eddc Hoi, ik wil
  // graag een afspraak maken bij Iris, dinsdagavond." got a reply claiming "Tuesday evening" while
  // actually offering Sunday's real slot times, DB-verified via get_available_slots_range. This is
  // a DIFFERENT failure than the R76/R77/R79 "no day named at all" shape (there is genuinely
  // nothing to hint there): here the customer DID name an explicit day, just in a fused compound
  // form this module's regex did not recognize, so the fix is a pure regex extension, not a new
  // mechanism. The optional non-capturing daypart suffix below lets the weekday match with OR
  // without a following daypart word, fused or spaced; the captured weekday group (group 3) is
  // unaffected, so date resolution (resolveWeekday) needs no changes.
  const DAYPART_SUFFIX_RE = "ochtend|voormiddag|namiddag|middag|avond|nacht";
  // R18: the parked S13 "vrijdag 1 uur volgende week" lost its week qualifier.
  // Permit exactly one clock/spoken-time/daypart between the weekday and qualifier.
  // Horizontal whitespace and a closed grammar prevent reaching across another clause;
  // never use a wildcard window here. A directly following weekday owns "next week"
  // instead ("friday 1pm next week monday" must not shift Friday).
  const hs = "[ \\t]";
  const clock = `(?:[01]?[0-9]|2[0-3])(?:[:.][0-5][0-9])?(?:${hs}*(?:uur|u|am|pm))?`;
  const spokenHour = "(?:[1-9]|1[0-2]|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf)";
  const spokenTime = `(?:half${hs}+|kwart${hs}+(?:over|voor)${hs}+)${spokenHour}`;
  const timeGap = `(?:${hs}+(?:(?:om|at)${hs}+)?(?:${clock}|${spokenTime}|${DAYPART_SUFFIX_RE}|morning|afternoon|evening|night))?`;
  const anyDay = `${dayNames}|${AMBIGUOUS_WEEKDAY_ABBR.map((cand) => cand.word).join("|")}`;
  const nextWeekTail = `${timeGap}${hs}+(?:volgende|next)${hs}+week\\b`;
  const re = new RegExp(
    `\\b((?:volgende|next)\\s+week\\s+)?(aanstaande|komende|deze|volgende|diezelfde|dezelfde|next|this|coming|upcoming)?\\s*(${dayNames})(?:${DAYPART_SUFFIX_RE})?\\b(\\s+(diezelfde|dezelfde|die|deze)\\s+week)?(${nextWeekTail})?`,
    "i",
  );
  const m = re.exec(s);
  if (m) {
    const dow = strongDays[m[3]];
    if (dow !== undefined) {
      let tail: string | undefined = m[6];
      if (tail) {
        const end = m.index + m[0].length;
        const following = new RegExp(
          `^(${hs}+(?:(?:on|op)${hs}+)?)(?:(${anyDay})(?:${DAYPART_SUFFIX_RE})?)\\b`,
          "i",
        ).exec(s.slice(end));
        if (following) {
          const cand = AMBIGUOUS_WEEKDAY_ABBR.find((day) => day.word === following[2]);
          if (!cand || isAmbiguousWeekdayContext(cand, s, end + following[1].length)) {
            tail = undefined;
          }
        }
      }
      const skipWeek = !!(m[1] || tail || (m[2] && (m[2] === "volgende" || m[2] === "next")));
      const keepToday = !!(m[4] || (m[2] && /^(deze|this|diezelfde|dezelfde)$/.test(m[2])));
      const d = skipWeek ? resolveWeekday(now, dow, true) : resolveWeekdayPastTimeAware(now, dow, s, keepToday, m.index);
      const iso = amsterdamISO(d);
      const matchedPhrase = m[6] && !tail ? m[0].slice(0, -m[6].length).trim() : m[0].trim();
      return { iso, label: dutchLabel(d), matchedPhrase };
    }
  }

  // R140, TWEEDE PAS: de dubbelzinnige afkortingen. Draait ALLEEN als hierboven geen voluit
  // geschreven naam is gevonden, zodat "whats the latest u can do me on friday" altijd op
  // vrijdag uitkomt en nooit op de "do". Per kandidaat wordt de directe omgeving getoetst; een
  // treffer die aan een uitsluitingsregel voldoet wordt overgeslagen en de scan loopt door naar
  // het volgende voorkomen van datzelfde woord (zodat "what do u do ... do 2 uur" nog steeds de
  // echte dag zou vinden als die er stond). De vroegste geldige treffer in de zin wint.
  let best: { index: number; dow: number; phrase: string } | null = null;
  for (const cand of AMBIGUOUS_WEEKDAY_ABBR) {
    const wre = new RegExp(`\\b${cand.word}\\b`, "gi");
    let wm: RegExpExecArray | null;
    while ((wm = wre.exec(s)) !== null) {
      if (!isAmbiguousWeekdayContext(cand, s, wm.index)) continue;
      if (best === null || wm.index < best.index) {
        best = { index: wm.index, dow: cand.dow, phrase: wm[0] };
      }
      break;
    }
  }
  if (best) {
    const d = resolveWeekdayPastTimeAware(now, best.dow, s, false, best.index);
    const iso = amsterdamISO(d);
    return { iso, label: dutchLabel(d), matchedPhrase: best.phrase };
  }
  return null;
}

// Renders the prompt-injected hint block, or "" when there is nothing to say (byte-identical
// prompt when no explicit relative-date phrase was found this turn).
export function formatRelativeDateHint(hint: RelativeDateHint | null): string {
  if (!hint) return "";
  return `\nLET OP (datumherkenning voor DIT bericht): de klant noemt hierin "${hint.matchedPhrase}". Onze eigen berekening, uitsluitend gebaseerd op de ECHTE datum van vandaag (dus NIET op een datum die eerder in dit gesprek al genoemd is), wijst naar ${hint.label} [${hint.iso}]. Gebruik voor DEZE verwijzing ALTIJD deze datum, ook als jij of de klant eerder in dit gesprek een andere datum noemde bij een vergelijkbare verwijzing: die eerdere datum was voor een ANDER moment in het gesprek en is nu niet meer relevant. Twijfel je toch, vertrouw dan deze berekening boven je eigen inschatting of boven de gespreksgeschiedenis.`;
}

// R127 (SILENT-DAY-DRIFT fix, live-reproduced R126, DB-proven: "Ik wil graag Knippen Dames boeken
// bij Sanne, woensdag om 10:00" got the normal slot offer "Schikt 10:00 of 10:30?" for the real,
// correct Wednesday; the customer's NEXT message, "Wat kost dat trouwens, en doe dan maar 10:00"
// (a mixed price-question + bare time-only confirmation, NO day repeated), got back "Ik zet
// Knippen Dames op zaterdag 18 juli 10:00 ..." -- the day silently changed from Wednesday to a
// wholly different Saturday, with zero disclosure, and the price question was also silently
// dropped). A bare time-only confirmation turn ("10:00 graag", or the R126 mixed shape) has
// nothing for extractRelativeDayHint to anchor on THIS message, so the day actually used for
// book_appointment's/get_available_slots'/reschedule_appointment's `date` argument was left
// ENTIRELY to the model's own free-form reading of the full conversation history. With several
// different dates already sitting in that history (the R126 thread had an earlier abandoned
// "donderdag 16 juli" request and a "vrijdag 14:00" combo request further back), the model can
// mis-anchor onto a stale, unrelated day -- the exact "recency/anchoring bug" class R29 already
// named and fixed for BARE WEEKDAY phrasing typed directly in the current message; this closes
// the sibling gap where the CURRENT message names no day reference at all, only a bare time.
//
// Live isolation this round (R127) found the plain single-intent shape ("Doe maar 10:00", no
// price question mixed in) does NOT reliably reproduce the drift -- the 20B model resolves the
// carried-forward day correctly from short, focused history most of the time. This is consistent
// with the R29/R54 lesson repeated throughout this file: a prompt-only nudge (or the model's own
// unaided attention) is not a GUARANTEE, only a probabilistic aid, and "the day a customer already
// established never silently changes" is exactly the class of guarantee that belongs in
// deterministic code, not in hoping the model's free-form history read holds up under load (a
// mixed-intent turn, a longer thread, or any other attention pressure).
//
// Mechanism: when the current message contains a bare clock-time reference (a time-only
// confirmation shape, e.g. "10:00" or "doe dan maar 10:00") and itself names no day
// (extractRelativeDayHint(currentText) is null, so there is nothing to override that decision),
// scan prior INBOUND messages (already topic-scoped by the caller, oldest-first, the same
// dayScanWindowTexts index.ts already builds for hasDayMentionAnywhere/rescheduleFlowActiveWithNoDay)
// from the END (most recent first) for the LAST message that named an explicit day, and carry
// that single, most-recent, deterministically-resolved day forward as this turn's hint. index.ts
// wires this into the SAME ctx.relativeDateHintISO channel extractRelativeDayHint already uses,
// so tools.ts's existing R29 enforcement (execute(), "the hint wins whenever the model's own date
// differs") applies unchanged and unconditionally overrides any date the model independently
// picked for THIS turn's date-bearing tool call -- the model no longer has to get this right on
// its own at all.
//
// Returns null (byte-identical prompt/no override) when: the current message already names its
// own day (extractRelativeDayHint wins, unchanged, this function is never consulted for that
// case); the current message has no bare clock time either (an ordinary non-confirmation turn has
// no established "the day just offered" to carry, and forcibly injecting one could WRONGLY
// override a legitimate fresh, dayless question); or no prior message in the scanned window names
// a day at all (nothing to carry forward).
const BARE_CLOCK_TIME_RE = /\b\d{1,2}[:.]\d{2}\b/;

// R84 review round 2 (2026-10-23): each earlier message is resolved at the moment it was SENT, the
// way bookingContinuity.ts already does. Resolved against the current clock, "dinsdag 10 uur" sent
// at 09:00 and confirmed with "doe maar 10:30" at 10:02 moved to next Tuesday, because 10:00 had
// passed by then: exactly the silent day drift this function exists to stop. A missing or
// unreadable send time falls back to `now` (the old behaviour).
export function extractCarriedForwardDayHint(
  currentText: string,
  priorInboundTextsOldestFirst: string[],
  now: Date,
  priorInboundSentAtOldestFirst?: Array<Date | null>,
): RelativeDateHint | null {
  if (extractRelativeDayHint(currentText, now) !== null) return null;
  if (!BARE_CLOCK_TIME_RE.test(currentText || "")) return null;
  for (let i = priorInboundTextsOldestFirst.length - 1; i >= 0; i--) {
    const sent = priorInboundSentAtOldestFirst?.[i];
    const at = sent && Number.isFinite(sent.getTime()) && sent.getTime() <= now.getTime() + 1000 ? sent : now;
    const hint = extractRelativeDayHint(priorInboundTextsOldestFirst[i], at);
    if (hint) return hint;
  }
  return null;
}

// Prompt-injected wording for the carried-forward case, deliberately distinct from
// formatRelativeDateHint above: that one describes a phrase the customer JUST typed ("de klant
// noemt hierin ..."), which would be FALSE here (the customer named no day this turn at all). This
// instead states plainly that no day was named this turn and names the real, most-recently-
// established day the confirmation carries forward, with the same "trust this over your own
// reading of history" closing line.
export function formatCarriedForwardDayHint(hint: RelativeDateHint | null): string {
  if (!hint) return "";
  return `\nLET OP (dag-doorloop voor DIT bericht): de klant noemt in dit bericht ZELF geen dag, alleen een tijd. Uit het gesprek blijkt de laatst vastgestelde dag "${hint.matchedPhrase}" te zijn, wat overeenkomt met ${hint.label} [${hint.iso}]. Gebruik voor DEZE bevestiging ALTIJD deze dag, nooit een andere dag die verder terug in het gesprek genoemd werd. Twijfel je toch, vertrouw dan deze berekening boven je eigen inschatting of boven de gespreksgeschiedenis.`;
}

// R93 (SILENT-TODAY-DEFAULT fix, confirmed live bug filed R92): a customer who names NO day at
// all, anywhere ("Ik wil graag een afspraak bij Milan boeken, wanneer heb je tijd?"), used to get
// slot times offered as if "today" had been silently agreed, with the assumption disclosed only
// if the customer happened to ask "welke dag is dat dan?" afterwards. This is a different failure
// shape than R80/R82 (an explicit day the regex failed to recognize): here there is genuinely
// NOTHING to hint, so extractRelativeDayHint correctly returns null, and the existing prompt-only
// "never invent vandaag/morgen" instruction (see prompt.ts, the "ONTBREEKT DE DAG" rule) proved,
// live, not reliably followed by the 20B model on this phrasing (no explicit day/time ask at all,
// just an open "wanneer heb je tijd?"). Mirrors the SAME deterministic, code-level discipline this
// module already uses for date RESOLUTION: instead of trusting the model to remember a prose rule,
// tools.ts's get_available_slots/book_appointment guards (ctx.blockForNoDayNamed) now REFUSE to
// run at all when this returns true, forcing an explicit day question, the same "refuse to guess"
// pattern serviceDisambiguationGuard.ts already established for missing-service/branch ambiguity.
//
// hasDayMentionAnywhere scans the CURRENT message plus every prior INBOUND message already loaded
// into this turn's conversation history (never outbound/agent text, which could itself contain a
// stray day word) for an explicit day reference, using the exact same extractRelativeDayHint this
// module already uses for resolution. `now` is the real server "now": for historical messages we
// only care whether a day phrase is PRESENT (a boolean), never its resolved ISO value, so reusing
// the current turn's `now` for older messages is safe and keeps this a single source of truth.
export function hasDayMentionAnywhere(
  currentText: string,
  priorInboundTexts: string[],
  now: Date,
): boolean {
  if (extractRelativeDayHint(currentText, now) !== null) return true;
  return priorInboundTexts.some((t) => extractRelativeDayHint(t, now) !== null);
}

// Refusal message forcing an explicit day question instead of a silent "today" assumption. NL
// default; index.ts/tools.ts already translate other refusal messages via the model's own
// customer-language handling for the surrounding reply, same convention as KIES_DIENST_MESSAGE.
export const VRAAG_DAG_MESSAGE =
  "De klant heeft in dit hele gesprek nog GEEN dag genoemd (geen weekdag, geen 'vandaag'/'morgen', geen datum). Neem NOOIT zelf een dag aan (ook niet 'vandaag'): vraag eerst kort en concreet op welke dag de klant de afspraak wil, bijvoorbeeld \"Op welke dag zou je de afspraak willen?\", en roep dan pas opnieuw aan zodra de klant een dag heeft genoemd.";

// R95 (RESCHEDULE-NO-DAY-STONEWALL fix): same discipline as VRAAG_DAG_MESSAGE above, worded for
// reschedule_appointment specifically (the klant already HAS a booking, so the question is which
// NEW day, never a first-time "which day do you want the appointment" phrasing that would confuse
// the existing-booking context).
export const VRAAG_DAG_RESCHEDULE_MESSAGE =
  "De klant wil verzetten maar heeft nog GEEN nieuwe dag genoemd (geen weekdag, geen 'vandaag'/'morgen', geen datum), alleen eventueel een tijdstip. Verzet NIETS en neem NOOIT zelf een dag aan: vraag eerst kort en concreet naar welke dag de klant de afspraak wil verzetten, bijvoorbeeld \"Naar welke dag wil je de afspraak verzetten?\", en roep reschedule_appointment dan pas opnieuw aan zodra de klant een dag heeft genoemd.";

// R95 (RESCHEDULE-NO-DAY-STONEWALL fix, live-reproduced R94): tools.ts's own reschedDayEstablished
// guard (see that file's reschedule_appointment case) only fires once the model actually INVOKES
// reschedule_appointment. Live-reproduced this round: the model routinely never calls ANY tool at
// all for a bare "kan ik mijn afspraak verzetten naar een ander tijdstip?" (no day named) turn,
// instead composing a prose reply that reads the request as a pure status lookup and echoes the
// EXACT get_my_appointments-shaped template ("Er staat een afspraak: <service> op <when> (op naam
// <name>)."), the identical failure shape serviceDisambiguationGuard.ts's own
// looksLikeAppointmentStatusReadout already names and guards against for the RETURNING-SERVICE
// case. This is the SAME deterministic "backstop AFTER the reply is drafted, independent of which
// tool (if any) was called this turn" pattern, applied to the reschedule-no-day case.
//
// rescheduleFlowActiveWithNoDay: true only when (a) a reschedule flow is genuinely in progress
// this turn (the CURRENT message names an explicit reschedule verb, OR a recent prior INBOUND
// message did, scoping "recent" to since the last such verb rather than the whole conversation,
// exactly like the reasoning in hasDayMentionAnywhere's own header for why reschedule needs a
// NARROWER window than book_appointment's whole-history scan: the ORIGINAL booking request almost
// always already named a day, which would otherwise make this permanently false-negative), AND
// (b) no day has been named anywhere in that same narrow window (current message + every inbound
// message from the most recent reschedule-verb turn onward).
export function rescheduleFlowActiveWithNoDay(
  currentText: string,
  priorInboundTextsOldestFirst: string[],
  now: Date,
  rescheduleVerbRe: RegExp,
): boolean {
  let sinceIndex = -1;
  for (let i = priorInboundTextsOldestFirst.length - 1; i >= 0; i--) {
    if (rescheduleVerbRe.test(priorInboundTextsOldestFirst[i])) {
      sinceIndex = i;
      break;
    }
  }
  const currentHasIntent = rescheduleVerbRe.test(currentText);
  if (sinceIndex === -1 && !currentHasIntent) return false;
  const windowTexts = sinceIndex === -1 ? [] : priorInboundTextsOldestFirst.slice(sinceIndex);
  return !hasDayMentionAnywhere(currentText, windowTexts, now);
}

// Customer-facing question this backstop rewrites the drafted reply to, when triggered. Kept
// separate from VRAAG_DAG_RESCHEDULE_MESSAGE (that one is a tool-result `message` field mixing an
// internal instruction with the question; this is the bare customer-facing sentence, same
// convention as BEVESTIG_TERUGKERENDE_DIENST_CUSTOMER_MESSAGE / enforceVerificationGateDisclosure's
// own customer_reply field).
export const VRAAG_DAG_RESCHEDULE_CUSTOMER_MESSAGE = "Naar welke dag wil je de afspraak verzetten?";

// Error codes a SIBLING gate on reschedule_appointment/get_available_slots can legitimately
// return this same turn, each with its own correct customer-facing question that must win over
// this backstop (identity/ambiguity/service/calendar concerns are real and take priority over the
// day question; asking "which day" on top of one of these would just be a second, confusing
// question). Deliberately does NOT include "vraag_dag" (this fix's own tools.ts guard): this fix's
// OWN live verify round found the model does NOT reliably relay that gate's `message` field into
// an actual day-question either (live-reproduced: reschedule_appointment returned vraag_dag, yet
// the model still composed the exact "Er staat een afspraak: ..." stonewall), the identical
// "prompt/tool-message-only steering does not reliably hold at this model's scale" lesson this
// whole codebase has already learned repeatedly (R102, R112, enforceReturningServiceDisclosure).
// Treating vraag_dag as "already handled" and skipping the rewrite would silently let that exact
// failure back through; this backstop must fire on EVERY vraag_dag hit too, not just tool-call-less
// turns, so it always forces the identical, correct customer-facing question regardless of whether
// the model followed the tool's own internal instruction.
const RESCHEDULE_SIBLING_GATE_ERRORS = new Set([
  "naam_verificatie_nodig",
  "meerdere_afspraken",
  "andere_dienst_verzet",
  "verzet_bevestiging_nodig",
  "meerdere_agendas",
  "dienst_onbekend",
]);

export interface RescheduleNoDayToolResult {
  name: string;
  result?: unknown;
}

export function enforceRescheduleNoDayDisclosure(
  replyText: string,
  rescheduleFlowActiveWithNoDayThisTurn: boolean,
  toolCalls: RescheduleNoDayToolResult[] = [],
): string {
  if (!replyText) return replyText;
  if (!rescheduleFlowActiveWithNoDayThisTurn) return replyText;
  // Already asks a day question (however phrased)? Trust correct model output, never clobber it.
  if (/welke dag|which day/i.test(replyText)) return replyText;
  // A sibling gate on reschedule_appointment/get_available_slots already fired this turn with its
  // OWN correct, different question (identity verification, multiple bookings, a service/calendar
  // choice), or the reschedule genuinely committed (ok:true): never override either with the day
  // question, that would fight (or contradict) the sibling gate/a real success.
  for (const tc of toolCalls) {
    if (tc.name !== "reschedule_appointment" && tc.name !== "get_available_slots" && tc.name !== "book_appointment") continue;
    const r = tc.result;
    if (!r || typeof r !== "object") continue;
    const err = (r as Record<string, unknown>).error;
    if (typeof err === "string" && RESCHEDULE_SIBLING_GATE_ERRORS.has(err)) return replyText;
    if ((r as Record<string, unknown>).ok === true) return replyText;
  }
  // Live-reproduced R95 (this fix's OWN verify round): the get_my_appointments-shaped stonewall
  // template is not the only shape this bug produces. A customer whose reschedule ask names no day
  // can also get a bare, silent slot OFFER (e.g. "19:30 past?"), the model having assumed some
  // unstated day for itself with zero disclosure, no tool call this turn carrying any of the
  // sibling-gate errors above, and no explicit day/appointment-status text either. Any reply this
  // deterministically-computed flag reaches, other than a genuine sibling gate or a real commit
  // (both already excluded above) or a reply that already asks the day, is WRONG BY CONSTRUCTION
  // (the one and only correct reply while rescheduleFlowActiveWithNoDayThisTurn holds is the day
  // question), so this rewrites unconditionally rather than pattern-matching one specific shape.
  return VRAAG_DAG_RESCHEDULE_CUSTOMER_MESSAGE;
}
