import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { useBillingData } from '@/hooks/useBillingData';
import { Loader2, CreditCard, Calendar, X, ChevronRight } from 'lucide-react';

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier?: string;
  billingCycle?: string;
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  billingCycle
}) => {
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { toast } = useToast();
  const { tiers } = useSubscriptionTiers();
  const { refetch: refetchBilling } = useBillingData();

  const handlePlanUpgrade = async (tierName: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier_name: tierName,
          is_annual: billingCycle === 'yearly',
          success_url: `${window.location.origin}/settings?tab=billing`,
          cancel_url: `${window.location.origin}/settings?tab=billing`,
          mode: 'test'
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBillingCycleChange = async (newCycle: 'monthly' | 'yearly') => {
    if (!currentTier) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-billing-cycle', {
        body: {
          newCycle,
          tierName: currentTier
        },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
        onClose();
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error changing billing cycle:', error);
      toast({
        title: 'Error',
        description: 'Failed to change billing cycle. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Subscription Cancelled',
        description: data.message || 'Your subscription will be cancelled at the end of the current billing period.',
      });
      
      // Refresh billing data to reflect changes
      setTimeout(() => {
        refetchBilling();
      }, 1000);
      
      onClose();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const availableTiers = tiers?.filter(tier => tier.tier_name !== 'starter') || [];
  const currentTierData = tiers?.find(tier => tier.tier_name === currentTier);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Manage Your Subscription
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Plan */}
          {currentTierData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{currentTierData.display_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} billing
                    </p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Cycle */}
          {currentTier && billingCycle && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Change Billing Cycle
                </CardTitle>
                <CardDescription>
                  Switch between monthly and yearly billing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  {billingCycle !== 'monthly' && (
                    <Button
                      onClick={() => handleBillingCycleChange('monthly')}
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Switch to Monthly
                    </Button>
                  )}
                  {billingCycle !== 'yearly' && (
                    <Button
                      onClick={() => handleBillingCycleChange('yearly')}
                      disabled={loading}
                      variant="outline"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Switch to Yearly
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Plans */}
          <Card>
            <CardHeader>
              <CardTitle>Upgrade Your Plan</CardTitle>
              <CardDescription>
                Choose a different plan that better suits your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {availableTiers.map((tier) => {
                  const isCurrentTier = tier.tier_name === currentTier;
                  const isUpgrade = currentTier === 'starter' || 
                    (currentTier === 'professional' && tier.tier_name === 'enterprise');
                  
                  return (
                    <div 
                      key={tier.id} 
                      className={`p-4 border rounded-lg ${isCurrentTier ? 'border-primary bg-primary/5' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{tier.display_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            €{billingCycle === 'yearly' ? tier.price_yearly : tier.price_monthly}
                            /{billingCycle === 'yearly' ? 'year' : 'month'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isCurrentTier && <Badge variant="secondary">Current</Badge>}
                          {!isCurrentTier && (
                            <Button
                              onClick={() => handlePlanUpgrade(tier.tier_name)}
                              disabled={loading}
                              variant={isUpgrade ? "default" : "outline"}
                              size="sm"
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                              {isUpgrade ? 'Upgrade' : 'Switch'}
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Cancel Subscription */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Cancel Subscription</CardTitle>
              <CardDescription>
                Cancel your subscription. You'll retain access until the end of your current billing period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={cancelLoading}>
                    {cancelLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel your subscription? You'll retain access to your current plan until the end of your billing period, but you won't be charged again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, Cancel Subscription
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};