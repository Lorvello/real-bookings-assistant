import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ThresholdMonitoringDashboardProps {
  accountId?: string;
  calendarId?: string;
}

interface ThresholdData {
  country: string;
  revenue: number;
  threshold: number;
  percentage: number;
  status: 'under' | 'near' | 'exceeded';
  currency: string;
}

const COUNTRY_NAMES: { [key: string]: string } = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'DE': 'Germany',
  'FR': 'France',
  'ES': 'Spain',
  'IT': 'Italy',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'AT': 'Austria',
  'SE': 'Sweden',
  'DK': 'Denmark',
  'FI': 'Finland',
  'NO': 'Norway',
  'CH': 'Switzerland',
  'AU': 'Australia',
  'CA': 'Canada',
  'SG': 'Singapore',
  'MY': 'Malaysia',
};

export const ThresholdMonitoringDashboard: React.FC<ThresholdMonitoringDashboardProps> = ({
  accountId,
  calendarId
}) => {
  const { toast } = useToast();

  const { data: thresholdData, isLoading, refetch } = useQuery({
    queryKey: ['tax-thresholds', accountId, calendarId],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-tax-thresholds', {
        body: {
          calendar_id: calendarId,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Tax threshold data has been updated"
    });
  };

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount / 100); // Convert from cents
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceeded':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      case 'near':
        return <TrendingUp className="w-4 h-4 text-warning" />;
      case 'under':
        return <CheckCircle className="w-4 h-4 text-success" />;
      default:
        return <CheckCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'destructive';
      case 'near':
        return 'warning';
      case 'under':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'Threshold Exceeded';
      case 'near':
        return 'Near Threshold';
      case 'under':
        return 'Under Threshold';
      default:
        return 'Unknown';
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'exceeded':
        return 'bg-destructive';
      case 'near':
        return 'bg-warning';
      case 'under':
        return 'bg-success';
      default:
        return 'bg-muted-foreground';
    }
  };

  const thresholds: ThresholdData[] = thresholdData?.thresholds || [];

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to monitor tax thresholds</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tax Threshold Monitoring
            </CardTitle>
            <CardDescription>
              Track revenue against tax registration thresholds by country
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : thresholds.length > 0 ? (
          <div className="space-y-4">
            {thresholds.map((threshold, index) => {
              const countryName = COUNTRY_NAMES[threshold.country] || threshold.country;
              
              return (
                <div 
                  key={index}
                  className="p-4 bg-card rounded-lg border"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(threshold.status)}
                      <div>
                        <h3 className="font-medium">{countryName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(threshold.revenue, threshold.currency)} of {formatCurrency(threshold.threshold, threshold.currency)} threshold
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(threshold.status) as any}>
                      {getStatusText(threshold.status)}
                    </Badge>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Revenue Progress</span>
                      <span>{threshold.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className={`rounded-full h-3 transition-all duration-300 ${getProgressBarColor(threshold.status)}`}
                        style={{ width: `${Math.min(threshold.percentage, 100)}%` }}
                      />
                    </div>
                    
                    {threshold.status === 'exceeded' && (
                      <p className="text-sm text-destructive mt-2">
                        ⚠️ You may need to register for tax collection in {countryName}
                      </p>
                    )}
                    
                    {threshold.status === 'near' && (
                      <p className="text-sm text-warning mt-2">
                        📈 Approaching tax threshold - consider preparing for registration
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(thresholdData?.lastUpdated || '').toLocaleString('nl-NL')}
              </div>
              {thresholdData?.note && (
                <div className="text-sm text-muted-foreground text-center mt-1">
                  {thresholdData.note}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No threshold data available yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start collecting revenue to monitor tax thresholds
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};