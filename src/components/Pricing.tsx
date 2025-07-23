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
      monthlyPrice: 19,
      annualPrice: 15,
      description: "Perfect for beginners with basic WhatsApp automation and calendar management",
      features: [
        "Strategic WhatsApp contact management (up to 500)",
        "Unified calendar orchestration platform",
        "Individual user access management",
        "AI-powered intelligent reminder sequences",
        "Essential dashboard overview & live operations monitoring",
        "Global multi-language localization",
        "Streamlined payment processing & collection"
      ],
      popular: false,
      cta: "Start Your Free Trial Now",
      color: "from-slate-600 to-slate-700"
    },
    {
      name: "Professional",
      monthlyPrice: 49,
      annualPrice: 39,
      description: "Advanced features for teams with extended contact management and collaboration tools",
      features: [
        "All Starter premium features included",
        "Professional WhatsApp contact management (up to 2,500)",
        "Unlimited calendar orchestration platform",
        "Advanced team collaboration suite (2-10 users)",
        "Multi-location business coordination",
        "Complete analytics suite: Business Intelligence, Performance tracking & Future Insights",
        "Dedicated priority customer success"
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
        "Complete professional suite included",
        "Unlimited enterprise WhatsApp contact management",
        "Unlimited enterprise user access management",
        "Dedicated WhatsApp Business API with custom branding",
        "Intelligent voice call routing & distribution",
        "Omnichannel social media DM orchestration",
        "Advanced reputation management & review analytics",
        "Enterprise SLA with dedicated success management",
        "White-glove onboarding & strategic integration consulting"
      ],
      popular: false,
      cta: "Contact Sales",
      color: "from-slate-900 to-black",
      isEnterprise: true
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => Math.min(prev + 1, plans.length - 1));
  };
  
  const prevSlide = () => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0));
  };
  
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

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
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
        <ScrollAnimatedSection animation="fade-up" delay={0} className="text-center mb-8 md:mb-16">
          <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8">
            <Star className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 mr-2" />
            <span className="text-emerald-400 font-semibold text-sm md:text-base">Simple Pricing</span>
          </div>
          <h2 className="text-2xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            Choose Your <span className="text-emerald-400">Perfect Plan</span>
          </h2>
          <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
            Start with our free trial and scale as you grow. No setup fees, no contracts.
          </p>
        </ScrollAnimatedSection>

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
                {isAnnual && (
                  <span className="absolute -top-2 -right-2 bg-gradient-to-br from-black via-slate-800 to-black text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg border border-slate-600/30 ring-1 ring-white/10 backdrop-blur-sm">
                    Save 20%
                  </span>
                )}
              </button>
            </div>
          </div>
        </ScrollAnimatedSection>

        <div className="hidden md:grid md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan, index) => (
            <ScrollAnimatedSection
              key={plan.name}
              animation="fade-up"
              delay={400 + index * 150}
              className="h-full"
              as="div"
            >
              <div className={`relative rounded-3xl border h-full flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
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
                    className={`w-full font-semibold py-3.5 px-6 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300 group ${
                      plan.isEnterprise
                        ? 'bg-gradient-to-r from-white to-slate-100 text-slate-900 hover:from-slate-100 hover:to-white shadow-white/20 hover:shadow-white/30'
                        : plan.popular
                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60'
                        : 'bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white shadow-slate-700/40 hover:shadow-slate-600/60'
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                <div className="px-6 pb-8 flex-1 relative z-10">
                  <div className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-3 group">
                        <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm group-hover:shadow-emerald-400/30 transition-all duration-200">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-slate-300 text-sm leading-relaxed font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollAnimatedSection>
          ))}
        </div>

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
                          className="w-full font-semibold py-2.5 px-3.5 rounded-xl text-xs shadow-lg hover:shadow-xl transition-all duration-300 group backdrop-blur-sm bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-emerald-500/50"
                        >
                          {plan.cta}
                          <ArrowRight className="ml-1.5 w-2.5 h-2.5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>

                      <div className="px-3.5 pb-3.5 flex-1 relative z-10">
                        <div className="space-y-1.5">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start space-x-2">
                              <div className="w-3.5 h-3.5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-emerald-400/30">
                                <Check className="w-2 h-2 text-white" />
                              </div>
                              <span className="text-slate-200/95 text-[10px] leading-tight font-medium tracking-wide">{feature}</span>
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
            
            <div className="text-center mt-4">
              <p className="text-xs text-slate-500">
                Swipe or tap arrows to explore plans
              </p>
            </div>
          </div>
        </div>

        <ScrollAnimatedSection animation="fade-up" delay={800} className="text-center mt-12">
          <p className="text-slate-400 text-[10px] sm:text-sm">
            30 days free trial • No credit card required • Cancel anytime
          </p>
        </ScrollAnimatedSection>
      </div>
    </section>
  );
};
