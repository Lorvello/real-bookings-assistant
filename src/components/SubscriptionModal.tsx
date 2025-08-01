import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, ChevronLeft, ChevronRight, Info, ArrowRight, Shield, Star, Users, Clock, TrendingUp, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserType } from '@/types/userStatus';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionTiers } from '@/hooks/useSubscriptionTiers';
import { isTestMode, getPriceId } from '@/utils/stripeConfig';
import { EnterpriseContactForm } from '@/components/EnterpriseContactForm';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType: UserType;
}

export function SubscriptionModal({ isOpen, onClose, userType }: SubscriptionModalProps) {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const { toast } = useToast();
  const { tiers, isLoading } = useSubscriptionTiers();
  const testMode = isTestMode();

  // Body scroll lock when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isOpen]);

  // Create plans from database tiers with dynamic price IDs
  const plans = React.useMemo(() => {
    if (!tiers || isLoading) {
      return [];
    }

    const starterTier = tiers.find(t => t.tier_name === 'starter');
    const professionalTier = tiers.find(t => t.tier_name === 'professional');
    const enterpriseTier = tiers.find(t => t.tier_name === 'enterprise');

    const planData = [
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
            text: "AI-powered intelligent reminder sequences",
            tooltip: "Automated reminder messages sent via WhatsApp to reduce no-shows and improve attendance rates"
          },
          {
            text: "Essential dashboard overview & live operations monitoring",
            tooltip: "Real-time view of bookings, appointments, and live operations monitoring with basic analytics"
          },
          {
            text: "Global multi-language localization",
            tooltip: "Automatically communicate with customers in their preferred language across multiple regions"
          },
          {
            text: "Streamlined payment processing & collection",
            tooltip: "Integrated payment system for booking deposits and service payments with automated invoicing"
          }
        ],
        popular: false,
        tier_name: 'starter',
        tierData: starterTier,
        stripePriceId: starterTier ? getPriceId(starterTier, isAnnual, testMode) : null
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
            text: "Advanced team collaboration suite (3+ users)",
            tooltip: "Multi-user workspace with role-based permissions, shared calendars, and team communication tools"
          },
          {
            text: "Multi-location business coordination",
            tooltip: "Manage bookings and operations across multiple business locations with centralized control"
          },
          {
            text: "Complete analytics suite: Business Intelligence, Performance tracking & Future Insights",
            tooltip: "Comprehensive analytics including appointment trends, customer behavior insights, revenue tracking, conversion rates, and predictive analytics for business growth and optimization"
          },
          {
            text: "Dedicated priority customer success",
            tooltip: "Priority support with faster response times and dedicated success manager for onboarding and optimization"
          }
        ],
        popular: true,
        tier_name: 'professional',
        tierData: professionalTier,
        stripePriceId: professionalTier ? getPriceId(professionalTier, isAnnual, testMode) : null
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
          },
          {
            text: "Intelligent voice call routing & distribution",
            tooltip: "Automated phone call management with smart routing to available team members and call recording capabilities"
          },
          {
            text: "Omnichannel social media DM orchestration",
            tooltip: "Unified management of direct messages across Facebook, Instagram, Twitter, LinkedIn, and other social platforms from one dashboard"
          },
          {
            text: "Advanced reputation management & review analytics",
            tooltip: "Monitor and manage online reviews across Google, Facebook, and other platforms with automated response suggestions and reputation scoring"
          },
          {
            text: "Enterprise SLA with dedicated success management",
            tooltip: "99.9% uptime guarantee, dedicated account manager, and enterprise-level support with guaranteed response times"
          },
          {
            text: "White-glove onboarding & strategic integration consulting",
            tooltip: "Complete setup assistance, custom integration with existing systems, staff training, and ongoing strategic consultation"
          }
        ],
        popular: false,
        isEnterprise: true,
        tier_name: 'enterprise',
        tierData: enterpriseTier
      }
    ];

    return planData;
  }, [tiers, isLoading, isAnnual, testMode]);

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, plans.length - 1));
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };
  
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentSlide < plans.length - 1) {
      nextSlide();
    } else if (isRightSwipe && currentSlide > 0) {
      prevSlide();
    }
  };

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

  const [showEnterpriseForm, setShowEnterpriseForm] = useState(false);

  const handlePlanSelect = async (plan: typeof plans[0]) => {
    if (plan.isEnterprise) {
      setShowEnterpriseForm(true);
      return;
    }

    if (!plan.stripePriceId) {
      toast({
        title: "Error",
        description: "Price configuration not available. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCheckingOut(true);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.stripePriceId,
          tier_name: plan.tier_name,
          price: isAnnual ? plan.annualPrice : plan.monthlyPrice,
          is_annual: isAnnual,
          mode: testMode ? 'test' : 'live',
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
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="!fixed !inset-0 !w-screen !h-screen !max-w-none !max-h-none !p-0 !m-0 !translate-x-0 !translate-y-0 !transform-none !rounded-none !border-none z-[9999]"
          style={{
            overflow: 'hidden',
            touchAction: 'none'
          }}
        >
          <div 
            className="relative"
            style={{
              overflow: 'auto',
              overflowY: 'scroll',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              scrollBehavior: 'smooth'
            }}
          >
            {/* Premium Background - Now part of scrollable content */}
            <div className="relative w-full">
              <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
              <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
            
            {/* Content container */}
            <div className="relative w-full">

            {/* Header */}
            <div className="relative z-10 bg-black/20 backdrop-blur-sm border-b border-white/10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Stripe Mode Indicator - Only show in test mode */}
                {testMode && (
                  <div className="mb-4 text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm bg-orange-500/90 text-white">
                      🧪 TEST MODE - No real charges will be made
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                      {getModalTitle()}
                    </h1>
                    <p className="mt-2 text-lg text-slate-300">
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
            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
              {/* Main Content Grid */}
              <div className="grid lg:grid-cols-5 gap-8 lg:gap-12 items-start">
                
                {/* Left Side - Trust & Value Section */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Trust Indicators */}
                  <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-xl shadow-slate-900/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Shield className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Trusted & Secure</h3>
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>SSL encrypted & secure payments</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>30-day money-back guarantee</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Cancel anytime, no questions asked</span>
                      </div>
                    </div>
                  </div>

                  {/* Social Proof */}
                  <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-xl shadow-slate-900/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Users className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Join 1,200+ Businesses</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">JD</div>
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">SM</div>
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">AL</div>
                        </div>
                        <span className="text-sm text-slate-300">12 people signed up today</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-current" />
                          ))}
                        </div>
                        <span className="text-sm text-slate-300">4.9/5 from 150+ reviews</span>
                      </div>
                    </div>
                  </div>

                  {/* Value Highlights */}
                  <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border border-slate-700/40 rounded-2xl p-6 shadow-xl shadow-slate-900/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">What You're Getting</h3>
                    </div>
                    <div className="space-y-3 text-sm text-slate-300">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-emerald-400" />
                        <span>Save <strong className="text-white">15+ hours</strong> per week</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        <span>Increase bookings by <strong className="text-white">40%</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Award className="w-4 h-4 text-emerald-400" />
                        <span>Reduce no-shows by <strong className="text-white">60%</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Testimonial */}
                  <div className="bg-gradient-to-br from-emerald-500/10 via-green-500/10 to-emerald-500/10 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 shadow-xl shadow-emerald-500/20">
                    <div className="flex text-yellow-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <p className="text-slate-200 text-sm italic mb-3">
                      "BookingsAssistant completely transformed our business. We went from chaos to organized efficiency in just one week!"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">MB</div>
                      <div>
                        <div className="text-white text-sm font-medium">Maria Bakker</div>
                        <div className="text-slate-400 text-xs">Beauty Salon Owner</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Side - Plans Section */}
                <div className="lg:col-span-3">
                  
              {/* Premium Toggle */}
              <div className="flex items-center justify-center mb-8 md:mb-12">
                <div className="bg-slate-800/50 rounded-full p-1 border border-slate-700/50">
                  <div className="flex">
                    <button
                      onClick={() => setIsAnnual(false)}
                      className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 ${
                        !isAnnual
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setIsAnnual(true)}
                      className={`px-4 py-2 md:px-6 md:py-3 rounded-full text-sm md:text-base font-medium transition-all duration-300 relative ${
                        isAnnual
                          ? 'bg-emerald-500 text-white shadow-lg'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Annual
                      {isAnnual && (
                        <span className="absolute -top-2 -right-2 bg-gradient-to-br from-black via-slate-800 to-black text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg border border-slate-600/30 ring-1 ring-white/10 backdrop-blur-sm">
                          Save 20%
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Desktop Grid */}
              <div className="hidden md:grid md:grid-cols-3 gap-6 items-stretch">
                {plans.map((plan, index) => (
                  <div key={plan.name} className={`relative rounded-3xl border h-full flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                    plan.isEnterprise
                      ? 'bg-gradient-to-br from-black/95 via-slate-900/95 to-black/95 border-slate-600/50 shadow-xl shadow-slate-900/40'
                      : plan.popular
                      ? 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border-emerald-500/30 shadow-xl shadow-emerald-500/20 ring-2 ring-emerald-500/30'
                      : 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm border-slate-700/40 shadow-xl shadow-slate-900/30'
                  } group`}>
                    
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent opacity-60 rounded-3xl pointer-events-none" />
                    <div className={`absolute inset-0 rounded-3xl pointer-events-none ${
                      plan.popular ? 'bg-gradient-to-t from-emerald-500/[0.08] via-transparent to-transparent' : 'bg-gradient-to-t from-slate-500/[0.05] via-transparent to-transparent'
                    }`} />
                    
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
                              €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                            </span>
                            <span className="text-slate-400 text-lg ml-2">/month</span>
                          </div>
                          {isAnnual && (
                            <div className="text-sm text-emerald-400/90 mb-1">
                              Billed annually (€{plan.annualPrice * 12}/year)
                            </div>
                          )}
                          <div className="text-xs text-slate-500">
                            Save €{((plan.monthlyPrice - plan.annualPrice) * 12)} per year
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-baseline justify-center mb-2">
                            <span className="text-2xl font-semibold text-emerald-400 drop-shadow-sm">From €499</span>
                            <span className="text-slate-400 text-lg ml-2">/month</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            Custom pricing based on your needs
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
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            Choose Plan
                            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="px-6 pb-8 flex-1 relative z-10">
                      <div className="space-y-4">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start space-x-3 group">
                            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm group-hover:shadow-emerald-400/30 transition-all duration-200">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                             <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex-1 cursor-help">
                                  <span className="text-slate-300 text-sm leading-relaxed font-medium hover:text-slate-200 transition-colors">
                                    {feature.text}
                                    <Info className="w-2.5 h-2.5 text-slate-500 hover:text-slate-400 transition-colors ml-0.5 inline align-baseline" />
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="top" 
                                className="max-w-xs bg-slate-900 border-slate-700 text-slate-200 text-xs p-3 shadow-xl z-[9999]"
                              >
                                <p>{feature.tooltip}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile Carousel */}
              <div className="md:hidden relative py-4">
                <div className="w-full max-w-sm mx-auto relative">
                  <div 
                    className="relative overflow-hidden rounded-lg"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    <div 
                      className="flex transition-transform duration-700 ease-in-out"
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                    >
                      {plans.map((plan, index) => (
                        <div
                          key={plan.name}
                          className="w-full flex-shrink-0 px-3"
                        >
                          <div className={`rounded-2xl border overflow-hidden relative flex flex-col backdrop-blur-xl ${
                            plan.isEnterprise
                              ? 'bg-gradient-to-br from-black/95 via-slate-900/95 to-black/95 border-slate-600/50 shadow-2xl shadow-slate-900/50'
                              : plan.popular
                              ? 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border-emerald-500/40 shadow-2xl shadow-emerald-500/30 ring-1 ring-emerald-500/40'
                              : 'bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 border-slate-700/50 shadow-2xl shadow-slate-900/50'
                          }`} style={{ minHeight: '320px' }}>
                            
                            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.10] via-white/[0.02] to-transparent opacity-70 pointer-events-none rounded-2xl" />
                            <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
                              plan.popular 
                                ? 'bg-gradient-to-t from-emerald-500/[0.08] via-emerald-400/[0.02] to-transparent' 
                                : 'bg-gradient-to-t from-slate-500/[0.05] via-transparent to-transparent'
                            }`} />
                            
                            {plan.popular && (
                              <div className="absolute top-2.5 left-1/2 transform -translate-x-1/2 z-10">
                                <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shadow-lg shadow-emerald-500/40">
                                  Most Popular
                                </div>
                              </div>
                            )}

                            <div className={`p-3.5 text-center relative z-10 ${plan.popular ? 'pt-10' : 'pt-4'}`}>
                              <h3 className="text-lg font-bold text-white drop-shadow-lg mb-1.5">{plan.name}</h3>
                              <p className="text-slate-400 text-[10px] leading-tight px-1">{plan.description}</p>
                            </div>

                            <div className="px-3.5 text-center mb-2.5 relative z-10">
                              {plan.monthlyPrice ? (
                                <div>
                                  <div className="flex items-baseline justify-center mb-1">
                                    <span className="text-xl font-bold text-emerald-400 drop-shadow-lg">
                                      €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="text-slate-300/90 text-sm ml-1">/month</span>
                                  </div>
                                  {isAnnual && (
                                    <div className="text-[10px] text-emerald-400/90 mb-0.5">
                                      Billed annually (€{(plan.annualPrice || 0) * 12}/year)
                                    </div>
                                  )}
                                  <div className="text-[9px] text-slate-500">
                                    Save €{((plan.monthlyPrice - (plan.annualPrice || 0)) * 12)} per year
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-baseline justify-center mb-1">
                                    <span className="text-lg font-semibold text-emerald-400 drop-shadow-lg">From €499</span>
                                    <span className="text-slate-300/90 text-xs ml-1">/month</span>
                                  </div>
                                  <div className="text-[9px] text-slate-500">
                                    Custom pricing
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="px-3.5 mb-2.5 relative z-10">
                              <Button 
                                onClick={() => handlePlanSelect(plan)}
                                disabled={isCheckingOut}
                                className={`w-full font-semibold py-2.5 px-3.5 rounded-xl text-xs shadow-lg hover:shadow-xl transition-all duration-300 group backdrop-blur-sm ${
                                  plan.isEnterprise
                                    ? 'bg-gradient-to-r from-white to-slate-100 text-slate-900 hover:from-slate-100 hover:to-white shadow-white/20 hover:shadow-white/30'
                                    : 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-emerald-500/50'
                                }`}
                              >
                                {isCheckingOut ? (
                                  <div className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  <>
                                    Choose Plan
                                    <ArrowRight className="ml-1.5 w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="px-3.5 pb-3.5 flex-1 relative z-10">
                              <div className="space-y-1.5">
                                {plan.features.map((feature, idx) => (
                                  <div key={idx} className="flex items-start space-x-2">
                                    <div className="w-3.5 h-3.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-emerald-400/30">
                                      <Check className="w-2 h-2 text-white" />
                                    </div>
                                     <div className="flex-1">
                                       <span className="text-slate-200/95 text-[10px] leading-tight font-medium tracking-wide">
                                         {feature.text}
                                       </span>
                                     </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {currentSlide > 0 && (
                    <div className="absolute top-1/2 -translate-y-1/2 -left-5 z-20">
                      <button
                        onClick={prevSlide}
                        className="p-3 rounded-full bg-slate-800/95 text-white hover:bg-slate-700/95 transition-colors duration-200 shadow-lg backdrop-blur-sm border border-slate-700/50"
                        aria-label="Previous slide"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {currentSlide < plans.length - 1 && (
                    <div className="absolute top-1/2 -translate-y-1/2 -right-5 z-20">
                      <button
                        onClick={nextSlide}
                        className="p-3 rounded-full bg-slate-800/95 text-white hover:bg-slate-700/95 transition-colors duration-200 shadow-lg backdrop-blur-sm border border-slate-700/50"
                        aria-label="Next slide"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex justify-center mt-6 space-x-2">
                    {plans.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide 
                            ? 'bg-emerald-400 w-8 shadow-md shadow-emerald-400/30' 
                            : 'bg-slate-600 hover:bg-slate-500 w-2'
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div> {/* End Mobile Carousel */}
              
                </div> {/* End Right Side - Plans Section */}
              </div> {/* End Main Content Grid */}
            </div> {/* End Content */}
            </div> {/* End Content container */}
            </div> {/* End Premium Background */}
          </div> {/* End Scrollable div */}
        </DialogContent>
      </Dialog>

      <EnterpriseContactForm 
        open={showEnterpriseForm} 
        onOpenChange={setShowEnterpriseForm} 
      />
    </TooltipProvider>
  );
}