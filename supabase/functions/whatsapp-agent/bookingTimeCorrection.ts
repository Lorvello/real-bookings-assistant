// R84 (S08, actual staging run 2026-09-08): "yeah fine. can we do 3 instead tho?" after a 14:00
// preview refreshed the OLD 14:00, because the model re-sent the old preview's ISO start_time and
// book_appointment only resolves args.date/args.time when no ISO is given. This module only
// RECOGNIZES a time-only correction; tools.ts resolves it against real availability.
//
// Closed grammar on purpose: a message that also names a day, a service or a person never matches,
// so those changes keep their own routes (relativeDateHint, service switch, identity guards).
// Returns the plausible HH:MM readings. 1-11 without am/pm may mean h or h+12 ("3 uur" in a salon
// is usually 15:00), and only real availability may decide between them, never a guess here.

const TIME = String.raw`(\d{1,2})(?:[:.]([0-5]\d))?\s*(am|pm|uur|u)?`;
const EN_ACK = String.raw`(?:(?:yeah|yes|ok(?:ay)?|fine|sure)(?:\s+fine)?[,.!]?\s*)?`;
const NL_ACK = String.raw`(?:(?:ja|oké|oke|ok|prima|goed)[,.!]?\s*)?`;

const CORRECTION_PATTERNS: RegExp[] = [
  // "yeah fine. can we do 3 instead tho?", "could you do 15:00 instead", "make it 4pm instead"
  new RegExp(
    String.raw`^${EN_ACK}(?:can we do|could we do|can you do|could you do|make it|let'?s do)\s+(?:at\s+)?${TIME}\s*(?:instead|rather)(?:\s+tho(?:ugh)?)?[.!?]*$`,
    "i",
  ),
  // "kan het toch om 3 uur?", "liever om 15:00", "doe toch maar 3 uur"
  new RegExp(
    String.raw`^${NL_ACK}(?:(?:kan het|kan dat|doe|maak er)\s+(?:dan\s+)?(?:ook\s+)?)?(?:toch\s+(?:maar\s+)?|liever\s+)(?:om\s+)?${TIME}[.!?]*$`,
    "i",
  ),
  // "kan het om 3 uur in plaats daarvan?"
  new RegExp(
    String.raw`^${NL_ACK}(?:kan het|kan dat|doe|maak er)\s+(?:maar\s+)?(?:ook\s+)?(?:om\s+)?${TIME}\s*(?:in plaats daarvan|liever)[.!?]*$`,
    "i",
  ),
];

export function correctedPreviewHours(message: string): string[] | null {
  const text = String(message ?? "").trim();
  for (const re of CORRECTION_PATTERNS) {
    const m = re.exec(text);
    if (!m) continue;
    let hour = Number(m[1]);
    if (!Number.isInteger(hour) || hour > 23) return null;
    const minutes = m[2] ?? "00";
    const suffix = m[3]?.toLowerCase();
    if (suffix === "am" || suffix === "pm") {
      if (hour < 1 || hour > 12) return null;
      hour = (hour % 12) + (suffix === "pm" ? 12 : 0);
      return [`${String(hour).padStart(2, "0")}:${minutes}`];
    }
    const values = [`${String(hour).padStart(2, "0")}:${minutes}`];
    if (hour >= 1 && hour <= 11) values.push(`${String(hour + 12).padStart(2, "0")}:${minutes}`);
    return values;
  }
  return null;
}
