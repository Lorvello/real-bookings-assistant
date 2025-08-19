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
  ArrowRight
} from 'lucide-react';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { ResearchModal } from './ResearchModal';
import type { BusinessStripeAccount } from '@/types/payments';

export function PaymentSettingsTab() {
  const { selectedCalendar } = useCalendarContext();
  const [searchParams, setSearchParams] = useSearchParams();
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
    createLoginLink
  } = useStripeConnect();

  const [stripeAccount, setStripeAccount] = useState<BusinessStripeAccount | null>(null);
  const [platformFee, setPlatformFee] = useState('2.50');
  const [paymentDeadline, setPaymentDeadline] = useState('24');
  const [refundPolicy, setRefundPolicy] = useState('');
  const [researchModal, setResearchModal] = useState<'no-shows' | 'cashflow' | 'compliance' | 'professionalism' | null>(null);

  useEffect(() => {
    if (selectedCalendar?.id) {
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
  }, [selectedCalendar?.id, searchParams, setSearchParams]);

  useEffect(() => {
    if (settings) {
      setPlatformFee(settings.platform_fee_percentage.toString());
      setPaymentDeadline(settings.payment_deadline_hours.toString());
      setRefundPolicy(settings.refund_policy_text || '');
    }
  }, [settings]);

  const loadStripeAccount = async () => {
    if (!selectedCalendar?.id) return;
    const account = await getStripeAccount(selectedCalendar.id);
    setStripeAccount(account);
  };

  const handleRefreshAccount = async () => {
    if (!selectedCalendar?.id) return;
    const account = await refreshAccountStatus(selectedCalendar.id);
    if (account) {
      setStripeAccount(account);
    }
  };

  const handleOpenStripeDashboard = async () => {
    if (!selectedCalendar?.id) return;
    const loginUrl = await createLoginLink(selectedCalendar.id);
    if (loginUrl) {
      // Redirect in the same tab for both login and onboarding flows
      window.location.href = loginUrl;
    }
  };

  const handleStartOnboarding = async () => {
    if (!selectedCalendar?.id) return;
    const { createOnboardingLink } = useStripeConnect();
    const onboardingLink = await createOnboardingLink(selectedCalendar.id);
    
    if (onboardingLink) {
      window.location.href = onboardingLink.url;
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

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              disabled={settingsSaving || !stripeAccount?.charges_enabled}
            />
          </div>
          
          {settings?.secure_payments_enabled && !stripeAccount?.charges_enabled && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Complete Stripe Connect setup to enable Pay & Book
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stripe Account Setup */}
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
          {stripeAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium">Account Status</p>
                    <Badge variant={getAccountStatusColor(stripeAccount.account_status)}>
                      {getAccountStatusText(stripeAccount)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Account ID: {stripeAccount.stripe_account_id}
                  </p>
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
                      Dashboard
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
          ) : (
            <div className="space-y-6">
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

              <div className="text-center py-4">
                <Button 
                  onClick={handleStartOnboarding}
                  disabled={stripeLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {stripeLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Setup Stripe Account
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Configuration */}
      {settings?.secure_payments_enabled && stripeAccount?.charges_enabled && (
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

      {/* Research Modal */}
      <ResearchModal 
        type={researchModal} 
        onClose={() => setResearchModal(null)} 
      />
    </div>
  );
}