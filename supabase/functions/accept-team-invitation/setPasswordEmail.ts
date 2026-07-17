import { escapeHtml } from "../send-team-invitation/invitationDelivery.ts";

export function buildSetPasswordEmail(
  fullName: unknown,
  email: string,
  actionLink: string,
): string {
  const parsedLink = new URL(actionLink);
  if (parsedLink.protocol !== "https:" && parsedLink.protocol !== "http:") {
    throw new Error("SET_PASSWORD_LINK_PROTOCOL_INVALID");
  }
  const rawName = typeof fullName === "string" && fullName.trim()
    ? fullName.trim()
    : email.split("@")[0];
  const safeName = escapeHtml(rawName || "there");
  const safeLink = escapeHtml(parsedLink.toString());

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;color:#111827">
      <h2 style="color:#111827">You're in! 🎉</h2>
      <p>Hi ${safeName}, your team access is set up. Choose a password to log in:</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${safeLink}" style="display:inline-block;background:#1A7F4D;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">Set my password</a>
      </p>
      <p style="color:#6B7280;font-size:13px">If the button doesn't work, copy this link into your browser:<br><a href="${safeLink}" style="color:#1A7F4D;word-break:break-all">${safeLink}</a></p>
    </div>`;
}
