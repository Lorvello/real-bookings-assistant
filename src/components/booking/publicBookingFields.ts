import { z } from 'zod';

/**
 * Cross-border / OSS VAT (target X3a). Shared helpers for the public customer booking
 * form's two new fields: customer COUNTRY (ISO-3166 alpha-2) and an optional EU B2B
 * VAT-ID.
 *
 * SCOPE / SECURITY: these are CLIENT-side format/UX helpers only. The authoritative tax
 * decision is Stripe's: the create-booking-payment edge fn threads country + vat_id into
 * the Stripe Tax Calculation API, which is the only thing that decides the rate /
 * reverse-charge. A customer-supplied country/vat_id can ONLY influence the
 * Stripe-bounded tax figure + reporting columns, never the destination account, platform
 * fee, charge mode, or base amount (all pinned server-side from the booking row). So the
 * validation here is deliberately lenient (basic format), not a tax authority: a bogus
 * VAT-ID is rejected by Stripe (no reverse-charge), and a missing country for a remote
 * service is rejected server-side too. We validate format purely so the customer gets a
 * clean inline error instead of a server round-trip.
 */

export type SupplyType = 'in_person' | 'remote_service' | 'digital';

/** A remote/digital service needs the customer country to compute cross-border VAT;
 * an in_person service is taxed where performed (domestic) and does not. */
export function isRemoteSupply(supplyType: string | null | undefined): boolean {
  return supplyType === 'remote_service' || supplyType === 'digital';
}

export interface CountryOption {
  code: string; // ISO-3166 alpha-2
  name: string; // English display name (i18n region-name applied at render time)
  flag: string;
}

/**
 * ISO-3166 alpha-2 country list for the booking-form country selector. Sourced from the
 * same set the existing CountryPhoneInput uses (kept as a focused, self-contained list so
 * X3a does not refactor the phone input). Sorted by English name; the UI can localize the
 * label via Intl.DisplayNames. EU members carry the VAT context the cross-border path
 * cares about, but the list is intentionally global (a customer may sit outside the EU).
 */
export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫' },
  { code: 'DZ', name: 'Algeria', flag: '🇩🇿' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
  { code: 'CY', name: 'Cyprus', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'EE', name: 'Estonia', flag: '🇪🇪' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷' },
  { code: 'HU', name: 'Hungary', flag: '🇭🇺' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
  { code: 'LV', name: 'Latvia', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧' },
  { code: 'LT', name: 'Lithuania', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', flag: '🇱🇺' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', flag: '🇲🇻' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
  { code: 'RO', name: 'Romania', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'SK', name: 'Slovakia', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', flag: '🇸🇮' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'TN', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
];

/** Fast lookup for validating a submitted country code is one we offer. */
const VALID_COUNTRY_CODES = new Set(COUNTRY_OPTIONS.map((c) => c.code));

export function isValidCountryCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && VALID_COUNTRY_CODES.has(code.trim().toUpperCase());
}

/**
 * EU VAT-ID basic FORMAT check (UX only). An EU VAT number is a 2-letter country prefix
 * followed by 2..12 alphanumerics (Stripe's eu_vat). We accept optional spaces/dots the
 * customer might type and strip them before the test. This is NOT VIES validation and not
 * authoritative: Stripe does the real format + (optionally) VIES check. We only gate
 * obviously-malformed input so the customer sees a clean inline hint. An empty value is
 * VALID here (the field is optional).
 *
 * Note GB is included in the pattern (legacy GB VAT numbers still appear); Stripe decides
 * whether to honor it. We do not encode any VAT rule (purely a character-shape gate).
 */
const EU_VAT_FORMAT = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

/** Normalize a user-typed VAT-ID: trim, uppercase, strip spaces/dots/hyphens. */
export function normalizeVatId(raw: string | null | undefined): string {
  return (raw ?? '').toUpperCase().replace(/[\s.\-]/g, '');
}

/** True when the (optional) VAT-ID is empty OR matches the basic EU format. */
export function isValidVatIdFormat(raw: string | null | undefined): boolean {
  const v = normalizeVatId(raw);
  if (v.length === 0) return true; // optional
  return EU_VAT_FORMAT.test(v);
}

/**
 * Zod schema for the two new public-booking fields. `supplyType` drives whether country
 * is required. Used to validate before calling createBooking (a parse failure yields the
 * inline error key). Country is uppercased + checked against the offered list; vatId is
 * normalized and format-checked only when non-empty.
 */
export const publicBookingTaxFieldsSchema = z
  .object({
    supplyType: z.string().optional(),
    customerCountry: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .or(z.literal(''))
      .optional(),
    customerVatId: z
      .string()
      .transform((v) => normalizeVatId(v))
      .optional(),
  })
  .superRefine((data, ctx) => {
    const remote = isRemoteSupply(data.supplyType);
    const country = (data.customerCountry ?? '').toUpperCase();
    if (remote && country.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerCountry'],
        message: 'country_required_remote',
      });
    } else if (country.length > 0 && !isValidCountryCode(country)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerCountry'],
        message: 'country_invalid',
      });
    }
    if (!isValidVatIdFormat(data.customerVatId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerVatId'],
        message: 'vat_id_invalid_format',
      });
    }
  });

export type PublicBookingTaxFields = z.infer<typeof publicBookingTaxFieldsSchema>;
