import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Globe, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeMode } from '@/utils/stripeConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TaxRegistration {
  id: string;
  country: string;
  country_options: any;
  active_from: number;
  expires_at: number | null;
  livemode: boolean;
  status: string;
  type: string;
}

interface TaxRegistrationsProps {
  accountId?: string;
}

export const TaxRegistrations: React.FC<TaxRegistrationsProps> = ({ accountId }) => {
  const [registrations, setRegistrations] = useState<TaxRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { toast } = useToast();

  const loadRegistrations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-tax-registrations', {
        body: { test_mode: getStripeMode() === 'test' }
      });

      if (error) throw error;

      if (data.success) {
        setRegistrations(data.registrations || []);
        setLastUpdated(new Date(data.lastUpdated));
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load tax registrations",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to load tax registrations:', error);
      toast({
        title: "Error",
        description: "Failed to load tax registrations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRegistrations();
    setRefreshing(false);
    toast({
      title: "Success",
      description: "Tax registrations refreshed successfully"
    });
  };

  useEffect(() => {
    if (accountId) {
      loadRegistrations();
    }
  }, [accountId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'pending': return 'bg-amber-500';
      case 'expired': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'expired': return 'destructive';
      default: return 'outline';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (!accountId) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to view tax registrations.
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
              <Globe className="w-5 h-5" />
              Tax Registrations
            </CardTitle>
            <CardDescription>
              Active tax registrations across jurisdictions
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
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-8">
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-lg mb-2">No Tax Registrations</h3>
            <p className="text-muted-foreground text-sm">
              No active tax registrations found for your account. Tax registrations are managed automatically based on your business activity.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <div
                key={registration.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 rounded-full mt-1 ${getStatusColor(registration.status)}`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{registration.country.toUpperCase()}</h4>
                      <Badge variant={getStatusVariant(registration.status)}>
                        {registration.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {registration.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Active from: {formatDate(registration.active_from)}</span>
                      </div>
                      {registration.expires_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Expires: {formatDate(registration.expires_at)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};