import {
  assert,
  assertEquals,
  assertFalse,
  assertStringIncludes,
} from "jsr:@std/assert@1.0.19";
import {
  buildBookingConfirmationEmail,
  escapeHtml,
  sanitizeHeaderText,
} from "./emailTemplate.ts";

Deno.test("HTML and mail headers escape owner and customer content", () => {
  const email = buildBookingConfirmationEmail({
    locale: "nl",
    customerName: '<img src=x onerror="alert(1)">',
    businessName: "Studio\r\nBcc: attacker@example.com<script>",
    serviceName: "<b>Knippen</b>",
    startTime: "2026-07-20T12:00:00.000Z",
    timezone: "Europe/Amsterdam",
    address: "<iframe>straat 1</iframe>",
  });

  assertFalse(email.html.includes("<script>"));
  assertFalse(email.html.includes("<iframe>"));
  assertFalse(email.html.includes("<img src=x"));
  assertFalse(email.subject.includes("\n"));
  assertFalse(email.fromName.includes("<"));
  assertStringIncludes(email.html, "&lt;b&gt;Knippen&lt;/b&gt;");
});

Deno.test("English locale produces English copy", () => {
  const email = buildBookingConfirmationEmail({
    locale: "en",
    customerName: "Alex",
    businessName: "Studio",
    serviceName: "Consultation",
    startTime: "2026-07-20T12:00:00.000Z",
    timezone: "Europe/Amsterdam",
    address: "Main Street 1",
  });
  assertStringIncludes(email.subject, "Appointment confirmation");
  assertStringIncludes(email.text, "Your appointment is confirmed");
});

Deno.test("escaping and header sanitizing are deterministic", () => {
  assertEquals(
    escapeHtml(`<&>"'`),
    "&lt;&amp;&gt;&quot;&#39;",
  );
  assertEquals(sanitizeHeaderText("A\r\nB <C>"), "A B C");
  assert(sanitizeHeaderText("x".repeat(200)).length <= 120);
});
