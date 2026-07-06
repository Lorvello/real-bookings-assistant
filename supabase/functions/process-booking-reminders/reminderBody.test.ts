// E-4 proof: the reminder body is NL or EN depending on the booking locale.
import { assert, assertStringIncludes, assertEquals } from "https://deno.land/std@0.190.0/testing/asserts.ts";
import { reminderHtml, formatDate } from "./reminderBody.ts";

Deno.test("reminderHtml NL body for an NL booking", () => {
  const { subject, html } = reminderHtml("nl", "Sanne", "Lorvello", null, "maandag 30 juni 2026", "14:00", false);
  assertStringIncludes(subject, "Herinnering: je afspraak bij Lorvello");
  assertStringIncludes(html, "Hoi Sanne,");
  assertStringIncludes(html, "Herinnering aan je afspraak");
  assertStringIncludes(html, "Dit is een herinnering aan je aankomende afspraak");
  // It must NOT contain the EN copy.
  assert(!html.includes("This is a reminder"), "NL body leaked EN copy");
});

Deno.test("reminderHtml EN body for an EN booking", () => {
  const { subject, html } = reminderHtml("en", "John", "Lorvello", null, "Monday 30 June 2026", "2:00 PM", false);
  assertStringIncludes(subject, "Reminder: your appointment at Lorvello");
  assertStringIncludes(html, "Hi John,");
  assertStringIncludes(html, "Reminder for your appointment");
  assertStringIncludes(html, "This is a reminder for your upcoming appointment");
  // It must NOT contain the NL copy.
  assert(!html.includes("Dit is een herinnering"), "EN body leaked NL copy");
});

Deno.test("second-reminder heading differs per locale", () => {
  assertStringIncludes(reminderHtml("nl", "x", "B", null, "d", "t", true).html, "Tot zo!");
  assertStringIncludes(reminderHtml("en", "x", "B", null, "d", "t", true).html, "See you soon!");
});

Deno.test("formatDate uses Dutch month/day names for NL", () => {
  const { datum } = formatDate("2026-06-29T12:00:00Z", "nl", "Europe/Amsterdam"); // a Monday
  assertStringIncludes(datum, "maandag");
  assertStringIncludes(datum, "juni");
});

Deno.test("formatDate uses English month/day names for EN", () => {
  const { datum } = formatDate("2026-06-29T12:00:00Z", "en", "Europe/Amsterdam");
  assertStringIncludes(datum, "Monday");
  assertStringIncludes(datum, "June");
});

// SEQP1R16 (finding R15-1): the date-off-by-one regression guard. An appointment in the
// 00:00-01:59 Europe/Amsterdam window has an Amsterdam calendar date that is ONE DAY AHEAD of
// its UTC date. The old formatDate localised the time to Amsterdam but built the date from UTC
// getters, so it rendered the previous day (e.g. Amsterdam Tuesday 7 July 00:30 -> "maandag 6
// juli", Monday). This asserts the FULL date string (weekday + day-of-month + month) lands on the
// correct Amsterdam day in BOTH locales, and that the time is still correct, so the exact case
// every prior round missed (they only tested noon, same UTC date) can never silently regress.
Deno.test("R15-1: 00:30 Amsterdam booking renders the correct Amsterdam day (SUMMER, +02) in NL and EN", () => {
  // 2026-07-06 22:30:00Z == Europe/Amsterdam Tuesday 2026-07-07 00:30 (Amsterdam is +02 in July).
  const iso = "2026-07-06T22:30:00Z";
  const nl = formatDate(iso, "nl");
  assertEquals(nl.datum, "dinsdag 7 juli 2026", "NL date must be Tuesday 7 July, not Monday 6");
  assertEquals(nl.tijd, "00:30");
  assert(!nl.datum.includes("maandag"), "must not show the previous day (Monday)");
  assert(!nl.datum.includes(" 6 "), "must not show day-of-month 6");

  const en = formatDate(iso, "en");
  assertEquals(en.datum, "Tuesday 7 July 2026", "EN date must be Tuesday 7 July, not Monday 6");
  assertEquals(en.tijd, "00:30");
  assert(!en.datum.includes("Monday"), "must not show the previous day (Monday)");
});

