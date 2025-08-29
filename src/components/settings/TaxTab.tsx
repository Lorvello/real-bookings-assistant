import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Crown, 
  Lock, 
  CheckCircle,
  Code,
  Building2
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { QuarterlyTaxSummary } from '@/components/tax/QuarterlyTaxSummary';
import { ServiceBreakdown } from '@/components/tax/ServiceBreakdown';
import { TaxExportSection } from '@/components/tax/TaxExportSection';
import { TaxStatusOverview } from '@/components/tax/TaxStatusOverview';
import { TaxRegistrationsManager } from '@/components/tax/TaxRegistrationsManager';
import { ThresholdMonitoringDashboard } from '@/components/tax/ThresholdMonitoringDashboard';
import { AccountRequirements } from '@/components/tax/AccountRequirements';
import { ProductTaxCodeManager } from '@/components/tax/ProductTaxCodeManager';
import { Settings } from 'lucide-react';

export const TaxTab = () => {
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { getStripeAccount, createOnboardingLink, refreshAccountStatus } = useStripeConnect();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(new Date().getMonth() / 3) + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const hasAccess = checkAccess('canAccessTaxCompliance');

  useEffect(() => {
    if (hasAccess && selectedCalendar?.id) {
      checkStripeAccountStatus();
    }
  }, [hasAccess, selectedCalendar?.id]);

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripe(true);
      
      const freshAccount = await refreshAccountStatus();
      let account = freshAccount || (await getStripeAccount());
      setStripeAccount(account);

      console.log('Stripe account status check:', {
        exists: !!account,
        onboardingCompleted: account?.onboarding_completed,
        chargesEnabled: account?.charges_enabled,
        accountId: account?.stripe_account_id
      });
    } catch (error) {
      console.error('Failed to check Stripe account:', error);
      const localAccount = await getStripeAccount();
      setStripeAccount(localAccount);
    } finally {
      setCheckingStripe(false);
    }
  };

  const toggleMockData = () => {
    setUseMockData(!useMockData);
    toast({
      title: useMockData ? "Live Mode Enabled" : "Mock Mode Enabled",
      description: useMockData ? "Showing live Stripe Tax data" : "Showing mock data for development"
    });
  };

  // Locked state for users without Professional access
  if (!hasAccess) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tax & Compliance</h1>
            <p className="text-muted-foreground mt-1">Automated tax management for your business</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Professional Feature</h3>
                <p className="text-muted-foreground">
                  Automated tax management and compliance is available for Professional plan users and above.
                </p>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade to Professional
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              What you get with Professional Tax Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Automatic tax calculation</h4>
                    <p className="text-sm text-muted-foreground">Tax is automatically calculated for all transactions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">International support</h4>
                    <p className="text-sm text-muted-foreground">Correct tax rates for customers from different countries</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Automated reports</h4>
                    <p className="text-sm text-muted-foreground">Generate tax reports for easy filing</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Compliance monitoring</h4>
                    <p className="text-sm text-muted-foreground">Real-time compliance status and alerts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Automatic updates</h4>
                    <p className="text-sm text-muted-foreground">Automatic updates when tax rates change</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Audit trail</h4>
                    <p className="text-sm text-muted-foreground">Complete audit trail for all tax-related transactions</p>
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
            <Shield className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Checking Stripe account status...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show simple onboarding message if Stripe is not set up
  if (!stripeAccount?.onboarding_completed) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Complete Stripe Onboarding</h3>
                <p className="text-muted-foreground">
                  Go to the Pay & Book page to complete your Stripe onboarding before configuring tax settings.
                </p>
              </div>
              <Button 
                onClick={async () => {
                  const link = await createOnboardingLink();
                  if (link?.url) {
                    window.open(link.url, '_blank');
                  }
                }}
                size="lg"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Complete Stripe Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Tax Tab UI - Business-focused quarterly overview
  return (
    <div className="space-y-8">
      {/* Header with Developer Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Summary</h1>
          <p className="text-muted-foreground mt-1">Quarterly revenue and VAT overview for your business</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Developer Mode Toggle - Non-production only */}
          {!import.meta.env.PROD && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/20 rounded-lg border border-amber-300">
              <Code className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {useMockData ? 'Mock Data' : 'Live Mode'}
              </span>
              <Switch
                checked={useMockData}
                onCheckedChange={toggleMockData}
              />
            </div>
          )}
        </div>
      </div>

      {/* Global Tax Coverage Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success" />
            <div>
              <p className="text-sm font-medium">Global Tax Coverage Active</p>
              <p className="text-xs text-muted-foreground">
                Automatic tax calculation is available in supported countries. 
                Some regions may have limited support (e.g., UK/NO/CH domestic only).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <QuarterlyTaxSummary 
          accountId={stripeAccount?.stripe_account_id} 
          calendarId={stripeAccount?.calendar_id}
        />
        
        <ServiceBreakdown
          accountId={stripeAccount?.stripe_account_id}
          calendarId={stripeAccount?.calendar_id}
          quarter={1}
          year={2024}
        />
        
        <TaxExportSection 
          accountId={stripeAccount?.stripe_account_id} 
          calendarId={stripeAccount?.calendar_id}
        />

        <ProductTaxCodeManager
          accountId={stripeAccount?.stripe_account_id}
          calendarId={stripeAccount?.calendar_id}
        />

        {/* Manage Service Tax Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Service Tax Management
            </CardTitle>
            <CardDescription>
              Configure tax settings for individual services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set up tax behavior (inclusive/exclusive) and tax codes for each of your services. 
                This allows you to have different tax configurations per service type.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  // Navigate to Services tab - this would need to be implemented
                  // based on your routing structure
                  window.location.href = '/settings?tab=services';
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Service Tax Settings
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <TaxRegistrationsManager
          accountId={stripeAccount?.stripe_account_id}
          calendarId={stripeAccount?.calendar_id}
        />

        <ThresholdMonitoringDashboard
          accountId={stripeAccount?.stripe_account_id}
          calendarId={stripeAccount?.calendar_id}
        />

        <AccountRequirements
          accountId={stripeAccount?.stripe_account_id}
          calendarId={stripeAccount?.calendar_id}
        />
        
        <TaxStatusOverview 
          accountId={stripeAccount?.stripe_account_id} 
          calendarId={stripeAccount?.calendar_id}
        />
      </div>

      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userType={userStatus.userType}
      />
    </div>
  );
};