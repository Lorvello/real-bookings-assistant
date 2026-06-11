import React from 'react';
import { CreditCard, RotateCcw } from 'lucide-react';
import {
  getStripeMode,
  setDevStripeModeOverride,
  getDevStripeModeOverrideRaw,
} from '@/utils/stripeConfig';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';

/**
 * Developer-only Stripe mode control. Lets the developer simulate test/live mode
 * at runtime (gated to the developer account in getStripeMode). Switching reloads
 * so every consumer re-reads the mode cleanly. End-customer payments are
 * unaffected — they resolve mode from the business's connected Stripe account.
 */
export const StripeModeIndicator = () => {
  const { isDeveloper } = useDeveloperAccess();
  if (!isDeveloper) return null;

  const mode = getStripeMode();
  const override = getDevStripeModeOverrideRaw();
  const isLive = mode === 'live';

  const apply = (next: 'test' | 'live' | null) => {
    setDevStripeModeOverride(next);
    window.location.reload();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          <CreditCard className="h-3.5 w-3.5" /> Stripe Mode
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isLive ? 'bg-red-500/15 text-red-400' : 'bg-primary/15 text-primary'
          }`}
        >
          {isLive ? '🔴 LIVE' : '🟢 TEST'}
        </span>
      </div>

      {/* Segmented toggle */}
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
        <button
          onClick={() => apply('test')}
          className={`rounded-md py-1.5 text-sm font-medium transition ${
            mode === 'test' ? 'bg-primary text-primary-foreground' : 'text-white/60 hover:text-white'
          }`}
        >
          Test
        </button>
        <button
          onClick={() => apply('live')}
          className={`rounded-md py-1.5 text-sm font-medium transition ${
            mode === 'live' ? 'bg-red-500 text-white' : 'text-white/60 hover:text-white'
          }`}
        >
          Live
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-white/40">
        <span>
          {override
            ? 'Simulated (developer override)'
            : 'Default (VITE_STRIPE_MODE env)'}
        </span>
        {override && (
          <button
            onClick={() => apply(null)}
            className="inline-flex items-center gap-1 text-white/50 transition hover:text-white"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {isLive && (
        <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1.5 text-xs text-red-400">
          ⚠️ Live mode — real payments are processed. Use Test to simulate safely.
        </p>
      )}
    </div>
  );
};
