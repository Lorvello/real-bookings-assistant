// Deterministic outbound-text hygiene for every WhatsApp agent reply.
// Em-dashes (and their en/figure/bar/minus cousins) read as "written by an AI", which
// Mathew wants to NEVER appear. We strip them server-side so the guarantee does not
// depend on the model obeying a prompt rule. Numeric ranges (09:00–17:00, €10–15) keep
// a plain hyphen; everywhere else a spaced/tight dash becomes a comma so the sentence
// still reads naturally ("klaar — top" -> "klaar, top", "doen—een" -> "doen, een").
const DASHES = "—–―‒−"; // U+2014 em, U+2013 en, U+2015 bar, U+2012 figure, U+2212 minus

export function sanitizeReply(text: string): string {
  if (!text) return text;
  let t = text;
  // 1. Keep numeric ranges readable as a hyphen (09:00–17:00, €10–15, 2–3).
  t = t.replace(new RegExp(`(\\d)\\s*[${DASHES}]\\s*(\\d)`, "g"), "$1-$2");
  // 2. Every remaining em/en/bar/minus dash -> comma+space (the AI tell, killed).
  t = t.replace(new RegExp(`\\s*[${DASHES}]\\s*`, "g"), ", ");
  // 3. Tidy artifacts a substitution can create.
  t = t
    .replace(/\s+,/g, ",")        // " ," -> ","
    .replace(/,\s*,/g, ", ")      // double comma -> single
    .replace(/^[\s,]+/, "")         // leading comma/space from a line-initial dash
    .replace(/\s{2,}/g, " ");      // collapse double spaces
  return t.trim();
}
