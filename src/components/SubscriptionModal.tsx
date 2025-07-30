import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Star, ArrowRight, Loader2, Info, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { UserType } from '@/types/userStatus';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
}

export function SubscriptionModal({ isOpen, onClose, userType }: SubscriptionModalProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('annual');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { tiers, isLoading } = useSubscriptionTiers();
  const { toast } = useToast();

  // Plan data matching Pricing component
  const plans = [
    {
      name: "Starter",
      monthlyPrice: 19,
      annualPrice: 15,
      description: "Perfect for beginners with basic WhatsApp automation and calendar management",
      features: [
        {
          text: "Strategic WhatsApp contact management (up to 500)",
          tooltip: "Organize and manage up to 500 WhatsApp contacts with smart categorization and automated responses"
        },
        {
          text: "Dual-calendar orchestration system",
          tooltip: "Seamlessly sync and manage two separate calendars with automated booking coordination"
        },
        {
          text: "Individual user access management",
          tooltip: "Single user account with full access to your calendar and booking system"
        },
        {
          text: "AI-powered intelligent reminder sequences",
          tooltip: "Automated reminder messages sent via WhatsApp to reduce no-shows and improve attendance rates"
        }
      ],
      popular: false,
      cta: "Choose Plan"
    },
    {
      name: "Professional",
      monthlyPrice: 49,
      annualPrice: 39,
      description: "Advanced features for teams with extended contact management and collaboration tools",
      features: [
        {
          text: "All Starter premium features included",
          tooltip: "Everything from the Starter plan plus additional professional features"
        },
        {
          text: "Professional WhatsApp contact management (up to 2,500)",
          tooltip: "Manage up to 2,500 contacts with advanced segmentation, bulk messaging, and automated workflows"
        },
        {
          text: "Unlimited calendar orchestration platform",
          tooltip: "Connect and manage unlimited calendars across different platforms with advanced synchronization"
        },
        {
          text: "Advanced team collaboration suite (2-10 users)",
          tooltip: "Multi-user workspace with role-based permissions, shared calendars, and team communication tools"
        }
      ],
      popular: true,
      cta: "Choose Plan"
    },
    {
      name: "Enterprise",
      monthlyPrice: null,
      annualPrice: null,
      description: "Complete business solution with dedicated WhatsApp number and premium support",
      features: [
        {
          text: "Complete professional suite included",
          tooltip: "All Professional plan features plus enterprise-grade capabilities"
        },
        {
          text: "Unlimited enterprise WhatsApp contact management",
          tooltip: "No limits on contacts with enterprise-grade security, compliance features, and bulk operations"
        },
        {
          text: "Dedicated WhatsApp Business API with custom branding",
          tooltip: "Your own WhatsApp Business API connection with custom branding, verified business account, and green checkmark"
        }
      ],
      popular: false,
      cta: "Contact Sales",
      isEnterprise: true
    }
  ];

  const getModalTitle = () => {
    if (userType === 'expired_trial') return 'Your Trial Has Expired';
    if (userType === 'canceled_subscriber') return 'Reactivate Your Account';
    return 'Choose Your Perfect Plan';
  };

  const handlePlanSelect = async (plan: typeof plans[0]) => {
    if (plan.isEnterprise) return;

    try {
      setIsCheckingOut(true);
      const price = billingPeriod === 'annual' ? plan.annualPrice! : plan.monthlyPrice!;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier: plan.name,
          price: price,
          billing: billingPeriod
        }
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
        onClose();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="fixed inset-0 max-w-none w-full h-full bg-slate-900 flex items-center justify-center border-none p-0">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="fixed inset-0 max-w-none w-full h-full bg-slate-900 border-none p-0 overflow-y-auto">
        <button onClick={onClose} className="fixed top-4 right-4 z-50 p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-white transition-colors">
          <X className="h-5 w-5" />
        </button>

        <TooltipProvider>
          <div className="relative min-h-full py-16 md:py-20 overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
            </div>
            
            <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
              <div className="text-center mb-8 md:mb-16">
                <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8">
                  <Star className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mr-2" />
                  <span className="text-emerald-400 font-semibold text-sm md:text-base">Simple Pricing</span>
                </div>
                <h2 className="text-2xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
                  {getModalTitle()}
                </h2>
              </div>

              <div className="flex items-center justify-center mb-8 md:mb-12">
                <div className="bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
                  <div className="flex">
                    <button
                      onClick={() => setBillingPeriod('monthly')}
                      className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${
                        billingPeriod === 'monthly' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingPeriod('annual')}
                      className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 relative ${
                        billingPeriod === 'annual' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Annual
                      {billingPeriod === 'annual' && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-br from-black via-slate-800 to-black text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg border border-slate-600/30 ring-1 ring-white/10 backdrop-blur-sm">
                          Save 20%
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-8 items-stretch">
                {plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative rounded-3xl border h-full flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      plan.isEnterprise
                        ? 'bg-gradient-to-br from-black/95 via-slate-900/95 to-black/95 border-slate-600/50 shadow-xl shadow-slate-900/40'
                        : plan.popular
                        ? 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border-emerald-500/30 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border-slate-700/40 shadow-xl shadow-slate-900/30'
                    }`}>
                    
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                        <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-6 py-2 rounded-full text-sm font-bold whitespace-nowrap shadow-lg shadow-emerald-500/30">
                          Most Popular
                        </div>
                      </div>
                    )}

                    <div className="p-6 text-center relative z-10">
                      <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-sm">{plan.name}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
                    </div>

                    <div className="px-6 text-center mb-6 relative z-10">
                      {plan.monthlyPrice ? (
                        <div>
                          <div className="flex items-baseline justify-center mb-2">
                            <span className="text-4xl font-bold text-emerald-400 drop-shadow-sm">
                              €{billingPeriod === 'annual' ? plan.annualPrice : plan.monthlyPrice}
                            </span>
                            <span className="text-slate-400 text-lg ml-2">/month</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline justify-center mb-2">
                            <span className="text-2xl font-semibold text-emerald-400 drop-shadow-sm">From €499</span>
                            <span className="text-slate-400 text-lg ml-2">/month</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-6 mb-6 relative z-10">
                      <Button 
                        onClick={() => handlePlanSelect(plan)}
                        disabled={isCheckingOut}
                        className={`w-full font-semibold py-3.5 px-6 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300 group ${
                          plan.isEnterprise
                            ? 'bg-gradient-to-r from-white to-slate-100 text-slate-900 hover:from-slate-100 hover:to-white shadow-white/20 hover:shadow-white/30'
                            : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60'
                        }`}
                      >
                        {isCheckingOut ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            {plan.cta}
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="px-6 pb-8 flex-1 relative z-10">
                      <div className="space-y-4">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start space-x-3">
                            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-slate-300 text-sm leading-relaxed font-medium">
                              {feature.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}