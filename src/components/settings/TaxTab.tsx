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
import { TaxOverview } from '@/components/tax/TaxOverview';
import { TaxRegistrations } from '@/components/tax/TaxRegistrations';
import { TaxThresholdMonitoring } from '@/components/tax/TaxThresholdMonitoring';
import { TaxExports } from '@/components/tax/TaxExports';
import { ServiceTypeTaxCodes } from '@/components/tax/ServiceTypeTaxCodes';

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

  // Main Tax Tab UI - Completely rebuilt for functional Stripe Tax integration
  return (
    <div className="space-y-6">
      {/* Header with Developer Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Tax & Compliance</CardTitle>
              <CardDescription>
                Live Stripe Tax integration for Express accounts
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
        </CardHeader>
      </Card>

      {/* Tax Settings Overview */}
      <TaxOverview 
        accountId={stripeAccount?.stripe_account_id} 
        useMockData={useMockData}
      />

      {/* Tax Registrations */}
      <TaxRegistrations 
        accountId={stripeAccount?.stripe_account_id}
      />

      {/* Threshold Monitoring - Stripe Embedded Component */}
      <TaxThresholdMonitoring 
        accountId={stripeAccount?.stripe_account_id}
        useMockData={useMockData}
      />

      {/* Product Tax Codes per Service Type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Product Tax Codes
          </CardTitle>
          <CardDescription>
            Configure tax codes for your services using Stripe Tax codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedCalendar?.id ? (
            <ServiceTypeTaxCodes calendarId={selectedCalendar.id} />
          ) : (
            <Alert>
              <AlertDescription>
                Select a calendar to configure product tax codes for your services.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tax Reports & Exports - Stripe Embedded Component */}
      <TaxExports 
        accountId={stripeAccount?.stripe_account_id}
        useMockData={useMockData}
      />

      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userType={userStatus.userType}
      />
    </div>
  );
};