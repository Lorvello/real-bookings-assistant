// R84: deterministic opening-hours answers (S01 dated, S18 weekly multi-calendar).
// Run: deno test openingHoursAnswer.test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.19";
import { answerOpeningHours, openingHoursQuestion } from "./openingHoursAnswer.ts";

type Row = Record<string, unknown>;
type Table = { data?: Row[]; error?: unknown };

// Minimal read-only stand-in for the Supabase query builder: eq() filters, limit() caps, await
// resolves { data, error }. Any write method would be absent, so a write attempt would throw.
function fakeClient(tables: Record<string, Table>) {
  return {
    from(name: string) {
      const filters: Array<[string, unknown]> = [];
      let cap: number | null = null;
      const q = {
        select: () => q,
        order: () => q,
        eq: (field: string, value: unknown) => (filters.push([field, value]), q),
        limit: (n: number) => ((cap = n), q),
        then: (resolve: (v: unknown) => unknown) => {
          const t = tables[name] ?? { data: [] };
          if (t.error) return resolve({ data: null, error: t.error });
          let rows = (t.data ?? []).filter((r) => filters.every(([f, v]) => r[f] === undefined || r[f] === v));
          if (cap !== null) rows = rows.slice(0, cap);
          return resolve({ data: rows, error: null });
        },
      };
      return q;
    },
  };
}

const NOW = new Date("2026-09-08T20:00:00Z");
const CAL = { id: "cal-a", name: "Iris" };
const CAL_B = { id: "cal-b", name: "Bram" };

function weekRules(scheduleId: string, perDay: Record<number, Array<[string, string]>>): Row[] {
  const rows: Row[] = [];
  for (let d = 1; d <= 7; d++) {
    for (const [s, e] of perDay[d] ?? []) rows.push({ schedule_id: scheduleId, day_of_week: d, start_time: s, end_time: e, is_available: true });
  }
  return rows;
}

const WEEKDAYS_9_17: Record<number, Array<[string, string]>> = {
  1: [["09:00:00", "17:00:00"]],
  2: [["09:00:00", "17:00:00"]],
  3: [["09:00:00", "17:00:00"]],
  4: [["09:00:00", "17:00:00"]],
  5: [["09:00:00", "17:00:00"]],
};

function singleCalendar(overrides: Row[] = [], perDay = WEEKDAYS_9_17) {
  return fakeClient({
    availability_schedules: { data: [{ id: "sch-a", calendar_id: "cal-a", is_default: true, created_at: "2026-01-01" }] },
    availability_rules: { data: weekRules("sch-a", perDay) },
    availability_overrides: { data: overrides },
  });
}

Deno.test("R84 S01 exact question is a dated Dutch hours question", () => {
  assertEquals(openingHoursQuestion("hoi! do 17 september open? en hoe laat dan", NOW), { language: "nl", date: "2026-09-17" });
});

Deno.test("R84 S18 exact question is a general English hours question", () => {
  assertEquals(openingHoursQuestion("what are ur opening hours btw", NOW), { language: "en", date: null });
});

Deno.test("R84 booking or negated questions are not hours-only", () => {
  assertEquals(openingHoursQuestion("kan ik do 17 september een afspraak, zijn jullie open?", NOW), null);
  assertEquals(openingHoursQuestion("zijn jullie niet open op zondag?", NOW), null);
  assertEquals(openingHoursQuestion("what are your opening hours, can i book friday?", NOW), null);
});

Deno.test("R84 weekday that contradicts the date is not answered deterministically", () => {
  // 17 September 2026 is a Thursday, not a Wednesday.
  assertEquals(openingHoursQuestion("wo 17 september open?", NOW), null);
});

Deno.test("R84 S01 answer uses the read Thursday hours and a readable date", async () => {
  const a = await answerOpeningHours(singleCalendar(), { language: "nl", date: "2026-09-17" }, [CAL]);
  assertEquals(a.text, "Op donderdag 17 september zijn we open van 09:00 tot 17:00.");
});

Deno.test("R84 a closing override wins over an open weekday", async () => {
  const a = await answerOpeningHours(
    singleCalendar([{ calendar_id: "cal-a", date: "2026-09-17", is_available: false, start_time: null, end_time: null }]),
    { language: "nl", date: "2026-09-17" },
    [CAL],
  );
  assertEquals(a.text, "Op donderdag 17 september zijn we gesloten.");
});

Deno.test("R84 explicit override hours win over the standard hours", async () => {
  const a = await answerOpeningHours(
    singleCalendar([{ calendar_id: "cal-a", date: "2026-09-17", is_available: true, start_time: "12:00:00", end_time: "16:00:00" }]),
    { language: "en", date: "2026-09-17" },
    [CAL],
  );
  assertEquals(a.text, "On Thursday 17 September we're open from 12:00 to 16:00.");
});

Deno.test("R84 a failed read is unknown, never closed", async () => {
  const client = fakeClient({ availability_schedules: { error: { message: "boom" } } });
  const a = await answerOpeningHours(client, { language: "nl", date: "2026-09-17" }, [CAL]);
  assert(!/gesloten/.test(a.text), a.text);
  assertEquals(a.text, "Ik kon de openingstijden nu niet controleren. Probeer het zo nog eens.");
});

Deno.test("R84 duplicate overrides for one date are unknown", async () => {
  const dup = { calendar_id: "cal-a", date: "2026-09-17", is_available: true, start_time: "10:00:00", end_time: "12:00:00" };
  const a = await answerOpeningHours(singleCalendar([dup, { ...dup }]), { language: "nl", date: "2026-09-17" }, [CAL]);
  assert(/niet controleren/.test(a.text), a.text);
});

Deno.test("R84 a midday break stays visible as two windows", async () => {
  const split = { ...WEEKDAYS_9_17, 4: [["09:00:00", "12:00:00"], ["13:00:00", "17:00:00"]] as Array<[string, string]> };
  const a = await answerOpeningHours(singleCalendar([], split), { language: "nl", date: "2026-09-17" }, [CAL]);
  assertEquals(a.text, "Op donderdag 17 september zijn we open van 09:00 tot 12:00 en van 13:00 tot 17:00.");
});

Deno.test("R84 S18 weekly answer attributes different hours to each calendar in English", async () => {
  const client = fakeClient({
    availability_schedules: {
      data: [
        { id: "sch-a", calendar_id: "cal-a", is_default: true, created_at: "2026-01-01" },
        { id: "sch-b", calendar_id: "cal-b", is_default: true, created_at: "2026-01-01" },
      ],
    },
    availability_rules: {
      data: [
        ...weekRules("sch-a", WEEKDAYS_9_17),
        ...weekRules("sch-b", { 2: [["10:00:00", "18:00:00"]], 6: [["10:00:00", "14:00:00"]] }),
      ],
    },
    availability_overrides: { data: [] },
  });
  const a = await answerOpeningHours(client, { language: "en", date: null }, [CAL, CAL_B]);
  const [iris, bram] = a.text.split("\n\n");
  assert(iris.startsWith("Iris:\nMonday 09:00 to 17:00"), iris);
  assert(iris.includes("Saturday closed") && iris.includes("Sunday closed"), iris);
  assert(bram.startsWith("Bram:\nMonday closed\nTuesday 10:00 to 18:00"), bram);
  assert(bram.includes("Saturday 10:00 to 14:00"), bram);
  assert(!bram.includes("09:00"), "Iris hours leaked into Bram: " + bram);
});
