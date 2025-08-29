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
  Code,
  AlertTriangle
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

  const loadTaxData = async (mockMode = false) => {
    setLoading(true);
    try {
      if (mockMode || useMockData) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTaxData(mockTaxData);
      } else {
        // Import getStripeMode for test_mode detection
        const { getStripeMode } = await import('@/utils/stripeConfig');
        
        // Fetch real tax data from Stripe with proper tenant isolation
        const { data, error } = await supabase.functions.invoke('get-tax-data', {
          body: {
            calendar_id: selectedCalendar?.id,
            test_mode: getStripeMode() === 'test',
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
          // Handle specific error codes with user-friendly UI instead of toast errors
          if (data?.code === 'UPGRADE_REQUIRED') {
            setShowUpgradeModal(true);
            return;
          } else if (data?.code === 'NO_ACCOUNT') {
            // This should be handled at the parent level, but just in case
            await checkStripeAccountStatus();
            return;
          }
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
        // Import getStripeMode for test_mode detection
        const { getStripeMode } = await import('@/utils/stripeConfig');
        
        const { data, error } = await supabase.functions.invoke('get-tax-settings', {
          body: { test_mode: getStripeMode() === 'test' }
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
          // Handle specific error codes 
          if (data?.code === 'UPGRADE_REQUIRED') {
            setShowUpgradeModal(true);
            return;
          } else if (data?.code === 'NO_ACCOUNT') {
            await checkStripeAccountStatus();
            return;
          }
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
        // Import getStripeMode for test_mode detection
        const { getStripeMode } = await import('@/utils/stripeConfig');
        
        const { data, error } = await supabase.functions.invoke('get-tax-codes', {
          body: { test_mode: getStripeMode() === 'test' }
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch tax codes');
        }

        if (data?.success) {
          setTaxCodes(data.taxCodes || []);
        } else {
          // Handle specific error codes 
          if (data?.code === 'UPGRADE_REQUIRED') {
            setShowUpgradeModal(true);
            return;
          }
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

  const refreshTaxData = async () => {
    setRefreshing(true);
    try {
      // Load data in sequence to avoid race conditions
      await loadTaxSettings(); // Load settings first (contains account status)
      await loadTaxData();      // Then load tax data 
      await loadTaxCodes();     // Finally load codes
      
      toast({
        title: "Success",
        description: "Tax data refreshed successfully"
      });
    } catch (error) {
      console.error('Refresh error:', error);
      // Only show toast if it's not a handled error code
      if (!error.message?.includes('upgrade') && !error.message?.includes('account')) {
        toast({
          title: "Error", 
          description: "Failed to refresh tax data",
          variant: "destructive"
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const refreshAll = async () => {
    await checkStripeAccountStatus();
    if (stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled) {
      await refreshTaxData();
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
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking Stripe account status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show Stripe onboarding required state
  if (!stripeAccount?.onboarding_completed || !stripeAccount?.charges_enabled) {
    return (
      <div className="space-y-6">
        <Card className="border-warning bg-warning/5">
          <CardHeader>
            <CardTitle className="text-warning flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Stripe Connect Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-warning/80">
              Complete your Stripe Connect onboarding to access tax compliance features and start collecting payments.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={async () => {
                  const link = await createOnboardingLink();
                  if (link?.url) {
                    window.open(link.url, '_blank');
                  }
                }}
                disabled={loading}
                variant="default"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                {stripeAccount?.onboarding_completed ? 'Go To Dashboard' : 'Start Onboarding'}
              </Button>
              <Button 
                variant="outline"
                onClick={checkStripeAccountStatus}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
              <Button 
                variant="outline"
                onClick={refreshAll}
                disabled={loading}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Tax Tab UI
  return (
    <div className="space-y-6">
      {/* Tax Compliance & Administration Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Tax Compliance & Administration</CardTitle>
              <CardDescription>
                Automated Tax Management Powered by Stripe
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={refreshTaxData} 
                disabled={refreshing || loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </Button>
              <Button 
                onClick={async () => {
                  const dashboardUrl = await createLoginLink();
                  if (dashboardUrl) {
                    window.open(dashboardUrl, '_blank');
                  }
                }}
                variant="outline"
                size="sm"
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Go To Dashboard
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Developer Tools */}
      {!import.meta.env.PROD && (
        <Card className="border-dashed border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Code className="h-5 w-5" />
              Developer Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTaxData(true)}
                disabled={loading}
              >
                Load Mock Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshTaxData}
                disabled={loading}
              >
                Refresh Real Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Settings
          </CardTitle>
          <CardDescription>
            Configure your tax settings and automatic tax calculation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StripeEmbeddedTaxSettings
            fallbackData={taxData}
            onFallback={() => {
              console.log('Tax settings fallback triggered');
            }}
          />
        </CardContent>
      </Card>

      {/* Tax Registrations Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Registrations
          </CardTitle>
          <CardDescription>
            Manage your tax registrations in different jurisdictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StripeEmbeddedTaxRegistrations
            fallbackData={{ taxRegistrations: registrations }}
          />
        </CardContent>
      </Card>

      {/* Threshold Monitoring */}
      <ConnectTaxThresholdMonitoring />

      {/* Product Tax Codes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Product Tax Codes
          </CardTitle>
          <CardDescription>
            Assign tax codes to products and prices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Mock product entries for demonstration */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Hair Cut Service</h4>
                  <p className="text-sm text-muted-foreground">Professional hair cutting service</p>
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
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium">Consultation Service</h4>
                  <p className="text-sm text-muted-foreground">Professional consultation session</p>
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
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
              onClick={refreshTaxData}
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