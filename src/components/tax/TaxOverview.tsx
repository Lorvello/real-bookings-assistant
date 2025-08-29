import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, Building2, MapPin, Shield, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode } from '@/utils/stripeConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxSettings {
  originAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  defaultTaxBehavior: 'inclusive' | 'exclusive';
  pricesIncludeTax: boolean;
  presetProductTaxCode: string;
  automaticTax: {
    checkout: { enabled: boolean; status: string };
    invoices: { enabled: boolean; status: string };
  };
}

interface TaxOverviewProps {
  accountId?: string;
  useMockData?: boolean;
}

export const TaxOverview: React.FC<TaxOverviewProps> = ({ accountId, useMockData = false }) => {
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadTaxSettings = async () => {
    if (useMockData) {
      // Mock data for development
      setTaxSettings({
        originAddress: {
          line1: "123 Business Street",
          city: "Amsterdam",
          state: "NH",
          postal_code: "1017 AB",
          country: "NL"
        },
        defaultTaxBehavior: 'exclusive',
        pricesIncludeTax: false,
        presetProductTaxCode: 'txcd_10000000',
        automaticTax: {
          checkout: { enabled: true, status: 'active' },
          invoices: { enabled: true, status: 'active' }
        }
      });
      setLastUpdated(new Date());
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-tax-settings', {
        body: { test_mode: getStripeMode() === 'test' }
      });

      if (error) throw error;

      if (data.success) {
        setTaxSettings(data.taxSettings);
        setLastUpdated(new Date(data.lastUpdated));
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load tax settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load tax settings:', error);
      toast({
        title: "Error",
        description: "Failed to load tax settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTaxSettings();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Tax settings refreshed successfully"
    });
  };

  useEffect(() => {
    if (accountId || useMockData) {
      loadTaxSettings();
    }
  }, [accountId, useMockData]);

  if (!accountId && !useMockData) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to view tax settings.
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
              <Building2 className="w-5 h-5" />
              Tax Settings Overview
            </CardTitle>
            <CardDescription>
              Current tax configuration and compliance status
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
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="animate-pulse space-y-3">
              <div className="h-20 bg-muted rounded-lg"></div>
              <div className="h-16 bg-muted rounded-lg"></div>
              <div className="h-16 bg-muted rounded-lg"></div>
            </div>
          </div>
        ) : taxSettings ? (
          <div className="space-y-6">
            {/* Origin Address */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4" />
                <h4 className="font-medium">Business Address</h4>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>{taxSettings.originAddress.line1}</p>
                {taxSettings.originAddress.line2 && <p>{taxSettings.originAddress.line2}</p>}
                <p>
                  {taxSettings.originAddress.city}, {taxSettings.originAddress.state} {taxSettings.originAddress.postal_code}
                </p>
                <p>{taxSettings.originAddress.country}</p>
              </div>
            </div>

            {/* Tax Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Tax Behavior</span>
                  <Badge variant="outline">
                    {taxSettings.defaultTaxBehavior}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {taxSettings.defaultTaxBehavior === 'inclusive' 
                    ? 'Tax is included in listed prices' 
                    : 'Tax is added to listed prices'}
                </p>
              </div>

              <div className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Product Tax Code</span>
                  <Badge variant="outline" className="text-xs">
                    {taxSettings.presetProductTaxCode}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default tax classification for products
                </p>
              </div>
            </div>

            {/* Automatic Tax */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4" />
                <h4 className="font-medium">Automatic Tax Collection</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Checkout</p>
                    <p className="text-xs text-muted-foreground">Tax calculation at checkout</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={taxSettings.automaticTax.checkout.enabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {taxSettings.automaticTax.checkout.status}
                    </Badge>
                    <Switch 
                      checked={taxSettings.automaticTax.checkout.enabled}
                      disabled
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Invoices</p>
                    <p className="text-xs text-muted-foreground">Tax calculation for invoices</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={taxSettings.automaticTax.invoices.enabled ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {taxSettings.automaticTax.invoices.status}
                    </Badge>
                    <Switch 
                      checked={taxSettings.automaticTax.invoices.enabled}
                      disabled
                    />
                  </div>
                </div>
              </div>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Tax settings are managed automatically for Express accounts. Changes to tax configuration are handled through your Stripe onboarding.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Tax Settings</h3>
            <p className="text-muted-foreground text-sm">
              Unable to load tax settings. Please ensure your Stripe account is properly configured.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};