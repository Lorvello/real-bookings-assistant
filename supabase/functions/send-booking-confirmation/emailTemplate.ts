export type BookingEmailLocale = "nl" | "en";

export interface BookingConfirmationEmailInput {
  locale: BookingEmailLocale;
  customerName: string | null;
  businessName: string | null;
  serviceName: string | null;
  startTime: string;
  timezone: string | null;
  address: string | null;
}

export interface BookingConfirmationEmail {
  fromName: string;
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
    .replaceAll("'", "&#39;");
}

export function sanitizeHeaderText(value: string): string {
  return value
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function safeTimezone(value: string | null): string {
  const timezone = value || "Europe/Amsterdam";
  try {
    new Intl.DateTimeFormat("nl-NL", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "Europe/Amsterdam";
  }
}

function formatDateTime(
  iso: string,
  timezone: string | null,
  locale: BookingEmailLocale,
): { date: string; time: string } {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) {
    throw new Error("BOOKING_CONFIRMATION_START_TIME_INVALID");
  }
  const timeZone = safeTimezone(timezone);
  const intlLocale = locale === "en" ? "en-GB" : "nl-NL";
  return {
    date: new Intl.DateTimeFormat(intlLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone,
    }).format(instant),
    time: new Intl.DateTimeFormat(intlLocale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(instant),
  };
}

export function buildBookingConfirmationEmail(
  input: BookingConfirmationEmailInput,
): BookingConfirmationEmail {
  const businessName = sanitizeHeaderText(input.businessName || "") ||
    (input.locale === "en" ? "Our business" : "Onze zaak");
  const customerName = input.customerName?.trim() ||
    (input.locale === "en" ? "there" : "daar");
  const { date, time } = formatDateTime(
    input.startTime,
    input.timezone,
    input.locale,
  );
  const serviceName = input.serviceName?.trim() || null;
  const address = input.address?.trim().replace(/^,\s*|\s*,\s*$/g, "") || null;

  const copy = input.locale === "en"
    ? {
      subject: `Appointment confirmation at ${businessName}`,
      title: "Appointment confirmed",
      hello: `Hi ${customerName},`,
      intro: "Your appointment is confirmed. Here are the details:",
      service: "Service",
      date: "Date",
      time: "Time",
      location: "Location",
      cancel:
        `Can’t make it? Contact ${businessName} in time to cancel or reschedule.`,
      footer: `This confirmation was sent on behalf of ${businessName}.`,
    }
    : {
      subject: `Bevestiging van je afspraak bij ${businessName}`,
      title: "Afspraak bevestigd",
      hello: `Hoi ${customerName},`,
      intro: "Je afspraak is bevestigd. Hier zijn de details:",
      service: "Dienst",
      date: "Datum",
      time: "Tijd",
      location: "Locatie",
      cancel:
        `Kun je niet? Neem dan tijdig contact op met ${businessName} om te annuleren of te verzetten.`,
      footer: `Deze bevestiging is verstuurd namens ${businessName}.`,
    };

  const row = (label: string, value: string) =>
    `<tr><td style="padding:8px 0;color:#6b7280;">${
      escapeHtml(label)
    }</td><td style="padding:8px 0;font-weight:600;text-align:right;">${
      escapeHtml(value)
    }</td></tr>`;

  const html = `
<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:36px 30px;text-align:center;">
        <h1 style="margin:0;font-size:26px;">${escapeHtml(copy.title)} ✅</h1>
        <p style="margin:8px 0 0;opacity:.9;">${escapeHtml(businessName)}</p>
      </div>
      <div style="padding:32px 30px;color:#111827;">
        <p>${escapeHtml(copy.hello)}</p>
        <p>${escapeHtml(copy.intro)}</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          ${serviceName ? row(copy.service, serviceName) : ""}
          ${row(copy.date, date)}
          ${row(copy.time, time)}
          ${address ? row(copy.location, address) : ""}
        </table>
        <p style="color:#6b7280;font-size:14px;">${escapeHtml(copy.cancel)}</p>
      </div>
      <div style="background:#f8fafc;padding:24px 30px;text-align:center;color:#9ca3af;font-size:13px;">
        <p style="margin:0;">${escapeHtml(copy.footer)}</p>
      </div>
    </div>
  </body>
</html>`.trim();

  const details = [
    serviceName ? `${copy.service}: ${serviceName}` : null,
    `${copy.date}: ${date}`,
    `${copy.time}: ${time}`,
    address ? `${copy.location}: ${address}` : null,
  ].filter(Boolean).join("\n");
  const text = [
    copy.hello,
    "",
    copy.intro,
    details,
    "",
    copy.cancel,
    "",
    copy.footer,
  ].join("\n");

  return {
    fromName: businessName,
    subject: copy.subject,
    html,
    text,
  };
}
