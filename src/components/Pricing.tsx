

import { Check, Star, ArrowRight, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";

export const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      monthlyPrice: 20,
      annualPrice: 16,
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 100 WhatsApp conversations/month",
        "Basic AI booking assistant",
        "Calendar integration",
        "Email notifications",
        "Standard support"
      ],
      popular: false,
      cta: "Start Free Trial",
      color: "from-slate-600 to-slate-700"
    },
    {
      name: "Professional",
      monthlyPrice: 48,
      annualPrice: 38,
      description: "Best for growing businesses with high volume",
      features: [
        "Unlimited WhatsApp conversations",
        "Advanced AI booking assistant",
        "Full calendar integration",
        "Advanced dashboard & analytics",
        "Automatic reminders & confirmations",
        "Multi-language support",
        "Priority support",
        "Custom branding"
      ],
      popular: true,
      cta: "Start Free Trial",
      color: "from-emerald-500 to-green-500"
    },
    {
      name: "Enterprise",
      monthlyPrice: null,
      annualPrice: null,
      description: "Custom solution for large organizations",
      features: [
        "Everything in Professional",
        "White-label solution",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "Advanced security features",
        "API access",
        "Custom development"
      ],
      popular: false,
      cta: "Contact Sales",
      color: "from-slate-900 to-black",
      isEnterprise: true
    }
  ];

  return (
    <section className="py-12 md:py-16 relative overflow-hidden">
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
              className={`relative rounded-3xl p-8 border transition-all duration-300 hover:scale-105 ${
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
                <p className="text-slate-400 mb-6">{plan.description}</p>
                
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

        {/* Mobile: Carousel */}
        <div className="md:hidden">
          <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain">
            <div className="flex gap-6 pb-4 px-4">
              {plans.map((plan, index) => (
                <ScrollAnimatedSection
                  key={plan.name}
                  animation="fade-up"
                  delay={400 + index * 150}
                  className={`w-[90vw] flex-none snap-start snap-always relative rounded-3xl p-6 border transition-all ${
                    plan.isEnterprise
                      ? 'bg-gradient-to-br from-slate-900 to-black border-slate-600'
                      : 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-700/50'
                  } ${plan.popular ? 'ring-2 ring-emerald-500/50' : ''}`}
                  as="div"
                >
                   {plan.popular && (
                     <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                       <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap">
                         Most Popular
                       </div>
                     </div>
                   )}

                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-slate-400 text-sm mb-4">{plan.description}</p>
                    
                    {plan.monthlyPrice ? (
                      <div className="mb-4">
                        <div className="flex items-center justify-center">
                          <span className="text-3xl font-bold text-emerald-400">
                            €{isAnnual ? plan.annualPrice : plan.monthlyPrice}
                          </span>
                          <span className="text-slate-400 text-lg ml-2">/month</span>
                        </div>
                        {isAnnual && (
                          <div className="text-xs text-emerald-400 mt-1">
                            Billed annually (€{(plan.annualPrice || 0) * 12}/year)
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4">
                        <div className="text-3xl font-bold text-white mb-1">Custom</div>
                        <div className="text-slate-400 text-sm">Contact us for pricing</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start space-x-2">
                        <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-slate-300 text-xs">{feature}</span>
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
                </ScrollAnimatedSection>
              ))}
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
