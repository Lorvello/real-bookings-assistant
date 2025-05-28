
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

export const Pricing: React.FC<PricingProps> = ({ plans, title, description }) => {
  const [billingPeriod, setBillingPeriod] = useState<string>("monthly");

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">{title}</h2>
          <p className="text-xl text-gray-600 whitespace-pre-line mb-8">{description}</p>
          
          <div className="flex justify-center mb-8">
            <ToggleGroup 
              type="single" 
              value={billingPeriod} 
              onValueChange={(value) => value && setBillingPeriod(value)}
              className="bg-gray-100 rounded-lg p-1"
            >
              <ToggleGroupItem value="monthly" className="px-6 py-2 rounded-md">
                Monthly
              </ToggleGroupItem>
              <ToggleGroupItem value="yearly" className="px-6 py-2 rounded-md">
                Yearly
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.isPopular ? 'border-green-500 shadow-lg scale-105' : 'border-gray-200'}`}>
              {plan.isPopular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white">
                  Most Popular
                </Badge>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600 mt-2">{plan.description}</CardDescription>
                <div className="mt-4">
                  {plan.isCustom ? (
                    <span className="text-3xl font-bold text-gray-900">Custom</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900">
                        €{billingPeriod === "yearly" ? plan.yearlyPrice : plan.price}
                      </span>
                      <span className="text-gray-600 ml-2">/month</span>
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
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className={`w-full ${plan.isPopular ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-900 hover:bg-gray-800'}`}
                  asChild
                >
                  <a href={plan.href}>{plan.buttonText}</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
