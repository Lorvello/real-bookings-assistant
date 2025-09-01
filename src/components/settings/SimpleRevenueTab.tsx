import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Euro, 
  TrendingUp, 
  Calendar,
  FileBarChart,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RevenueData {
  totalRevenue: number;
  totalTax: number;
  currency: string;
  serviceBreakdown: {
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    revenue: number;
    taxCollected: number;
    price: number;
    taxRate: number;
  }[];
  monthlyTrends: {
    month: string;
    revenue: number;
    taxCollected: number;
    bookings: number;
  }[];
}

export function SimpleRevenueTab() {
  const { selectedCalendar } = useCalendarContext();
  const { toast } = useToast();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (selectedCalendar?.id) {
      loadRevenueData();
    }
  }, [selectedCalendar?.id]);

  const loadRevenueData = async () => {
    if (!selectedCalendar?.id) return;
    
    setLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('revenue-analytics', {
        body: { 
          calendar_id: selectedCalendar.id,
          period: 'current_month'
        }
      });

      if (error) throw error;
      setData(response);
    } catch (error) {
      console.error('Error loading revenue data:', error);
      toast({
        title: "Unable to load revenue data",
        description: "Please try refreshing or contact support if the problem persists.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRevenueData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    const symbol = data?.currency === 'EUR' ? '€' : data?.currency === 'USD' ? '$' : '£';
    return `${symbol}${amount.toFixed(2)}`;
  };

  const exportTaxReport = async () => {
    try {
      const { data: reportData, error } = await supabase.functions.invoke('export-tax-report', {
        body: { 
          calendar_id: selectedCalendar?.id,
          format: 'csv'
        }
      });

      if (error) throw error;

      // Create and download CSV file
      const blob = new Blob([reportData.csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Tax report exported",
        description: "Your tax report has been downloaded successfully."
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export tax report. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading revenue data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!selectedCalendar) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Calendar Selected</h3>
          <p className="text-gray-400">Please select a calendar to view revenue data.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Euro className="w-6 h-6" />
            Monthly Revenue Overview
          </h2>
          <p className="text-gray-400 mt-1">
            Your revenue and tax collected this month
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={exportTaxReport}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-700"
          >
            <FileBarChart className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">This Month's Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400 mb-2">
              {formatCurrency(data?.totalRevenue || 0)}
            </div>
            <p className="text-gray-400 text-sm">
              Total revenue from completed bookings
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white">Tax Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {formatCurrency(data?.totalTax || 0)}
            </div>
            <p className="text-gray-400 text-sm">
              VAT/tax included in your revenue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Breakdown */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">Revenue by Service</CardTitle>
          <p className="text-gray-400 text-sm">
            Performance breakdown of your services this month
          </p>
        </CardHeader>
        <CardContent>
          {data?.serviceBreakdown && data.serviceBreakdown.length > 0 ? (
            <div className="space-y-4">
              {data.serviceBreakdown.map((service) => (
                <div key={service.serviceId} className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-white font-medium">{service.serviceName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {formatCurrency(service.price)} incl. tax
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-400">
                      {service.bookingCount} bookings • {service.taxRate.toFixed(1)}% tax rate
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {formatCurrency(service.revenue)}
                    </div>
                    <div className="text-sm text-blue-400">
                      {formatCurrency(service.taxCollected)} tax
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Revenue This Month</h3>
              <p className="text-gray-400">
                You haven't had any completed bookings this month yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Trends */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Monthly Trends
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Revenue performance over the last 6 months
          </p>
        </CardHeader>
        <CardContent>
          {data?.monthlyTrends && data.monthlyTrends.length > 0 ? (
            <div className="space-y-3">
              {data.monthlyTrends.map((month) => (
                <div key={month.month} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-white font-medium w-20">{month.month}</div>
                    <div className="text-sm text-gray-400">
                      {month.bookings} bookings
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-semibold">
                      {formatCurrency(month.revenue)}
                    </div>
                    <div className="text-xs text-blue-400">
                      {formatCurrency(month.taxCollected)} tax
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">
              No historical data available yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}