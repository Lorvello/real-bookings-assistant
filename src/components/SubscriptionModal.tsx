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
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { toast } = useToast();

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for individuals and small businesses just getting started',
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: [
        { text: 'Up to 3 calendars', tooltip: 'Create and manage up to 3 different booking calendars' },
        { text: 'Basic booking system', tooltip: 'Essential appointment scheduling features' },
        { text: 'Email notifications', tooltip: 'Automated email confirmations and reminders' },
        { text: 'Mobile responsive', tooltip: 'Optimized for all devices and screen sizes' },
        { text: 'Basic customization', tooltip: 'Customize colors and basic branding elements' },
        { text: 'Standard support', tooltip: 'Email support with response within 24-48 hours' }
      ],
      popular: false,
      gradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Professional',
      description: 'Most popular choice for growing businesses and teams',
      monthlyPrice: 79,
      yearlyPrice: 790,
      features: [
        { text: 'Unlimited calendars', tooltip: 'Create as many booking calendars as you need' },
        { text: 'Advanced booking features', tooltip: 'Buffer times, custom fields, booking forms' },
        { text: 'WhatsApp integration', tooltip: 'Send confirmations and reminders via WhatsApp' },
        { text: 'Team collaboration', tooltip: 'Multiple team members can manage bookings' },
        { text: 'Advanced customization', tooltip: 'Full branding control, custom CSS, white-label' },
        { text: 'Calendar sync', tooltip: 'Two-way sync with Google Calendar, Outlook' },
        { text: 'Analytics dashboard', tooltip: 'Detailed insights into your booking performance' },
        { text: 'Priority support', tooltip: 'Email and chat support with priority response' }
      ],
      popular: true,
      gradient: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-300',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'Enterprise',
      description: 'Advanced solution for large organizations with custom needs',
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: [
        { text: 'Everything in Professional', tooltip: 'All Professional features included' },
        { text: 'API access', tooltip: 'Full REST API for custom integrations' },
        { text: 'Advanced reporting', tooltip: 'Custom reports, data export, business intelligence' },
        { text: 'Custom integrations', tooltip: 'Bespoke integrations with your existing systems' },
        { text: 'Multi-location support', tooltip: 'Manage bookings across multiple locations' },
        { text: 'Advanced user roles', tooltip: 'Granular permission system for team members' },
        { text: 'Dedicated account manager', tooltip: 'Personal account manager for strategic support' },
        { text: 'SLA guarantee', tooltip: '99.9% uptime guarantee with service level agreement' }
      ],
      popular: false,
      gradient: 'from-emerald-50 to-teal-50',
      borderColor: 'border-emerald-300',
      buttonColor: 'bg-emerald-600 hover:bg-emerald-700'
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
    try {
      setIsCheckingOut(true);
      const price = isAnnual ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          tier: plan.name,
          price: price,
          billing: isAnnual ? 'annual' : 'monthly'
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
          {/* Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute top-40 left-40 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
          </div>

          {/* Header */}
          <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {getModalTitle()}
                  </h1>
                  <p className="mt-2 text-lg text-gray-600">
                    Choose the perfect plan for your business
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 hover:bg-white/20"
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
              <div className="flex items-center bg-white/50 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isAnnual 
                      ? 'bg-white text-gray-900 shadow-lg shadow-blue-500/25' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isAnnual 
                      ? 'bg-white text-gray-900 shadow-lg shadow-purple-500/25' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs px-2 py-0">
                    Save 17%
                  </Badge>
                </button>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              <TooltipProvider>
                {plans.map((plan, index) => (
                  <div
                    key={plan.name}
                    className={`relative bg-gradient-to-br ${plan.gradient} backdrop-blur-sm rounded-2xl border ${plan.borderColor} p-8 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                      plan.popular ? 'ring-2 ring-purple-300 shadow-2xl' : 'shadow-xl'
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 text-sm font-medium border-0 shadow-lg">
                          ⭐ Most Popular
                        </Badge>
                      </div>
                    )}

                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
                      
                      <div className="mt-6">
                        <span className="text-5xl font-bold text-gray-900">
                          €{isAnnual ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice}
                        </span>
                        <span className="text-gray-600 text-lg">/month</span>
                        {isAnnual && (
                          <div className="text-sm text-gray-500 mt-1">
                            Billed annually (€{plan.yearlyPrice})
                          </div>
                        )}
                      </div>
                    </div>

                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <div className="flex items-center gap-1">
                            <span className="text-gray-700 text-sm">{feature.text}</span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{feature.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handlePlanSelect(plan)}
                      disabled={isCheckingOut}
                      className={`w-full ${plan.buttonColor} text-white font-medium py-3 text-base rounded-xl transition-all duration-200 hover:scale-105 shadow-lg disabled:opacity-50 disabled:scale-100`}
                    >
                      {isCheckingOut ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : (
                        'Choose Plan'
                      )}
                    </Button>
                  </div>
                ))}
              </TooltipProvider>
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
                <TooltipProvider>
                  {plans.map((plan, index) => (
                    <div key={plan.name} className="w-full flex-shrink-0 px-4">
                      <div
                        className={`relative bg-gradient-to-br ${plan.gradient} backdrop-blur-sm rounded-2xl border ${plan.borderColor} p-6 ${
                          plan.popular ? 'ring-2 ring-purple-300 shadow-2xl' : 'shadow-xl'
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 text-xs font-medium border-0">
                              ⭐ Most Popular
                            </Badge>
                          </div>
                        )}

                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                          <p className="text-gray-600 text-sm">{plan.description}</p>
                          
                          <div className="mt-4">
                            <span className="text-4xl font-bold text-gray-900">
                              €{isAnnual ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice}
                            </span>
                            <span className="text-gray-600">/month</span>
                            {isAnnual && (
                              <div className="text-sm text-gray-500 mt-1">
                                Billed annually (€{plan.yearlyPrice})
                              </div>
                            )}
                          </div>
                        </div>

                        <ul className="space-y-3 mb-6">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start">
                              <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                              <div className="flex items-center gap-1">
                                <span className="text-gray-700 text-sm">{feature.text}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-gray-400 hover:text-gray-600 cursor-help" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="max-w-xs text-xs">{feature.tooltip}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => handlePlanSelect(plan)}
                          disabled={isCheckingOut}
                          className={`w-full ${plan.buttonColor} text-white font-medium py-2.5 rounded-xl transition-all duration-200 shadow-lg disabled:opacity-50`}
                        >
                          {isCheckingOut ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Processing...
                            </div>
                          ) : (
                            'Choose Plan'
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </TooltipProvider>
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