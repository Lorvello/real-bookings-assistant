
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
  AlertCircle
} from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { useBillingData } from '@/hooks/useBillingData';
import { useSettingsContext } from '@/contexts/SettingsContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BillingTab: React.FC = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { billingData, isLoading: billingLoading } = useBillingData();
  const { profileData } = useSettingsContext();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    // Only show customer portal for users with active subscriptions/billing history
    if (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') {
      // Redirect to plans section for users without subscriptions
      document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing portal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening billing history:', error);
      toast({
        title: 'Error',
        description: 'Failed to open billing history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
          success_url: window.location.origin + '/settings?tab=billing&success=true',
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

  const handleContactSales = () => {
    const subject = encodeURIComponent('Enterprise Plan Inquiry');
    const body = encodeURIComponent(`Hi,

I'm interested in learning more about your Enterprise plan and would like to discuss:
- Custom pricing for my organization
- White-label branding options
- Dedicated support and SLA
- Custom integrations

Please let me know when we can schedule a call.

Thank you!`);
    
    window.open(`mailto:sales@company.com?subject=${subject}&body=${body}`, '_blank');
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
    
    // For trial users, show the plan price but indicate it's free during trial
    const price = billingCycle === 'yearly' ? currentPlan.price_yearly : currentPlan.price_monthly;
    
    if (!price || price === 0) {
      return { amount: 0, currency: '€', period: '/month', displayText: 'Free' };
    }
    
    const period = billingCycle === 'yearly' ? '/year' : '/month';
    return { 
      amount: price, 
      currency: '€', 
      period, 
      displayText: `${price}${period}` 
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
    
    if (isNoSubscription || !billingData) {
      return {
        nextBilling: "—",
        lastPayment: "No billing history yet", 
        billingCycle: "—",
        paymentStatus: "—"
      };
    }

    const nextBilling = billingData.next_billing_date 
      ? format(new Date(billingData.next_billing_date), "MMM d, yyyy")
      : "—";

    const lastPayment = billingData.last_payment_date && billingData.last_payment_amount
      ? `${format(new Date(billingData.last_payment_date), "MMM d, yyyy")} - €${(billingData.last_payment_amount / 100).toFixed(2)}`
      : "—";

    const billingCycle = billingData.billing_cycle 
      ? billingData.billing_cycle.charAt(0).toUpperCase() + billingData.billing_cycle.slice(1) + 'ly'
      : "—";

    const paymentStatus = billingData.payment_status === 'paid' ? 'Active' : 
                         billingData.payment_status === 'unpaid' ? 'Failed' : 
                         billingData.payment_status || "—";

    return {
      nextBilling,
      lastPayment,
      billingCycle,
      paymentStatus
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
          {userStatus.subscriptionEndDate && (
            <div className="text-sm text-gray-400">
              <Calendar className="w-4 h-4 inline mr-1" />
              Renews {new Date(userStatus.subscriptionEndDate).toLocaleDateString()}
            </div>
          )}
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
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 
                  (userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive') 
                    ? 'Choose Plan' 
                    : 'Manage Plan'
                }
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
            {billingData?.billing_history && billingData.billing_history.length > 0 && (
              <Button 
                onClick={handleViewAllHistory}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                View All History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {billingLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : billingData?.billing_history && billingData.billing_history.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Amount</TableHead>
                    <TableHead className="text-gray-400">Plan</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400 text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingData.billing_history.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-white">
                        {format(new Date(invoice.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-white">
                        €{(invoice.amount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-white capitalize">
                        {invoice.description}
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
                           invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.invoice_url ? (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(invoice.invoice_url!, '_blank')}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        ) : (
                          <span className="text-gray-500 text-xs">No PDF</span>
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
              <h3 className="text-white font-medium mb-2">No billing history available</h3>
              <p className="text-gray-400 text-sm">
                {userStatus.userType === 'expired_trial' || userStatus.userType === 'canceled_and_inactive'
                  ? "No billing history available"
                  : userStatus.userType === 'trial' || userStatus.userType === 'setup_incomplete'
                  ? "Your billing history will appear here after your first payment"
                  : "No billing records found for your account."
                }
              </p>
              {(userStatus.userType === 'trial' || userStatus.userType === 'expired_trial' || userStatus.userType === 'setup_incomplete') && (
                <Button 
                  className="mt-4" 
                  onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  View Plans
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tiers?.filter(tier => tier.tier_name !== 'free' && tier.price_monthly > 0).map((tier) => {
              const isCurrentPlan = tier.tier_name === currentPlan?.tier_name;
              const isEnterprise = tier.tier_name === 'enterprise';
              const isProfessional = tier.tier_name === 'professional';
              
              // Use correct pricing from database
              let displayPrice, billingText, savingsText;
              
              if (isEnterprise) {
                if (billingCycle === 'monthly') {
                  displayPrice = 'Starting at €499';
                  billingText = '/month';
                  savingsText = 'Custom pricing for large organizations';
                } else {
                  displayPrice = 'Starting at €399.20';
                  billingText = '/month';
                  savingsText = 'Billed annually (€4790.40/year)';
                }
              } else {
                // Calculate yearly rate as monthly equivalent (20% discount)
                const monthlyPrice = tier.price_monthly;
                const yearlyMonthlyRate = tier.price_yearly / 12;
                
                if (billingCycle === 'monthly') {
                  displayPrice = `€${monthlyPrice}`;
                  billingText = '/month';
                  savingsText = tier.description;
                } else {
                  displayPrice = `€${yearlyMonthlyRate.toFixed(2)}`;
                  billingText = '/month';
                  savingsText = `Billed annually (€${tier.price_yearly}/year)`;
                }
              }
              
              return (
                <div 
                  key={tier.id} 
                  className={`group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 ${
                    isCurrentPlan 
                      ? 'bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border-2 border-primary/50 shadow-xl shadow-primary/20' 
                      : isProfessional
                      ? 'bg-gradient-to-br from-gray-800/90 via-gray-800/70 to-gray-900/90 border border-gray-600/50 hover:border-primary/30 shadow-lg hover:shadow-xl hover:shadow-primary/10'
                      : 'bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 border border-gray-700/50 hover:border-gray-600/70 shadow-lg hover:shadow-xl hover:shadow-black/20'
                  }`}
                >
                  {/* Background pattern overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-black/[0.03] pointer-events-none" />
                  
                  {/* Current plan badge */}
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white border-0 shadow-lg px-4 py-1 text-xs font-semibold tracking-wide">
                        <Crown className="w-3 h-3 mr-1" />
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  
                  {/* Popular badge for Professional */}
                  {isProfessional && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-4 py-1 text-xs font-semibold tracking-wide">
                        <Zap className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  {/* Enterprise premium indicator */}
                  {isEnterprise && (
                    <div className="absolute top-6 right-6">
                      <div className="flex items-center gap-1 text-purple-400">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs font-medium">Enterprise</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="relative p-8">
                    {/* Plan header */}
                    <div className="text-center mb-8">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        {tier.tier_name === 'starter' && <Users className="w-5 h-5 text-blue-400" />}
                        {isProfessional && <BarChart3 className="w-5 h-5 text-green-400" />}
                        {isEnterprise && <Shield className="w-5 h-5 text-purple-400" />}
                        <h3 className="text-2xl font-bold text-white capitalize tracking-tight">
                          {tier.display_name}
                        </h3>
                      </div>
                      
                      {/* Pricing */}
                      <div className="mb-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-white tracking-tight">
                            {isEnterprise ? 'Custom' : displayPrice.replace('€', '')}
                          </span>
                          {!isEnterprise && (
                            <>
                              <span className="text-lg text-gray-400 font-medium">€</span>
                              <span className="text-lg text-gray-400 font-medium">{billingText}</span>
                            </>
                          )}
                        </div>
                        
                        {/* Savings badge for yearly */}
                        {billingCycle === 'yearly' && !isEnterprise && (
                          <div className="inline-flex items-center gap-1 mt-2">
                            <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                              Save 20%
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {savingsText}
                      </p>
                    </div>

                    {/* Features list */}
                    <div className="space-y-4 mb-8">
                      <h4 className="text-white font-semibold text-sm uppercase tracking-wider opacity-90 mb-4">
                        Everything included
                      </h4>
                      <div className="space-y-3">
                        {(tier.tier_name === 'starter' ? [
                          "Strategic WhatsApp contact management (up to 500)",
                          "Dual-calendar orchestration system", 
                          "Individual user access management",
                          "AI-powered intelligent reminder sequences",
                          "Essential dashboard overview & live operations monitoring",
                          "Global multi-language localization",
                          "Streamlined payment processing & collection"
                        ] : tier.tier_name === 'professional' ? [
                          "All Starter premium features included",
                          "Professional WhatsApp contact management (up to 2,500)",
                          "Unlimited calendar orchestration platform",
                          "Advanced team collaboration suite (2-10 users)",
                          "Multi-location business coordination", 
                          "Complete analytics suite: Business Intelligence, Performance tracking & Future Insights",
                          "Dedicated priority customer success"
                        ] : [
                          "Complete professional suite included",
                          "Unlimited enterprise WhatsApp contact management",
                          "Unlimited enterprise user access management",
                          "Dedicated WhatsApp Business API with custom branding",
                          "Intelligent voice call routing & distribution",
                          "Omnichannel social media DM orchestration",
                          "Advanced reputation management & review analytics",
                          "Enterprise SLA with dedicated success management",
                          "White-glove onboarding & strategic integration consulting"
                        ]).map((feature, index) => (
                          <div key={index} className="flex items-start gap-3 group/item">
                            <div className="flex-shrink-0 mt-0.5">
                              <Check className="w-4 h-4 text-green-400 transition-transform duration-200 group-hover/item:scale-110" />
                            </div>
                            <span className="text-gray-300 text-sm leading-relaxed group-hover/item:text-white transition-colors duration-200">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="space-y-3">
                      {isEnterprise ? (
                        <Button 
                          className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                          onClick={handleContactSales}
                          disabled={loading}
                        >
                          <HeadphonesIcon className="w-4 h-4 mr-2" />
                          {loading ? 'Loading...' : 'Contact Sales'}
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                            isCurrentPlan 
                              ? 'bg-gradient-to-r from-primary/20 to-primary/30 text-primary border-primary/50 hover:bg-gradient-to-r hover:from-primary/30 hover:to-primary/40' 
                              : isProfessional
                              ? 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary border-0 shadow-lg hover:shadow-xl hover:shadow-primary/25'
                              : 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 border-0 shadow-lg hover:shadow-xl'
                          }`}
                          variant={isCurrentPlan ? "outline" : "default"}
                          disabled={isCurrentPlan || loading}
                          onClick={() => handleUpgrade(tier.tier_name)}
                        >
                          {loading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              Loading...
                            </div>
                          ) : isCurrentPlan ? (
                            <div className="flex items-center gap-2">
                              <Check className="w-4 h-4" />
                              Current Plan
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              Switch to {tier.display_name}
                            </div>
                          )}
                        </Button>
                      )}
                      
                      {/* Trust indicators */}
                      <div className="flex items-center justify-center gap-4 text-xs text-gray-500 pt-2">
                        <div className="flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          <span>Secure</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Cancel anytime</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
