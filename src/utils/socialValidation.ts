// Validation + normalization for the business website and social links.
// Goal: reject random text (e.g. "asdf"), accept and canonicalize real links/handles.

export interface FieldValidation {
  ok: boolean;
  /** The value to store (canonicalized) when ok; the raw value otherwise. */
  normalized: string;
  error?: string;
}

// A hostname like "example.com" / "sub.example.co.uk" — at least one dot + a 2+ char TLD.
const DOMAIN_RE = /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
// A plausible social handle.
const HANDLE_RE = /^[a-zA-Z0-9._-]{1,50}$/;

/** Website: optional. Must be a real domain; bare domains get https:// prepended. */
export function validateWebsite(raw?: string | null): FieldValidation {
  const value = (raw ?? '').trim();
  if (!value) return { ok: true, normalized: '' };

  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withProto);
    if (!DOMAIN_RE.test(u.hostname)) {
      return { ok: false, normalized: value, error: 'Enter a valid website, e.g. www.example.com' };
    }
    return { ok: true, normalized: withProto.replace(/\/+$/, '') };
  } catch {
    return { ok: false, normalized: value, error: 'Enter a valid website, e.g. www.example.com' };
  }
}

// A basic email shape: something@something.tld, no whitespace. Deliberately permissive
// (full RFC 5322 is overkill and rejects valid addresses); the goal is to catch obvious
// junk (no @, spaces, missing domain) before it is stored and shown by the agent.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Business email: optional. Trim; must look like an email. Stored as typed (trimmed). */
export function validateEmail(raw?: string | null): FieldValidation {
  const value = (raw ?? '').trim();
  if (!value) return { ok: true, normalized: '' };
  if (!EMAIL_RE.test(value)) {
    return { ok: false, normalized: value, error: 'Enter a valid email, e.g. name@yourbusiness.com' };
  }
  return { ok: true, normalized: value };
}

/**
 * Business phone: optional. Trim and collapse internal whitespace. Must be a plausible
 * phone (only +, digits, spaces, -, (), . and at least 7 digits). This is the field sent
 * to Stripe Connect as business_profile.support_phone, which Stripe rejects when malformed
 * (mirrors the website-field bug). Random text is rejected here too.
 */
export function validatePhone(raw?: string | null): FieldValidation {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return { ok: true, normalized: '' };
  const digits = (value.match(/\d/g) ?? []).length;
  // Only phone punctuation (+, digits, spaces, -, (), .) and at least 7 digits. Rejects
  // letters/junk but accepts "(020) 123-4567", "+31 6 12345678", "0612345678".
  if (!/^[+\d\s().-]+$/.test(value) || digits < 7) {
    return { ok: false, normalized: value, error: 'Enter a valid phone number, e.g. +31 6 12345678' };
  }
  return { ok: true, normalized: value };
}

export interface SocialPlatform {
  /** canonical domain, e.g. instagram.com */
  domain: string;
  /** human label, e.g. Instagram */
  label: string;
  /** example shown in errors/placeholder */
  example: string;
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  instagram: { domain: 'instagram.com', label: 'Instagram', example: '@yourhandle' },
  facebook: { domain: 'facebook.com', label: 'Facebook', example: 'facebook.com/yourpage' },
  linkedin: { domain: 'linkedin.com', label: 'LinkedIn', example: 'linkedin.com/company/yourco' },
  tiktok: { domain: 'tiktok.com', label: 'TikTok', example: '@yourhandle' },
  youtube: { domain: 'youtube.com', label: 'YouTube', example: 'youtube.com/@yourchannel' },
  x: { domain: 'x.com', label: 'X (Twitter)', example: '@yourhandle' },
};

/**
 * Social link: optional. Accepts "@handle", a bare handle, the platform URL, or a
 * full https URL — but only if it actually belongs to the platform. Rejects random
 * text. Returns a canonical https URL.
 */
export function validateSocial(platform: SocialPlatform, raw?: string | null): FieldValidation {
  const value = (raw ?? '').trim();
  if (!value) return { ok: true, normalized: '' };

  // @handle or a bare handle (no dot, no slash) → canonical profile URL.
  const handle = value.replace(/^@/, '');
  if (!value.includes('/') && !value.includes('.') && HANDLE_RE.test(handle)) {
    return { ok: true, normalized: `https://${platform.domain}/${handle}` };
  }

  // URL forms — must point at the platform's domain.
  const withProto = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    if (host === platform.domain || host.endsWith(`.${platform.domain}`)) {
      return { ok: true, normalized: withProto.replace(/\/+$/, '') };
    }
    return { ok: false, normalized: value, error: `Enter a valid ${platform.label} link or @handle (${platform.example})` };
  } catch {
    return { ok: false, normalized: value, error: `Enter a valid ${platform.label} link or @handle (${platform.example})` };
  }
}
