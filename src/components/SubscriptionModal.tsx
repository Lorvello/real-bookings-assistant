import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserType } from '@/types/userStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
}

export function SubscriptionModal({ isOpen, onClose, userType }: SubscriptionModalProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { toast } = useToast();

  const plans = [
    {
      name: "Starter",
      price: "19",
      yearlyPrice: "15",
      period: "/month",
      description: "Perfect for beginners with basic WhatsApp automation and calendar management",
      features: [
        "Strategic WhatsApp contact management (up to 500)",
        "Dual-calendar orchestration system", 
        "AI-powered intelligent reminder sequences",
        "Essential dashboard overview & live operations monitoring",
        "Global multi-language localization",
        "Streamlined payment processing & collection"
      ],
      buttonText: "Choose Plan",
      href: "#",
      isPopular: false,
      tier_name: 'starter',
      stripePriceId: 'price_starter'
    },
    {
      name: "Professional",
      price: "49",
      yearlyPrice: "39",
      period: "/month",
      description: "Advanced features for teams with extended contact management and collaboration tools",
      features: [
        "All Starter premium features included",
        "Professional WhatsApp contact management (up to 2,500)",
        "Unlimited calendar orchestration platform",
        "Advanced team collaboration suite (3+ users)",
        "Multi-location business coordination",
        "Complete analytics suite: Business Intelligence, Performance tracking & Future Insights",
        "Dedicated priority customer success"
      ],
      buttonText: "Choose Plan",
      href: "#",
      isPopular: true,
      tier_name: 'professional',
      stripePriceId: 'price_professional'
    },
    {
      name: "Enterprise",
      price: "Custom",
      yearlyPrice: "Custom",
      period: "/month",
      description: "Complete business solution with dedicated WhatsApp number and premium support",
      features: [
        "Complete professional suite included",
        "Unlimited enterprise WhatsApp contact management",
        "Dedicated WhatsApp Business API with custom branding",
        "Intelligent voice call routing & distribution",
        "Omnichannel social media DM orchestration",
        "Advanced reputation management & review analytics",
        "Enterprise SLA with dedicated success management",
        "White-glove onboarding & strategic integration consulting"
      ],
      buttonText: "Contact Sales",
      href: "#",
      isPopular: false,
      isCustom: true,
      tier_name: 'enterprise',
      stripePriceId: 'price_enterprise'
    }
  ];

  // Touch handlers for mobile carousel
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < plans.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  }, [touchStart, touchEnd, currentSlide, plans.length]);

  const getModalTitle = () => {
    switch (userType) {
      case 'expired_trial':
        return 'Your trial has expired';
      case 'canceled_subscriber':
        return 'Reactivate your subscription';
      default:
        return 'Choose your plan';
    }
  };

  const handlePlanSelect = async (plan: typeof plans[0]) => {
    if (plan.name === 'Enterprise') {
      // Handle enterprise contact logic
      window.open('mailto:sales@company.com', '_blank');
      return;
    }

    try {
      setIsCheckingOut(true);
      const price = isAnnual ? parseInt(plan.yearlyPrice) : parseInt(plan.price);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier_name: plan.tier_name,
          price: price,
          is_annual: isAnnual,
          success_url: `${window.location.origin}/success`,
          cancel_url: `${window.location.origin}/dashboard`,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !p-0 !m-0 !translate-x-0 !translate-y-0 !transform-none !rounded-none !border-none overflow-y-auto z-[9999]">
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.1)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
            
            {/* Animated circles */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>

          {/* Header */}
          <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {getModalTitle()}
                  </h1>
                  <p className="mt-2 text-lg text-gray-300">
                    Choose the perfect plan for your business
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 hover:bg-white/10 text-white"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Billing Toggle */}
            <div className="flex justify-center mb-12">
              <div className="relative">
                {isAnnual && (
                  <div className="absolute -top-4 right-4 bg-black text-green-500 px-2 py-1 rounded text-xs font-bold">
                    20% OFF
                  </div>
                )}
                <div className="rounded-lg p-1 border bg-gray-800 border-gray-700">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`px-6 py-2 rounded-md transition-all ${
                      !isAnnual 
                        ? 'bg-white text-gray-900 shadow-md' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`px-6 py-2 rounded-md transition-all ${
                      isAnnual 
                        ? 'bg-white text-gray-900 shadow-md' 
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {plans.map((plan, index) => (
                <div
                  key={plan.name}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    plan.name === 'Enterprise' ? 'bg-black border-gray-600 text-white' : 'bg-gray-800 border-gray-700'
                  } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''} hover:scale-105 hover:shadow-xl rounded-2xl p-8`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </div>
                  )}
                  
                  <div className="text-center mb-8">
                    <h3 className={`text-2xl font-bold mb-2 ${
                      plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                    }`}>
                      {plan.name}
                    </h3>
                    <p className={`mb-6 text-sm ${
                      plan.name === 'Enterprise' ? 'text-gray-300' : 'text-gray-300'
                    }`}>
                      {plan.description}
                    </p>
                    <div className="mt-6">
                      {plan.isCustom ? (
                        <span className={`text-5xl font-bold ${
                          plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                        }`}>
                          Custom
                        </span>
                      ) : (
                        <>
                          <span className={`text-5xl font-bold ${
                            plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                          }`}>
                            €{isAnnual ? plan.yearlyPrice : plan.price}
                          </span>
                          <span className={`ml-2 text-lg ${
                            plan.name === 'Enterprise' ? 'text-gray-300' : 'text-gray-300'
                          }`}>
                            /month
                          </span>
                        </>
                      )}
                      {!plan.isCustom && isAnnual && (
                        <div className="text-sm text-green-600 font-medium mt-1">
                          Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <span className="text-green-500 mr-3 mt-0.5">✓</span>
                        <span className={
                          plan.name === 'Enterprise' ? 'text-gray-200 text-sm' : 'text-gray-300 text-sm'
                        }>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button
                    onClick={() => handlePlanSelect(plan)}
                    disabled={isCheckingOut}
                    className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-200 ${
                      plan.isPopular
                        ? 'bg-green-500 text-white hover:bg-green-600 shadow-lg hover:shadow-xl'
                        : plan.name === 'Enterprise'
                          ? 'bg-white text-black hover:bg-gray-100'
                          : 'bg-white text-black hover:bg-gray-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isCheckingOut ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      plan.buttonText
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Mobile Carousel */}
            <div className="md:hidden">
              <div 
                className="flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {plans.map((plan, index) => (
                  <div key={plan.name} className="w-full flex-shrink-0 px-4">
                    <div
                      className={`relative transition-all duration-300 ${
                        plan.name === 'Enterprise' ? 'bg-black border-gray-600 text-white' : 'bg-gray-800 border-gray-700'
                      } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''} rounded-2xl border p-6`}
                    >
                      {plan.isPopular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Most Popular
                        </div>
                      )}

                      <div className="text-center mb-6">
                        <h3 className={`text-xl font-bold mb-2 ${
                          plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                        }`}>
                          {plan.name}
                        </h3>
                        <p className={`text-sm mb-4 ${
                          plan.name === 'Enterprise' ? 'text-gray-300' : 'text-gray-300'
                        }`}>
                          {plan.description}
                        </p>
                        
                        <div className="mt-4">
                          {plan.isCustom ? (
                            <span className={`text-4xl font-bold ${
                              plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                            }`}>
                              Custom
                            </span>
                          ) : (
                            <>
                              <span className={`text-4xl font-bold ${
                                plan.name === 'Enterprise' ? 'text-white' : 'text-white'
                              }`}>
                                €{isAnnual ? plan.yearlyPrice : plan.price}
                              </span>
                              <span className={`ml-1 text-sm ${
                                plan.name === 'Enterprise' ? 'text-gray-300' : 'text-gray-300'
                              }`}>
                                /month
                              </span>
                            </>
                          )}
                          {!plan.isCustom && isAnnual && (
                            <div className="text-xs text-green-600 font-medium mt-1">
                              Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                            </div>
                          )}
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.features.slice(0, 4).map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <span className="text-green-500 mr-2 mt-0.5 text-sm">✓</span>
                            <span className={`text-sm ${
                              plan.name === 'Enterprise' ? 'text-gray-200' : 'text-gray-300'
                            }`}>
                              {feature}
                            </span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className={`text-xs italic ${
                            plan.name === 'Enterprise' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            +{plan.features.length - 4} more features
                          </li>
                        )}
                      </ul>

                      <Button
                        onClick={() => handlePlanSelect(plan)}
                        disabled={isCheckingOut}
                        className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                          plan.isPopular
                            ? 'bg-green-500 text-white hover:bg-green-600'
                            : plan.name === 'Enterprise'
                              ? 'bg-white text-black hover:bg-gray-100'
                              : 'bg-white text-black hover:bg-gray-100'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isCheckingOut ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          plan.buttonText
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Navigation */}
              <div className="flex justify-center items-center mt-8 space-x-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="h-10 w-10 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex space-x-2">
                  {plans.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-3 h-3 rounded-full transition-all duration-200 ${
                        index === currentSlide 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 scale-125' 
                          : 'bg-white/50 hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentSlide(Math.min(plans.length - 1, currentSlide + 1))}
                  disabled={currentSlide === plans.length - 1}
                  className="h-10 w-10 bg-white/50 backdrop-blur-sm border-white/20 hover:bg-white/70"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}