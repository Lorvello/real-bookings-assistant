import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, TrendingUp, AlertCircle, CheckCircle, Zap, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AutoTaxServiceCreation } from '@/components/settings/service-types/AutoTaxServiceCreation';
import { TaxComplianceMonitor } from '@/components/tax/TaxComplianceMonitor';

interface InternationalDashboardProps {
  calendarId: string;
}

export const InternationalDashboard: React.FC<InternationalDashboardProps> = ({
  calendarId
}) => {
  const [businessStats, setBusinessStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testingWorkflow, setTestingWorkflow] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchBusinessStats();
  }, [calendarId]);

  const fetchBusinessStats = async () => {
    setLoading(true);
    try {
      // Get comprehensive business statistics
      const { data: services } = await supabase
        .from('service_types')
        .select('*')
        .eq('calendar_id', calendarId);

      const { data: bookings } = await supabase
        .from('bookings')
        .select('*, service_types(*)')
        .eq('calendar_id', calendarId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const taxEnabledServices = services?.filter(s => s.tax_enabled) || [];
      const countries = [...new Set(services?.map(s => s.business_country).filter(Boolean))];
      const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
      
      setBusinessStats({
        totalServices: services?.length || 0,
        taxEnabledServices: taxEnabledServices.length,
        countries: countries.length,
        totalRevenue,
        recentBookings: bookings?.length || 0,
        internationalReady: taxEnabledServices.length > 0 && countries.length > 0
      });
    } catch (error) {
      console.error('Error fetching business stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCompleteWorkflowTest = async () => {
    setTestingWorkflow(true);
    try {
      toast({
        title: "Testing International Workflow",
        description: "Running complete integration test...",
      });

      // Test 1: Detect tax requirements
      const { data: taxDetection } = await supabase.functions.invoke('detect-tax-requirements', {
        body: { calendar_id: calendarId }
      });

      // Test 2: Auto setup tax
      const { data: taxSetup } = await supabase.functions.invoke('auto-setup-tax', {
        body: { 
          calendar_id: calendarId,
          business_country: 'NL',
          business_type: 'service_provider'
        }
      });

      // Test 3: Create test service with auto tax
      const testService = {
        name: "International Test Service",
        description: "Testing international tax integration",
        duration: 30,
        price: 50,
        service_category: "consultation",
        calendar_id: calendarId
      };

      const { data: serviceCreation } = await supabase.functions.invoke('create-service-type-with-stripe', {
        body: {
          serviceData: testService,
          testMode: true
        }
      });

      // Test 4: Validate compliance
      const { data: compliance } = await supabase.functions.invoke('validate-tax-compliance', {
        body: { calendar_id: calendarId }
      });

      toast({
        title: "Workflow Test Complete",
        description: "All international features are working correctly!",
      });

      fetchBusinessStats();
    } catch (error: any) {
      toast({
        title: "Workflow Test Failed",
        description: error.message || "Some features need attention",
        variant: "destructive",
      });
    } finally {
      setTestingWorkflow(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading international dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">International Business Hub</h2>
          <p className="text-muted-foreground">
            Complete international tax management and compliance
          </p>
        </div>
        
        <Button 
          onClick={runCompleteWorkflowTest}
          disabled={testingWorkflow}
          variant="outline"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          {testingWorkflow ? 'Testing...' : 'Test Complete Workflow'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Countries</span>
            </div>
            <div className="text-2xl font-bold">{businessStats?.countries || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Tax-Ready Services</span>
            </div>
            <div className="text-2xl font-bold">{businessStats?.taxEnabledServices || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Monthly Bookings</span>
            </div>
            <div className="text-2xl font-bold">{businessStats?.recentBookings || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Revenue (30d)</span>
            </div>
            <div className="text-2xl font-bold">€{businessStats?.totalRevenue?.toFixed(0) || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Status Banner */}
      <Card className={businessStats?.internationalReady ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            {businessStats?.internationalReady ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <span className="font-medium">
              {businessStats?.internationalReady 
                ? 'Your business is internationally ready!' 
                : 'Complete setup to start accepting international bookings'}
            </span>
            <Badge variant={businessStats?.internationalReady ? 'default' : 'secondary'}>
              {businessStats?.internationalReady ? 'Ready' : 'Setup Required'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="setup">Quick Setup</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <AutoTaxServiceCreation 
            calendarId={calendarId}
            onServiceCreated={fetchBusinessStats}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <TaxComplianceMonitor calendarId={calendarId} />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Testing</CardTitle>
              <CardDescription>
                Validate your complete international setup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Test Scenarios</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Netherlands client booking (21% VAT)</li>
                    <li>• German client booking (19% VAT)</li>
                    <li>• UK client booking (20% VAT)</li>
                    <li>• Multi-currency transactions</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Compliance Checks</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Tax registration status</li>
                    <li>• Stripe configuration</li>
                    <li>• Service tax codes</li>
                    <li>• Receipt formatting</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={runCompleteWorkflowTest}
                disabled={testingWorkflow}
                className="w-full"
              >
                {testingWorkflow ? 'Running Tests...' : 'Run Complete Integration Test'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};