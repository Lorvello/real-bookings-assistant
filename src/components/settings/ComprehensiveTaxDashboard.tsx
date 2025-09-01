import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw, 
  Download, 
  Settings,
  BarChart3,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { StripeEmbeddedTaxSettings } from '@/components/tax/StripeEmbeddedTaxSettings';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface RevenueData {
  totalRevenue: number;
  totalTax: number;
  currency: string;
  serviceBreakdown: Array<{
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

export function ComprehensiveTaxDashboard() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportPeriod, setExportPeriod] = useState('current_month');
  const [exportLoading, setExportLoading] = useState(false);
  const { toast } = useToast();
  const { selectedCalendar } = useCalendarContext();

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
    } catch (error: any) {
      console.error('Error loading revenue data:', error);
      toast({
        title: 'Error',
        description: 'Unable to load revenue data. Please try refreshing.',
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

  const exportTaxReport = async () => {
    if (!selectedCalendar?.id) return;

    setExportLoading(true);
    try {
      const exportParams: any = {
        calendar_id: selectedCalendar.id,
        format: exportFormat
      };

      // Set period parameters
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

      // Create download
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

        toast({
          title: 'Export Complete',
          description: 'Tax report has been downloaded successfully.'
        });
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Unable to export tax report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };

  const calculateAverageTaxRate = (): number => {
    if (!data?.serviceBreakdown.length) return 0;
    const totalRevenue = data.serviceBreakdown.reduce((sum, service) => sum + service.totalRevenue, 0);
    const totalTax = data.serviceBreakdown.reduce((sum, service) => sum + service.totalTax, 0);
    return totalRevenue > 0 ? (totalTax / totalRevenue) * 100 : 0;
  };

  const getTaxComplianceStatus = () => {
    if (!data) return { status: 'unknown', label: 'Unknown', color: 'bg-gray-500' };
    
    const avgTaxRate = calculateAverageTaxRate();
    if (avgTaxRate > 15) {
      return { status: 'compliant', label: 'Compliant', color: 'bg-green-500' };
    } else if (avgTaxRate > 5) {
      return { status: 'partial', label: 'Partial', color: 'bg-yellow-500' };
    }
    return { status: 'needs_review', label: 'Needs Review', color: 'bg-orange-500' };
  };

  if (!selectedCalendar) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Please select a calendar to view tax data.</p>
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

  const complianceStatus = getTaxComplianceStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground">Complete tax overview and management for your business</p>
        </div>
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Tax Overview
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Reports
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Tax Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data ? formatCurrency(data.totalRevenue) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Gross revenue this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data ? formatCurrency(data.totalTax) : formatCurrency(0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  VAT/Tax collected this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Tax Rate</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {calculateAverageTaxRate().toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Weighted average tax rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tax Status</CardTitle>
                {complianceStatus.status === 'compliant' ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Badge className={`${complianceStatus.color} text-white`}>
                    {complianceStatus.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax compliance status
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Service */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Breakdown by Service</CardTitle>
              <CardDescription>Revenue and tax collected per service type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.serviceBreakdown.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="flex-1">
                      <h4 className="font-medium">{service.serviceName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {service.bookingCount} bookings • {service.taxRate.toFixed(1)}% tax rate
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(service.totalRevenue)}</div>
                      <div className="text-sm text-green-600">{formatCurrency(service.totalTax)} tax</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Collection Trends</CardTitle>
              <CardDescription>Monthly tax collection over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data?.monthlyTrends || []}>
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'tax' ? formatCurrency(value) : value,
                        name === 'tax' ? 'Tax Collected' : name === 'revenue' ? 'Revenue' : 'Bookings'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="tax" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      name="tax"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="bookings" 
                      stroke="hsl(var(--muted-foreground))" 
                      strokeWidth={2} 
                      name="bookings"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <StripeEmbeddedTaxSettings />
        </TabsContent>

        <TabsContent value="exports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Tax Reports</CardTitle>
              <CardDescription>Generate detailed tax reports for accounting and compliance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Export Format</label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Excel Compatible)</SelectItem>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="xml">XML (Accounting Software)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Export Period</label>
                  <Select value={exportPeriod} onValueChange={setExportPeriod}>
                    <SelectTrigger>
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
                className="w-full"
              >
                {exportLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export Tax Report
              </Button>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Export Information</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• CSV format is compatible with Excel and most accounting software</li>
                  <li>• PDF reports include detailed transaction summaries</li>
                  <li>• XML format is designed for automated accounting system imports</li>
                  <li>• All exports include tax breakdown by service and customer</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax Performance Metrics</CardTitle>
                <CardDescription>Key tax collection indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Tax Collection Rate</span>
                    <span className="text-sm">{calculateAverageTaxRate().toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Services with Tax</span>
                    <span className="text-sm">{data?.serviceBreakdown.filter(s => s.totalTax > 0).length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Highest Tax Service</span>
                    <span className="text-sm">
                      {data?.serviceBreakdown.reduce((max, service) => 
                        service.taxRate > max.taxRate ? service : max, 
                        data.serviceBreakdown[0] || { serviceName: 'None', taxRate: 0 }
                      )?.serviceName || 'None'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
                <CardDescription>Tax compliance monitoring</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Status</span>
                    <Badge className={`${complianceStatus.color} text-white`}>
                      {complianceStatus.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Last Updated</span>
                    <span className="text-sm">{new Date().toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Next Review</span>
                    <span className="text-sm">Monthly</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}