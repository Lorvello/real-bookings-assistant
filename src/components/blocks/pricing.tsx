import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PricingPlan {
  name: string;
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
  isCustom?: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title: string;
  description: string;
  selectedPlan?: string;
  onPlanSelect?: (plan: string) => void;
  showAsSelection?: boolean;
}

export const Pricing: React.FC<PricingProps> = ({
  plans,
  title,
  description,
  selectedPlan,
  onPlanSelect,
  showAsSelection = false
}) => {
  const [billingPeriod, setBillingPeriod] = useState<string>("yearly");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Update default features to match actual dashboard capabilities
  const defaultPlans = [
    {
      name: "Starter",
      price: "30",
      yearlyPrice: "24",
      period: "/month",
      description: "Perfect for beginners with basic WhatsApp automation and calendar management",
      features: [
        "Strategic WhatsApp contact management (up to 500)",
        "Dual-calendar orchestration system", 
        "VAT tracking & compliance",
        "AI-powered intelligent reminder sequences",
        "Essential dashboard overview & live operations monitoring",
        "Global multi-language localization",
        "Streamlined payment processing & collection"
      ],
      buttonText: "Start Your Free Trial Now",
      href: "#",
      isPopular: false
    },
    {
      name: "Professional",
      price: "60",
      yearlyPrice: "48",
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
      buttonText: "Start Your Free Trial Now",
      href: "#",
      isPopular: true
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
      isCustom: true
    }
  ];

  // Use provided plans or default plans with updated features
  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  const handleCardHover = (planName: string) => {
    setHoveredCard(planName);
  };

  const handleCardLeave = () => {
    setHoveredCard(null);
  };

  const handlePlanClick = (planName: string) => {
    if (showAsSelection && onPlanSelect) {
      onPlanSelect(planName);
    }
  };

  const getButtonText = (plan: PricingPlan) => {
    if (showAsSelection) {
      return selectedPlan === plan.name ? 'Selected' : 'Select Plan';
    }
    if (plan.name === 'ENTERPRISE') {
      return 'Contact Sales';
    } else {
      return 'Start Your Free Trial Now';
    }
  };

  return (
    <section className={`py-8 md:py-20 px-4 ${showAsSelection ? 'bg-white' : 'bg-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 md:mb-16">
          <h2 className={`text-xl md:text-4xl font-bold mb-3 md:mb-6 ${showAsSelection ? 'text-gray-900' : 'text-white'}`}>
            {title}
          </h2>
          <p className={`text-xs md:text-xl whitespace-pre-line mb-4 md:mb-8 ${showAsSelection ? 'text-gray-600' : 'text-gray-300'}`}>
            {description}
          </p>
          
          <div className="flex justify-center mb-4 md:mb-8">
            <div className="relative">
              {billingPeriod === "yearly" && (
                <div className="absolute -top-4 right-4 bg-black text-green-500 px-2 py-1 rounded text-xs font-bold">
                  20% OFF
                </div>
              )}
              <ToggleGroup 
                type="single" 
                value={billingPeriod} 
                onValueChange={value => {
                  if (value) {
                    setBillingPeriod(value);
                  }
                }} 
                className={`rounded-lg p-1 border ${showAsSelection ? 'bg-gray-100 border-gray-300' : 'bg-gray-800 border-gray-700'}`}
              >
                <ToggleGroupItem 
                  value="monthly" 
                  className={`px-4 md:px-6 py-2 rounded-md transition-all ${
                    billingPeriod === 'monthly' 
                      ? `${showAsSelection ? 'bg-white text-gray-900' : 'bg-white text-gray-900'} shadow-md` 
                      : `${showAsSelection ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`
                  }`}
                >
                  Monthly
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="yearly" 
                  className={`px-4 md:px-6 py-2 rounded-md transition-all ${
                    billingPeriod === 'yearly' 
                      ? `${showAsSelection ? 'bg-white text-gray-900' : 'bg-white text-gray-900'} shadow-md` 
                      : `${showAsSelection ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-200' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`
                  }`}
                >
                  Yearly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
        
        {showAsSelection && (
          <RadioGroup value={selectedPlan} onValueChange={onPlanSelect} className="mb-8">
            {/* Desktop: Grid layout */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {displayPlans.map((plan, index) => (
                <div key={index} className="relative">
                  <Card 
                    onClick={() => handlePlanClick(plan.name)}
                    onMouseEnter={() => handleCardHover(plan.name)} 
                    onMouseLeave={handleCardLeave}
                    className={`relative cursor-pointer transition-all duration-300 ${
                      selectedPlan === plan.name 
                        ? 'border-green-500 shadow-lg ring-2 ring-green-500 bg-green-50' 
                        : plan.name === 'ENTERPRISE' 
                          ? 'bg-black border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                    } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''} ${
                      hoveredCard === plan.name ? 'scale-105 shadow-xl' : 'hover:scale-102'
                    }`}
                  >
                    {plan.isPopular && (
                      <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
                        Most Popular
                      </Badge>
                    )}
                    
                    <div className="absolute top-4 right-4">
                      <RadioGroupItem value={plan.name} />
                    </div>
                    
                    <CardHeader className="text-center">
                      <CardTitle className={`font-bold text-4xl ${
                        plan.name === 'ENTERPRISE' ? 'text-white' : 
                        selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                      }`}>
                        {plan.name}
                      </CardTitle>
                      <CardDescription className={`mt-2 ${
                        plan.name === 'ENTERPRISE' ? 'text-gray-300' : 
                        selectedPlan === plan.name ? 'text-gray-600' : 'text-gray-500'
                      }`}>
                        {plan.description}
                      </CardDescription>
                      <div className="mt-4">
                        {plan.isCustom ? (
                          <span className={`text-3xl font-bold ${
                            plan.name === 'ENTERPRISE' ? 'text-white' : 
                            selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                          }`}>
                            Custom
                          </span>
                        ) : (
                          <>
                            <span className={`text-5xl font-bold ${
                              plan.name === 'ENTERPRISE' ? 'text-white' : 
                              selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                            }`}>
                              €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                            </span>
                            <span className={`ml-2 ${
                              plan.name === 'ENTERPRISE' ? 'text-gray-300' : 
                              selectedPlan === plan.name ? 'text-gray-600' : 'text-gray-500'
                            }`}>
                              /month
                            </span>
                          </>
                        )}
                      </div>
                      {!plan.isCustom && billingPeriod === "yearly" && (
                        <div className="text-sm text-green-600 font-medium">
                          Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                        </div>
                      )}
                    </CardHeader>
                    
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-center">
                            <span className="text-green-500 mr-3">✓</span>
                            <span className={
                              plan.name === 'ENTERPRISE' ? 'text-gray-200' : 
                              selectedPlan === plan.name ? 'text-gray-700' : 'text-gray-600'
                            }>
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {/* Mobile: Carousel */}
            <div className="md:hidden">
              <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                <div className="flex space-x-4">
                  {displayPlans.map((plan, index) => (
                    <div key={index} className="w-[85vw] flex-none snap-start snap-always">
                      <Card 
                        onClick={() => handlePlanClick(plan.name)}
                        className={`relative cursor-pointer transition-all duration-300 ${
                          selectedPlan === plan.name 
                            ? 'border-green-500 shadow-lg ring-2 ring-green-500 bg-green-50' 
                            : plan.name === 'ENTERPRISE' 
                              ? 'bg-black border-gray-600 text-white' 
                              : 'bg-white border-gray-300'
                        } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''}`}
                      >
                        {plan.isPopular && (
                          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs">
                            Most Popular
                          </Badge>
                        )}
                        
                        <div className="absolute top-4 right-4">
                          <RadioGroupItem value={plan.name} />
                        </div>
                        
                        <CardHeader className="text-center pb-4">
                          <CardTitle className={`font-bold text-2xl ${
                            plan.name === 'ENTERPRISE' ? 'text-white' : 
                            selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                          }`}>
                            {plan.name}
                          </CardTitle>
                          <CardDescription className={`mt-2 text-xs ${
                            plan.name === 'ENTERPRISE' ? 'text-gray-300' : 
                            selectedPlan === plan.name ? 'text-gray-600' : 'text-gray-500'
                          }`}>
                            {plan.description}
                          </CardDescription>
                          <div className="mt-3">
                            {plan.isCustom ? (
                              <span className={`text-2xl font-bold ${
                                plan.name === 'ENTERPRISE' ? 'text-white' : 
                                selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                              }`}>
                                Custom
                              </span>
                            ) : (
                              <>
                                <span className={`text-3xl font-bold ${
                                  plan.name === 'ENTERPRISE' ? 'text-white' : 
                                  selectedPlan === plan.name ? 'text-gray-900' : 'text-gray-900'
                                }`}>
                                  €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                                </span>
                                <span className={`ml-2 text-sm ${
                                  plan.name === 'ENTERPRISE' ? 'text-gray-300' : 
                                  selectedPlan === plan.name ? 'text-gray-600' : 'text-gray-500'
                                }`}>
                                  /month
                                </span>
                              </>
                            )}
                          </div>
                          {!plan.isCustom && billingPeriod === "yearly" && (
                            <div className="text-xs text-green-600 font-medium">
                              Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          <ul className="space-y-2">
                            {plan.features.slice(0, 6).map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center">
                                <span className="text-green-500 mr-2 text-sm">✓</span>
                                <span className={`text-xs ${
                                  plan.name === 'ENTERPRISE' ? 'text-gray-200' : 
                                  selectedPlan === plan.name ? 'text-gray-700' : 'text-gray-600'
                                }`}>
                                  {feature}
                                </span>
                              </li>
                            ))}
                            {plan.features.length > 6 && (
                              <li className={`text-xs italic ${
                                plan.name === 'ENTERPRISE' ? 'text-gray-400' : 'text-gray-500'
                              }`}>
                                +{plan.features.length - 6} more features
                              </li>
                            )}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
              {/* Carousel indicators */}
              <div className="flex justify-center space-x-2 mt-4">
                {displayPlans.map((_, index) => (
                  <div key={index} className="w-2 h-2 bg-gray-400 rounded-full"></div>
                ))}
              </div>
            </div>
          </RadioGroup>
        )}

        {!showAsSelection && (
          <>
            {/* Desktop: Grid layout */}
            <div className="hidden md:grid md:grid-cols-3 gap-8">
              {displayPlans.map((plan, index) => (
                <Card 
                  key={index}
                  onMouseEnter={() => handleCardHover(plan.name)} 
                  onMouseLeave={handleCardLeave}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    plan.name === 'ENTERPRISE' ? 'bg-black border-gray-600 text-white' : 'bg-gray-800 border-gray-700'
                  } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''} ${
                    hoveredCard === plan.name ? 'scale-105 shadow-xl' : 'hover:scale-102'
                  }`}
                >
                  {plan.isPopular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center">
                    <CardTitle className={`font-bold text-4xl ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                      {plan.name}
                    </CardTitle>
                    <CardDescription className={`mt-2 ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                      {plan.description}
                    </CardDescription>
                    <div className="mt-4">
                      {plan.isCustom ? (
                        <span className={`text-3xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                          Custom
                        </span>
                      ) : (
                        <>
                          <span className={`text-5xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                            €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                          </span>
                          <span className={`ml-2 ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                            /month
                          </span>
                        </>
                      )}
                    </div>
                    {!plan.isCustom && billingPeriod === "yearly" && (
                      <div className="text-sm text-green-400 font-medium">
                        Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                      </div>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <span className="text-green-400 mr-3">✓</span>
                          <span className={plan.name === 'ENTERPRISE' ? 'text-gray-200' : 'text-gray-300'}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full transition-all duration-300 ${
                        plan.name === 'ENTERPRISE' 
                          ? 'bg-white hover:bg-gray-100 text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                          : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                      }`} 
                      asChild
                    >
                      <a href={plan.href}>{getButtonText(plan)}</a>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Mobile: Carousel */}
            <div className="md:hidden">
              <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth">
                <div className="flex space-x-4">
                  {displayPlans.map((plan, index) => (
                    <div key={index} className="w-[85vw] flex-none snap-start snap-always">
                      <Card 
                        className={`relative cursor-pointer transition-all duration-300 ${
                          plan.name === 'ENTERPRISE' ? 'bg-black border-gray-600 text-white' : 'bg-gray-800 border-gray-700'
                        } ${plan.isPopular ? 'border-green-500 shadow-lg' : ''}`}
                      >
                        {plan.isPopular && (
                          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs">
                            Most Popular
                          </Badge>
                        )}
                        
                        <CardHeader className="text-center pb-4">
                          <CardTitle className={`font-bold text-2xl ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                            {plan.name}
                          </CardTitle>
                          <CardDescription className={`mt-2 text-xs ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                            {plan.description}
                          </CardDescription>
                          <div className="mt-3">
                            {plan.isCustom ? (
                              <span className={`text-2xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                                Custom
                              </span>
                            ) : (
                              <>
                                <span className={`text-3xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                                  €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                                </span>
                                <span className={`ml-2 text-sm ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                                  /month
                                </span>
                              </>
                            )}
                          </div>
                          {!plan.isCustom && billingPeriod === "yearly" && (
                            <div className="text-xs text-green-400 font-medium">
                              Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                            </div>
                          )}
                        </CardHeader>
                        
                        <CardContent className="pb-4">
                          <ul className="space-y-2">
                            {plan.features.slice(0, 6).map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-center">
                                <span className="text-green-400 mr-2 text-sm">✓</span>
                                <span className={`text-xs ${plan.name === 'ENTERPRISE' ? 'text-gray-200' : 'text-gray-300'}`}>
                                  {feature}
                                </span>
                              </li>
                            ))}
                            {plan.features.length > 6 && (
                              <li className={`text-xs italic ${plan.name === 'ENTERPRISE' ? 'text-gray-400' : 'text-gray-400'}`}>
                                +{plan.features.length - 6} more features
                              </li>
                            )}
                          </ul>
                        </CardContent>
                        
                        <CardFooter className="pt-4">
                          <Button 
                            className={`w-full transition-all duration-300 text-sm py-2 ${
                              plan.name === 'ENTERPRISE' 
                                ? 'bg-white hover:bg-gray-100 text-black hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]' 
                                : 'bg-green-500 hover:bg-green-600 text-white hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'
                            }`} 
                            asChild
                          >
                            <a href={plan.href}>{getButtonText(plan)}</a>
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
              {/* Carousel indicators */}
              <div className="flex justify-center space-x-2 mt-4">
                {displayPlans.map((_, index) => (
                  <div key={index} className="w-2 h-2 bg-gray-600 rounded-full"></div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
