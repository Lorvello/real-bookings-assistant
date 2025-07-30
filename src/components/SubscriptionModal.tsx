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
      name: 'Starter',
      monthlyPrice: 9,
      annualPrice: 108,
      yearlyDiscount: 20,
      description: 'Perfect for individuals and small teams starting out',
      features: [
        { 
          text: 'Up to 5 team members', 
          tooltip: 'Add up to 5 team members to collaborate on projects' 
        },
        { 
          text: '10GB storage', 
          tooltip: 'Store files, documents, and project assets with 10GB of cloud storage' 
        },
        { 
          text: 'Basic analytics', 
          tooltip: 'Track project progress with essential metrics and reporting' 
        },
        { 
          text: 'Email support', 
          tooltip: 'Get help via email with our standard support team' 
        },
        { 
          text: 'Mobile app access', 
          tooltip: 'Access your projects on the go with our mobile application' 
        }
      ],
      cta: 'Choose Plan',
      popular: false
    },
    {
      name: 'Professional',
      monthlyPrice: 29,
      annualPrice: 348,
      yearlyDiscount: 20,
      description: 'Ideal for growing teams and businesses',
      features: [
        { 
          text: 'Up to 50 team members', 
          tooltip: 'Scale your team with up to 50 collaborators' 
        },
        { 
          text: '100GB storage', 
          tooltip: 'Expanded storage capacity for larger teams and more content' 
        },
        { 
          text: 'Advanced analytics', 
          tooltip: 'Deep insights with custom dashboards, detailed reports, and data export' 
        },
        { 
          text: 'Priority support', 
          tooltip: 'Faster response times and priority handling for all support requests' 
        },
        { 
          text: 'API access', 
          tooltip: 'Integrate with third-party tools and build custom solutions' 
        },
        { 
          text: 'Custom integrations', 
          tooltip: 'Connect with your existing workflow tools and platforms' 
        },
        { 
          text: 'Advanced security', 
          tooltip: 'Enhanced security features including SSO and advanced permissions' 
        }
      ],
      cta: 'Choose Plan',
      popular: true
    },
    {
      name: 'Enterprise',
      monthlyPrice: 99,
      annualPrice: 1188,
      yearlyDiscount: 20,
      description: 'For large organizations with advanced needs',
      features: [
        { 
          text: 'Unlimited team members', 
          tooltip: 'No limits on team size - perfect for large organizations' 
        },
        { 
          text: 'Unlimited storage', 
          tooltip: 'Store as much content as you need without worrying about limits' 
        },
        { 
          text: 'Custom analytics', 
          tooltip: 'Tailored reporting and analytics designed for your specific needs' 
        },
        { 
          text: '24/7 phone support', 
          tooltip: 'Round-the-clock phone support with dedicated enterprise specialists' 
        },
        { 
          text: 'Dedicated account manager', 
          tooltip: 'Personal account manager to help optimize your workflow' 
        },
        { 
          text: 'Custom contracts', 
          tooltip: 'Flexible contract terms and pricing tailored to your organization' 
        },
        { 
          text: 'On-premise deployment', 
          tooltip: 'Deploy on your own infrastructure for maximum control and security' 
        },
        { 
          text: 'Advanced compliance', 
          tooltip: 'Meet industry standards with SOC 2, HIPAA, and other compliance features' 
        }
      ],
      cta: 'Contact Sales',
      popular: false
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
      const price = isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice;
      
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
              <div className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20">
                <button
                  onClick={() => setIsAnnual(false)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    !isAnnual 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setIsAnnual(true)}
                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    isAnnual 
                      ? 'bg-white text-gray-900 shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Annual
                  <Badge className="bg-emerald-500 text-white border-0 text-xs px-2 py-0">
                    Save 20%
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
                     className={`relative bg-white rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-2xl group ${
                       plan.popular 
                         ? 'ring-2 ring-emerald-500 shadow-emerald-500/25 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' 
                         : 'border-gray-200 hover:border-gray-300'
                     }`}
                  >
                    {plan.popular && (
                       <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                         <Badge className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 text-sm font-medium border-0 shadow-lg">
                           Most Popular
                         </Badge>
                       </div>
                    )}

                     <div className="text-center mb-8">
                       <h3 className={`text-2xl font-bold mb-2 ${
                         plan.popular ? 'text-emerald-900' : 'text-gray-900'
                       }`}>{plan.name}</h3>
                       <p className="text-gray-600 text-sm leading-relaxed">{plan.description}</p>
                      
                       <div className="mt-6">
                         <span className={`text-5xl font-bold ${
                           plan.popular ? 'text-emerald-900' : 'text-gray-900'
                         }`}>
                           €{isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice}
                         </span>
                         <span className="text-gray-600 text-lg">/month</span>
                         {isAnnual && (
                           <div className="text-sm text-emerald-600 mt-1">
                             €{plan.annualPrice}/year - Save 20%
                           </div>
                         )}
                       </div>
                    </div>

                     <ul className="space-y-4 mb-8">
                       {plan.features.map((feature, featureIndex) => (
                         <li key={featureIndex} className="flex items-start">
                           <Check className={`h-5 w-5 ${
                             plan.popular ? 'text-emerald-600' : 'text-gray-400'
                           } mr-3 flex-shrink-0 mt-0.5`} />
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
                       className={`w-full py-3 ${
                         plan.popular 
                           ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white' 
                           : 'bg-gray-900 hover:bg-gray-800 text-white'
                       } transition-all duration-200 font-medium`}
                     >
                       {isCheckingOut ? (
                         <div className="flex items-center justify-center gap-2">
                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                           Processing...
                         </div>
                       ) : (
                         plan.cta
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
                         className={`relative bg-white rounded-2xl border p-6 ${
                           plan.popular 
                             ? 'ring-2 ring-emerald-500 shadow-emerald-500/25 bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' 
                             : 'border-gray-200 shadow-xl'
                         }`}
                       >
                        {plan.popular && (
                           <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                             <Badge className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-3 py-1 text-xs font-medium border-0">
                               Most Popular
                             </Badge>
                           </div>
                        )}

                         <div className="text-center mb-6">
                           <h3 className={`text-xl font-bold mb-2 ${
                             plan.popular ? 'text-emerald-900' : 'text-gray-900'
                           }`}>{plan.name}</h3>
                           <p className="text-gray-600 text-sm">{plan.description}</p>
                           
                           <div className="mt-4">
                             <span className={`text-4xl font-bold ${
                               plan.popular ? 'text-emerald-900' : 'text-gray-900'
                             }`}>
                               €{isAnnual ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice}
                             </span>
                             <span className="text-gray-600">/month</span>
                             {isAnnual && (
                               <div className="text-sm text-emerald-600 mt-1">
                                 €{plan.annualPrice}/year - Save 20%
                               </div>
                             )}
                           </div>
                         </div>

                         <ul className="space-y-3 mb-6">
                           {plan.features.map((feature, featureIndex) => (
                             <li key={featureIndex} className="flex items-start">
                               <Check className={`h-4 w-4 ${
                                 plan.popular ? 'text-emerald-600' : 'text-gray-400'
                               } mr-2 flex-shrink-0 mt-0.5`} />
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
                           className={`w-full py-2.5 ${
                             plan.popular 
                               ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white' 
                               : 'bg-gray-900 hover:bg-gray-800 text-white'
                           } transition-all duration-200 font-medium`}
                         >
                           {isCheckingOut ? (
                             <div className="flex items-center justify-center gap-2">
                               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                               Processing...
                             </div>
                           ) : (
                             plan.cta
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