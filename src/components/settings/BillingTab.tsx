
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
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
import { UsageSummary } from '@/components/ui/UsageSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BillingTab: React.FC = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
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

  const handleUpgrade = async (tierId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { tierId, billingCycle }
      });
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
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
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Trial</Badge>;
      case 'expired_trial':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Expired</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  const getCurrentPlan = () => {
    if (!tiers) return null;
    // Try to find current plan based on user type and tiers
    if (userStatus.userType === 'subscriber' || userStatus.userType === 'canceled_subscriber') {
      // For actual subscribers, try to match professional tier for now
      return tiers.find(tier => tier.tier_name === 'professional') || tiers.find(tier => tier.tier_name === 'starter') || tiers[0];
    }
    // For trial users, default to starter tier
    return tiers.find(tier => tier.tier_name === 'starter') || tiers[0];
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
                {loading ? 'Loading...' : 'Manage Plan'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white capitalize">
                  {currentPlan?.tier_name || 'No Plan'} Plan
                </h3>
                <p className="text-gray-400">{currentPlan?.description}</p>
                {userStatus.daysRemaining > 0 && userStatus.userType === 'trial' && (
                  <p className="text-yellow-400 text-sm mt-1">
                    {userStatus.daysRemaining} days remaining in trial
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  €{billingCycle === 'monthly' ? currentPlan?.price_monthly : currentPlan?.price_yearly}
                  <span className="text-sm text-gray-400 font-normal">
                    /{billingCycle === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                {billingCycle === 'yearly' && currentPlan?.price_monthly && (
                  <p className="text-sm text-green-400">
                    Save €{((currentPlan.price_monthly * 12) - (currentPlan.price_yearly || 0)).toFixed(0)} per year
                  </p>
                )}
              </div>
            </div>

            {/* Billing Timeline */}
            <Separator className="bg-gray-700" />
            <div>
              <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" />
                Billing Timeline
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Next Billing</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      <span className="text-white text-sm font-medium">
                        {userStatus.subscriptionEndDate 
                          ? new Date(userStatus.subscriptionEndDate).toLocaleDateString()
                          : 'Mar 15, 2024'
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Billing Cycle</span>
                    <span className="text-gray-300 text-sm">
                      {billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Last Payment</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-gray-300 text-sm">Feb 15, 2024</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Payment Status</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-sm">Current</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Subscription Usage */}
        <UsageSummary className="bg-gray-800 border-gray-700" />
      </div>

      {/* Billing History - Middle Section */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">
              View your complete billing history and download invoices in the Stripe customer portal.
            </p>
            <Button 
              onClick={handleManageSubscription}
              disabled={loading}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              View Billing History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans - Bottom Section */}
      <Card className="bg-gray-800 border-gray-700">
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
              
              // Use homepage pricing structure
              let monthlyPrice, yearlyPrice, displayPrice, billingText, savingsText;
              
              if (isEnterprise) {
                displayPrice = 'Starting at €499';
                billingText = '/month';
                savingsText = 'Custom pricing for large organizations';
              } else {
                // Match homepage pricing exactly
                if (tier.tier_name === 'starter') {
                  monthlyPrice = 19;
                  yearlyPrice = 15; // €15/mo when billed annually
                } else if (tier.tier_name === 'professional') {
                  monthlyPrice = 49;
                  yearlyPrice = 39; // €39/mo when billed annually  
                } else {
                  monthlyPrice = tier.price_monthly;
                  yearlyPrice = tier.price_yearly;
                }
                
                displayPrice = `€${billingCycle === 'monthly' ? monthlyPrice : yearlyPrice}`;
                billingText = '/month';
                
                if (billingCycle === 'yearly') {
                  savingsText = `Billed annually (€${yearlyPrice * 12}/year)`;
                } else {
                  savingsText = tier.description;
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
                    <div className="text-3xl font-bold text-white">
                      {displayPrice}
                      <span className="text-sm text-gray-400 font-normal">
                        {billingText}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-2">
                      {savingsText}
                    </p>
                    {billingCycle === 'yearly' && !isEnterprise && monthlyPrice && yearlyPrice && (
                      <p className="text-green-400 text-xs mt-1">
                        Save €{((monthlyPrice - yearlyPrice) * 12)} per year
                      </p>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {(tier.features as string[])?.map((feature, index) => (
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
                      onClick={() => window.open('mailto:sales@company.com?subject=Enterprise Plan Inquiry', '_blank')}
                    >
                      Contact Sales
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      variant={isCurrentPlan ? "outline" : "default"}
                      disabled={isCurrentPlan || loading}
                      onClick={() => handleUpgrade(tier.id)}
                    >
                      {isCurrentPlan ? 'Current Plan' : `Switch to ${tier.display_name}`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
