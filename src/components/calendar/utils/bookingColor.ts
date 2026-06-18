import type { CSSProperties } from 'react';

/**
 * Canonical event-chip colour treatment for the calendar.
 *
 * Previously every booking chip used the raw `service_types.color` as a full
 * background with fixed white (`text-foreground`) text — for a light service
 * colour that text fails WCAG contrast. The premium + accessible treatment
 * (R19) keeps the colour identity but as a Linear/Stripe-style *accent*: a
 * coloured left bar + a low-alpha tint over the dark surface, so the text always
 * sits on a near-card background and `text-foreground` stays readable.
 *
 * `color-mix` handles any input format (hex, hsl(), CSS var) uniformly, so the
 * old `'#3B82F6'` / `hsl(var(--primary))` fallbacks all work.
 */
export function resolveBookingColor(color?: string | null): string {
  const c = color?.trim();
  return c && c.length > 0 ? c : 'hsl(var(--primary))';
}

/** Solid swatch (dots, legends). */
export function bookingDotStyle(color?: string | null): CSSProperties {
  return { backgroundColor: resolveBookingColor(color) };
}

/**
 * Accent-chip style: subtle tinted fill + coloured left bar. Pair with
 * `text-foreground` content — contrast holds for any service colour.
 */
export function bookingChipStyle(color?: string | null, tintPercent = 16): CSSProperties {
  const accent = resolveBookingColor(color);
  return {
    backgroundColor: `color-mix(in srgb, ${accent} ${tintPercent}%, transparent)`,
    borderLeftColor: accent,
  };
}
