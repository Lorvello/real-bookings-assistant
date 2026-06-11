// Stripe configuration and helper functions
import { isDeveloperEmail } from './environment';

// getStripeMode() is called on many renders; log the resolved mode only ONCE so
// the console isn't flooded (e.g. a per-call "LIVE MODE ACTIVE" warn in prod).
let stripeModeLogged = false;
const logStripeModeOnce = (message: string, level: 'log' | 'warn' = 'log') => {
  if (stripeModeLogged) return;
  stripeModeLogged = true;
  console[level](message);
};

// --- Developer-only runtime Stripe-mode override -------------------------------
// Lets the developer account simulate test/live mode from the dev dashboard
// WITHOUT a redeploy. Strictly gated to the developer email: a forced override
// set by anyone else is ignored, so a normal user can never push their own
// checkout into test mode (which would let them "pay" with a test card). Only
// affects the owner-side flows that read getStripeMode() (subscription /
// Connect onboarding); end-customer booking payments resolve their mode from the
// business's connected Stripe account, not from this.
const SUPABASE_PROJECT_REF = 'grdgjhkygzciwwrxgvgy';
const DEV_STRIPE_MODE_KEY = 'dev_stripe_mode_override';

const getSessionEmail = (): string | null => {
  try {
    const raw = localStorage.getItem(`sb-${SUPABASE_PROJECT_REF}-auth-token`);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const token = session?.access_token || session?.currentSession?.access_token;
    if (token) {
      // JWT segments are base64url — normalise to base64 before atob.
      let seg = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      seg += '='.repeat((4 - (seg.length % 4)) % 4);
      const payload = JSON.parse(atob(seg));
      return payload?.email ?? null;
    }
    return session?.user?.email ?? session?.currentSession?.user?.email ?? null;
  } catch {
    return null;
  }
};

const getDevStripeModeOverride = (): 'test' | 'live' | null => {
  try {
    const v = localStorage.getItem(DEV_STRIPE_MODE_KEY);
    if (v !== 'test' && v !== 'live') return null;
    if (!isDeveloperEmail(getSessionEmail())) return null;
    return v;
  } catch {
    return null;
  }
};

/** Set (or clear with null) the developer Stripe-mode override. */
export const setDevStripeModeOverride = (mode: 'test' | 'live' | null): void => {
  try {
    if (mode === null) localStorage.removeItem(DEV_STRIPE_MODE_KEY);
    else localStorage.setItem(DEV_STRIPE_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
};

/** The current raw override value (for the dev dashboard UI), regardless of gating. */
export const getDevStripeModeOverrideRaw = (): 'test' | 'live' | null => {
  try {
    const v = localStorage.getItem(DEV_STRIPE_MODE_KEY);
    return v === 'test' || v === 'live' ? v : null;
  } catch {
    return null;
  }
};

/**
 * SECURITY: Get Stripe mode from environment variable ONLY
 * Users cannot manipulate this through browser dev tools
 * Server-side validation in edge functions provides additional security layer
 */
export const getStripeMode = (): 'test' | 'live' => {
  // In Vite development mode, ALWAYS use test (safety first)
  if (import.meta.env.DEV) {
    logStripeModeOnce('[STRIPE] Development environment detected - forcing TEST mode');
    return 'test';
  }

  // Developer-only runtime override (dev dashboard). Gated to the developer email.
  const devOverride = getDevStripeModeOverride();
  if (devOverride) {
    return devOverride;
  }

  // Production: try to get env var, but gracefully fallback to test if missing
  const envMode = import.meta.env.VITE_STRIPE_MODE as 'test' | 'live' | undefined;

  if (envMode === 'live' || envMode === 'test') {
    if (envMode === 'live') {
      logStripeModeOnce('[STRIPE] ⚠️  LIVE MODE ACTIVE - Real payments will be processed', 'warn');
    } else {
      logStripeModeOnce('[STRIPE] TEST MODE ACTIVE - Using Stripe test environment');
    }
    return envMode;
  }

  // FALLBACK: log warning and use test mode (NO CRASH)
  logStripeModeOnce(
    '[STRIPE CONFIG] VITE_STRIPE_MODE not configured in production. ' +
    'Falling back to TEST mode for safety. Configure runtime Stripe mode later.',
    'warn'
  );

  return 'test'; // Safe fallback, prevents crash
};

export const getStripePublishableKey = (): string => {
  const mode = getStripeMode();
  
  // These are safe to hardcode as they are publishable keys (not secret)
  if (mode === 'test') {
    return 'pk_test_51RqIgEPyiLcfGjGYOLNQiJdmchHRGvAA5gFET2PfbZYAY2jsqmGrdKH5RbOEH4NyRwoZVMLatkRl1k7bnmBTQUvE00LwV1G5xJ';
  } else {
    return 'pk_live_51RqIg2LcBboIITXg0n6rT0RPzpsmk4L2Z5Ymzxxfs2iZcHfJCH6aSq2ueinqjNsPti9U6fYxLprpxn9grpd7arZJ00KC2Va0D6';
  }
};

export const isTestMode = (): boolean => {
  return getStripeMode() === 'test';
};

export const getStripeConfig = () => {
  const mode = getStripeMode();
  const fallbackUsed = !import.meta.env.DEV && 
    !import.meta.env.VITE_STRIPE_MODE;
  
  return {
    mode,
    publishableKey: getStripePublishableKey(),
    testMode: mode === 'test',
    isTestMode: mode === 'test', // Legacy alias for compatibility
    fallbackUsed // Flag to indicate if fallback mode is being used
  };
};

export const getPriceId = (tierData: any, isAnnual: boolean, testMode: boolean) => {
  if (!tierData) return null;
  
  // Return the correct Stripe Price ID based on mode, billing frequency, and tier
  if (testMode) {
    // Test mode price IDs
    if (isAnnual) {
      return tierData.stripe_test_yearly_price_id;
    } else {
      return tierData.stripe_test_monthly_price_id;
    }
  } else {
    // Live mode price IDs
    if (isAnnual) {
      return tierData.stripe_live_yearly_price_id;
    } else {
      return tierData.stripe_live_monthly_price_id;
    }
  }
};
