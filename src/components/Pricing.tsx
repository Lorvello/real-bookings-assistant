
import { Check, Star, ArrowRight, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 20,
      annualPrice: 16,
      description: "Perfect for beginners with basic WhatsApp automation and calendar management",
      features: [
        "Up to 500 WhatsApp contacts",
        "Up to 2 calendars",
        "Automated reminders",
        "Detailed analytics",
        "Multi-language support",
        "Advance payment collection"
      ],
      popular: false,
      cta: "Start Your Free Trial Now",
      color: "from-slate-600 to-slate-700"
    },
    {
      name: "Professional",
      monthlyPrice: 50,
      annualPrice: 40,
      description: "Advanced features for teams with extended contact management and collaboration tools",
      features: [
        "All Starter features included",
        "Up to 2500 WhatsApp contacts",
        "Unlimited Calendars",
        "Team collaboration (3+ users)",
        "Review system",
        "Future Insights",
        "Priority support"
      ],
      popular: true,
      cta: "Start Your Free Trial Now",
      color: "from-emerald-500 to-green-500"
    },
    {
      name: "Enterprise",
      monthlyPrice: null,
      annualPrice: null,
      description: "Complete business solution with dedicated WhatsApp number and premium support",
      features: [
        "All professional features included",
        "Unlimited WhatsApp contacts",
        "Own WhatsApp number with dedicated branding",
        "Voice call routing",
        "Social media DM integration",
        "SLA & dedicated priority support",
        "Done-for-you onboarding & integration support"
      ],
      popular: false,
      cta: "Contact Sales",
      color: "from-slate-900 to-black",
      isEnterprise: true
    }
  ];

  // Slideshow navigation functions
  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, plans.length - 1));
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };
  
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Touch gesture support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  return (
    <section className="py-16 md:py-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
        {/* Header */}
        <ScrollAnimatedSection animation="fade-up" delay={0} className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mr-2" />
            <span className="text-emerald-400 font-semibold text-sm md:text-base">Simple Pricing</span>
          </div>
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Choose Your <span className="text-emerald-400">Perfect Plan</span>
          </h2>
          <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            Start with our free trial and scale as you grow. No setup fees, no contracts.
          </p>
        </ScrollAnimatedSection>

        {/* Pricing toggle */}
        <ScrollAnimatedSection animation="fade-up" delay={200} className="flex items-center justify-center mb-8 md:mb-12">
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
                    <span className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      Save 20%
                    </span>
                  </button>
            </div>
          </div>
        </ScrollAnimatedSection>

        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <ScrollAnimatedSection
              key={plan.name}
              animation="fade-up"
              delay={400 + index * 150}
              className={`relative rounded-3xl p-8 border ${
                plan.isEnterprise
                  ? 'bg-gradient-to-br from-slate-900 to-black border-slate-600'
                  : 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-700/50'
              } ${plan.popular ? 'ring-2 ring-emerald-500/50' : ''}`}
              as="div"
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap shadow-lg">
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>
                
                {plan.monthlyPrice ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-center">
                      <span className="text-4xl font-bold text-emerald-400">
                        €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                      </span>
                      <span className="text-slate-400 text-xl ml-2">/month</span>
                    </div>
                    {isAnnual && (
                      <div className="text-sm text-emerald-400 mt-2">
                        Billed annually (€{plan.annualPrice * 12}/year)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-6">
                    <div className="text-4xl font-bold text-white mb-2">Custom</div>
                    <div className="text-slate-400">Contact us for pricing</div>
                  </div>
                )}
              </div>

              <div className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <Button 
                className={`w-full font-semibold py-3 px-6 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300 group ${
                  plan.isEnterprise
                    ? 'bg-white text-black hover:bg-gray-100'
                    : plan.popular
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                {plan.cta}
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </ScrollAnimatedSection>
          ))}
        </div>

        {/* Mobile: Slideshow */}
        <div className="md:hidden relative py-4">
          <div className="w-full max-w-xs mx-auto relative">
            {/* Slide container */}
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
                    className="w-full flex-shrink-0 px-2"
                  >
                    <div className={`rounded-lg border shadow-lg overflow-hidden relative ${
                      plan.isEnterprise
                        ? 'bg-gradient-to-br from-slate-900 to-black border-slate-600'
                        : 'bg-slate-900/95 border-slate-700/50'
                    }`}>
                      {plan.popular && (
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-10">
                          <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                            Most Popular
                          </div>
                        </div>
                      )}

                      <div className={`p-5 ${plan.popular ? 'pt-12' : ''}`}>
                        <div className="text-center mb-5">
                          <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                          <p className="text-slate-400 text-sm mb-4 leading-snug">{plan.description}</p>
                          
                          {plan.monthlyPrice ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-center">
                                <span className="text-2xl font-bold text-emerald-400">
                                  €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                </span>
                                <span className="text-slate-400 text-base ml-1">/month</span>
                              </div>
                              {isAnnual && (
                                <div className="text-xs text-emerald-400 mt-1">
                                  Billed annually (€{(plan.annualPrice || 0) * 12}/year)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="mb-4">
                              <div className="text-2xl font-bold text-white mb-1">Custom</div>
                              <div className="text-slate-400 text-sm">Contact us for pricing</div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2.5 mb-5">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                              <span className="text-slate-300 text-xs leading-relaxed">{feature}</span>
                            </div>
                          ))}
                        </div>

                        <Button 
                          className={`w-full font-semibold py-2.5 px-4 rounded-xl text-sm shadow-lg transition-all duration-300 group ${
                            plan.isEnterprise
                              ? 'bg-white text-black hover:bg-gray-100'
                              : plan.popular
                              ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-white'
                          }`}
                        >
                          {plan.cta}
                          <ArrowRight className="ml-2 w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Navigation arrows */}
            {currentSlide > 0 && (
              <div className="absolute top-1/2 -translate-y-1/2 -left-4 z-20">
                <button
                  onClick={prevSlide}
                  className="p-2.5 rounded-full bg-slate-800/90 text-white hover:bg-slate-700/90 transition-colors duration-200 shadow-lg"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
            {currentSlide < plans.length - 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 -right-4 z-20">
                <button
                  onClick={nextSlide}
                  className="p-2.5 rounded-full bg-slate-800/90 text-white hover:bg-slate-700/90 transition-colors duration-200 shadow-lg"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Slide indicators */}
            <div className="flex justify-center mt-4 space-x-2">
              {plans.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentSlide 
                      ? 'bg-emerald-400 w-6' 
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Swipe hint */}
            <div className="text-center mt-3">
              <p className="text-xs text-slate-500">
                Swipe or tap arrows to explore
              </p>
            </div>
          </div>
        </div>

        {/* Additional info */}
        <ScrollAnimatedSection animation="fade-up" delay={800} className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            30 days free trial • No credit card required • Cancel anytime
          </p>
        </ScrollAnimatedSection>
      </div>
    </section>
  );
};
