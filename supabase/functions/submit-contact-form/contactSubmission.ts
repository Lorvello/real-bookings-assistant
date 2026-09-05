import { z } from "npm:zod@3.23.8";

const countrySchema = z.enum([
  "nl",
  "be",
  "de",
  "uk",
  "us",
  "fr",
  "es",
  "it",
  "other",
]);

const subjectSchema = z.enum([
  "general",
  "sales",
  "partnership",
  "support",
  "demo",
]);

const budgetSchema = z.enum([
  "exploring",
  "starter",
  "professional",
  "enterprise",
]);

const companySizeSchema = z.enum(["1-10", "11-50", "51-200", "200+"]);

const enterpriseFeatureSchema = z.enum([
  "Complete professional suite included",
  "Unlimited enterprise user access management",
  "Dedicated WhatsApp Business API with custom branding",
  "Intelligent voice call routing & distribution",
  "Omnichannel social media DM orchestration",
  "Advanced reputation management & review analytics",
  "Enterprise SLA with dedicated success management",
  "White-glove onboarding & strategic integration consulting",
]);

const trimmedRequired = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

const optionalTrimmed = (maximum: number) =>
  z.string().trim().max(maximum).optional().transform((value) =>
    value || undefined
  );

const emailSchema = z.string().trim().email().max(254).transform((value) =>
  value.toLowerCase()
);

const generalSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  formType: z.literal("general"),
  name: trimmedRequired(2, 100),
  email: emailSchema,
  company: optionalTrimmed(200),
  country: countrySchema,
  subject: subjectSchema,
  budget: z.union([budgetSchema, z.literal("")]).optional().transform((value) =>
    value || undefined
  ),
  message: trimmedRequired(10, 2000),
  requestMeeting: z.boolean().default(false),
  meetingDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional()
    .transform((value) => value || undefined),
  meetingTime: z
    .union([z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/), z.literal("")])
    .optional()
    .transform((value) => value || undefined),
}).strict();

const enterpriseSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  formType: z.literal("enterprise"),
  name: trimmedRequired(2, 100),
  email: emailSchema,
  company: trimmedRequired(2, 200),
  companyWebsite: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "https:" || protocol === "http:";
      } catch {
        return false;
      }
    }, "Company website must use HTTP or HTTPS"),
  phone: optionalTrimmed(30),
  companySize: companySizeSchema,
  selectedFeatures: z.array(enterpriseFeatureSchema).min(1).max(8)
    .refine(
      (features) => new Set(features).size === features.length,
      "Features must be unique",
    ),
  message: optionalTrimmed(2000),
  requestMeeting: z.boolean().default(true),
}).strict();

export const contactSubmissionSchema = z
  .discriminatedUnion("formType", [
    generalSubmissionSchema,
    enterpriseSubmissionSchema,
  ])
  .superRefine((submission, context) => {
    if (
      submission.formType === "general" &&
      submission.requestMeeting &&
      (!submission.meetingDate || !submission.meetingTime)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meetingDate"],
        message:
          "Meeting date and time are required when a meeting is requested",
      });
    }
  });

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>;

export interface ContactEmailContent {
  submissionId: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}

function safeHeaderText(value: string): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\r\n\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function htmlRow(label: string, value: string | boolean | undefined): string {
  if (value === undefined || value === "") return "";
  const displayValue = typeof value === "boolean"
    ? (value ? "Yes" : "No")
    : value;
  return `<tr><th align="left" valign="top">${escapeHtml(label)}</th><td>${
    escapeHtml(displayValue).replaceAll("\n", "<br>")
  }</td></tr>`;
}

function textLine(
  label: string,
  value: string | boolean | undefined,
): string | null {
  if (value === undefined || value === "") return null;
  const displayValue = typeof value === "boolean"
    ? (value ? "Yes" : "No")
    : value;
  return `${label}: ${displayValue}`;
}

export function buildContactEmail(
  submission: ContactSubmission,
): ContactEmailContent {
  const commonRows = [
    htmlRow("Submission ID", submission.submissionId),
    htmlRow("Name", submission.name),
    htmlRow("Email", submission.email),
    htmlRow("Company", submission.company),
    htmlRow("Meeting requested", submission.requestMeeting),
  ];
  const commonLines = [
    textLine("Submission ID", submission.submissionId),
    textLine("Name", submission.name),
    textLine("Email", submission.email),
    textLine("Company", submission.company),
    textLine("Meeting requested", submission.requestMeeting),
  ];

  if (submission.formType === "enterprise") {
    const rows = [
      ...commonRows,
      htmlRow("Company website", submission.companyWebsite),
      htmlRow("Phone", submission.phone),
      htmlRow("Company size", submission.companySize),
      htmlRow("Selected features", submission.selectedFeatures.join("\n")),
      htmlRow("Message", submission.message),
    ];
    const lines = [
      ...commonLines,
      textLine("Company website", submission.companyWebsite),
      textLine("Phone", submission.phone),
      textLine("Company size", submission.companySize),
      textLine("Selected features", submission.selectedFeatures.join(", ")),
      textLine("Message", submission.message),
    ].filter((line): line is string => line !== null);

    return {
      submissionId: submission.submissionId,
      replyTo: submission.email,
      subject: safeHeaderText(`Enterprise contact: ${submission.company}`),
      html: `<h1>New enterprise contact submission</h1><table>${
        rows.join("")
      }</table>`,
      text: ["New enterprise contact submission", "", ...lines].join("\n"),
    };
  }

  const rows = [
    ...commonRows,
    htmlRow("Country", submission.country),
    htmlRow("Subject", submission.subject),
    htmlRow("Budget", submission.budget),
    htmlRow("Message", submission.message),
    htmlRow("Meeting date", submission.meetingDate),
    htmlRow("Meeting time", submission.meetingTime),
  ];
  const lines = [
    ...commonLines,
    textLine("Country", submission.country),
    textLine("Subject", submission.subject),
    textLine("Budget", submission.budget),
    textLine("Message", submission.message),
    textLine("Meeting date", submission.meetingDate),
    textLine("Meeting time", submission.meetingTime),
  ].filter((line): line is string => line !== null);

  return {
    submissionId: submission.submissionId,
    replyTo: submission.email,
    subject: safeHeaderText(`Contact form: ${submission.subject}`),
    html: `<h1>New contact submission</h1><table>${rows.join("")}</table>`,
    text: ["New contact submission", "", ...lines].join("\n"),
  };
}
