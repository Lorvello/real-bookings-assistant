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
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Shield, ExternalLink, CheckCircle, AlertCircle, Loader2, Euro, Clock, RefreshCw, Check, ArrowRight, TestTube, RotateCcw, Info, ChevronDown, TrendingUp, Zap, Lock, X } from 'lucide-react';
import { FundFlowCard } from './FundFlowCard';
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
import { PaymentOptions } from '../payments/PaymentOptions';
import { supabase } from '@/integrations/supabase/client';

// Fixed: Removed StripeEmbeddedDashboard component

export function PaymentSettingsTab() {
  // Payment methods data with their fees
  const paymentMethodsFees = [{
    id: 'ideal',
    name: 'iDEAL',
    fee: '€0.29',
    feeType: 'fixed'
  }, {
    id: 'cards_eea',
    name: 'Cards (EEA)',
    fee: '1.5% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'cards_uk',
    name: 'Cards (UK)',
    fee: '2.5% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'cards_international',
    name: 'Cards (International)',
    fee: '3.25% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'apple_pay',
    name: 'Apple Pay',
    fee: '1.5% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'bancontact',
    name: 'Bancontact',
    fee: '€0.35',
    feeType: 'fixed'
  }, {
    id: 'blik',
    name: 'BLIK',
    fee: '1.6% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'twint',
    name: 'TWINT',
    fee: '1.9% + 0.30',
    feeType: 'percentage'
  }, {
    id: 'revolut_pay',
    name: 'Revolut Pay',
    fee: '1.5% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'sofort',
    name: 'Sofort',
    fee: '1.4% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'eps',
    name: 'EPS',
    fee: '1.6% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'przelewy24',
    name: 'Przelewy24',
    fee: '2.2% + €0.30',
    feeType: 'percentage'
  }, {
    id: 'pay_by_bank',
    name: 'Pay by Bank',
    fee: '1.5% + €0.20',
    feeType: 'percentage'
  }, {
    id: 'cartes_bancaires',
    name: 'Cartes Bancaires',
    fee: '1.5% + €0.25',
    feeType: 'percentage'
  }, {
    id: 'google_pay',
    name: 'Google Pay',
    fee: '1.5% + €0.25',
    feeType: 'percentage'
  }];

  // Helper functions for fee calculations
  const calculateTotalFee = (payoutType: 'standard' | 'instant', paymentMethod: string) => {
    const method = paymentMethodsFees.find(m => m.id === paymentMethod);
    if (!method) return 'N/A';

    // Platform fees
    const platformPercentage = 1.9;
    const platformFixed = payoutType === 'standard' ? 0.25 : 0.35;

    // Stripe processing fees
    const stripePercentage = payoutType === 'standard' ? 0.25 : 1.0;
    const stripeFixed = payoutType === 'standard' ? 0.10 : 0;
    if (method.feeType === 'fixed') {
      // For fixed fees like iDEAL (€0.29)
      const methodFixed = parseFloat(method.fee.replace(/[€£CHF]/g, '').replace(/[^0-9.]/g, ''));
      const totalPercentage = platformPercentage + stripePercentage;
      const totalFixed = platformFixed + stripeFixed + methodFixed;
      return `${totalPercentage}% + €${totalFixed.toFixed(2)}`;
    } else {
      // For percentage fees
      const parts = method.fee.split(' + ');
      const methodPercentage = parseFloat(parts[0].replace('%', ''));
      const methodFixed = parts[1] ? parseFloat(parts[1].replace(/[€£CHF]/g, '').replace(/[^0-9.]/g, '')) : 0;
      const totalPercentage = platformPercentage + stripePercentage + methodPercentage;
      const totalFixed = platformFixed + stripeFixed + methodFixed;
      return `${totalPercentage.toFixed(2)}% + €${totalFixed.toFixed(2)}`;
    }
  };
  const {
    selectedCalendar
  } = useCalendarContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    toast
  } = useToast();
  const {
    isAccountOwner,
    accountOwnerId,
    loading: roleLoading
  } = useAccountRole();
  const {
    settings,
    loading: settingsLoading,
    saving: settingsSaving,
    updateSettings,
    toggleSecurePayments,
    togglePaymentRequired,
    updatePaymentMethods,
    updatePayoutOption
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
  const [fundFlowOpen, setFundFlowOpen] = useState(false);
  const [currencyConversionModalOpen, setCurrencyConversionModalOpen] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['ideal']);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savingMethods, setSavingMethods] = useState(false);

  // Payout options state
  const [selectedPayoutOption, setSelectedPayoutOption] = useState<'standard' | 'instant'>('standard');
  const [hasUnsavedPayoutChanges, setHasUnsavedPayoutChanges] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ideal');
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

  // Load saved payment methods
  useEffect(() => {
    if (settings?.enabled_payment_methods) {
      setSelectedMethods(settings.enabled_payment_methods);
      setHasUnsavedChanges(false);
    }
    if (settings?.payout_option) {
      setSelectedPayoutOption(settings.payout_option);
      setHasUnsavedPayoutChanges(false);
    }
  }, [settings?.enabled_payment_methods, settings?.payout_option]);

  // Track changes to payment methods
  useEffect(() => {
    const original = settings?.enabled_payment_methods ?? [];
    const originalKey = [...original].sort().join(',');
    const currentKey = [...selectedMethods].sort().join(',');
    setHasUnsavedChanges(originalKey !== currentKey);
  }, [selectedMethods, settings?.enabled_payment_methods]);

  // Track changes to payout options
  useEffect(() => {
    const original = settings?.payout_option ?? 'standard';
    setHasUnsavedPayoutChanges(original !== selectedPayoutOption);
  }, [selectedPayoutOption, settings?.payout_option]);
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
        description: "Your Stripe account status has been updated."
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
        variant: "destructive"
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
          description: refreshedAccount.charges_enabled && refreshedAccount.payouts_enabled ? "Your account is fully set up and ready to accept payments." : "Account setup in progress. Some features may need additional verification."
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
        description: "Your Stripe connection has been reset. You can now connect a new account."
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
  const handleToggleMethod = (methodId: string) => {
    setSelectedMethods(prev => prev.includes(methodId) ? prev.filter(id => id !== methodId) : [...prev, methodId]);
  };
  const handleSavePaymentMethods = async () => {
    if (!selectedMethods.length) {
      toast({
        title: "Error",
        description: "Please select at least one payment method",
        variant: "destructive"
      });
      return;
    }
    setSavingMethods(true);
    try {
      // Save to database
      const success = await updatePaymentMethods(selectedMethods);
      if (!success) return;

      // Sync with Stripe if account is connected
      if (stripeAccount?.stripe_account_id && selectedCalendar?.id) {
        try {
          const {
            data,
            error
          } = await supabase.functions.invoke('sync-payment-methods', {
            body: {
              payment_methods: selectedMethods,
              calendar_id: selectedCalendar.id
            }
          });
          if (error) throw error;
        } catch (syncError) {
          console.warn('Stripe sync failed, but settings saved locally:', syncError);
        }
      }
      setHasUnsavedChanges(false);
      toast({
        title: "Success",
        description: "Payment methods saved successfully"
      });
    } catch (error) {
      console.error('Error saving payment methods:', error);
      toast({
        title: "Error",
        description: "Failed to save payment methods",
        variant: "destructive"
      });
    } finally {
      setSavingMethods(false);
    }
  };
  const handleSavePayoutOption = async (option: 'standard' | 'instant') => {
    setSavingMethods(true);
    try {
      const success = await updatePayoutOption(option);
      if (success) {
        setHasUnsavedPayoutChanges(false);
        toast({
          title: "Success",
          description: "Payout option saved successfully"
        });
      }
    } catch (error) {
      console.error('Error saving payout option:', error);
      toast({
        title: "Error",
        description: "Failed to save payout option",
        variant: "destructive"
      });
    } finally {
      setSavingMethods(false);
    }
  };
  const getAccountStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'restricted':
        return 'destructive';
      case 'disabled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  const getAccountStatusText = (account: BusinessStripeAccount) => {
    if (!account.onboarding_completed) return 'Setup Required';
    if (account.charges_enabled && account.payouts_enabled) return 'Active';
    if (account.charges_enabled) return 'Charges Only';
    return account.account_status.charAt(0).toUpperCase() + account.account_status.slice(1);
  };
  if (settingsLoading || roleLoading) {
    return <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  if (!isAccountOwner) {
    return <div className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Only account owners can manage payment settings. Contact your account owner to configure Stripe Connect and payment options.
          </AlertDescription>
        </Alert>
      </div>;
  }
  const hasStripeAccount = !!stripeAccount?.stripe_account_id;
  const isStripeSetupComplete = stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled && stripeAccount?.payouts_enabled;
  return <div className="space-y-6">
      {/* Stripe Mode Switcher (for development) */}
      {stripeConfig.isTestMode && <StripeModeSwitcher />}

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
            <Switch checked={settings?.secure_payments_enabled || false} onCheckedChange={toggleSecurePayments} disabled={settingsSaving || !isStripeSetupComplete} data-pay-book-toggle />
          </div>
          
          {settings?.secure_payments_enabled && !isStripeSetupComplete && <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {hasStripeAccount ? "Complete your Stripe account setup to enable Pay & Book" : "Connect your Stripe account to enable Pay & Book"}
                </p>
              </div>
            </div>}
        </CardContent>
      </Card>

      {/* Stripe Account Setup */}
      {accountLoading ? <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading account status...</span>
            </div>
          </CardContent>
        </Card> : isStripeSetupComplete ? <Card>
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
                  <button onClick={() => setResearchModal('no-shows')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Reduce no-shows dramatically
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('cashflow')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Faster access to your cash
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('compliance')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Secure & compliant payments
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('professionalism')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Present yourself as a professional business
                  </button>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3 italic">
                Click any benefit to learn more
              </p>
            </div>

            <div className="text-center py-3 space-y-4">
              <Button onClick={handleOpenStripeDashboard} disabled={stripeLoading} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-medium w-full max-w-xs">
                {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <ExternalLink className="h-4 w-4 mr-2" />
                Go To Dashboard
              </Button>


              {stripeConfig.isTestMode && <p className="text-xs text-orange-600">
                  <TestTube className="h-3 w-3 inline mr-1" />
                  Test mode - No real money will be processed
                </p>}
            </div>
          </CardContent>
        </Card> : hasStripeAccount ? <Card>
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
                      {stripeConfig.isTestMode && <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                          <TestTube className="h-3 w-3 mr-1" />
                          TEST MODE
                        </Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Environment: {stripeAccount.environment} | Updated: {new Date(stripeAccount.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      {stripeAccount.charges_enabled ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-amber-600" />}
                      <span>Charges {stripeAccount.charges_enabled ? 'Enabled' : 'Disabled'}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      {stripeAccount.payouts_enabled ? <CheckCircle className="h-3 w-3 text-green-600" /> : <AlertCircle className="h-3 w-3 text-amber-600" />}
                      <span>Payouts {stripeAccount.payouts_enabled ? 'Enabled' : 'Disabled'}</span>
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleRefreshAccount} disabled={stripeLoading}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                   {stripeAccount.onboarding_completed && <Button variant="outline" size="sm" onClick={handleOpenStripeDashboard} disabled={stripeLoading}>
                       <ExternalLink className="h-4 w-4 mr-1" />
                       Go To Dashboard
                     </Button>}
                  {stripeConfig.isTestMode && <Button variant="outline" size="sm" onClick={handleResetStripeConnection} disabled={stripeLoading}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>}
                </div>
              </div>

              {!stripeAccount.onboarding_completed && <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Setup Incomplete</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Complete your account setup to start accepting payments
                      </p>
                      <Button onClick={handleStartOnboarding} size="sm" disabled={stripeLoading} className="bg-green-600 hover:bg-green-700 text-white font-medium">
                        {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Complete Setup in Minutes
                      </Button>
                    </div>
                  </div>
                </div>}
            </div>
          </CardContent>
        </Card> : <Card>
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
                  <button onClick={() => setResearchModal('no-shows')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Reduce no-shows dramatically
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('cashflow')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Faster access to your cash
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('compliance')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
                    Secure & compliant payments
                  </button>
                </li>
                <li className="flex items-start space-x-3 text-sm group">
                  <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                  <button onClick={() => setResearchModal('professionalism')} className="text-left cursor-pointer hover:text-foreground transition-colors text-muted-foreground group-hover:text-foreground">
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
                {['Business bank account details', 'Business registration or tax ID', 'Valid ID of representative (passport or ID card)', 'Date of birth and address of representative', 'Beneficial ownership details (if applicable)'].map((requirement, index) => <li key={index} className="flex items-start space-x-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{requirement}</span>
                  </li>)}
              </ul>
            </div>

            <div className="text-center py-6">
              <Button onClick={handleStartOnboarding} disabled={stripeLoading} size="lg" className="bg-green-600 hover:bg-green-700 text-white font-medium">
                {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                Start Stripe Setup
              </Button>
              {stripeConfig.isTestMode && <p className="text-xs text-orange-600 mt-2">
                  <TestTube className="h-3 w-3 inline mr-1" />
                  Test mode - No real money will be processed
                </p>}
            </div>
          </CardContent>
        </Card>}

      {/* Pay & Book with Stripe Information Section */}
      {isStripeSetupComplete && <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Pay & Book with Stripe</CardTitle>
            </div>
            <CardDescription>
              Payment costs and configuration for your business
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment Methods */}
            <div className="bg-muted/50 p-6 rounded-lg">
              <h4 className="font-medium mb-6 text-foreground">Payment Methods</h4>
              <PaymentOptions selectedMethods={selectedMethods} onSelectionChange={setSelectedMethods} onSave={handleSavePaymentMethods} onFeesOpen={() => setFeesInfoOpen(true)} hasUnsavedChanges={hasUnsavedChanges} />
            </div>

            {/* Payout Options */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="mb-4">
                <h4 className="font-medium text-foreground">Payout Options</h4>
                <p className="text-sm text-muted-foreground">Choose how quickly you want to receive your payments</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Payout Card */}
                <div className="relative">
                  <input type="radio" id="standard-payout" name="payout-option" className="sr-only peer" checked={selectedPayoutOption === 'standard'} onChange={() => setSelectedPayoutOption('standard')} />
                  <label htmlFor="standard-payout" className="block cursor-pointer p-4 bg-background border-2 border-border rounded-lg transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-slate-800/50">
                    <div className="mb-2">
                      <div className="font-semibold text-foreground">Standard Payout</div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      3 business days to your business account
                    </div>
                    
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors group">
                           <span>View fee breakdown example</span>
                          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                         <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Booking Assistant platform fee:</span>
                            <span>1.9% + €0.25</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stripe processing fee:</span>
                            <span>0.25% + €0.10</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Transaction fee:</span>
                            <div className="flex items-center gap-2">
                              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                                <SelectTrigger className="w-32 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethodsFees.map(method => <SelectItem key={method.id} value={method.id} className="text-xs">
                                      {method.name}
                                    </SelectItem>)}
                                </SelectContent>
                              </Select>
                              <span>{paymentMethodsFees.find(m => m.id === selectedPaymentMethod)?.fee}</span>
                            </div>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                            <span className="font-medium">Total fee:</span>
                            <span className="text-primary font-medium">
                              {calculateTotalFee('standard', selectedPaymentMethod)}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </label>
                </div>

                {/* Instant Payout Card */}
                <div className="relative">
                  <input type="radio" id="instant-payout" name="payout-option" className="sr-only peer" checked={selectedPayoutOption === 'instant'} onChange={() => setSelectedPayoutOption('instant')} />
                  <label htmlFor="instant-payout" className="block cursor-pointer p-4 bg-background border-2 border-border rounded-lg transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-slate-800/50">
                    <div className="mb-2">
                      <div className="font-semibold text-foreground">Instant Payout</div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Direct within minutes
                    </div>
                    
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors group">
                          <span>View fee breakdown example</span>
                          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                         <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Booking Assistant platform fee:</span>
                            <span>1.9% + €0.35</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Stripe Instant Payout Processing Fee:</span>
                            <span>1%</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Transaction fee:</span>
                            <div className="flex items-center gap-2">
                              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                                <SelectTrigger className="w-32 h-6 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {paymentMethodsFees.map(method => <SelectItem key={method.id} value={method.id} className="text-xs">
                                      {method.name}
                                    </SelectItem>)}
                                </SelectContent>
                              </Select>
                              <span>{paymentMethodsFees.find(m => m.id === selectedPaymentMethod)?.fee}</span>
                            </div>
                          </div>
                          <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                            <span className="font-medium">Total fee:</span>
                            <span className="text-primary font-medium">
                              {calculateTotalFee('instant', selectedPaymentMethod)}
                            </span>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </label>
                </div>
              </div>
              
              {/* Summary with Save Button */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <span className="font-medium text-foreground">
                      Selected payout option: {selectedPayoutOption === 'standard' ? 'Standard (3 business days)' : 'Instant (within minutes)'}
                    </span>
                  </div>
                  <button onClick={() => handleSavePayoutOption(selectedPayoutOption)} disabled={!hasUnsavedPayoutChanges || savingMethods} aria-disabled={!hasUnsavedPayoutChanges || savingMethods} className={cn("px-4 py-2 text-sm font-medium rounded-md transition-colors", "bg-primary text-primary-foreground hover:bg-primary/90", (!hasUnsavedPayoutChanges || savingMethods) && "opacity-50 cursor-not-allowed hover:bg-primary")} title={!hasUnsavedPayoutChanges ? "Geen wijzigingen om op te slaan" : undefined}>
                    {savingMethods ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>

            {/* Fund Flow Section */}
            <Collapsible open={fundFlowOpen} onOpenChange={setFundFlowOpen}>
              <div className="bg-muted/30 border border-muted/40 p-3 rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-0.5">Fund Flow (How money moves)</h4>
                      <p className="text-xs text-muted-foreground">Understand the payment journey for your bookings</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${fundFlowOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-3 space-y-4">
              
                     {/* Redesigned flow diagram */}
                     <div className="mb-4">
                       <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
                  {/* Customer */}
                  <div className="flex flex-col items-center">
                    <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                      Customer
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center max-w-[120px]">Payment initiated in local currency</p>
                  </div>
                  
                         {/* First arrow with Platform Fee card */}
                         <div className="flex flex-col items-center gap-2 flex-1 px-2">
                           <div className="w-full border-t-2 border-dashed border-primary/30 relative">
                             <ArrowRight className="absolute -right-1 -top-2 h-4 w-4 text-primary/60" />
                           </div>
                           <FundFlowCard 
                             title="Payment Processing"
                             items={[
                               {
                                 label: "Currency Conversion",
                                 description: "+2% fee if payment currency differs from your account currency"
                               },
                               {
                                 label: "Payment Method Fee", 
                                 description: "Based on selected method (iDEAL: €0.29, Cards: 1.5-2.5% + €0.25)"
                               },
                               {
                                 label: "Platform Fee",
                                 description: "1.9% + €0.25/€0.35 deducted by Booking Assistant platform"
                               }
                             ]}
                             className="max-w-[200px]"
                           />
                         </div>
                  
                  {/* Connected Account */}
                  <div className="flex flex-col items-center">
                    <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                      Connected Account
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center max-w-[120px]">Gross funds received in account currency</p>
                  </div>
                  
                         {/* Second arrow with Stripe Processing Fee card */}
                         <div className="flex flex-col items-center gap-2 flex-1 px-2">
                           <div className="w-full border-t-2 border-dashed border-primary/30 relative">
                             <ArrowRight className="absolute -right-1 -top-2 h-4 w-4 text-primary/60" />
                           </div>
                           <FundFlowCard 
                             title="Stripe Processing"
                             items={[
                               {
                                 label: "Stripe Processing Fee",
                                 description: "0.25% + €0.10 for Standard Payout, 1% for Instant Payout"
                               }
                             ]}
                             className="max-w-[200px]"
                           />
                         </div>
                  
                  {/* Bank Account */}
                  <div className="flex flex-col items-center">
                    <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                      Bank Account
                    </div>
                      <p className="text-xs text-muted-foreground mt-2 text-center max-w-[120px]">Funds transferred (Standard or Instant payout)</p>
                    </div>
                      </div>
                    </div>
              
                    {/* Updated bullet points */}
                    <ul className="space-y-1.5 mb-3">
                      <li className="flex items-start space-x-2 text-xs">
                        <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">Payments always start with the customer's currency.</span>
                      </li>
                      <li className="flex items-start space-x-2 text-xs">
                        <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">If different from your account currency, Stripe applies a 2% conversion fee.</span>
                      </li>
                      <li className="flex items-start space-x-2 text-xs">
                        <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">Payment method fee, Stripe fee, and platform fee are all deducted automatically before payout.</span>
                      </li>
                      <li className="flex items-start space-x-2 text-xs">
                        <Check className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">Final payout = net balance transferred to your bank (Standard or Instant).</span>
                      </li>
                    </ul>
              
              {/* Learn more link */}
              
                    <button onClick={() => {
                  setFeesInfoOpen(true);
                  setTimeout(() => {
                    const feesSection = document.getElementById('fees-section');
                    if (feesSection) {
                      feesSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }
                  }, 100);
                }} className="text-xs text-primary hover:underline flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Learn more in Fees</span>
                    </button>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Fees Section */}
            <Collapsible open={feesInfoOpen} onOpenChange={setFeesInfoOpen}>
              <div id="fees-section" className="bg-muted/30 border border-muted/40 p-3 rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full text-left">
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-0.5">Fees</h4>
                      <p className="text-xs text-muted-foreground">Payment processing fees overview</p>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${feesInfoOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="mt-3 space-y-4">
                    {/* Payment Methods Fees - Table Layout */}
                     <div>
                       <h5 className="text-xs font-medium text-muted-foreground mb-3">Payment Methods Fees</h5>
                       <div className="bg-background/50 rounded-lg border border-border/40 overflow-hidden">
                         {/* Payment method rows with subtle separators */}
                          <div className="py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">iDEAL</span>
                            <span className="text-muted-foreground text-xs font-medium">€0.29</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                           <div className="flex items-center gap-2">
                             <span className="text-muted-foreground text-xs">Cards (EEA)</span>
                             <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                               <Info className="w-3 h-3 text-muted-foreground" />
                             </button>
                           </div>
                           <span className="text-muted-foreground text-xs font-medium">1.5% + €0.25</span>
                         </div>
                         
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Cards (UK)</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">2.5% + €0.25</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Cards (International)</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">3.25% + €0.25</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Apple Pay</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">Same as cards</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Bancontact</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">€0.35</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">BLIK</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">1.6% + €0.25</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">TWINT</span>
                            <span className="text-muted-foreground text-xs font-medium">1.9% + CHF 0.30</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">Revolut Pay</span>
                            <span className="text-muted-foreground text-xs font-medium">1.5% + €0.25</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">Sofort</span>
                            <span className="text-muted-foreground text-xs font-medium">1.4% + €0.25</span>
                          </div>
                         
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">EPS</span>
                            <span className="text-muted-foreground text-xs font-medium">1.6% + €0.25</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">Przelewy24</span>
                            <span className="text-muted-foreground text-xs font-medium">2.2% + €0.30</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <span className="text-muted-foreground text-xs">Pay by Bank</span>
                            <span className="text-muted-foreground text-xs font-medium">~1.5% + £0.20</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Cartes Bancaires</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">Same as cards</span>
                          </div>
                          
                          <div className="border-t border-border/20 py-2 px-3 flex justify-between items-center hover:bg-muted/20 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground text-xs">Google Pay</span>
                              <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-0.5 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                                <Info className="w-3 h-3 text-muted-foreground" />
                              </button>
                            </div>
                            <span className="text-muted-foreground text-xs font-medium">Same as cards</span>
                          </div>
                       </div>
                      </div>

                      {/* Currency Conversion Fee Info */}
                      <div className="border-t border-muted/40 pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="text-xs font-medium text-muted-foreground">Currency Conversion Fee</h5>
                          <button onClick={() => setCurrencyConversionModalOpen(true)} className="p-1 rounded-full hover:bg-muted transition-colors" aria-label="Currency conversion info">
                            <Info className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Additional 2% fee applies when customer payment currency differs from your account currency.
                        </p>
                      </div>

                      {/* Fee Structure Transparency */}
                      <div className="border-t border-muted/40 pt-3 mb-3">
                        <h5 className="text-xs text-muted-foreground mb-2">Fee Structure Transparency</h5>
                        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                          We believe in complete transparency about fees. Here's exactly how our pricing works:
                        </p>
                        <div className="space-y-2 text-xs text-muted-foreground">
                          <div>
                            <div className="mb-1">Stripe Processing Fees</div>
                            <div className="ml-3.5">
                              <div>• Standard payout: 0.25% + €0.10 per transaction</div>
                              <div>• Instant payout: 1% per transaction</div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1">Platform Fees</div>
                            <div className="ml-3.5">
                              <div>• Standard payout: 1.9% + €0.25 per booking</div>
                              <div>• Instant payout: 1.9% + €0.35 per booking</div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-1">Payment Method Fees</div>
                            <div className="ml-3.5">
                              Vary by payment method (e.g., iDEAL €0.29, Card fees vary)
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 p-2 bg-muted/30 rounded border border-muted/40">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            These fees cover secure payment processing, instant payouts when selected, and platform maintenance including booking management and customer support.
                          </p>
                        </div>
                      </div>

                      {/* Fee Impact Example */}
                     <div className="border-t border-muted/40 pt-3">
                      <h5 className="text-xs font-medium text-muted-foreground mb-2">Fee Impact Example</h5>
                      <div className="bg-background/50 p-2 rounded border border-muted/40">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Booking amount:</span>
                            <span className="text-muted-foreground">€100.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment method fee (iDEAL):</span>
                            <span className="text-muted-foreground">-€0.29</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (1.9% + €0.25):</span>
                            <span className="text-muted-foreground">-€2.15</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stripe processing (0.25% + €0.10):</span>
                            <span className="text-muted-foreground">-€0.35</span>
                          </div>
                          <div className="border-t border-muted/40 pt-1 mt-1 flex justify-between">
                            <span className="text-muted-foreground font-medium">Net payout:</span>
                            <span className="text-muted-foreground font-medium">€97.21</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 opacity-75">
                        All fees are deducted from your total booking amount before payout
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          </CardContent>
        </Card>}

      {/* Payment Configuration */}
      {settings?.secure_payments_enabled && isStripeSetupComplete && <Card>
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
              <Switch checked={settings?.payment_required_for_booking || false} onCheckedChange={togglePaymentRequired} disabled={settingsSaving} />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform-fee" className="flex items-center space-x-2">
                  <Euro className="h-4 w-4" />
                  <span>Platform Fee (%)</span>
                </Label>
                <Input id="platform-fee" type="number" step="0.01" min="0" max="10" value={platformFee} onChange={e => setPlatformFee(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Fee charged per transaction (max 10%)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-deadline" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Payment Deadline (hours)</span>
                </Label>
                <Input id="payment-deadline" type="number" min="1" max="168" value={paymentDeadline} onChange={e => setPaymentDeadline(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Time limit for payment after booking (max 7 days)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-policy">Refund Policy</Label>
              <Textarea id="refund-policy" placeholder="Describe your refund policy for customers..." value={refundPolicy} onChange={e => setRefundPolicy(e.target.value)} rows={3} />
              <p className="text-xs text-muted-foreground">
                This will be shown to customers during payment
              </p>
            </div>

            <Button onClick={handleUpdateSettings} disabled={settingsSaving} className="w-full">
              {settingsSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Payment Settings
            </Button>
          </CardContent>
        </Card>}


      {/* Research Modal */}
      <ResearchModal type={researchModal} onClose={() => setResearchModal(null)} />

      {/* Embedded Onboarding Modal */}
      {showEmbeddedOnboarding && <StripeEmbeddedOnboardingModal isOpen={showEmbeddedOnboarding} onComplete={() => {
      // Refresh account status after completion
      refreshAccountStatus().then(account => {
        if (account) {
          setStripeAccount(account);
        }
      });
      setShowEmbeddedOnboarding(false);
      toast({
        title: "Setup Complete!",
        description: "Your Stripe account is ready to accept payments."
      });
    }} onClose={() => setShowEmbeddedOnboarding(false)} />}

      {/* Currency Conversion Modal */}
      {currencyConversionModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setCurrencyConversionModalOpen(false)}>
          <div className="relative w-full max-w-[calc(100vw-32px)] sm:max-w-md bg-background rounded-2xl border shadow-lg" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Currency Conversion Fee
              </h2>
              <button onClick={() => setCurrencyConversionModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    Stripe applies an additional 2% fee if the payment currency differs from your account currency.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    <strong>Example:</strong> A UK customer pays £100 in GBP → funds are converted to EUR with a 2% markup on the exchange rate.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    This fee is charged on top of the normal payment processing fee.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    Customers always see the charge in their own currency; the conversion happens on your side as the merchant.
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-foreground">
                    If the customer pays in the same currency as your account (e.g., EUR), this fee does not apply.
                  </span>
                </div>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      <strong>Tip:</strong> To avoid this fee, try to charge in the same currency as your Stripe account.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>}

    </div>;
}