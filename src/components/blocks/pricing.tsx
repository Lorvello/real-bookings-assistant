import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
}
export const Pricing: React.FC<PricingProps> = ({
  plans,
  title,
  description
}) => {
  const [billingPeriod, setBillingPeriod] = useState<string>("yearly");
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const handleCardHover = (planName: string) => {
    setHoveredCard(planName);
  };
  const handleCardLeave = () => {
    setHoveredCard(null);
  };
  const getButtonText = (plan: PricingPlan) => {
    if (plan.name === 'ENTERPRISE') {
      return 'Contact Sales';
    } else {
      return 'Start Your Free Trial Now';
    }
  };
  return <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">{title}</h2>
          <p className="text-xl text-gray-300 whitespace-pre-line mb-8">{description}</p>
          
          <div className="flex justify-center mb-8">
            <div className="relative">
              {billingPeriod === "yearly" && <div className="absolute -top-3 right-4 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                  20% OFF
                </div>}
              <ToggleGroup type="single" value={billingPeriod} onValueChange={value => {
              if (value) {
                setBillingPeriod(value);
              }
            }} className="bg-gray-800 rounded-lg p-1 border border-gray-700">
                <ToggleGroupItem value="monthly" className={`px-6 py-2 rounded-md transition-all ${billingPeriod === 'monthly' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}>
                  Monthly
                </ToggleGroupItem>
                <ToggleGroupItem value="yearly" className={`px-6 py-2 rounded-md transition-all ${billingPeriod === 'yearly' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}>
                  Yearly
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => <Card key={index} onMouseEnter={() => handleCardHover(plan.name)} onMouseLeave={handleCardLeave} className={`relative cursor-pointer transition-all duration-300 ${plan.name === 'ENTERPRISE' ? 'bg-black border-gray-600 text-white' : 'bg-gray-800 border-gray-700'} ${plan.isPopular ? 'border-green-500 shadow-lg' : ''} ${hoveredCard === plan.name ? 'scale-105 shadow-xl' : 'hover:scale-102'}`}>
              {plan.isPopular && <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
                  Most Popular
                </Badge>}
              
              <CardHeader className="text-center">
                <CardTitle className={`font-bold text-4xl ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                  {plan.name}
                </CardTitle>
                <CardDescription className={`mt-2 ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  {plan.isCustom ? <span className={`text-3xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                      Custom
                    </span> : <>
                      <span className={`text-5xl font-bold ${plan.name === 'ENTERPRISE' ? 'text-white' : 'text-white'}`}>
                        €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className={`ml-2 ${plan.name === 'ENTERPRISE' ? 'text-gray-300' : 'text-gray-400'}`}>
                        /month
                      </span>
                    </>}
                </div>
                {!plan.isCustom && billingPeriod === "yearly" && <div className="text-sm text-green-400 font-medium">
                    Save €{(parseInt(plan.price) - parseInt(plan.yearlyPrice)) * 12}/year
                  </div>}
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => <li key={featureIndex} className="flex items-center">
                      <span className="text-green-400 mr-3">✓</span>
                      <span className={plan.name === 'ENTERPRISE' ? 'text-gray-200' : 'text-gray-300'}>
                        {feature}
                      </span>
                    </li>)}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button className={`w-full ${plan.name === 'ENTERPRISE' ? 'bg-white hover:bg-gray-100 text-black' : 'bg-green-500 hover:bg-green-600 text-white'}`} asChild>
                  <a href={plan.href}>{getButtonText(plan)}</a>
                </Button>
              </CardFooter>
            </Card>)}
        </div>
      </div>
    </section>;
};