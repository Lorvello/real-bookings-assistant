import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CreditCard, 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Euro,
  Clock,
  RefreshCw,
  Check,
  ArrowRight,
  TestTube,
  RotateCcw,
  Info,
  ChevronDown,
  TrendingUp,
  Zap,
  Lock
} from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { useAccountRole } from '@/hooks/useAccountRole';
import { ResearchModal } from './ResearchModal';
import { StripeEmbeddedOnboardingModal } from './StripeEmbeddedOnboardingModal';
import { StripeModeSwitcher } from '@/components/developer/StripeModeSwitcher';
import { getStripeConfig } from '@/utils/stripeConfig';
import { useToast } from '@/hooks/use-toast';
import type { BusinessStripeAccount } from '@/types/payments';

// Fixed: Removed StripeEmbeddedDashboard component

export function PaymentSettingsTab() {
  const { selectedCalendar } = useCalendarContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAccountOwner, accountOwnerId, loading: roleLoading } = useAccountRole();
  const {
    settings,
    loading: settingsLoading,
    saving: settingsSaving,
    updateSettings,
    toggleSecurePayments,
    togglePaymentRequired
  } = usePaymentSettings(selectedCalendar?.id);
  
  const {
    loading: stripeLoading,
    getStripeAccount,
    refreshAccountStatus,
    createLoginLink,
    createOnboardingLink,
    resetStripeAccount
  } = useStripeConnect();

  const [stripeAccount, setStripeAccount] = useState<BusinessStripeAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [platformFee, setPlatformFee] = useState('2.50');
  const [paymentDeadline, setPaymentDeadline] = useState('24');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [researchModal, setResearchModal] = useState<'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null>(null);
  const [showEmbeddedOnboarding, setShowEmbeddedOnboarding] = useState(false);
  const [feesInfoOpen, setFeesInfoOpen] = useState(false);
  
  const stripeConfig = getStripeConfig();

  useEffect(() => {
    if (isAccountOwner && accountOwnerId && !roleLoading) {
      console.log('[PAYMENT SETTINGS] Loading Stripe account for owner:', accountOwnerId);
      loadStripeAccount();
      
      // Handle return from Stripe onboarding
      const success = searchParams.get('success');
      const refresh = searchParams.get('refresh');
      
      if (success === 'true' || refresh === 'true') {
        // Clear URL parameters
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('success');
        newParams.delete('refresh');
        setSearchParams(newParams);
        
        // Refresh account status after short delay
        setTimeout(() => {
          handleRefreshAccount();
        }, 1000);
      }
    }
  }, [isAccountOwner, accountOwnerId, roleLoading, searchParams, setSearchParams]);

  useEffect(() => {
    if (settings) {
      setPlatformFee(settings.platform_fee_percentage.toString());
      setPaymentDeadline(settings.payment_deadline_hours.toString());
      setRefundPolicy(settings.refund_policy_text || '');
    }
  }, [settings]);

  const loadStripeAccount = async () => {
    setAccountLoading(true);
    console.log('[PAYMENT SETTINGS] Loading Stripe account...');
    
    try {
      const account = await getStripeAccount();
      console.log('[PAYMENT SETTINGS] Stripe account loaded:', {
        hasAccount: !!account,
        accountId: account?.stripe_account_id,
        onboarding_completed: account?.onboarding_completed,
        charges_enabled: account?.charges_enabled,
        payouts_enabled: account?.payouts_enabled
      });
      setStripeAccount(account);
    } catch (error) {
      console.error('[PAYMENT SETTINGS] Error loading Stripe account:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleRefreshAccount = async () => {
    const account = await refreshAccountStatus();
    if (account) {
      setStripeAccount(account);
      toast({
        title: "Account status refreshed",
        description: "Your Stripe account status has been updated.",
      });
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const url = await createLoginLink();
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    }
  };

  const handleStartOnboarding = async () => {
    setShowEmbeddedOnboarding(true);
  };

  const handleOnboardingComplete = async () => {
    setShowEmbeddedOnboarding(false);
    // Immediately refresh account status after onboarding completion
    console.log('[PAYMENT SETTINGS] Onboarding completed, refreshing account status...');
    
    try {
      const refreshedAccount = await refreshAccountStatus();
      if (refreshedAccount) {
        setStripeAccount(refreshedAccount);
        console.log('[PAYMENT SETTINGS] Account refreshed:', {
          onboarding_completed: refreshedAccount.onboarding_completed,
          charges_enabled: refreshedAccount.charges_enabled,
          payouts_enabled: refreshedAccount.payouts_enabled
        });
        
        // Show success toast
        toast({
          title: "Stripe setup completed!",
          description: refreshedAccount.charges_enabled && refreshedAccount.payouts_enabled 
            ? "Your account is fully set up and ready to accept payments."
            : "Account setup in progress. Some features may need additional verification.",
        });
      }
    } catch (error) {
      console.error('[PAYMENT SETTINGS] Error refreshing account:', error);
      // Fallback to regular load
      setTimeout(() => {
        loadStripeAccount();
      }, 2000);
    }
  };

  const handleResetStripeConnection = async () => {
    const success = await resetStripeAccount();
    if (success) {
      setStripeAccount(null);
      toast({
        title: "Stripe account reset",
        description: "Your Stripe connection has been reset. You can now connect a new account.",
      });
      // Refresh to show the setup flow again
      await loadStripeAccount();
    }
  };

  const handleUpdateSettings = async () => {
    await updateSettings({
      platform_fee_percentage: parseFloat(platformFee),
      payment_deadline_hours: parseInt(paymentDeadline),
      refund_policy_text: refundPolicy
    });
  };

  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending': return 'secondary';
      case 'restricted': return 'destructive';
      case 'disabled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getAccountStatusText = (account: BusinessStripeAccount) => {
    if (!account.onboarding_completed) return 'Setup Required';
    if (account.charges_enabled && account.payouts_enabled) return 'Active';
    if (account.charges_enabled) return 'Charges Only';
    return account.account_status.charAt(0).toUpperCase() + account.account_status.slice(1);
  };

  if (settingsLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAccountOwner) {
    return (
      <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Only account owners can manage payment settings. Contact your account owner to configure Stripe Connect and payment options.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasStripeAccount = !!stripeAccount?.stripe_account_id;
  const isStripeSetupComplete = stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled;

  return (
    <div className="space-y-6">
      {/* Stripe Mode Switcher (for development) */}
      {stripeConfig.isTestMode && (
        <StripeModeSwitcher />
      )}

      {/* Feature Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Pay & Book</CardTitle>
          </div>
          <CardDescription>
            Enable secure pre-payments for your bookings to reduce no-shows and secure revenue upfront.
            Powered by Stripe Connect for seamless payouts to your business account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Pay & Book</Label>
              <div className="text-sm text-muted-foreground">
                Allow customers to pay for bookings upfront through WhatsApp
              </div>
            </div>
            <Switch
              checked={settings?.secure_payments_enabled || false}
              onCheckedChange={toggleSecurePayments}
              disabled={settingsSaving || !isStripeSetupComplete}
              data-pay-book-toggle
            />
          </div>
          
          {settings?.secure_payments_enabled && !isStripeSetupComplete && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {hasStripeAccount 
                    ? "Complete your Stripe account setup to enable Pay & Book"
                    : "Connect your Stripe account to enable Pay & Book"
                  }
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Account Setup */}
      {accountLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading account status...</span>
            </div>
          </CardContent>
        </Card>
      ) : isStripeSetupComplete ? (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Stripe Account</CardTitle>
            </div>
            <CardDescription>
              Receive payments directly to your business account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Why we recommend this */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-foreground flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Why we recommend this</span>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Upfront payments transform the way businesses operate:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('no-shows')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Reduce no-shows dramatically
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('cashflow')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Faster access to your cash
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('compliance')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Secure & compliant payments
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('professionalism')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Present yourself as a professional business
                  </button>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Click any benefit to learn more
              </p>
            </div>

            <div className="text-center py-6 space-y-4">
              <Button 
                onClick={handleOpenStripeDashboard}
                disabled={stripeLoading}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-medium w-full max-w-xs"
              >
                {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <ExternalLink className="h-4 w-4 mr-2" />
                Go To Dashboard
              </Button>


              {stripeConfig.isTestMode && (
                <p className="text-xs text-orange-600">
                  <TestTube className="h-3 w-3 inline mr-1" />
                  Test mode - No real money will be processed
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : hasStripeAccount ? (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Stripe Account</CardTitle>
            </div>
            <CardDescription>
              Receive payments directly to your business account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">Account Status</p>
                    <Badge variant={getAccountStatusColor(stripeAccount.account_status)}>
                      {getAccountStatusText(stripeAccount)}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Account ID: {stripeAccount.stripe_account_id}
                      {stripeConfig.isTestMode && (
                        <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                          <TestTube className="h-3 w-3 mr-1" />
                          TEST MODE
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Environment: {stripeAccount.environment} | Updated: {new Date(stripeAccount.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      {stripeAccount.charges_enabled ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                      )}
                      <span>Charges {stripeAccount.charges_enabled ? 'Enabled' : 'Disabled'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      {stripeAccount.payouts_enabled ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <AlertCircle className="h-3 w-3 text-amber-600" />
                      )}
                      <span>Payouts {stripeAccount.payouts_enabled ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAccount}
                    disabled={stripeLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                   {stripeAccount.onboarding_completed && (
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleOpenStripeDashboard}
                       disabled={stripeLoading}
                     >
                       <ExternalLink className="h-4 w-4 mr-1" />
                       Go To Dashboard
                     </Button>
                   )}
                  {stripeConfig.isTestMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetStripeConnection}
                      disabled={stripeLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {!stripeAccount.onboarding_completed && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Setup Incomplete</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Complete your account setup to start accepting payments
                      </p>
                      <Button 
                        onClick={handleStartOnboarding} 
                        size="sm"
                        disabled={stripeLoading}
                        className="bg-green-600 hover:bg-green-700 text-white font-medium"
                      >
                        {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Complete Setup in Minutes
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Stripe Account</CardTitle>
            </div>
            <CardDescription>
              Receive payments directly to your business account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Why we recommend this */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-foreground flex items-center space-x-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Why we recommend this</span>
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Upfront payments transform the way businesses operate:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('no-shows')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Reduce no-shows dramatically
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('cashflow')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Faster access to your cash
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('compliance')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Secure & compliant payments
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button 
                    onClick={() => setResearchModal('professionalism')}
                    className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground"
                  >
                    Present yourself as a professional business
                  </button>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Click any benefit to learn more
              </p>
            </div>

            {/* What you'll need */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-3 text-foreground">What you'll need</h4>
              <ul className="space-y-2">
                {[
                  'Business bank account details',
                  'Business registration or tax ID', 
                  'Valid ID of representative (passport or ID card)',
                  'Date of birth and address of representative',
                  'Beneficial ownership details (if applicable)'
                ].map((requirement, index) => (
                  <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center py-6">
              <Button 
                onClick={handleStartOnboarding}
                disabled={stripeLoading}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
              >
                {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                Start Stripe Setup
              </Button>
              {stripeConfig.isTestMode && (
                <p className="text-xs text-orange-600 mt-2">
                  <TestTube className="h-3 w-3 inline mr-1" />
                  Test mode - No real money will be processed
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pay & Book with Stripe Information Section */}
      {isStripeSetupComplete && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Pay & Book met Stripe</CardTitle>
            </div>
            <CardDescription>
              Transparant overzicht van kosten en hoe het werkt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Introductie */}
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Als ondernemer krijg je een volledig <strong>Stripe Dashboard</strong> waarin je alle uitbetalingen, 
                uitgaven en transacties kunt bekijken. Stripe zorgt voor veilige betalingen en automatische uitbetalingen naar je zakelijke rekening.
              </p>
            </div>

            {/* Fees Overzicht en Meer Informatie */}
            <div className="space-y-4">
              <Collapsible open={feesInfoOpen} onOpenChange={setFeesInfoOpen}>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-foreground">Kostenoverzicht</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="p-1">
                      <Info className="h-4 w-4 mr-1" />
                      Meer informatie
                      <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${feesInfoOpen ? 'rotate-180' : ''}`} />
                    </Button>
                  </CollapsibleTrigger>
                </div>

                {/* Fees Tabel */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Type Kosten</TableHead>
                          <TableHead className="min-w-[120px]">Standaard Uitbetaling</TableHead>
                          <TableHead className="min-w-[120px]">Instant Uitbetaling</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Platform fee</TableCell>
                          <TableCell>1,9% + €0,25</TableCell>
                          <TableCell>1,9% + €0,35</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Stripe uitbetaling</TableCell>
                          <TableCell>0,25% + €0,10</TableCell>
                          <TableCell>1%</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">iDEAL betaling</TableCell>
                          <TableCell>€0,29</TableCell>
                          <TableCell>€0,29</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <CollapsibleContent className="space-y-4">
                  {/* Uitgebreide Informatie */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Uitbetalingen */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <h5 className="font-medium">Uitbetalingen</h5>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>Standaard uitbetaling:</strong> 2-3 werkdagen naar je zakelijke rekening</p>
                        <p><strong>Instant uitbetaling:</strong> Direct op je rekening binnen enkele minuten</p>
                        <p>Alle fees worden automatisch verrekend voor uitbetaling.</p>
                      </div>
                    </div>

                    {/* Veiligheid */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-green-600" />
                        <h5 className="font-medium">Veiligheid</h5>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>PCI-DSS gecertificeerd:</strong> Hoogste veiligheidsnormen</p>
                        <p><strong>End-to-end encryptie:</strong> Kaartgegevens volledig beveiligd</p>
                        <p><strong>Fraud detectie:</strong> Automatische bescherming tegen fraude</p>
                      </div>
                    </div>
                  </div>

                  {/* Voordelen */}
                  <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-3">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <h5 className="font-medium text-green-800 dark:text-green-200">Voordelen voor jouw business</h5>
                    </div>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                      <li>• <strong>Voorspelbare cashflow:</strong> Geld direct binnen na betaling</li>
                      <li>• <strong>Lagere no-shows:</strong> Klanten verschijnen vaker als ze vooraf betalen</li>
                      <li>• <strong>Veilige betalingen:</strong> Klanten betalen via vertrouwde WhatsApp link</li>
                      <li>• <strong>Professionele uitstraling:</strong> Moderne betaalervaring voor klanten</li>
                    </ul>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Call to Action */}
            <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 p-6 rounded-lg text-center">
              <div className="flex items-center justify-center space-x-2 mb-3">
                <Zap className="h-5 w-5 text-primary" />
                <h4 className="font-semibold text-foreground">Begin vandaag nog</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Activeer veilig vooraf betalen en verbeter je cashflow direct
              </p>
              <Button 
                onClick={() => {
                  // Scroll to the Pay & Book toggle at the top
                  document.querySelector('[data-pay-book-toggle]')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white"
              >
                Activeer Pay & Book in jouw dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Configuration */}
      {settings?.secure_payments_enabled && isStripeSetupComplete && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Configuration</CardTitle>
            <CardDescription>
              Configure payment policies and requirements for your bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Require Payment for Booking</Label>
                <div className="text-sm text-muted-foreground">
                  Payment must be completed before booking is confirmed
                </div>
              </div>
              <Switch
                checked={settings?.payment_required_for_booking || false}
                onCheckedChange={togglePaymentRequired}
                disabled={settingsSaving}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform-fee" className="flex items-center space-x-2">
                  <Euro className="h-4 w-4" />
                  <span>Platform Fee (%)</span>
                </Label>
                <Input
                  id="platform-fee"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Fee charged per transaction (max 10%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-deadline" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Payment Deadline (hours)</span>
                </Label>
                <Input
                  id="payment-deadline"
                  type="number"
                  min="1"
                  max="168"
                  value={paymentDeadline}
                  onChange={(e) => setPaymentDeadline(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Time limit for payment after booking (max 7 days)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-policy">Refund Policy</Label>
              <Textarea
                id="refund-policy"
                placeholder="Describe your refund policy for customers..."
                value={refundPolicy}
                onChange={(e) => setRefundPolicy(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                This will be shown to customers during payment
              </p>
            </div>

            <Button
              onClick={handleUpdateSettings}
              disabled={settingsSaving}
              className="w-full"
            >
              {settingsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Payment Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Account-level info */}
      <div className="text-xs text-muted-foreground bg-muted/30 border border-muted rounded p-2 flex items-center space-x-2">
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>Payment settings are managed at the account level and apply to all team members and calendars.</span>
      </div>

      {/* Research Modal */}
      <ResearchModal 
        type={researchModal} 
        onClose={() => setResearchModal(null)} 
      />

      {/* Embedded Onboarding Modal */}
      {showEmbeddedOnboarding && (
        <StripeEmbeddedOnboardingModal
          isOpen={showEmbeddedOnboarding}
          onComplete={() => {
            // Refresh account status after completion
            refreshAccountStatus().then((account) => {
              if (account) {
                setStripeAccount(account);
              }
            });
            setShowEmbeddedOnboarding(false);
            toast({
              title: "Setup Complete!",
              description: "Your Stripe account is ready to accept payments.",
            });
          }}
          onClose={() => setShowEmbeddedOnboarding(false)}
        />
      )}

    </div>
  );
}