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
// dash-free of em dashes per house rule.

const NL_WEEKDAYS: Record<string, number> = {
  // JS Date.getDay(): 0=zondag .. 6=zaterdag
  zondag: 0, maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4, vrijdag: 5, zaterdag: 6,
};

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

// Scans ONLY the given text (the current customer message) for the first explicit relative-date
// phrase. First mention wins (mirrors dateOfferGuard.ts's own "first date named is the one being
// offered" convention).
const NL_MONTH_NAMES =
  "januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december|" +
  "jan|feb|mrt|apr|jun|jul|aug|sep|okt|nov|dec";
// An explicit "24 juli" / "juli 24" style date ANYWHERE in the message means the customer's ask
// is already unambiguous (dateOfferGuard.ts / the model's own <kalender> lookup already handle an
// explicit date correctly, this whole module exists only for a BARE weekday with no day-number).
// A bare weekday word can sit right next to an explicit date ("vrijdag 24 juli"): resolving that
// as a fresh relative reference would silently overrule the customer's own explicit date, a real
// regression this guard must never cause. So: any explicit day+month anywhere -> defer entirely,
// return null.
const EXPLICIT_DATE_RE = new RegExp(`\\b(\\d{1,2}\\s+(${NL_MONTH_NAMES})|(${NL_MONTH_NAMES})\\s+\\d{1,2})\\b`, "i");

export function extractRelativeDayHint(text: string, now: Date): RelativeDateHint | null {
  const s = (text || "").toLowerCase();
  if (EXPLICIT_DATE_RE.test(s)) return null;

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
  const dayNames = Object.keys(NL_WEEKDAYS).join("|");
  const re = new RegExp(
    `\\b(volgende\\s+week\\s+)?(aanstaande|komende|deze|volgende|diezelfde|dezelfde)?\\s*(${dayNames})\\b(\\s+(diezelfde|dezelfde|die|deze)\\s+week)?(\\s+volgende\\s+week)?`,
    "i",
  );
  const m = re.exec(s);
  if (!m) return null;
  const dow = NL_WEEKDAYS[m[3]];
  if (dow === undefined) return null;
  const skipWeek = !!(m[1] || m[6] || (m[2] && m[2] === "volgende"));
  const d = resolveWeekday(now, dow, skipWeek);
  const iso = amsterdamISO(d);
  return { iso, label: dutchLabel(d), matchedPhrase: m[0].trim() };
}

// Renders the prompt-injected hint block, or "" when there is nothing to say (byte-identical
// prompt when no explicit relative-date phrase was found this turn).
export function formatRelativeDateHint(hint: RelativeDateHint | null): string {
  if (!hint) return "";
  return `\nLET OP (datumherkenning voor DIT bericht): de klant noemt hierin "${hint.matchedPhrase}". Onze eigen berekening, uitsluitend gebaseerd op de ECHTE datum van vandaag (dus NIET op een datum die eerder in dit gesprek al genoemd is), wijst naar ${hint.label} [${hint.iso}]. Gebruik voor DEZE verwijzing ALTIJD deze datum, ook als jij of de klant eerder in dit gesprek een andere datum noemde bij een vergelijkbare verwijzing: die eerdere datum was voor een ANDER moment in het gesprek en is nu niet meer relevant. Twijfel je toch, vertrouw dan deze berekening boven je eigen inschatting of boven de gespreksgeschiedenis.`;
}
