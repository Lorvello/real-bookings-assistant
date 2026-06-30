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

Deno.test("empty name falls back per locale", () => {
  assertStringIncludes(reminderHtml("nl", "", "B", null, "d", "t", false).html, "Hoi daar,");
  assertStringIncludes(reminderHtml("en", "", "B", null, "d", "t", false).html, "Hi there,");
});

Deno.test("service row is omitted when service is null and present otherwise", () => {
  assert(!reminderHtml("nl", "x", "B", null, "d", "t", false).html.includes(">Dienst<"));
  assertStringIncludes(reminderHtml("nl", "x", "B", "Knipbeurt", "d", "t", false).html, "Knipbeurt");
});

// Sanity: subjects are distinct between locales (used by the send path).
Deno.test("subjects differ between NL and EN", () => {
  const nl = reminderHtml("nl", "x", "B", null, "d", "t", false).subject;
  const en = reminderHtml("en", "x", "B", null, "d", "t", false).subject;
  assert(nl !== en);
  assertEquals(nl.startsWith("Herinnering"), true);
  assertEquals(en.startsWith("Reminder"), true);
});
