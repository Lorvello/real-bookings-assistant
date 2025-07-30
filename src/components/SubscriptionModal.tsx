import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Crown, Star, Zap, ArrowRight } from 'lucide-react';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserType } from '@/types/userStatus';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  userType
}) => {
  const { tiers, isLoading } = useSubscriptionTiers();
  const { toast } = useToast();
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [isAnnual, setIsAnnual] = useState(true);

  const getModalTitle = () => {
    switch (userType) {
      case 'expired_trial':
        return 'Upgrade Your Plan';
      case 'canceled_subscriber':
      case 'canceled_and_inactive':
        return 'Reactivate Your Subscription';
      default:
        return 'Choose Your Plan';
    }
  };

  const getModalDescription = () => {
    switch (userType) {
      case 'expired_trial':
        return 'Your trial has ended. Choose a plan to continue using all features.';
      case 'canceled_subscriber':
      case 'canceled_and_inactive':
        return 'Reactivate your subscription to regain access to all features.';
      default:
        return 'Select the perfect plan for your business needs.';
    }
  };

  const handlePlanSelect = async (tierName: string, price: number) => {
    if (tierName === 'enterprise') {
      // For enterprise, show contact sales message
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for Enterprise pricing and setup.",
      });
      return;
    }

    setIsCreatingCheckout(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier_name: tierName,
          price: price,
          is_annual: isAnnual,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/dashboard?checkout=cancel`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const getButtonText = (tierName: string) => {
    if (tierName === 'enterprise') return 'Contact Sales';
    
    switch (userType) {
      case 'canceled_subscriber':
      case 'canceled_and_inactive':
        return 'Reactivate Plan';
      default:
        return 'Choose Plan';
    }
  };

  const getButtonIcon = (tierName: string) => {
    if (tierName === 'enterprise') return <Crown className="h-4 w-4" />;
    return <ArrowRight className="h-4 w-4" />;
  };

  const formatPrice = (monthlyPrice: number, yearlyPrice: number) => {
    const price = isAnnual ? yearlyPrice : monthlyPrice;
    return `€${price}`;
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const displayTiers = tiers?.filter(tier => tier.tier_name !== 'free') || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-6">
          <DialogTitle className="text-3xl font-bold">{getModalTitle()}</DialogTitle>
          <DialogDescription className="text-lg text-muted-foreground mt-2">
            {getModalDescription()}
          </DialogDescription>
        </DialogHeader>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-secondary rounded-full p-1 border">
            <div className="flex">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  !isAnnual
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${
                  isAnnual
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Annual
                {isAnnual && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full font-bold">
                    Save 20%
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {displayTiers.map((tier) => {
            const monthlyPrice = tier.price_monthly;
            const yearlyPrice = tier.price_yearly;
            const isPopular = tier.tier_name === 'professional';
            const isEnterprise = tier.tier_name === 'enterprise';

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl border p-6 transition-all duration-300 hover:scale-[1.02] ${
                  isPopular
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-border bg-card'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                    {tier.display_name}
                    {isEnterprise && <Crown className="h-5 w-5 text-yellow-500" />}
                    {tier.tier_name === 'professional' && <Zap className="h-5 w-5 text-blue-500" />}
                  </h3>
                  <p className="text-muted-foreground text-sm">{tier.description}</p>
                </div>

                <div className="text-center mb-6">
                  {isEnterprise ? (
                    <div>
                      <div className="text-3xl font-bold text-primary mb-1">Custom</div>
                      <div className="text-sm text-muted-foreground">Contact for pricing</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-primary mb-1">
                        {formatPrice(monthlyPrice, yearlyPrice)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        per month{isAnnual && ', billed annually'}
                      </div>
                      {isAnnual && (
                        <div className="text-xs text-green-600 mt-1">
                          Save €{((monthlyPrice - yearlyPrice) * 12).toFixed(0)} per year
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handlePlanSelect(
                    tier.tier_name, 
                    isAnnual ? yearlyPrice : monthlyPrice
                  )}
                  disabled={isCreatingCheckout}
                  className={`w-full mb-6 ${
                    isPopular
                      ? 'bg-primary hover:bg-primary/90'
                      : 'bg-secondary hover:bg-secondary/80'
                  }`}
                >
                  {getButtonIcon(tier.tier_name)}
                  {getButtonText(tier.tier_name)}
                  {isCreatingCheckout && <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
                </Button>

                <div className="space-y-3">
                  {tier.features?.map((feature, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};