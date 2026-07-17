import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildContactEmail,
  contactSubmissionSchema,
} from "./contactSubmission.ts";

const submissionId = "05e2d9bb-aac4-4d2f-a0e4-4325be1f1fc1";

Deno.test("general contact submission is normalized and accepted", () => {
  const result = contactSubmissionSchema.safeParse({
    submissionId,
    formType: "general",
    name: "  Ada Lovelace  ",
    email: "  ADA@EXAMPLE.COM ",
    company: "",
    country: "nl",
    subject: "sales",
    budget: "",
    message: "  Please tell me more about the product.  ",
    requestMeeting: false,
    meetingDate: null,
    meetingTime: "",
  });

  assert(result.success);
  if (result.data.formType !== "general") {
    throw new Error("Expected a general contact submission");
  }
  assertEquals(result.data.name, "Ada Lovelace");
  assertEquals(result.data.email, "ada@example.com");
  assertEquals(result.data.company, undefined);
  assertEquals(result.data.budget, undefined);
});

Deno.test("meeting requests require both a date and a time", () => {
  const result = contactSubmissionSchema.safeParse({
    submissionId,
    formType: "general",
    name: "Ada Lovelace",
    email: "ada@example.com",
    country: "nl",
    subject: "demo",
    message: "I would like to book a product demonstration.",
    requestMeeting: true,
    meetingDate: "2026-07-20",
  });

  assertEquals(result.success, false);
});

Deno.test("enterprise contact supports its complete payload and an empty optional message", () => {
  const result = contactSubmissionSchema.safeParse({
    submissionId,
    formType: "enterprise",
    name: "Ada Lovelace",
    email: "ada@example.com",
    company: "Analytical Engines",
    companyWebsite: "https://example.com",
    phone: "+31 6 12345678",
    companySize: "51-200",
    selectedFeatures: [
      "Complete professional suite included",
      "Enterprise SLA with dedicated success management",
    ],
    message: "",
    requestMeeting: true,
  });

  assert(result.success);
  assertEquals(result.data.message, undefined);
});

Deno.test("unknown payload keys are rejected", () => {
  const result = contactSubmissionSchema.safeParse({
    submissionId,
    formType: "general",
    name: "Ada Lovelace",
    email: "ada@example.com",
    country: "nl",
    subject: "sales",
    message: "Please tell me more about the product.",
    requestMeeting: false,
    isAdmin: true,
  });

  assertEquals(result.success, false);
});

Deno.test("email output escapes user-controlled HTML and strips header newlines", () => {
  const result = contactSubmissionSchema.safeParse({
    submissionId,
    formType: "enterprise",
    name: "<img src=x onerror=alert(1)>",
    email: "ada@example.com",
    company: "Example\r\nBcc: attacker@example.com",
    companyWebsite: "https://example.com",
    companySize: "1-10",
    selectedFeatures: ["Complete professional suite included"],
    message: "<script>alert('xss')</script>",
    requestMeeting: false,
  });

  assert(result.success);
  const email = buildContactEmail(result.data);
  assert(!email.subject.includes("\r"));
  assert(!email.subject.includes("\n"));
  assertStringIncludes(email.html, "&lt;img src=x onerror=alert(1)&gt;");
  assertStringIncludes(
    email.html,
    "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;",
  );
  assert(!email.html.includes("<script>"));
});
