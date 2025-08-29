import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  Shield, 
  Crown, 
  Lock, 
  CheckCircle,
  RefreshCw,
  Info,
  Code,
  Building2,
  FileSpreadsheet
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
import { useTaxConfiguration } from '@/hooks/useTaxConfiguration';
import { ServiceTypeTaxCodes } from '@/components/tax/ServiceTypeTaxCodes';

export const TaxTab = () => {
  const { userStatus } = useUserStatus();
  const { selectedCalendar } = useCalendarContext();
  const { settings } = usePaymentSettings(selectedCalendar?.id);
  const { checkAccess } = useAccessControl();
  const { toast } = useToast();
  const { isDeveloper } = useDeveloperAccess();
  const { getStripeAccount, createOnboardingLink, refreshAccountStatus } = useStripeConnect();
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [taxData, setTaxData] = useState<any>(null);
  const [taxSettings, setTaxSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [checkingStripe, setCheckingStripe] = useState(true);

  const { status: configStatus, loading: configLoading, refetch: refetchConfig } = useTaxConfiguration(selectedCalendar?.id);

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

      if (account?.onboarding_completed) {
        loadTaxData();
        loadTaxSettings();
      }
    } catch (error) {
      console.error('Failed to check Stripe account:', error);
      const localAccount = await getStripeAccount();
      setStripeAccount(localAccount);
    } finally {
      setCheckingStripe(false);
    }
  };

  const loadTaxSettings = async () => {
    try {
      const { getStripeMode } = await import('@/utils/stripeConfig');
      
      const { data, error } = await supabase.functions.invoke('get-tax-settings', {
        body: { test_mode: getStripeMode() === 'test' }
      });

      if (error) throw error;

      if (data?.success) {
        setTaxSettings(data);
      } else if (data?.code === 'UPGRADE_REQUIRED') {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Failed to load tax settings:', error);
      toast({
        title: "Error",
        description: "Failed to load tax settings",
        variant: "destructive",
      });
    }
  };

  const loadTaxData = async () => {
    setLoading(true);
    try {
      const { getStripeMode } = await import('@/utils/stripeConfig');
      
      const { data, error } = await supabase.functions.invoke('get-tax-data', {
        body: {
          calendar_id: selectedCalendar?.id,
          test_mode: getStripeMode() === 'test',
          start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString()
        }
      });

      if (error) throw error;

      if (data?.success) {
        setTaxData(data);
      } else if (data?.code === 'UPGRADE_REQUIRED') {
        setShowUpgradeModal(true);
      }
    } catch (error) {
      console.error('Failed to load tax data:', error);
      toast({
        title: "Error",
        description: "Failed to load tax data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshTaxData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadTaxSettings(),
        loadTaxData(),
        refetchConfig()
      ]);
      
      toast({
        title: "Success",
        description: "Tax data refreshed successfully"
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Error", 
        description: "Failed to refresh tax data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load with proper sequence
  useEffect(() => {
    if (hasAccess && selectedCalendar?.id && stripeAccount?.onboarding_completed) {
      loadTaxSettings();
      loadTaxData();
    }
  }, [hasAccess, selectedCalendar?.id, stripeAccount?.onboarding_completed]);

  // Re-check status when tab becomes visible
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && hasAccess && selectedCalendar?.id) {
        checkStripeAccountStatus();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [hasAccess, selectedCalendar?.id]);

  // Locked state for users without Professional access
  if (!hasAccess) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">BTW & Belastingbeheer</h1>
            <p className="text-muted-foreground mt-1">Geautomatiseerd belastingbeheer voor Nederland</p>
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
                  Geautomatiseerd BTW-beheer en belastingadministratie is beschikbaar voor Professional plan gebruikers en hoger.
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Wat je krijgt met Professional BTW-beheer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Automatische BTW-berekening</h4>
                    <p className="text-sm text-muted-foreground">BTW wordt automatisch berekend voor alle transacties (21% & 9%)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Internationale ondersteuning</h4>
                    <p className="text-sm text-muted-foreground">Juiste belastingtarieven voor klanten uit verschillende landen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Geautomatiseerde rapporten</h4>
                    <p className="text-sm text-muted-foreground">Genereer belastingrapporten voor eenvoudige aangifte</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Compliance monitoring</h4>
                    <p className="text-sm text-muted-foreground">Real-time compliance status en waarschuwingen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Automatische updates</h4>
                    <p className="text-sm text-muted-foreground">Automatische updates wanneer belastingtarieven wijzigen</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">Audit trail</h4>
                    <p className="text-sm text-muted-foreground">Volledige audit trail voor alle belasting-gerelateerde transacties</p>
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
            <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Stripe account status controleren...</p>
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
                <h3 className="text-xl font-semibold mb-2">Voltooi Stripe Onboarding</h3>
                <p className="text-muted-foreground">
                  Ga naar de Pay & Book pagina om je Stripe onboarding te voltooien voordat je belastinginstellingen configureert.
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
                Voltooi Stripe Onboarding
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
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">BTW & Belastingbeheer</CardTitle>
              <CardDescription>
                Geautomatiseerd belastingbeheer voor Nederlandse bedrijven
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
                Ververs Data
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
                onClick={() => loadTaxData()}
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

      {/* BTW-profiel (NL) - In-platform status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            BTW-profiel (Nederland)
          </CardTitle>
          <CardDescription>
            Status van je belastingconfiguratie voor Nederlandse BTW
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {taxSettings && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${stripeAccount?.onboarding_completed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-medium">Stripe Verbinding</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {stripeAccount?.onboarding_completed ? 'Verbonden en actief' : 'Onboarding vereist'}
                  </p>
                </div>
                
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${taxSettings.automaticTaxEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-medium">Automatische BTW</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {taxSettings.automaticTaxEnabled ? 'Geactiveerd' : 'Niet geactiveerd'}
                  </p>
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${(taxSettings.registrations || 0) > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-medium">BTW Registraties</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {taxSettings.registrations || 0} actieve registratie(s)
                  </p>
                </div>
              </div>
            )}
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Voor Express accounts wordt belastingbeheer binnen het platform afgehandeld. 
                Uitgebreide instellingen zijn automatisch geconfigureerd voor Nederlandse BTW-vereisten.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* Service Types BTW Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Service BTW-tarieven (Nederland)
          </CardTitle>
          <CardDescription>
            Configureer BTW-tarieven voor je services (21% standaard, 9% gereduceerd)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {selectedCalendar?.id ? (
            <ServiceTypeTaxCodes calendarId={selectedCalendar.id} />
          ) : (
            <p className="text-muted-foreground">Selecteer een kalender om BTW-tarieven te configureren.</p>
          )}
        </CardContent>
      </Card>

      {/* Threshold Monitoring */}
      <ConnectTaxThresholdMonitoring accountId={stripeAccount?.stripe_account_id} />

      {/* Tax Data Exports */}
      <TaxExportComponent accountId={stripeAccount?.stripe_account_id} />
    </div>
  );
};