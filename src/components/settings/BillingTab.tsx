
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
import { useSettingsContext } from '@/contexts/SettingsContext';
import { UsageSummary } from '@/components/ui/UsageSummary';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BillingTab: React.FC = () => {
  const { userStatus, accessControl } = useUserStatus();
  const { tiers, isLoading: tiersLoading } = useSubscriptionTiers();
  const { profileData } = useSettingsContext();
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
        return null;
      case 'expired_trial':
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Expired</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-400 border-gray-500/20">Unknown</Badge>;
    }
  };

  const getCurrentPlan = () => {
    if (!tiers) return null;
    
    // Get user's actual subscription tier from profile
    const userTier = userStatus.isSetupIncomplete ? null : 
      (userStatus.userType === 'subscriber' || userStatus.userType === 'canceled_subscriber' || userStatus.userType === 'trial') 
        ? (profileData?.subscription_tier || 'starter') 
        : 'starter';
    
    // If user has no tier or is setup incomplete, show free tier
    if (!userTier || userStatus.isSetupIncomplete) {
      return tiers.find(tier => tier.tier_name === 'free') || tiers[0];
    }
    
    // Find the matching tier
    const matchingTier = tiers.find(tier => tier.tier_name === userTier);
    
    // Fallback to starter if tier not found
    return matchingTier || tiers.find(tier => tier.tier_name === 'starter') || tiers[0];
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
                  {currentPlan?.price_monthly === 0 ? (
                    'Free'
                  ) : (
                    <>
                      €{currentPlan?.price_monthly || 0}
                      <span className="text-sm text-gray-400 font-normal">/month</span>
                    </>
                  )}
                </div>
                {currentPlan?.price_monthly > 0 && (
                  <p className="text-sm text-gray-400">
                    {userStatus.userType === 'trial' && userStatus.daysRemaining > 0 
                      ? 'Free during trial period'
                      : 'Billed monthly'
                    }
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
                <TableRow>
                  <TableCell className="text-white">Feb 15, 2024</TableCell>
                  <TableCell className="text-white">€19</TableCell>
                  <TableCell className="text-white">Starter</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-white">Jan 15, 2024</TableCell>
                  <TableCell className="text-white">€19</TableCell>
                  <TableCell className="text-white">Starter</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-white">Dec 15, 2023</TableCell>
                  <TableCell className="text-white">€19</TableCell>
                  <TableCell className="text-white">Starter</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-white">Nov 15, 2023</TableCell>
                  <TableCell className="text-white">€19</TableCell>
                  <TableCell className="text-white">Starter</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-white">Oct 15, 2023</TableCell>
                  <TableCell className="text-white">€19</TableCell>
                  <TableCell className="text-white">Starter</TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                      Paid
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={handleManageSubscription}>
                      <Download className="w-3 h-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-center">
            <Button 
              onClick={handleManageSubscription}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              View All History
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
                  </div>

                  <div className="space-y-3 mb-6">
                    {/* Updated features to match homepage exactly */}
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
