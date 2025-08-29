import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, RefreshCw, AlertCircle, Plus } from 'lucide-react';
import { useStripeAccountSession } from '@/hooks/useStripeAccountSession';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import '@/types/stripe-connect.d.ts';

interface StripeEmbeddedTaxRegistrationsProps {
  fallbackData?: {
    taxRegistrations?: Array<{
      country: string;
      type: string;
      status: 'active' | 'inactive' | 'pending';
      active_from: number;
    }>;
  };
}

export const StripeEmbeddedTaxRegistrations: React.FC<StripeEmbeddedTaxRegistrationsProps> = ({
  fallbackData
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [embeddedComponent, setEmbeddedComponent] = useState<any>(null);
  const [embeddedError, setEmbeddedError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const { sessionData, loading, error, refreshSession } = useStripeAccountSession({
    components: ['tax_registrations']
  });

  useEffect(() => {
    // Don't initialize if we're in an error state or loading or no session data
    if (!sessionData || !containerRef.current || useFallback || loading || error) return;

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

        const { getStripePublishableKey } = await import('@/utils/stripeConfig');
        const stripe = window.Stripe(getStripePublishableKey());
        
        if (!stripe) {
          throw new Error('Failed to initialize Stripe');
        }

        console.log('[TAX-REGISTRATIONS] Creating embedded component with session:', sessionData.session_id);

        // Create embedded tax registrations component
        const component = stripe.connectEmbeddedComponents.create({
          clientSecret: sessionData.client_secret,
          fetchClientSecret: async () => {
            console.log('[TAX-REGISTRATIONS] Refreshing client secret...');
            await refreshSession();
            return sessionData.client_secret;
          }
        });

        const taxRegistrations = component.create('tax_registrations');
        
        // Clear container and mount
        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          await taxRegistrations.mount(containerRef.current);
          setEmbeddedComponent(taxRegistrations);
          setEmbeddedError(null);
          console.log('[TAX-REGISTRATIONS] Component mounted successfully');
        }

      } catch (err) {
        console.error('[TAX-REGISTRATIONS] Failed to initialize embedded component:', err);
        setEmbeddedError(err instanceof Error ? err.message : 'Unknown error');
        setUseFallback(true);
      }
    };

    initializeEmbedded();

    return () => {
      if (embeddedComponent) {
        console.log('[TAX-REGISTRATIONS] Unmounting component');
        embeddedComponent.unmount();
      }
    };
  }, [sessionData, refreshSession, useFallback, loading, error]);

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
            <FileText className="w-5 h-5" />
            Tax Registrations
          </CardTitle>
          <CardDescription className="text-gray-400">
            Loading tax registrations...
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
            <FileText className="w-5 h-5" />
            Tax Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">
              {error || embeddedError}
              <Button 
                onClick={handleRetryEmbedded}
                variant="outline" 
                size="sm" 
                className="ml-2"
              >
                Retry
              </Button>
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
            <FileText className="w-5 h-5" />
            Tax Registrations (Read-only)
          </CardTitle>
          <CardDescription className="text-gray-400">
            Embedded component unavailable, showing read-only data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fallbackData?.taxRegistrations && fallbackData.taxRegistrations.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Location</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Effective Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fallbackData.taxRegistrations.map((registration, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-white">{registration.country}</TableCell>
                      <TableCell className="text-gray-300 uppercase">{registration.type}</TableCell>
                      <TableCell>
                        <Badge 
                          className={
                            registration.status === 'active' 
                              ? 'bg-green-500/10 text-green-400 border-green-500/20'
                              : registration.status === 'pending'
                              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                              : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                          }
                        >
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(registration.active_from * 1000).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <Button 
                onClick={handleRetryEmbedded}
                variant="outline" 
                className="mt-4"
              >
                Try Loading Embedded Component Again
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4 py-8">
              <p className="text-gray-400">No tax registrations found</p>
              <Button 
                onClick={handleRetryEmbedded}
                variant="outline"
              >
                Try Loading Embedded Component Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Tax Registrations
        </CardTitle>
        <CardDescription className="text-gray-400">
          Manage your tax registrations across jurisdictions
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