import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, BarChart3, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ServiceBreakdownProps {
  accountId?: string;
  calendarId?: string;
  quarter: number;
  year: number;
}

interface ServiceData {
  name: string;
  revenue: number;
  bookingCount: number;
  percentage: number;
}

export const ServiceBreakdown: React.FC<ServiceBreakdownProps> = ({ 
  accountId, 
  calendarId,
  quarter,
  year
}) => {
  const { toast } = useToast();

  const { data: taxData, isLoading, refetch } = useQuery({
    queryKey: ['service-breakdown', accountId, calendarId, quarter, year],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-tax-data', {
        body: {
          calendar_id: calendarId,
          quarter,
          year,
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
      description: "Service breakdown data has been updated"
    });
  };

  const serviceBreakdown: ServiceData[] = taxData?.serviceBreakdown || [];

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to view service breakdown</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getQuarterName = (quarter: number) => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    return quarters[quarter - 1] || 'Q1';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-5 h-5 text-primary" />
              Service Breakdown
            </CardTitle>
            <CardDescription>
              Revenue performance by service type for {getQuarterName(quarter)} {year}
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
              <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : serviceBreakdown.length > 0 ? (
          <div className="space-y-4">
            {serviceBreakdown.map((service, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 bg-card rounded-lg border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium">{service.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {service.bookingCount} bookings • {service.percentage}% of total
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary rounded-full h-2 transition-all duration-300"
                        style={{ width: `${service.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t">
              <div className="text-sm text-muted-foreground text-center">
                Last updated: {new Date(taxData?.lastUpdated || '').toLocaleString('nl-NL')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No service data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};