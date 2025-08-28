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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Lock,
  Play,
  Building2,
  Lightbulb,
  Users,
  Link,
  Activity,
  Webhook,
  AlertTriangle,
  Globe,
  BarChart
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
import { PaymentOptions } from '../payments/PaymentOptions';

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
  const [payBookEnabled, setPayBookEnabled] = useState(settings?.secure_payments_enabled || false);
  
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
      setPayBookEnabled(settings.secure_payments_enabled || false);
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

  const handleConnect = async () => {
    await handleStartOnboarding();
  };

  const handleOpenDashboard = async () => {
    await handleOpenStripeDashboard();
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
      {/* Live Readiness Strip */}
      <div className="flex items-center justify-between p-3 bg-muted/30 border border-muted rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span className="text-sm font-medium">Mode: Test</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => {
            alert('Test payments allow you to verify your integration without real money. Use test card numbers from Stripe documentation.');
          }}
        >
          <Play className="h-3 w-3 mr-1" />
          Run a test payment
        </Button>
      </div>

      {/* Setup Group */}
      <div className="space-y-6">
        <div className="border-l-4 border-primary pl-4">
          <h3 className="text-lg font-semibold text-foreground">Setup</h3>
          <p className="text-sm text-muted-foreground">Connect your account and enable payments</p>
        </div>

        {/* Stripe Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Stripe Account</span>
            </CardTitle>
            <CardDescription>
              Connect your Stripe account to process payments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stripeAccount ? (
                <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Connected</p>
                      <p className="text-sm text-green-700">
                        Account ID: {stripeAccount.stripe_account_id}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenDashboard}
                    disabled={stripeLoading}
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    {stripeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Go To Dashboard
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">Not Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Connect your Stripe account to start accepting payments
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={stripeLoading}
                    size="sm"
                  >
                    {stripeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Link className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pay & Book Toggle */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Pay & Book</span>
                </CardTitle>
                <CardDescription>
                  Enable payment collection during booking process
                </CardDescription>
              </div>
              <Switch
                checked={payBookEnabled}
                onCheckedChange={(checked) => {
                  setPayBookEnabled(checked);
                  toggleSecurePayments(checked);
                }}
                disabled={settingsSaving || !isStripeSetupComplete}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Why we recommend this */}
        {payBookEnabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <span>Why we recommend this</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Reduce No-Shows</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Customers who pay upfront are 80% more likely to attend their appointment
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Increase Revenue</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Immediate payment collection improves cash flow and reduces payment delays
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Better Experience</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Seamless booking and payment in one step creates a professional impression
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {payBookEnabled && (
        <>
          {/* Configure Group */}
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold text-foreground">Configure</h3>
              <p className="text-sm text-muted-foreground">Set up payment methods and payout preferences</p>
            </div>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Methods</span>
                </CardTitle>
                <CardDescription>
                  Choose which payment methods to offer your customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentOptions 
                  selectedMethods={['ideal']}
                  onSelectionChange={(methods) => {
                    console.log('Selected payment methods:', methods);
                  }}
                  onFeesOpen={() => setFeesInfoOpen(true)}
                />
              </CardContent>
            </Card>

            {/* Payout Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Payout Options</span>
                </CardTitle>
                <CardDescription>
                  Choose how quickly you want to receive your payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Standard Payout Card */}
                  <div className="relative">
                    <input 
                      type="radio" 
                      id="standard-payout" 
                      name="payout-option" 
                      className="sr-only peer" 
                      defaultChecked 
                    />
                    <label 
                      htmlFor="standard-payout" 
                      className="block cursor-pointer p-4 bg-background border-2 border-border rounded-lg transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5"
                    >
                      <div className="mb-2">
                        <div className="font-semibold text-foreground">Standard Payout</div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        3 business days to your business account
                      </div>
                      
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors group">
                            <span>View fee breakdown</span>
                            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Platform fee:</span>
                              <span>1.9% + €0.25</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Stripe processing fee:</span>
                              <span>0.25% + €0.10</span>
                            </div>
                            <div className="flex justify-between">
                              <span>iDEAL transaction fee:</span>
                              <span>€0.29</span>
                            </div>
                            <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                              <span className="font-medium">Total fee:</span>
                              <span className="text-primary font-medium">2.15% + €0.64</span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </label>
                  </div>

                  {/* Instant Payout Card */}
                  <div className="relative">
                    <input 
                      type="radio" 
                      id="instant-payout" 
                      name="payout-option" 
                      className="sr-only peer" 
                    />
                    <label 
                      htmlFor="instant-payout" 
                      className="block cursor-pointer p-4 bg-background border-2 border-border rounded-lg transition-all duration-200 hover:border-primary/50 peer-checked:border-primary peer-checked:bg-primary/5"
                    >
                      <div className="mb-2">
                        <div className="font-semibold text-foreground flex items-center space-x-2">
                          <span>Instant Payout</span>
                          <Zap className="h-4 w-4 text-yellow-500" />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        Direct within minutes
                      </div>
                      
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <div className="flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors group">
                            <span>View fee breakdown</span>
                            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 pt-2 border-t border-border/50">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Platform fee:</span>
                              <span>1.9% + €0.35</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Stripe Instant Payout fee:</span>
                              <span>1%</span>
                            </div>
                            <div className="flex justify-between">
                              <span>iDEAL transaction fee:</span>
                              <span>€0.29</span>
                            </div>
                            <div className="flex justify-between border-t border-border/50 pt-1 mt-1">
                              <span className="font-medium">Total fee:</span>
                              <span className="text-primary font-medium">2.9% + €0.64</span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monitor & Transparency Group */}
          <div className="space-y-6">
            <div className="border-l-4 border-primary pl-4">
              <h3 className="text-lg font-semibold text-foreground">Monitor & Transparency</h3>
              <p className="text-sm text-muted-foreground">Track fees, money flow, and account health</p>
            </div>

            {/* Fees Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Euro className="h-5 w-5" />
                      <span>Fees</span>
                    </CardTitle>
                    <CardDescription>
                      Complete breakdown of payment processing costs
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setFeesInfoOpen(!feesInfoOpen)}
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${feesInfoOpen ? 'rotate-180' : ''}`} />
                    {feesInfoOpen ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
              </CardHeader>
              <Collapsible open={feesInfoOpen} onOpenChange={setFeesInfoOpen}>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Payment Methods Fees */}
                    <div>
                      <h5 className="text-sm font-medium text-foreground mb-3">Payment Method Fees</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">iDEAL</span>
                          <span className="text-muted-foreground">€0.29</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Cards (EU)</span>
                          <span className="text-muted-foreground">1.5% + €0.25</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Apple Pay / Google Pay</span>
                          <span className="text-muted-foreground">Same as cards</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Bancontact</span>
                          <span className="text-muted-foreground">€0.35</span>
                        </div>
                      </div>
                    </div>

                    {/* Fee Impact Example */}
                    <div className="border-t pt-4">
                      <h5 className="text-sm font-medium text-foreground mb-3">Fee Impact Example</h5>
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Booking amount:</span>
                            <span className="font-medium">€100.00</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Platform fee (1.9% + €0.25):</span>
                            <span className="text-red-600">-€2.15</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Stripe processing (0.25% + €0.10):</span>
                            <span className="text-red-600">-€0.35</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment method fee (iDEAL):</span>
                            <span className="text-red-600">-€0.29</span>
                          </div>
                          <div className="border-t pt-2 mt-2 flex justify-between">
                            <span className="font-medium">Net payout:</span>
                            <span className="font-medium text-green-600">€97.21</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* Fund Flow Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowRight className="h-5 w-5" />
                  <span>Fund Flow (How money moves)</span>
                </CardTitle>
                <CardDescription>
                  Visual overview of payment processing flow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Flow Diagram */}
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg overflow-x-auto">
                    <div className="flex items-center space-x-3 min-w-max">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium whitespace-nowrap">Customer</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-medium whitespace-nowrap">Connected Account</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span className="text-xs font-medium whitespace-nowrap">Fees Deducted</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-xs font-medium whitespace-nowrap">Available Balance</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                        <span className="text-xs font-medium whitespace-nowrap">Your Bank</span>
                      </div>
                    </div>
                  </div>

                  {/* Explanation Points */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">Payments go from the customer directly to your Connected Account.</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">Stripe fees and our platform fee are automatically deducted before payout.</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">Choose Standard (cheapest) or Instant (fastest) payout in "Payout Options".</span>
                    </div>
                    <div className="flex items-start space-x-2 text-sm">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-muted-foreground">
                        For fee amounts, see the{' '}
                        <button 
                          onClick={() => setFeesInfoOpen(true)}
                          className="text-primary hover:underline"
                        >
                          Fees section
                        </button>.
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stripe Health & Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Stripe Health & Compliance</span>
                </CardTitle>
                <CardDescription>
                  Monitor account status and webhook reliability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Status */}
                <div>
                  <h4 className="font-medium text-sm mb-3">Account Status</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Charges</div>
                        <div className="text-sm font-medium">Enabled</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Payouts</div>
                        <div className="text-sm font-medium">Enabled</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="text-xs text-muted-foreground">Instant Payouts</div>
                        <div className="text-sm font-medium">Eligible</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={handleOpenDashboard}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open in Stripe Dashboard
                    </Button>
                  </div>
                </div>

                {/* Webhook Health */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-sm mb-3">Webhook Health</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Last 24 hours</div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>47 Delivered</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span>0 Failed</span>
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Retry last failed
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Healthy webhooks keep your bookings and payouts in sync.</span>
                      <Button variant="link" size="sm" className="h-auto p-0" onClick={handleOpenDashboard}>
                        View logs in Stripe Dashboard
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Research Modal */}
      <ResearchModal 
        type={researchModal} 
        onClose={() => setResearchModal(null)} 
      />

      {/* Embedded Onboarding Modal */}
      {showEmbeddedOnboarding && (
        <StripeEmbeddedOnboardingModal
          isOpen={showEmbeddedOnboarding}
          onComplete={handleOnboardingComplete}
          onClose={() => setShowEmbeddedOnboarding(false)}
        />
      )}
    </div>
  );
}