import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, CalendarDays, TrendingUp, Calculator, DollarSign } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuarterlyTaxSummaryProps {
  accountId?: string;
  calendarId?: string;
}

interface QuarterlyData {
  quarter: number;
  year: number;
  grossRevenue: number;
  vatCollected: number;
  netRevenue: number;
  averageBooking: number;
  totalBookings: number;
  vatRate: number;
  period: {
    start: string;
    end: string;
  };
}

export const QuarterlyTaxSummary: React.FC<QuarterlyTaxSummaryProps> = ({ 
  accountId, 
  calendarId 
}) => {
  const { toast } = useToast();
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: taxData, isLoading, refetch } = useQuery({
    queryKey: ['quarterly-tax-summary', accountId, calendarId, selectedQuarter, selectedYear],
    queryFn: async () => {
      if (!accountId) return null;

      const { data, error } = await supabase.functions.invoke('get-tax-data', {
        body: {
          calendar_id: calendarId,
          quarter: selectedQuarter,
          year: selectedYear,
          test_mode: true
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshed",
      description: "Tax summary data has been updated"
    });
  };

  const quarterlyOverview: QuarterlyData | null = taxData?.quarterlyOverview || null;

  if (!accountId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Connect your Stripe account to view tax summary</p>
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
              <Calculator className="w-5 h-5 text-primary" />
              Quarterly Tax Summary
            </CardTitle>
            <CardDescription>
              Revenue and VAT overview for your selected quarter
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedQuarter.toString()}
              onValueChange={(value) => setSelectedQuarter(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : quarterlyOverview ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Gross Revenue</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(quarterlyOverview.grossRevenue)}</p>
              </div>
              
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <Calculator className="w-4 h-4 text-chart-1" />
                  <span className="text-sm font-medium text-muted-foreground">VAT Collected</span>
                </div>
                <p className="text-2xl font-bold text-chart-1">{formatCurrency(quarterlyOverview.vatCollected)}</p>
              </div>
              
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-chart-2" />
                  <span className="text-sm font-medium text-muted-foreground">Net Revenue</span>
                </div>
                <p className="text-2xl font-bold text-chart-2">{formatCurrency(quarterlyOverview.netRevenue)}</p>
              </div>
              
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-4 h-4 text-chart-3" />
                  <span className="text-sm font-medium text-muted-foreground">Avg. Booking</span>
                </div>
                <p className="text-2xl font-bold text-chart-3">{formatCurrency(quarterlyOverview.averageBooking)}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {getQuarterName(quarterlyOverview.quarter)} {quarterlyOverview.year} • {quarterlyOverview.totalBookings} bookings • VAT rate: {quarterlyOverview.vatRate}%
              </div>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date(taxData?.lastUpdated || '').toLocaleString('nl-NL')}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No tax data available for the selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};