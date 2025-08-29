import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Calculator, 
  Shield, 
  TrendingUp, 
  FileText, 
  Crown, 
  Lock, 
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Info,
  Code
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useAccessControl } from '@/hooks/useAccessControl';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { ConnectTaxThresholdMonitoring } from '@/components/tax/ConnectTaxThresholdMonitoring';
import { TaxExportComponent } from '@/components/tax/TaxExportComponent';
import { StripeEmbeddedTaxSettings } from '@/components/tax/StripeEmbeddedTaxSettings';
import { StripeEmbeddedTaxRegistrations } from '@/components/tax/StripeEmbeddedTaxRegistrations';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  mockTaxSettings, 
  mockTaxCodes, 
  mockTaxData,
  type MockTaxSettings,
  type MockTaxCode,
  type MockTaxData
} from '@/types/mockTaxData';

export const TaxTab = () => {
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { settings } = usePaymentSettings(selectedCalendar?.id);
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { isDeveloper } = useDeveloperAccess();
  const { getStripeAccount, createOnboardingLink, createLoginLink } = useStripeConnect();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [taxData, setTaxData] = useState<any>(null);
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [taxCodes, setTaxCodes] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);

  const hasAccess = checkAccess('canAccessTaxCompliance');

  // Check if we're in production
  const isProduction = import.meta.env.PROD;

  useEffect(() => {
    if (hasAccess && selectedCalendar?.id) {
      checkStripeAccountStatus();
    }
  }, [hasAccess, selectedCalendar?.id]);

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripe(true);
      const account = await getStripeAccount();
      setStripeAccount(account);
      
      // Only load tax data if Stripe is fully onboarded
      if (account?.onboarding_completed && account?.charges_enabled) {
        loadTaxData();
        loadTaxSettings();
        loadTaxCodes();
      }
    } catch (error) {
      console.error('Failed to check Stripe account:', error);
    } finally {
      setCheckingStripe(false);
    }
  };

  const loadTaxData = async () => {
    setLoading(true);
    try {
      if (useMockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTaxData(mockTaxData);
      } else {
        // Fetch real tax data from Stripe with proper tenant isolation
        const { data, error } = await supabase.functions.invoke('get-tax-data', {
          body: {
            calendar_id: selectedCalendar?.id,
            test_mode: true,
            start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            end_date: new Date().toISOString()
          }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch tax data');
        }

        if (data?.success) {
          // Use data directly from Stripe
          setTaxData(data);
        } else {
          throw new Error(data?.error || 'Invalid response from tax service');
        }
      }
    } catch (error) {
      console.error('Failed to load tax data:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tax data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTaxSettings = async () => {
    try {
      if (useMockData) {
        setTaxSettings(mockTaxSettings);
        setRegistrations(mockTaxSettings.taxRegistrations);
      } else {
        const { data, error } = await supabase.functions.invoke('get-tax-settings', {
          body: { test_mode: true }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch tax settings');
        }

        if (data?.success) {
          setTaxSettings(data);
          // Set registrations from the response
          if (data.taxRegistrations) {
            setRegistrations(data.taxRegistrations);
          }
        } else {
          throw new Error(data?.error || 'Invalid response from tax settings service');
        }
      }
    } catch (error) {
      console.error('Failed to load tax settings:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tax settings",
        variant: "destructive",
      });
    }
  };

  const loadTaxCodes = async () => {
    try {
      if (useMockData) {
        setTaxCodes(mockTaxCodes);
      } else {
        const { data, error } = await supabase.functions.invoke('get-tax-codes', {
          body: { test_mode: true }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch tax codes');
        }

        if (data?.success) {
          setTaxCodes(data.taxCodes || []);
        } else {
          throw new Error(data?.error || 'Invalid response from tax codes service');
        }
      }
    } catch (error) {
      console.error('Failed to load tax codes:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load tax codes",
        variant: "destructive",
      });
    }
  };

  const handleSetMockData = () => {
    setUseMockData(true);
    loadTaxData();
    loadTaxSettings();
    loadTaxCodes();
    toast({
      title: "Mock Data Enabled",
      description: "Displaying mock tax data for development"
    });
  };

  const handleRemoveMockData = () => {
    setUseMockData(false);
    loadTaxData();
    loadTaxSettings();
    loadTaxCodes();
    toast({
      title: "Mock Data Disabled",
      description: "Mock data has been cleared"
    });
  };

  const handleRefreshTaxData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadTaxData(), loadTaxSettings(), loadTaxCodes()]);
      toast({
        title: "Success",
        description: "Tax data refreshed successfully"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to refresh tax data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedCalendar?.id) {
      toast({
        title: "Error",
        description: "No calendar selected",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating Report",
      description: "Your tax report is being generated...",
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-tax-report', {
        body: {
          calendar_id: selectedCalendar.id,
          test_mode: true,
          report_type: 'quarterly',
          year: new Date().getFullYear(),
          quarter: Math.floor(new Date().getMonth() / 3) + 1
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate report');
      }

      if (data?.success) {
        // Create blob and download link for the report
        const reportBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const downloadUrl = URL.createObjectURL(reportBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `tax-report-${data.reportMetadata.period.year}-Q${data.reportMetadata.period.quarter || new Date().getMonth()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        toast({
          title: "Report Ready",
          description: `Tax report generated with ${data.reportMetadata.transactionCount} transactions. Download started.`,
        });
      } else {
        throw new Error(data?.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate tax report",
        variant: "destructive",
      });
    }
  };

  // Locked state for users without Professional access
  if (!hasAccess) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Tax Compliance & Administration</h1>
            <p className="text-gray-400 mt-1">Automated tax management powered by Stripe Tax</p>
          </div>
        </div>

        {/* Professional Feature Lock */}
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-yellow-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Professional Feature</h3>
                <p className="text-gray-400">
                  Automated tax compliance & administration is available for Professional plan users and above.
                </p>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Professional
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Feature Benefits */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="w-5 h-5" />
              What You Get with Professional Tax Compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Automatic Tax Calculation</h4>
                    <p className="text-sm text-gray-400">VAT and taxes calculated automatically for all transactions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Multi-jurisdiction Support</h4>
                    <p className="text-sm text-gray-400">Handle customers from different countries with correct tax rates</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Automated Reports</h4>
                    <p className="text-sm text-gray-400">Generate tax reports for easy filing with authorities</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Compliance Monitoring</h4>
                    <p className="text-sm text-gray-400">Real-time compliance status and alerts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Tax Rate Updates</h4>
                    <p className="text-sm text-gray-400">Automatic updates when tax rates change</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-white font-medium">Audit Trail</h4>
                    <p className="text-sm text-gray-400">Complete audit trail for all tax-related transactions</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <SubscriptionModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          userType={userStatus.userType}
        />
      </div>
    );
  }

  // Show loading state while checking Stripe account
  if (checkingStripe) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Tax Compliance & Administration</h1>
            <p className="text-gray-400 mt-1">Automated tax management powered by Stripe Tax</p>
          </div>
        </div>
        <Card className="bg-gray-800 border-gray-700">
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Checking Stripe account status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show Stripe onboarding required state
  if (!stripeAccount?.onboarding_completed || !stripeAccount?.charges_enabled) {
    const handleStartOnboarding = async () => {
      const link = await createOnboardingLink();
      if (link?.url) {
        window.open(link.url, '_blank');
      }
    };

    const handleOpenDashboard = async () => {
      const dashboardUrl = await createLoginLink();
      if (dashboardUrl) {
        window.open(dashboardUrl, '_blank');
      }
    };

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Tax Compliance & Administration</h1>
            <p className="text-gray-400 mt-1">Automated tax management powered by Stripe Tax</p>
          </div>
        </div>

        <Card className="bg-orange-900/20 border-orange-700">
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Stripe Connect Setup Required</h3>
                <p className="text-gray-400">
                  Complete your Stripe Connect onboarding to access tax compliance features and start collecting payments.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  onClick={handleStartOnboarding}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  size="lg"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  {stripeAccount ? 'Complete Setup' : 'Start Onboarding'}
                </Button>
                {stripeAccount && (
                  <Button 
                    onClick={handleOpenDashboard}
                    variant="outline"
                    className="border-orange-600 text-orange-400 hover:bg-orange-600/10"
                    size="lg"
                  >
                    Check Status
                  </Button>
                )}
                <Button 
                  onClick={checkStripeAccountStatus}
                  variant="outline"
                  className="border-gray-600 text-gray-400 hover:bg-gray-600/10"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {stripeAccount && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Info className="w-5 h-5" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Onboarding Completed</span>
                  <Badge variant={stripeAccount.onboarding_completed ? "default" : "secondary"}>
                    {stripeAccount.onboarding_completed ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Charges Enabled</span>
                  <Badge variant={stripeAccount.charges_enabled ? "default" : "secondary"}>
                    {stripeAccount.charges_enabled ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Account Status</span>
                  <Badge variant={stripeAccount.account_status === 'complete' ? "default" : "secondary"}>
                    {stripeAccount.account_status || "Unknown"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Developer Controls - Only show in non-production */}
      {!isProduction && (
        <div className="space-y-3">
          <Card className="bg-blue-900/20 border-blue-700">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-blue-400">Dev Mode</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button 
                    onClick={handleSetMockData} 
                    variant="outline" 
                    size="sm"
                    className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                  >
                    Set MockData
                  </Button>
                  <Button 
                    onClick={handleRemoveMockData} 
                    variant="outline" 
                    size="sm"
                    className="border-blue-600 text-blue-400 hover:bg-blue-600/10"
                  >
                    Remove MockData
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mock Data Active Banner */}
          {useMockData && (
            <Alert className="bg-orange-900/20 border-orange-700">
              <AlertCircle className="h-4 w-4 text-orange-400" />
              <AlertDescription className="text-orange-300">
                <strong>Dev Mock Data active</strong> - Displaying sample data for development
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Tax Settings Card - Using Stripe Embedded Component */}
      <StripeEmbeddedTaxSettings 
        fallbackData={taxSettings}
        onFallback={() => {
          // Load fallback data if embedded component fails
          if (!taxSettings) {
            loadTaxSettings();
          }
        }}
      />

      {/* Tax Registrations Card - Using Stripe Embedded Component */}
      <StripeEmbeddedTaxRegistrations 
        fallbackData={taxSettings}
      />

      {/* Threshold Monitoring Card */}
      <ConnectTaxThresholdMonitoring />

      {/* Product Tax Codes Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Product Tax Codes
          </CardTitle>
          <CardDescription className="text-gray-400">
            Assign tax codes to products and prices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock product entries for demonstration */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Hair Cut Service</h4>
                  <p className="text-sm text-gray-400">Professional hair cutting service</p>
                </div>
                <div className="flex-shrink-0">
                  <Select defaultValue="txcd_30000000">
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex-1">
                  <h4 className="text-white font-medium">Consultation Service</h4>
                  <p className="text-sm text-gray-400">Professional consultation session</p>
                </div>
                <div className="flex-shrink-0">
                  <Select defaultValue="txcd_30000000">
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taxCodes.map((code) => (
                        <SelectItem key={code.id} value={code.id}>
                          {code.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Alert className="bg-blue-900/20 border-blue-700">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-blue-200">
                Tax codes determine how tax is calculated for each product. 
                <a href="https://dashboard.stripe.com/tax/tax-codes" target="_blank" className="underline ml-1">
                  View all codes in Stripe →
                </a>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Exports Card */}
      <TaxExportComponent />

      {/* Quick Actions */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button 
              onClick={() => window.open('https://dashboard.stripe.com/tax', '_blank')}
              variant="outline"
              className="justify-start"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Open Stripe Tax Dashboard
            </Button>
            <Button 
              onClick={() => window.open('https://dashboard.stripe.com/tax/registrations', '_blank')}
              variant="outline"
              className="justify-start"
            >
              <FileText className="w-4 h-4 mr-2" />
              Manage Registrations
            </Button>
            <Button 
              onClick={handleRefreshTaxData}
              disabled={refreshing}
              variant="outline"
              className="justify-start"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};