import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Crown, 
  Lock, 
  CheckCircle2,
  AlertTriangle,
  Settings,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useAccessControl } from '@/hooks/useAccessControl';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { SyncServicesButton } from '@/components/stripe/SyncServicesButton';
import { TaxAnalyticsDashboard } from '@/components/tax/TaxAnalyticsDashboard';
import { AutomatedTaxSetup } from '@/components/tax/AutomatedTaxSetup';
import { TaxComplianceMonitor } from '@/components/tax/TaxComplianceMonitor';

export const SimplifiedTaxTab = () => {
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { getStripeAccount, createOnboardingLink, refreshAccountStatus } = useStripeConnect();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);

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
    } catch (error) {
      console.error('Failed to check Stripe account:', error);
      const localAccount = await getStripeAccount();
      setStripeAccount(localAccount);
    } finally {
      setCheckingStripe(false);
    }
  };

  // Locked state for users without Professional access
  if (!hasAccess) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Tax & Compliance</h1>
            <p className="text-muted-foreground mt-1">Automated VAT management for your business</p>
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
                  Automated VAT management is available for Professional and Enterprise users.
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

  // Show Stripe onboarding if not completed
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
                <h3 className="text-xl font-semibold mb-2">Complete Stripe Setup</h3>
                <p className="text-muted-foreground">
                  Go to the Pay & Book page to complete your Stripe onboarding before you can configure tax settings.
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
                <ArrowRight className="w-4 h-4 mr-2" />
                Go to Pay & Book
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Real-Data Tax Management UI
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Management</h1>
          <p className="text-muted-foreground mt-1">Real-time tax analytics and compliance</p>
        </div>
        <SyncServicesButton />
      </div>

      {/* Real-Data Tax Analytics Dashboard */}
      <TaxAnalyticsDashboard 
        calendarId={selectedCalendar?.id}
        accountId={stripeAccount?.stripe_account_id}
      />

      {/* Service Tax Management Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Service Tax Configuration
          </CardTitle>
          <CardDescription>
            Configure tax settings and rates for your services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enable tax collection and set rates for each service type to see them in your analytics.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                window.location.href = '/settings?tab=services';
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure Service Taxes
            </Button>
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
};