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
import { SimplifiedTaxStatusOverview } from '@/components/tax/SimplifiedTaxStatusOverview';
import { AutoTaxSetup } from '@/components/tax/AutoTaxSetup';
import { SimpleProductTaxManager } from '@/components/tax/SimpleProductTaxManager';

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
            <h1 className="text-2xl font-bold">Belasting & Compliance</h1>
            <p className="text-muted-foreground mt-1">Automatisch BTW beheer voor je bedrijf</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-8 text-center">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Professional Functie</h3>
                <p className="text-muted-foreground">
                  Automatisch BTW beheer is beschikbaar voor Professional en Enterprise gebruikers.
                </p>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade naar Professional
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
            <p className="text-muted-foreground">Controleren van Stripe account status...</p>
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
                <h3 className="text-xl font-semibold mb-2">Voltooi Stripe Setup</h3>
                <p className="text-muted-foreground">
                  Ga naar de Betaal & Boek pagina om je Stripe onboarding te voltooien voordat je belastinginstellingen kunt configureren.
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
                Ga naar Betaal & Boek
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Simplified Tax UI
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Belasting Setup</h1>
          <p className="text-muted-foreground mt-1">BTW configuratie voor je services</p>
        </div>
        <SyncServicesButton />
      </div>

      {/* Quick Status Overview */}
      <SimplifiedTaxStatusOverview 
        accountId={stripeAccount?.stripe_account_id}
        calendarId={selectedCalendar?.id}
      />

      {/* Auto Tax Setup for Dutch businesses */}
      <AutoTaxSetup 
        accountId={stripeAccount?.stripe_account_id}
        calendarId={selectedCalendar?.id}
      />

      {/* Simple Product Tax Manager */}
      <SimpleProductTaxManager
        accountId={stripeAccount?.stripe_account_id}
        calendarId={selectedCalendar?.id}
      />

      {/* Service Tax Management Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Service Belasting Instellingen
          </CardTitle>
          <CardDescription>
            Pas belastinginstellingen aan per service type
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Stel BTW gedrag (inclusief/exclusief) en belastingcodes in voor elk van je services.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                window.location.href = '/settings?tab=services';
              }}
            >
              <Settings className="w-4 h-4 mr-2" />
              Beheer Service Belastingen
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