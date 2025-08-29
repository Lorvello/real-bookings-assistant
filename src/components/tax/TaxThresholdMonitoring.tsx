import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { getStripePublishableKey } from '@/utils/stripeConfig';

interface TaxThresholdMonitoringProps {
  accountId?: string;
  useMockData?: boolean;
}

export const TaxThresholdMonitoring: React.FC<TaxThresholdMonitoringProps> = ({ 
  accountId,
  useMockData = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { createEmbeddedSession } = useStripeConnect();

  const loadThresholdComponent = async () => {
    if (!mountRef.current || (!accountId && !useMockData)) return;

    if (useMockData) {
      // Show mock data for development
      mountRef.current.innerHTML = `
        <div class="space-y-4">
          <div class="p-4 bg-muted/50 rounded-lg border">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-bold">⚠</span>
              </div>
              <div>
                <h4 class="font-medium">Threshold Monitoring Active</h4>
                <p class="text-sm text-muted-foreground">Mock Mode - Development Only</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="p-3 bg-background rounded border">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium">Netherlands (VAT)</span>
                  <span class="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">Safe</span>
                </div>
                <div class="text-xs text-muted-foreground">
                  <p>Current: €2,450 / €10,000 threshold</p>
                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="bg-emerald-500 h-2 rounded-full" style="width: 24.5%"></div>
                  </div>
                </div>
              </div>
              <div class="p-3 bg-background rounded border">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-sm font-medium">Germany (VAT)</span>
                  <span class="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">Watch</span>
                </div>
                <div class="text-xs text-muted-foreground">
                  <p>Current: €8,200 / €10,000 threshold</p>
                  <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div class="bg-amber-500 h-2 rounded-full" style="width: 82%"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      setComponentLoaded(true);
      setLastUpdated(new Date());
      return;
    }

    try {
      setLoading(true);
      
      // Try to load the Stripe embedded component
      const session = await createEmbeddedSession();
      
      // For now, show placeholder until Stripe Tax embedded components are available
      if (session && window.Stripe) {
        // Fallback to placeholder
        mountRef.current.innerHTML = `
          <div class="p-6 bg-muted/50 rounded-lg border border-dashed">
            <div class="text-center">
              <div class="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="text-amber-500 text-xl">⚠</span>
              </div>
              <h4 class="font-medium mb-2">Threshold Monitoring</h4>
              <p class="text-sm text-muted-foreground mb-4">
                Tax threshold monitoring is not yet available for your account type.
              </p>
              <p class="text-xs text-muted-foreground">
                This feature will be automatically enabled when you approach tax registration thresholds.
              </p>
            </div>
          </div>
        `;
        setComponentLoaded(true);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load threshold monitoring:', error);
      mountRef.current.innerHTML = `
        <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p class="text-red-200 text-sm">Failed to load threshold monitoring component.</p>
        </div>
      `;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setComponentLoaded(false);
    setLoading(true);
    await loadThresholdComponent();
  };

  useEffect(() => {
    if (accountId || useMockData) {
      loadThresholdComponent();
    }
  }, [accountId, useMockData]);

  if (!accountId && !useMockData) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to enable threshold monitoring.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tax Threshold Monitoring
            </CardTitle>
            <CardDescription>
              Automatic monitoring of tax registration thresholds
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !componentLoaded ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ) : (
          <div ref={mountRef} className="w-full" />
        )}
      </CardContent>
    </Card>
  );
};