Deno.test("R15-1: 00:30 Amsterdam booking renders the correct Amsterdam day (WINTER, +01) in NL and EN", () => {
  // 2026-01-05 23:30:00Z == Europe/Amsterdam Tuesday 2026-01-06 00:30 (Amsterdam is +01 in January).
  const iso = "2026-01-05T23:30:00Z";
  const nl = formatDate(iso, "nl");
  assertEquals(nl.datum, "dinsdag 6 januari 2026", "NL date must be Tuesday 6 Jan, not Monday 5");
  assertEquals(nl.tijd, "00:30");
  const en = formatDate(iso, "en");
  assertEquals(en.datum, "Tuesday 6 January 2026", "EN date must be Tuesday 6 Jan, not Monday 5");
  assertEquals(en.tijd, "00:30");
});

Deno.test("noon booking date + time are unchanged (anti-regression, same output shape as before)", () => {
  // 2026-06-29 12:00:00Z == Europe/Amsterdam Monday 2026-06-29 14:00 (same UTC date, the only case
  // the old tests ever covered). Locks the exact prior output shape so the fix did not drift it.
  assertEquals(formatDate("2026-06-29T12:00:00Z", "nl").datum, "maandag 29 juni 2026");
  assertEquals(formatDate("2026-06-29T12:00:00Z", "nl").tijd, "14:00");
  assertEquals(formatDate("2026-06-29T12:00:00Z", "en").datum, "Monday 29 June 2026");
  assertEquals(formatDate("2026-06-29T12:00:00Z", "en").tijd, "14:00");
});

Deno.test("DST boundary dates stay correct (spring-forward + fall-back)", () => {
  // Spring-forward 2026-03-29 (Amsterdam clocks jump 02:00 -> 03:00, +01 -> +02).
  // 00:30Z = Amsterdam 01:30 (before the gap); 01:30Z = Amsterdam 03:30 (after the gap).
  assertEquals(formatDate("2026-03-29T00:30:00Z", "nl").datum, "zondag 29 maart 2026");
  assertEquals(formatDate("2026-03-29T00:30:00Z", "nl").tijd, "01:30");
  assertEquals(formatDate("2026-03-29T01:30:00Z", "nl").tijd, "03:30");
  // Fall-back 2026-10-25 (Amsterdam clocks fall 03:00 -> 02:00, +02 -> +01).
  // 00:30Z = Amsterdam 02:30, date must stay Sunday 25 October.
  assertEquals(formatDate("2026-10-25T00:30:00Z", "en").datum, "Sunday 25 October 2026");
  assertEquals(formatDate("2026-10-25T00:30:00Z", "en").tijd, "02:30");
});

Deno.test("empty name falls back per locale", () => {
  assertStringIncludes(reminderHtml("nl", "", "B", null, "d", "t", false).html, "Hoi daar,");
  assertStringIncludes(reminderHtml("en", "", "B", null, "d", "t", false).html, "Hi there,");
});

Deno.test("service row is omitted when service is null and present otherwise", () => {
  assert(!reminderHtml("nl", "x", "B", null, "d", "t", false).html.includes(">Dienst<"));
  assertStringIncludes(reminderHtml("nl", "x", "B", "Knipbeurt", "d", "t", false).html, "Knipbeurt");
});

// SEQP1R19 (finding R18-2, SECURITY): every user/owner-controlled field interpolated into the
// email HTML must be output-encoded at the render boundary. customer_name arrives verbatim from the
// WhatsApp booking path, so a stored `<img src=x onerror=...>` name (or a business_name breaking out
// of a table cell with `</td></tr><script>`) previously rendered as LIVE markup in a DKIM-signed
// reminder email. These assert the payloads land ESCAPED (HTML entities, not live tags) while a
// normal name is untouched, so the injection can never silently regress.
Deno.test("R18-2: customer_name HTML is escaped, not rendered as live markup", () => {
  const payload = "rux <img src=x onerror=alert(1)> Bobby";
  const { html } = reminderHtml("nl", payload, "Lorvello", null, "d", "t", false);
  // The raw live tag must NOT be present.
  assert(!html.includes("<img src=x onerror=alert(1)>"), "live <img> tag leaked into the email HTML");
  // The escaped, inert entity form MUST be present.
  assertStringIncludes(html, "rux &lt;img src=x onerror=alert(1)&gt; Bobby");
});

