// E-4: pure presentation layer for the reminder engine. Split out of index.ts so it can be
// unit-tested without importing the function's top-level serve() side effect. The NL/EN
// branch is keyed off the booking locale (bookings.customer_locale, normalised to nl|en by
// the RPC), so an NL booking gets an NL body and an EN booking gets an EN body.

const MAANDEN = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
const DAGEN = ["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_EN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export type ReminderLocale = "nl" | "en";

export function formatDate(iso: string, locale: ReminderLocale, tz = "Europe/Amsterdam"): { datum: string; tijd: string } {
  try {
    const d = new Date(iso);
    const tijd = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(d);
    const datum = locale === "en"
      ? `${DAYS_EN[d.getDay()]} ${d.getDate()} ${MONTHS_EN[d.getMonth()]} ${d.getFullYear()}`
      : `${DAGEN[d.getDay()]} ${d.getDate()} ${MAANDEN[d.getMonth()]} ${d.getFullYear()}`;
    return { datum, tijd };
  } catch {
    return { datum: iso, tijd: "" };
  }
}

export function reminderHtml(locale: ReminderLocale, name: string, business: string, service: string | null, datum: string, tijd: string, second: boolean): { subject: string; html: string } {
  const t = locale === "en"
    ? {
        kop: second ? "See you soon!" : "Reminder for your appointment",
        greet: `Hi ${name || "there"},`,
        intro: "This is a reminder for your upcoming appointment:",
        service: "Service", date: "Date", time: "Time",
        cant: `Can't make it? Please contact ${business} in time to cancel or reschedule.`,
        sentBy: `This reminder was sent on behalf of ${business}.`,
        subject: `Reminder: your appointment at ${business}`,
      }
    : {
        kop: second ? "Tot zo!" : "Herinnering aan je afspraak",
        greet: `Hoi ${name || "daar"},`,
        intro: "Dit is een herinnering aan je aankomende afspraak:",
        service: "Dienst", date: "Datum", time: "Tijd",
        cant: `Kun je niet? Neem dan tijdig contact op met ${business} om te annuleren of te verzetten.`,
        sentBy: `Deze herinnering is verstuurd namens ${business}.`,
        subject: `Herinnering: je afspraak bij ${business}`,
      };
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f8fafc;">
    <div style="max-width:600px;margin:0 auto;background:#fff;">
      <div style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:36px 30px;text-align:center;">
        <h1 style="margin:0;font-size:24px;">${t.kop} ⏰</h1>
        <p style="margin:8px 0 0;opacity:.9;">${business}</p>
      </div>
      <div style="padding:32px 30px;color:#111827;">
        <p>${t.greet}</p>
        <p>${t.intro}</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          ${service ? `<tr><td style="padding:8px 0;color:#6b7280;">${t.service}</td><td style="padding:8px 0;font-weight:600;text-align:right;">${service}</td></tr>` : ""}
          <tr><td style="padding:8px 0;color:#6b7280;">${t.date}</td><td style="padding:8px 0;font-weight:600;text-align:right;">${datum}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;">${t.time}</td><td style="padding:8px 0;font-weight:600;text-align:right;">${tijd}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:14px;">${t.cant}</p>
      </div>
      <div style="background:#f8fafc;padding:24px 30px;text-align:center;color:#9ca3af;font-size:13px;">
        <p style="margin:0;">${t.sentBy}</p>
      </div>
    </div>
  </body></html>`;
  return { subject: t.subject, html };
}
