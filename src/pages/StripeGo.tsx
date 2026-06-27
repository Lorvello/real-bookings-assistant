import React from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getStripeMode } from '@/utils/stripeConfig';

// Simple utility route that performs a top-level redirect to Stripe dashboard
// This helps bypass popup blockers and iframe restrictions
const StripeGo: React.FC = () => {
  const { t } = useTranslation('common');
  const [error, setError] = React.useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const test_mode = getStripeMode() === 'test';
        console.log('[StripeGo] Requesting login link with test_mode:', test_mode);
        const { data, error } = await supabase.functions.invoke('stripe-connect-login', {
          body: { test_mode },
        });
        if (error) throw new Error(error.message || 'Failed to get login link');
        if (!data?.url) throw new Error('No login URL received');

        const url: string = data.url;
        console.log('[StripeGo] Redirecting top-level to Stripe:', url);
        if (cancelled) return;
        // Force top-level navigation
        if (window.top && window.top !== window) {
          window.top.location.assign(url);
        } else {
          window.location.assign(url);
        }
      } catch (e: any) {
        console.error('[StripeGo] Error:', e);
        if (!cancelled) {
          setError(e?.message || t('stripeRedirect.couldNotRedirect', 'Could not redirect to Stripe'));
          // Try to fetch a fallback URL once more
          try {
            const { data } = await supabase.functions.invoke('stripe-connect-login', {
              body: { test_mode: getStripeMode() === 'test' },
            });
            if (data?.url) setFallbackUrl(data.url);
          } catch {}
        }
      }
    };

    document.title = t('stripeRedirect.docTitle', 'Stripe Dashboard Redirect');
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md w-full text-center">
        {!error ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-semibold mb-2">{t('stripeRedirect.redirecting', 'Redirecting to Stripe…')}</h1>
            <p className="text-sm text-muted-foreground">{t('stripeRedirect.pleaseWait', 'Please wait. You can close this window once Stripe opens.')}</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold mb-2">{t('stripeRedirect.blockedTitle', 'Direct redirect blocked')}</h1>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            {fallbackUrl && (
              <a
                href={fallbackUrl}
                target="_self"
                rel="noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 rounded-md border"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('stripeRedirect.openNow', 'Open Stripe now')}
              </a>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default StripeGo;
