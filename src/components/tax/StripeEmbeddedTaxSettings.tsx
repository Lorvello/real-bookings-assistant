import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { useStripeAccountSession } from '@/hooks/useStripeAccountSession';
import '@/types/stripe-connect';

interface StripeEmbeddedTaxSettingsProps {
  fallbackData?: any;
  onFallback?: () => void;
}

export const StripeEmbeddedTaxSettings: React.FC<StripeEmbeddedTaxSettingsProps> = ({
  fallbackData,
  onFallback
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embeddedComponent, setEmbeddedComponent] = useState<any>(null);
  const [embeddedError, setEmbeddedError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const { sessionData, loading, error, refreshSession } = useStripeAccountSession({
    components: ['tax_settings']
  });

  useEffect(() => {
    if (!sessionData || !containerRef.current || useFallback) return;

    const initializeEmbedded = async () => {
      try {
        // Load Stripe.js if not already loaded
        if (!window.Stripe) {
          const script = document.createElement('script');
          script.src = 'https://js.stripe.com/v3/';
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }

        const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
        
        if (!stripe) {
          throw new Error('Failed to initialize Stripe');
        }

        // Create embedded tax settings component
        const component = stripe.connectEmbeddedComponents.create({
          clientSecret: sessionData.client_secret,
          fetchClientSecret: async () => {
            await refreshSession();
            return sessionData.client_secret;
          }
        });

        const taxSettings = component.create('tax_settings');
        
        // Clear container and mount
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await taxSettings.mount(containerRef.current);
          setEmbeddedComponent(taxSettings);
          setEmbeddedError(null);
        }

      } catch (err) {
        console.error('Failed to initialize embedded tax settings:', err);
        setEmbeddedError(err instanceof Error ? err.message : 'Unknown error');
        setUseFallback(true);
        onFallback?.();
      }
    };

    initializeEmbedded();

    return () => {
      if (embeddedComponent) {
        embeddedComponent.unmount();
      }
    };
  }, [sessionData, refreshSession, useFallback, onFallback]);

  const handleRetryEmbedded = () => {
    setUseFallback(false);
    setEmbeddedError(null);
    refreshSession();
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tax Settings
          </CardTitle>
          <CardDescription className="text-gray-400">
            Loading tax configuration...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || embeddedError) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tax Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error || embeddedError}
              {!useFallback && (
                <Button 
                  onClick={handleRetryEmbedded}
                  variant="outline" 
                  size="sm" 
                  className="ml-2"
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (useFallback) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Tax Settings (Read-only)
          </CardTitle>
          <CardDescription className="text-gray-400">
            Embedded component unavailable, showing read-only data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fallbackData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Origin Address</label>
                  <div className="text-white">
                    {fallbackData.taxSettings?.originAddress?.line1 || 'Not set'}
                    <br />
                    <span className="text-gray-400">
                      {fallbackData.taxSettings?.originAddress?.city} {fallbackData.taxSettings?.originAddress?.postal_code}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">Tax Behavior</label>
                  <div className="text-white capitalize">
                    {fallbackData.taxSettings?.defaultTaxBehavior || 'Not set'}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">No fallback data available</p>
            )}
            
            <Button 
              onClick={handleRetryEmbedded}
              variant="outline" 
              className="mt-4"
            >
              Try Loading Embedded Component Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tax Settings
        </CardTitle>
        <CardDescription className="text-gray-400">
          Configure your tax settings and origin address
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="min-h-[300px]"
          style={{
            '--stripe-color-background': '#1f2937',
            '--stripe-color-text': '#ffffff',
            '--stripe-color-text-secondary': '#9ca3af',
          } as React.CSSProperties}
        />
      </CardContent>
    </Card>
  );
};