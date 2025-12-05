import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  DollarSign, 
  Receipt, 
  BarChart3,
  Calendar,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TaxAnalyticsData {
  overview: {
    total_tax_collected: number;
    total_revenue: number;
    tax_rate: number;
    currency: string;
    collection_period: string;
    business_country: string;
  };
  monthly_trends: Array<{
    month: string;
    revenue: number;
    tax_collected: number;
    bookings: number;
  }>;
  service_performance: Array<{
    service_name: string;
    total_bookings: number;
    total_revenue: number;
    tax_collected: number;
    tax_rate: number;
    avg_revenue_per_booking: number;
  }>;
  compliance_status: {
    tax_collection_active: boolean;
    services_configured: number;
    registrations_active: number;
    stripe_connected: boolean;
  };
}

interface TaxAnalyticsDashboardProps {
  calendarId: string;
  accountId?: string;
}

export const TaxAnalyticsDashboard: React.FC<TaxAnalyticsDashboardProps> = ({ 
  calendarId, 
  accountId 
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const { data: analytics, isLoading, error, refetch } = useQuery({
    queryKey: ['tax-analytics', calendarId, dateRange],
    queryFn: async (): Promise<TaxAnalyticsData> => {
      const { data, error } = await supabase.functions.invoke('get-tax-analytics', {
        body: {
          calendar_id: calendarId,
          start_date: dateRange.start_date,
          end_date: dateRange.end_date
        }
      });

      if (error) {
        console.error('Tax analytics error:', error);
        throw error;
      }

      return data.data;
    },
    enabled: !!calendarId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: { [key: string]: string } = {
      'NL': '🇳🇱',
      'DE': '🇩🇪',
      'FR': '🇫🇷',
      'ES': '🇪🇸',
      'IT': '🇮🇹',
      'BE': '🇧🇪',
      'AT': '🇦🇹',
      'US': '🇺🇸',
      'GB': '🇬🇧',
      'CA': '🇨🇦'
    };
    return flags[countryCode] || '🌍';
  };

  const getTaxSystemName = (countryCode: string) => {
    const taxSystems: { [key: string]: string } = {
      'NL': 'VAT (BTW)',
      'DE': 'VAT (MwSt)',
      'FR': 'VAT (TVA)',
      'ES': 'VAT (IVA)',
      'IT': 'VAT (IVA)',
      'BE': 'VAT (BTW)',
      'AT': 'VAT (USt)',
      'US': 'Sales Tax',
      'GB': 'VAT',
      'CA': 'GST/HST'
    };
    return taxSystems[countryCode] || 'Tax';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tax analytics...</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Failed to load tax analytics</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Tax Analytics
            <span className="text-lg font-normal text-muted-foreground">
              {getCountryFlag(analytics.overview.business_country)}
            </span>
          </h2>
          <p className="text-muted-foreground">
            {getTaxSystemName(analytics.overview.business_country)} collection for {analytics.overview.collection_period}
          </p>
        </div>
        
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.start_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
            className="px-3 py-2 border border-border rounded-md text-sm"
          />
          <input
            type="date"
            value={dateRange.end_date}
            onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
            className="px-3 py-2 border border-border rounded-md text-sm"
          />
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(analytics.overview.total_tax_collected, analytics.overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg rate: {analytics.overview.tax_rate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.overview.total_revenue, analytics.overview.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              From tax-enabled services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Services Configured</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.compliance_status.services_configured}
            </div>
            <p className="text-xs text-muted-foreground">
              Tax-enabled services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Status</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              {analytics.compliance_status.tax_collection_active ? (
                <Badge variant="default" className="bg-green-600">Active</Badge>
              ) : (
                <Badge variant="destructive">Inactive</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.compliance_status.stripe_connected ? 'Stripe Connected' : 'Setup Required'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Service Performance Table */}
      {analytics.service_performance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Service Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Service</th>
                    <th className="text-right py-2 px-3 font-medium">Bookings</th>
                    <th className="text-right py-2 px-3 font-medium">Revenue</th>
                    <th className="text-right py-2 px-3 font-medium">Tax Collected</th>
                    <th className="text-right py-2 px-3 font-medium">Tax Rate</th>
                    <th className="text-right py-2 px-3 font-medium">Avg/Booking</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.service_performance.map((service, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-3 font-medium">{service.service_name}</td>
                      <td className="text-right py-3 px-3">{service.total_bookings}</td>
                      <td className="text-right py-3 px-3">
                        {formatCurrency(service.total_revenue, analytics.overview.currency)}
                      </td>
                      <td className="text-right py-3 px-3 text-primary font-medium">
                        {formatCurrency(service.tax_collected, analytics.overview.currency)}
                      </td>
                      <td className="text-right py-3 px-3">{service.tax_rate}%</td>
                      <td className="text-right py-3 px-3">
                        {formatCurrency(service.avg_revenue_per_booking, analytics.overview.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Trends */}
      {analytics.monthly_trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Monthly Tax Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 font-medium">Month</th>
                    <th className="text-right py-2 px-3 font-medium">Bookings</th>
                    <th className="text-right py-2 px-3 font-medium">Revenue</th>
                    <th className="text-right py-2 px-3 font-medium">Tax Collected</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.monthly_trends.map((month, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-3 font-medium">
                        {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long' 
                        })}
                      </td>
                      <td className="text-right py-3 px-3">{month.bookings}</td>
                      <td className="text-right py-3 px-3">
                        {formatCurrency(month.revenue, analytics.overview.currency)}
                      </td>
                      <td className="text-right py-3 px-3 text-primary font-medium">
                        {formatCurrency(month.tax_collected, analytics.overview.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {analytics.service_performance.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tax Data Yet</h3>
            <p className="text-muted-foreground mb-4">
              Complete some bookings with tax-enabled services to see analytics here.
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/settings?tab=services')}
            >
              Configure Service Taxes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};