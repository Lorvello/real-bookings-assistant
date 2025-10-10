/**
 * Server-side Stripe mode validation and security utilities
 * CRITICAL: These functions provide server-side validation that cannot be bypassed by client manipulation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface StripeModeValidation {
  isValid: boolean;
  mode: 'test' | 'live';
  error?: string;
}

/**
 * Validate and get Stripe mode on server-side
 * This prevents client-side manipulation of payment mode
 */
export function validateStripeMode(requestedMode?: 'test' | 'live'): StripeModeValidation {
  // Get mode from environment (only source of truth on server)
  const envMode = Deno.env.get('STRIPE_MODE') as 'test' | 'live' | undefined;
  
  // Default to test for safety
  const actualMode: 'test' | 'live' = envMode === 'live' ? 'live' : 'test';
  
  // If client requested a specific mode, validate it matches server config
  if (requestedMode && requestedMode !== actualMode) {
    return {
      isValid: false,
      mode: actualMode,
      error: `Mode mismatch: client requested ${requestedMode} but server is configured for ${actualMode}`
    };
  }
  
  return {
    isValid: true,
    mode: actualMode
  };
}

/**
 * Get the correct Stripe secret key based on validated mode
 */
export function getStripeSecretKey(mode: 'test' | 'live'): string | null {
  const key = mode === 'test' 
    ? Deno.env.get('STRIPE_SECRET_KEY_TEST')
    : Deno.env.get('STRIPE_SECRET_KEY_LIVE');
  
  return key || null;
}

/**
 * Log mode switches and security events to Supabase
 */
export async function logStripeModeEvent(
  supabaseUrl: string,
  supabaseKey: string,
  eventType: 'mode_check' | 'mode_mismatch' | 'key_missing',
  details: Record<string, any>
) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('webhook_security_logs')
      .insert({
        event_type: `stripe_${eventType}`,
        severity: eventType === 'mode_mismatch' ? 'high' : 'info',
        event_data: {
          ...details,
          timestamp: new Date().toISOString()
        }
      });
  } catch (error) {
    console.error('[STRIPE-SECURITY] Failed to log event:', error);
  }
}

/**
 * Validate Stripe configuration before any payment operation
 * Returns validated config or throws error
 */
export async function validateStripeConfig(
  requestedMode: 'test' | 'live' | undefined,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ mode: 'test' | 'live'; secretKey: string }> {
  // Validate mode
  const modeValidation = validateStripeMode(requestedMode);
  
  if (!modeValidation.isValid) {
    await logStripeModeEvent(supabaseUrl, supabaseKey, 'mode_mismatch', {
      requested: requestedMode,
      actual: modeValidation.mode,
      error: modeValidation.error
    });
    
    throw new Error(modeValidation.error);
  }
  
  // Get secret key
  const secretKey = getStripeSecretKey(modeValidation.mode);
  
  if (!secretKey) {
    await logStripeModeEvent(supabaseUrl, supabaseKey, 'key_missing', {
      mode: modeValidation.mode
    });
    
    throw new Error(`Missing Stripe secret key for ${modeValidation.mode} mode`);
  }
  
  // Log successful validation
  await logStripeModeEvent(supabaseUrl, supabaseKey, 'mode_check', {
    mode: modeValidation.mode,
    requested: requestedMode
  });
  
  return {
    mode: modeValidation.mode,
    secretKey
  };
}
