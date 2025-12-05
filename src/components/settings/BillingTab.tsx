
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Calendar, 
  Crown, 
  Check, 
  Download, 
  Settings, 
  Zap,
  Shield,
  Users,
  BarChart3,
  Palette,
  HeadphonesIcon,
  CalendarClock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { EnterpriseContactForm } from '@/components/EnterpriseContactForm';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { useBillingData } from '@/hooks/useBillingData';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getStripeConfig } from '@/utils/stripeConfig';


export const BillingTab: React.FC = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { billingData, isLoading: billingLoading, refetch } = useBillingData();
  const { profileData } = useSettingsContext();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);
  

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      // Get current Stripe mode from utils
      const { mode } = getStripeConfig();
      
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: { mode },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
        
        // Auto-refresh billing data after returning from portal
        const checkForUpdates = () => {
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
              setTimeout(() => {
                refetch();
              }, 2000);
              document.removeEventListener('visibilitychange', checkForUpdates);
            }
          });
        };
        checkForUpdates();
      }
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      
      // Show specific message if portal is not configured
      const errorMessage = error?.message?.includes('portal') || error?.message?.includes('Portal') 
        ? 'Subscription management is currently being set up. Please contact support for assistance.'
        : 'Failed to open billing portal. Please try again.';
        
      toast({
        title: 'Notice',
        description: errorMessage,
        variant: error?.message?.includes('portal') ? 'default' : 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllHistory = () => {
    setShowAllHistory(!showAllHistory);
  };

  const handleContactSales = () => {
    setShowEnterpriseForm(true);
  };

  const handleUpgrade = async (tierName: string) => {
    if (!tiers) return;
    
    const selectedTier = tiers.find(tier => tier.tier_name === tierName);
    if (!selectedTier) {
      toast({
        title: 'Error',
        description: 'Selected plan not found. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: { 
          tier_name: selectedTier.tier_name,
          price: billingCycle === 'yearly' ? selectedTier.price_yearly : selectedTier.price_monthly,
          is_annual: billingCycle === 'yearly',
          success_url: window.location.origin + '/success',
          cancel_url: window.location.origin + '/settings?tab=billing&canceled=true',
          mode: 'test' // Will be determined by edge function based on environment
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };


  const getStatusBadge = () => {
    switch (userStatus.userType) {
      case 'subscriber':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge>;
      case 'canceled_subscriber':
        return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Canceled</Badge>;
      case 'trial':
        return null;
      case 'expired_trial':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Expired</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  const getCurrentPlan = () => {
    if (!tiers || !profileData) return null;
    
    // For users with no active subscription, return null
    if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
      return null;
    }
    
    // Get user's actual subscription tier from their profile data
    const userTier = profileData.subscription_tier;
    
    // If no tier specified, default to starter for active users
    if (!userTier) {
      return tiers.find(tier => tier.tier_name === 'starter') || tiers[0];
    }
    
    // Find the matching tier from the database
    const matchingTier = tiers.find(tier => tier.tier_name === userTier);
    
    // Return the exact tier from database or fallback
    return matchingTier || tiers.find(tier => tier.tier_name === 'starter') || tiers[0];
  };

  const getCurrentPrice = () => {
    if (!currentPlan) return { amount: 0, currency: '€', period: '/month', displayText: 'Free' };
    
    // Use actual billing cycle from billingData, not the toggle state
    const actualBillingCycle = billingData?.billing_cycle || 'monthly';
    const price = actualBillingCycle === 'yearly' ? currentPlan.price_yearly : currentPlan.price_monthly;
    
    if (!price || price === 0) {
      return { amount: 0, currency: '€', period: '/month', displayText: 'Free' };
    }
    
    // Always show monthly equivalent for consistent display
    const monthlyPrice = actualBillingCycle === 'yearly' ? price / 12 : price;
    return { 
      amount: Math.round(monthlyPrice), 
      currency: '€', 
      period: '/month', 
      displayText: `€${Math.round(monthlyPrice)}/month` 
    };
  };

  const getBillingStatus = () => {
    if (userStatus.userType === 'trial' && userStatus.daysRemaining > 0) {
      return 'Free during trial period';
    }
    if (userStatus.userType === 'canceled_subscriber') {
      return `Canceled - access until ${userStatus.subscriptionEndDate ? new Date(userStatus.subscriptionEndDate).toLocaleDateString() : 'end date'}`;
    }
    return billingCycle === 'yearly' ? 'Billed annually' : 'Billed monthly';
  };

  // Helper function to get real billing timeline data
  const getBillingTimelineData = () => {
    const isNoSubscription = userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive';
    
    // Early return for users without subscription or billing data is loading
    if (isNoSubscription || !billingData) {
      return {
        nextBilling: "No active subscription",
        lastPayment: "No billing history", 
        billingCycle: "No subscription",
        paymentStatus: "Inactive"
      };
    }

    // Handle billing data that may be incomplete
    const nextBilling = billingData.next_billing_date 
      ? format(new Date(billingData.next_billing_date), "MMM d, yyyy")
      : (billingData.subscribed ? "Next billing date unavailable" : "No active subscription");

    const lastPayment = billingData.last_payment_date && billingData.last_payment_amount
      ? `${format(new Date(billingData.last_payment_date), "MMM d, yyyy")} - €${(billingData.last_payment_amount / 100).toFixed(2)}`
      : (billingData.subscribed ? "No payment history" : "No billing history");

    const billingCycle = billingData.billing_cycle 
      ? billingData.billing_cycle.charAt(0).toUpperCase() + billingData.billing_cycle.slice(1) + 'ly'
      : (billingData.subscribed ? "Cycle unavailable" : "No subscription");

    // More robust payment status mapping
    const getPaymentStatus = () => {
      if (!billingData.subscribed) return 'Inactive';
      if (billingData.payment_status === 'paid') return 'Active';
      if (billingData.payment_status === 'unpaid') return 'Payment Failed';
      if (billingData.payment_status === 'pending') return 'Payment Pending';
      if (billingData.payment_status === 'requires_payment_method') return 'Payment Method Required';
      if (billingData.payment_status === 'canceled') return 'Canceled';
      return billingData.payment_status || 'Status Unknown';
    };

    return {
      nextBilling,
      lastPayment,
      billingCycle,
      paymentStatus: getPaymentStatus()
    };
  };

  const currentPlan = getCurrentPlan();

  if (tiersLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
          <p className="text-gray-400 mt-1">Manage your subscription and billing preferences</p>
        </div>
        <div className="flex items-center gap-4">
          {getStatusBadge()}
        </div>
      </div>

      {/* Current Plan & Subscription Usage - Combined Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-500" />
                Current Plan
              </CardTitle>
              <Button 
                onClick={handleManageSubscription}
                disabled={loading || !userStatus.isSubscriber}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'Manage Subscription'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4">
              <div>
                {(userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') ? (
                  <>
                    <h3 className="text-xl font-semibold text-white">
                      No Active Subscription
                    </h3>
                    <p className="text-gray-400">Start your subscription to access all features</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-white capitalize">
                      {currentPlan?.display_name || currentPlan?.tier_name || 'Free'} Plan
                    </h3>
                    <p className="text-gray-400">{currentPlan?.description}</p>
                    {userStatus.userType === 'trial' && userStatus.daysRemaining > 0 && (
                      <p className="text-yellow-400 text-sm mt-1">
                        {userStatus.daysRemaining} days remaining in trial
                      </p>
                    )}
                  </>
                )}
              </div>
              <div className="text-right">
                {(userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') ? (
                  <div className="text-2xl font-bold text-gray-400">
                    No Plan
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-white">
                      {getCurrentPrice().amount === 0 ? (
                        getCurrentPrice().displayText
                      ) : (
                        <>
                          {getCurrentPrice().currency}{getCurrentPrice().amount}
                          <span className="text-sm text-gray-400 font-normal">{getCurrentPrice().period}</span>
                        </>
                      )}
                    </div>
                    {currentPlan && getCurrentPrice().amount > 0 && (
                      <p className="text-sm text-gray-400">
                        {getBillingStatus()}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Billing Timeline - Only show for users with subscriptions */}
            {(userStatus.userType !== 'expired_trial' && userStatus.userType !== 'canceled_and_inactive') && (
              <>
                <Separator className="bg-gray-700" />
                <div>
                  <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Billing Timeline
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">
                          {userStatus.userType === 'canceled_subscriber' ? 'Access Until' : 'Next Billing'}
                        </span>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          <span className="text-white text-sm font-medium">
                            {getBillingTimelineData().nextBilling}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Last Payment</span>
                        <span className="text-gray-300 text-sm">
                          {getBillingTimelineData().lastPayment}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Billing Cycle</span>
                        <span className="text-gray-300 text-sm">
                          {getBillingTimelineData().billingCycle}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Payment Status</span>
                        <div className="flex items-center gap-1">
                          {getBillingTimelineData().paymentStatus === 'Active' ? (
                            <CheckCircle className="w-3 h-3 text-green-400" />
                          ) : getBillingTimelineData().paymentStatus === 'Failed' ? (
                            <AlertCircle className="w-3 h-3 text-red-400" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-gray-400" />
                          )}
                          <span className={`text-sm ${
                            getBillingTimelineData().paymentStatus === 'Active' ? 'text-green-400' :
                            getBillingTimelineData().paymentStatus === 'Failed' ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {getBillingTimelineData().paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </CardContent>
        </Card>

        {/* Subscription Usage */}
        <UsageSummary className="bg-gray-800 border-gray-700" />
      </div>

      {/* Billing History - Middle Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Billing History
            </CardTitle>
            {billingData?.billing_history && billingData.billing_history.length > 3 && (
              <Button 
                onClick={handleViewAllHistory}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                {showAllHistory ? 'Show Less' : 'View All History'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <p className="text-gray-400 text-sm mt-2">Loading billing history...</p>
            </div>
          ) : (billingData?.billing_history && Array.isArray(billingData.billing_history) && billingData.billing_history.length > 0) ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Description</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.billing_history
                    .filter(invoice => invoice && invoice.id) // Filter out invalid entries
                    .slice(0, showAllHistory ? undefined : 3) // Show only 3 items unless viewing all
                    .map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-white">
                        {invoice.date ? format(new Date(invoice.date), "MMM d, yyyy") : "Date unavailable"}
                      </TableCell>
                      <TableCell className="text-white">
                        {invoice.amount && typeof invoice.amount === 'number' 
                          ? `${invoice.currency || '€'}${(invoice.amount / 100).toFixed(2)}`
                          : "Amount unavailable"
                        }
                      </TableCell>
                      <TableCell className="text-white">
                        {invoice.description || "No description"}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          invoice.status === 'paid' 
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : invoice.status === 'open' || invoice.status === 'draft'
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }>
                          {invoice.status === 'paid' ? 'Paid' : 
                           invoice.status === 'open' ? 'Pending' :
                           invoice.status === 'draft' ? 'Draft' : 
                           invoice.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.invoice_url ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(invoice.invoice_url!, '_blank')}
                            title="Download invoice PDF"
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        ) : (
                          <span className="text-gray-500 text-xs">Not available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No Billing History</h3>
              <p className="text-gray-400 text-sm mb-4">
                {(() => {
                  if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
                    return "No billing history found for your account.";
                  }
                  if (userStatus.userType === 'trial' || userStatus.userType === 'setup_incomplete') {
                    return "Your billing history will appear here after your first payment.";
                  }
                  if (billingData && !billingData.subscribed) {
                    return "You don't have an active subscription yet.";
                  }
                  return "No billing records found. This may be due to a recent subscription or pending payment processing.";
                })()}
              </p>
              {(userStatus.userType === 'trial' || userStatus.userType === 'expired_trial' || userStatus.userType === 'setup_incomplete') && (
                <Button 
                  onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                  variant="outline"
                >
                  View Available Plans
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans - Bottom Section */}
      <Card id="available-plans" className="bg-gray-800 border-gray-700">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="text-white">Available Plans</CardTitle>
              <p className="text-gray-400">Choose the plan that best fits your needs</p>
            </div>
            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-4">
              <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white' : 'text-gray-400'}`}>
                Monthly
              </span>
              <Switch 
                checked={billingCycle === 'yearly'}
                onCheckedChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
              />
              <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white' : 'text-gray-400'}`}>
                Yearly
              </span>
              {billingCycle === 'yearly' && (
                <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers?.filter(tier => tier.tier_name !== 'free' && tier.price_monthly > 0).map((tier) => {
              const isCurrentPlan = tier.tier_name === currentPlan?.tier_name;
              const isEnterprise = tier.tier_name === 'enterprise';
              
              // Use correct pricing from database
              let displayPrice, billingText, savingsText;
              
              if (isEnterprise) {
                // Enterprise always shows "Starting at €299" regardless of billing cycle
                displayPrice = 'Starting at €300';
                billingText = '/month';
                savingsText = 'Custom pricing for large organizations';
              } else {
                // Non-enterprise tiers with clean rounded yearly pricing
                const monthlyPrice = tier.price_monthly;
                
                if (billingCycle === 'monthly') {
                  displayPrice = `€${monthlyPrice}`;
                  billingText = '/month';
                  savingsText = tier.description;
                } else {
                  // Show rounded monthly equivalent for yearly billing
                  if (tier.tier_name === 'starter') {
                    displayPrice = '€24';
                    savingsText = 'Billed annually (€288/year)';
                  } else if (tier.tier_name === 'professional') {
                    displayPrice = '€48';
                    savingsText = 'Billed annually (€576/year)';
                  } else {
                    // Fallback for any other tiers
                    const yearlyMonthlyRate = tier.price_yearly / 12;
                    displayPrice = `€${Math.round(yearlyMonthlyRate)}`;
                    savingsText = `Billed annually (€${tier.price_yearly}/year)`;
                  }
                  billingText = '/month';
                }
              }
              
              return (
                <div 
                  key={tier.id} 
                  className={`border rounded-lg p-6 relative ${
                    isCurrentPlan 
                      ? 'border-primary bg-primary/5' 
                      : 'border-gray-700 bg-gray-900'
                  }`}
                >
                  {isCurrentPlan && (
                    <Badge className="absolute -top-3 left-6 bg-primary text-primary-foreground">
                      Current Plan
                    </Badge>
                  )}
                  
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold text-white capitalize mb-2">
                      {tier.display_name}
                    </h3>
                     <div className={`text-3xl font-bold ${billingCycle === 'yearly' && !isEnterprise ? 'text-green-400' : 'text-white'}`}>
                       {displayPrice}
                       <span className="text-sm text-gray-400 font-normal">
                         {billingText}
                       </span>
                     </div>
                    <p className="text-gray-400 text-sm mt-2">
                      {savingsText}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {/* Updated features to match homepage exactly */}
                    {(tier.tier_name === 'starter' ? [
                       "Unlimited WhatsApp contact management",
                       "Dual-calendar orchestration system", 
                       "Individual user access management",
                       "AI-powered intelligent reminder sequences",
                      "Essential dashboard overview & live operations monitoring",
                      "Global multi-language localization",
                      "Streamlined payment processing & collection"
                    ] : tier.tier_name === 'professional' ? [
                       "All Starter premium features included",
                       "Automated tax compliance & administration (Coming Soon)",
                       "Flexible installment payment options",
                       "Unlimited calendar orchestration platform",
                       "Advanced team collaboration suite (2-10 users)",
                       "Multi-location business coordination", 
                       "Complete analytics suite: Business Intelligence, Performance tracking & Future Insights",
                       "Dedicated priority customer success"
                    ] : [
                      "Complete professional suite included",
                      
                      "Unlimited enterprise user access management",
                      "Dedicated WhatsApp Business API with custom branding",
                      "Intelligent voice call routing & distribution",
                      "Omnichannel social media DM orchestration",
                      "Advanced reputation management & review analytics",
                      "Enterprise SLA with dedicated success management",
                      "White-glove onboarding & strategic integration consulting"
                    ]).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {isEnterprise ? (
                    <Button 
                      className="w-full"
                      variant="outline"
                      onClick={handleContactSales}
                      disabled={loading}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || loading}
                      onClick={() => handleUpgrade(tier.tier_name)}
                    >
                      {loading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : `Switch to ${tier.display_name}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Enterprise Contact Form Modal */}
      <EnterpriseContactForm 
        open={showEnterpriseForm}
        onOpenChange={setShowEnterpriseForm}
      />

    </div>
  );
};
