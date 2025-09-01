import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  Download, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Flag,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useTaxConfiguration } from '@/hooks/useTaxConfiguration';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RevenueData {
  totalRevenue: number;
  totalTax: number;
  currency: string;
  previousMonthRevenue: number;
  previousMonthTax: number;
  yearToDateRevenue: number;
  yearToDateTax: number;
  revenueChange: number;
  taxChange: number;
  serviceBreakdown: Array<{
    serviceId: string;
    serviceName: string;
    bookingCount: number;
    totalRevenue: number;
    totalTax: number;
    taxRate: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    revenue: number;
    tax: number;
    bookings: number;
  }>;
}

interface ServiceType {
  id: string;
  name: string;
  tax_enabled: boolean;
  applicable_tax_rate: number;
  business_country: string;
}

export function TaxManagementPage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportPeriod, setExportPeriod] = useState('current_month');
  const [exportLoading, setExportLoading] = useState(false);
  const [lastExportDate, setLastExportDate] = useState<string | null>(null);
  const { toast } = useToast();
  const { selectedCalendar } = useCalendarContext();
  const { status: taxStatus } = useTaxConfiguration(selectedCalendar?.id);

  const loadRevenueData = async () => {
    if (!selectedCalendar?.id) return;
    
    try {
      setLoading(true);
      const { data: revenueData, error } = await supabase.functions.invoke('revenue-analytics', {
        body: {
          calendar_id: selectedCalendar.id,
          period: 'current_month'
        }
      });

      if (error) throw error;
      setData(revenueData);

      // Load service types
      const { data: serviceData, error: serviceError } = await supabase
        .from('service_types')
        .select('id, name, tax_enabled, applicable_tax_rate, business_country')
        .eq('calendar_id', selectedCalendar.id)
        .eq('is_active', true);

      if (serviceError) throw serviceError;
      setServices(serviceData || []);

    } catch (error: any) {
      console.error('Error loading revenue data:', error);
      toast({
        title: 'Error',
        description: 'Unable to load tax data. Please try refreshing.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueData();
  }, [selectedCalendar?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRevenueData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: data?.currency || 'EUR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const exportTaxReport = async () => {
    if (!selectedCalendar?.id) return;

    setExportLoading(true);
    try {
      const exportParams: any = {
        calendar_id: selectedCalendar.id,
        format: exportFormat
      };

      const currentDate = new Date();
      switch (exportPeriod) {
        case 'current_month':
          exportParams.year = currentDate.getFullYear();
          exportParams.month = currentDate.getMonth() + 1;
          break;
        case 'current_quarter':
          exportParams.year = currentDate.getFullYear();
          exportParams.quarter = Math.floor(currentDate.getMonth() / 3) + 1;
          break;
        case 'current_year':
          exportParams.year = currentDate.getFullYear();
          break;
      }

      const { data: reportData, error } = await supabase.functions.invoke('export-tax-report', {
        body: exportParams
      });

      if (error) throw error;

      if (reportData) {
        const blob = new Blob([reportData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `tax-report-${exportPeriod}.${exportFormat}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setLastExportDate(new Date().toLocaleDateString());
        toast({
          title: 'Export Complete',
          description: 'Tax report downloaded successfully.'
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const toggleServiceTax = async (serviceId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('service_types')
        .update({ tax_enabled: enabled })
        .eq('id', serviceId);

      if (error) throw error;

      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, tax_enabled: enabled } : service
      ));

      toast({
        title: 'Tax Setting Updated',
        description: `Tax ${enabled ? 'enabled' : 'disabled'} for service.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tax setting.',
        variant: 'destructive'
      });
    }
  };

  const getBusinessCountry = () => {
    const countryCode = services[0]?.business_country || 'NL';
    const countryNames: Record<string, string> = {
      'NL': 'Netherlands',
      'DE': 'Germany',
      'BE': 'Belgium',
      'FR': 'France',
      'GB': 'United Kingdom',
      'ES': 'Spain',
      'IT': 'Italy',
      'AT': 'Austria'
    };
    return { code: countryCode, name: countryNames[countryCode] || countryCode };
  };

  const getCountryFlag = (countryCode: string) => {
    const flags: Record<string, string> = {
      'NL': '🇳🇱',
      'DE': '🇩🇪',
      'BE': '🇧🇪',
      'FR': '🇫🇷',
      'GB': '🇬🇧',
      'ES': '🇪🇸',
      'IT': '🇮🇹',
      'AT': '🇦🇹'
    };
    return flags[countryCode] || '🌍';
  };

  const getSystemStatus = () => {
    const taxActive = services.some(s => s.tax_enabled);
    const stripeConnected = taxStatus?.stripeAccountReady || false;
    const servicesConfigured = services.length > 0;

    return {
      taxCollection: { status: taxActive, label: taxActive ? 'Active' : 'Inactive' },
      stripeConnection: { status: stripeConnected, label: stripeConnected ? 'Connected' : 'Not Connected' },
      serviceIntegration: { status: servicesConfigured, label: servicesConfigured ? 'Complete' : 'Incomplete' }
    };
  };

  if (!selectedCalendar) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Please select a calendar to view tax management.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading tax data...</span>
        </div>
      </div>
    );
  }

  const businessCountry = getBusinessCountry();
  const systemStatus = getSystemStatus();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tax Management</h1>
          <p className="text-gray-400">Complete tax overview and management for your business</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* SECTION 1: Revenue Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data ? formatCurrency(data.totalRevenue) : formatCurrency(0)}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              {data && data.revenueChange !== 0 && (
                <>
                  {data.revenueChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={data.revenueChange > 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatPercentage(data.revenueChange)}
                  </span>
                </>
              )}
              <span className="text-gray-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Tax Collected</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {data ? formatCurrency(data.totalTax) : formatCurrency(0)}
            </div>
            <div className="flex items-center space-x-2 text-xs">
              {data && data.taxChange !== 0 && (
                <>
                  {data.taxChange > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={data.taxChange > 0 ? 'text-green-500' : 'text-red-500'}>
                    {formatPercentage(data.taxChange)}
                  </span>
                </>
              )}
              <span className="text-gray-400">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Last Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data ? formatCurrency(data.previousMonthRevenue) : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-400">
              {data ? formatCurrency(data.previousMonthTax) : formatCurrency(0)} tax
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Year to Date</CardTitle>
            <BarChart3 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {data ? formatCurrency(data.yearToDateRevenue) : formatCurrency(0)}
            </div>
            <p className="text-xs text-gray-400">
              {data ? formatCurrency(data.yearToDateTax) : formatCurrency(0)} tax
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: Service Tax Breakdown */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Service Performance Breakdown</CardTitle>
          <CardDescription className="text-gray-400">
            Revenue and tax collected per service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Service</TableHead>
                <TableHead className="text-gray-300">Bookings</TableHead>
                <TableHead className="text-gray-300">Revenue</TableHead>
                <TableHead className="text-gray-300">Tax Rate</TableHead>
                <TableHead className="text-gray-300">Tax Collected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.serviceBreakdown.map((service, index) => (
                <TableRow key={index} className="border-gray-700">
                  <TableCell className="font-medium text-white">{service.serviceName}</TableCell>
                  <TableCell className="text-gray-300">{service.bookingCount}</TableCell>
                  <TableCell className="text-white">{formatCurrency(service.totalRevenue)}</TableCell>
                  <TableCell className="text-gray-300">{service.taxRate.toFixed(1)}%</TableCell>
                  <TableCell className="text-green-400">{formatCurrency(service.totalTax)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SECTION 3: Business Tax Configuration */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Business Tax Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Tax settings for {businessCountry.name} {getCountryFlag(businessCountry.code)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-white">Business Country</h4>
                  <p className="text-sm text-gray-400">{businessCountry.name}</p>
                </div>
                <div className="text-2xl">{getCountryFlag(businessCountry.code)}</div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-white mb-2">Standard Tax Rate</h4>
                <p className="text-2xl font-bold text-green-400">
                  {businessCountry.code === 'NL' ? '21%' : 
                   businessCountry.code === 'DE' ? '19%' : 
                   businessCountry.code === 'GB' ? '20%' : '21%'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-white">Service Tax Settings</h4>
            <div className="space-y-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div>
                    <h5 className="font-medium text-white">{service.name}</h5>
                    <p className="text-sm text-gray-400">
                      {service.tax_enabled ? `${service.applicable_tax_rate}% tax rate` : 'Tax exempt'}
                    </p>
                  </div>
                  <Switch
                    checked={service.tax_enabled}
                    onCheckedChange={(checked) => toggleServiceTax(service.id, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 4: Simplified Trends */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">6-Month Revenue Trend</CardTitle>
            <CardDescription className="text-gray-400">Revenue and tax collection overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthlyTrends || []}>
                  <XAxis dataKey="month" className="text-gray-400" />
                  <YAxis className="text-gray-400" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#374151', border: '1px solid #4B5563', borderRadius: '8px' }}
                    labelStyle={{ color: '#F3F4F6' }}
                    formatter={(value: any, name: string) => [
                      name === 'tax' ? formatCurrency(value) : value,
                      name === 'tax' ? 'Tax' : name === 'revenue' ? 'Revenue' : 'Bookings'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2} 
                    name="revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="tax" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    name="tax"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 5: Tax Reporting & Export */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Export Tax Reports</CardTitle>
            <CardDescription className="text-gray-400">Generate reports for accounting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="xml">XML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Period</label>
                <Select value={exportPeriod} onValueChange={setExportPeriod}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Current Month</SelectItem>
                    <SelectItem value="current_quarter">Current Quarter</SelectItem>
                    <SelectItem value="current_year">Current Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={exportTaxReport}
              disabled={exportLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exportLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download for Accountant
            </Button>

            {lastExportDate && (
              <p className="text-xs text-gray-400">
                Last export: {lastExportDate}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION 6: System Status */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">System Status</CardTitle>
          <CardDescription className="text-gray-400">Tax system health overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              {systemStatus.taxCollection.status ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium text-white">Tax Collection</p>
                <p className="text-sm text-gray-400">{systemStatus.taxCollection.label}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {systemStatus.stripeConnection.status ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium text-white">Stripe Connection</p>
                <p className="text-sm text-gray-400">{systemStatus.stripeConnection.label}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {systemStatus.serviceIntegration.status ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertCircle className="w-5 h-5 text-orange-500" />
              )}
              <div>
                <p className="font-medium text-white">Service Integration</p>
                <p className="text-sm text-gray-400">{systemStatus.serviceIntegration.label}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}