Deno.test("R18-2: business_name HTML is escaped in both the body and the subject", () => {
  const evilBusiness = "Evil</td></tr><script>steal()</script>";
  const { subject, html } = reminderHtml("nl", "Sanne", evilBusiness, null, "d", "t", false);
  assert(!html.includes("<script>steal()</script>"), "live <script> leaked into the email HTML");
  assert(!subject.includes("<script>"), "live <script> leaked into the email subject");
  assertStringIncludes(html, "Evil&lt;/td&gt;&lt;/tr&gt;&lt;script&gt;steal()&lt;/script&gt;");
});

Deno.test("R18-2: service value is escaped", () => {
  const { html } = reminderHtml("nl", "Sanne", "Lorvello", "Cut & <b>Style</b>", "d", "t", false);
  assert(!html.includes("<b>Style</b>"), "live <b> tag leaked from the service value");
  assertStringIncludes(html, "Cut &amp; &lt;b&gt;Style&lt;/b&gt;");
});

Deno.test("R18-2: the quote characters are escaped (attribute-context safety)", () => {
  const { html } = reminderHtml("en", `A"B'C`, "Biz", null, "d", "t", false);
  assertStringIncludes(html, "A&quot;B&#39;C");
});

Deno.test("R18-2: a normal name with no special chars renders unchanged (no over-escaping)", () => {
  const { html } = reminderHtml("nl", "Sanne de Vries", "Lorvello", "Knipbeurt", "d", "t", false);
  assertStringIncludes(html, "Hoi Sanne de Vries,");
  assertStringIncludes(html, "Knipbeurt");
  assert(!html.includes("&amp;"), "a plain name/business/service must not introduce stray entities");
});

// Sanity: subjects are distinct between locales (used by the send path).
Deno.test("subjects differ between NL and EN", () => {
  const nl = reminderHtml("nl", "x", "B", null, "d", "t", false).subject;
  const en = reminderHtml("en", "x", "B", null, "d", "t", false).subject;
  assert(nl !== en);
  assertEquals(nl.startsWith("Herinnering"), true);
  assertEquals(en.startsWith("Reminder"), true);
});

// SEQP1R21 (finding R20-1, availability, sibling of R18-2/F4): a business_name containing a raw
// CRLF must never reach the subject string, since Resend rejects the ENTIRE send when the subject
// header contains a literal `\n` ("The `\n` is not allowed in the `subject` field"), silently
// zeroing out every reminder email for that tenant. Asserts both the CRLF itself and any other C0
// control byte are stripped from the subject (and the body), in both locales.
Deno.test("R20-1: a CRLF/control-char business_name cannot break the subject header", () => {
  const evilBusiness = "Evil\r\nBcc: victim@evil.com\r\nX-Injected: 1";
  const nl = reminderHtml("nl", "Sanne", evilBusiness, null, "d", "t", false);
  const en = reminderHtml("en", "Sanne", evilBusiness, null, "d", "t", false);
  for (const { subject, html } of [nl, en]) {
    assert(!subject.includes("\r"), "CR leaked into the subject");
    assert(!subject.includes("\n"), "LF leaked into the subject");
    assert(!html.includes("\r"), "CR leaked into the body");
    // eslint-disable-next-line no-control-regex
    assert(!/[\x00-\x1F\x7F]/.test(subject), "a control char leaked into the subject");
  }
  assertStringIncludes(nl.subject, "Herinnering: je afspraak bij EvilBcc: victim@evil.comX-Injected: 1");
  assertStringIncludes(en.subject, "Reminder: your appointment at EvilBcc: victim@evil.comX-Injected: 1");
});

// Anti-regression: a normal business_name (no control chars) must render an unchanged subject in
// both locales, i.e. the control-char strip must not touch legitimate whitespace/punctuation.
Deno.test("R20-1: a normal business_name renders an unchanged subject in NL and EN", () => {
  const nl = reminderHtml("nl", "Sanne", "Lorvello", null, "d", "t", false).subject;
  const en = reminderHtml("en", "Sanne", "Lorvello", null, "d", "t", false).subject;
  assertEquals(nl, "Herinnering: je afspraak bij Lorvello");
  assertEquals(en, "Reminder: your appointment at Lorvello");
});
