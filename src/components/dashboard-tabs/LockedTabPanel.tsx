import React from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, ArrowUp, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LockedTabPanelProps {
  /** The Pro feature being gated, e.g. "Business Intelligence". */
  feature: string;
  /** One-line benefit description shown under the title. */
  description: string;
  /** 2–3 short "what you unlock" benefits (kept calm — no green-check spam). */
  bullets?: string[];
  /** Label for the primary CTA (defaults to "Upgrade to Pro"). */
  ctaText?: string;
  /** Optional feature icon (the same lucide icon used in the tab trigger). */
  icon?: LucideIcon;
  onUpgrade: () => void;
}

/**
 * In-flow premium upsell for a Pro-gated dashboard tab.
 *
 * Replaces the old AccessBlockedOverlay screen-cover (a `fixed inset-0 bg-black/60
 * z-50` modal that blacked out the whole app when a trial user clicked a Pro tab,
 * with only browser-back to escape). This is an honest in-tab panel: a soft,
 * blurred faux-analytics backdrop signals "there's premium content behind this
 * lock" without claiming fake numbers, with a single clear Upgrade CTA. Calm,
 * on-brand, and the conversion driver stays reachable (the old toast-only path
 * hid it). See launch-ready-loop R20.
 */
export function LockedTabPanel({
  feature,
  description,
  bullets,
  ctaText,
  icon: Icon = Lock,
  onUpgrade,
}: LockedTabPanelProps) {
  const { t } = useTranslation('dashboard');
  return (
    <div className="relative isolate overflow-hidden rounded-xl">
      {/* Blurred faux-analytics backdrop — atmosphere only, never read as data.
          Decorative bars + a hairline baseline, heavily blurred and masked so it
          dissolves toward the upsell card. aria-hidden + pointer-events-none. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-[6px] opacity-[0.35]"
        style={{
          maskImage: 'radial-gradient(120% 90% at 50% 18%, #000 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 18%, #000 30%, transparent 75%)',
        }}
      >
        <div className="flex h-full items-end justify-center gap-3 px-10 pb-10">
          {[38, 62, 50, 78, 44, 70, 56, 84].map((h, i) => (
            <div
              key={i}
              className="w-6 rounded-t-md bg-gradient-to-t from-primary/15 to-primary/45"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center px-6 py-12 text-center md:py-16">
        {/* lock tile with a soft accent halo */}
        <div className="glow-accent relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <Icon className="h-6 w-6 text-accent-foreground" aria-hidden />
        </div>

        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-gold-foreground ring-1 ring-gold/20">
          <Lock className="h-3 w-3" aria-hidden /> {t('dashboard.locked.proFeature', 'Pro feature')}
        </span>

        <h3 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{feature}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>

        {bullets && bullets.length > 0 && (
          <ul className="mt-5 flex flex-col items-start gap-2 text-left">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-subtle-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden />
                {b}
              </li>
            ))}
          </ul>
        )}

        <Button onClick={onUpgrade} className="mt-7 gap-2">
          <ArrowUp className="h-4 w-4" aria-hidden />
          {ctaText ?? t('dashboard.locked.cta', 'Upgrade to Pro')}
        </Button>
      </div>
    </div>
  );
}
