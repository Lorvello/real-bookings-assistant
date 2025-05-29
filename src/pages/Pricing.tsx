
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { PricingBasic } from '@/components/PricingBasic';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from 'lucide-react';

const Pricing = () => {
  const features = [
    { name: "Own WhatsApp number", description: "Get a dedicated business WhatsApp number", included: "starter" },
    { name: "Unlimited bookings", description: "No limits on appointments your AI can book", included: "starter" },
    { name: "Automated reminders", description: "Automatic booking confirmations and reminders", included: "starter" },
    { name: "Multi-language support", description: "Serve customers in 20+ languages", included: "starter" },
    { name: "Calendar sync", description: "Google Calendar, Outlook, Apple Calendar integration", included: "starter" },
    { name: "Available 24/7", description: "Your AI assistant never sleeps", included: "starter" },
    { name: "Custom branding", description: "Match your brand voice and style", included: "starter" },
    { name: "Quick setup", description: "Get running in 5-10 minutes", included: "starter" },
    
    { name: "FAQ integration", description: "Train AI to answer common questions", included: "pro" },
    { name: "Dynamic scheduling", description: "Smart appointment time suggestions", included: "pro" },
    { name: "Advanced analytics", description: "Deeper business insights and metrics", included: "pro" },
    { name: "Team management", description: "Multiple team members with permissions", included: "pro" },
    { name: "CRM integrations", description: "Notion, Airtable, HubSpot sync", included: "pro" },
    { name: "Review system", description: "Automatic customer feedback collection", included: "pro" },
    
    { name: "Voice call routing", description: "Route calls to right team members", included: "enterprise" },
    { name: "Multiple locations", description: "Unlimited locations and numbers", included: "enterprise" },
    { name: "Custom AI workflows", description: "Advanced business rules and logic", included: "enterprise" },
    { name: "Lead qualification", description: "AI screening and lead routing", included: "enterprise" },
    { name: "Email marketing", description: "Automated email campaigns", included: "enterprise" },
    { name: "Social media integration", description: "Instagram, Facebook, LinkedIn DMs", included: "enterprise" },
  ];

  const plans = [
    {
      name: "STARTER",
      price: { monthly: 25, yearly: 20 },
      level: "starter",
      description: "Essential booking automation for solo entrepreneurs",
      buttonText: "Start Free Trial",
      href: "/sign-up"
    },
    {
      name: "PROFESSIONAL", 
      price: { monthly: 60, yearly: 48 },
      level: "pro",
      description: "Advanced features with team management",
      buttonText: "Start Free Trial",
      href: "/sign-up",
      popular: true
    },
    {
      name: "ENTERPRISE",
      price: { monthly: "Custom", yearly: "Custom" },
      level: "enterprise",
      description: "Complete business automation solution",
      buttonText: "Contact Sales",
      href: "/contact",
      isCustom: true
    }
  ];

  const getIncludedStatus = (feature: any, planLevel: string) => {
    if (feature.included === "starter") {
      return true;
    }
    if (feature.included === "pro") {
      return planLevel === "pro" || planLevel === "enterprise";
    }
    if (feature.included === "enterprise") {
      return planLevel === "enterprise";
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Header */}
      <ScrollAnimatedSection className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
            Pricing Plans
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Compare features and find the perfect solution for your business. 7-day free trial included.
          </p>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Table */}
      <ScrollAnimatedSection className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="text-center pb-6 bg-gradient-to-br from-gray-50 to-white">
              <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                Feature Comparison
              </CardTitle>
              <CardDescription className="text-gray-600">
                Detailed breakdown of features in each plan
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-200">
                      <TableHead className="w-1/2 p-4 text-left font-semibold text-gray-900">
                        Features
                      </TableHead>
                      {plans.map((plan) => (
                        <TableHead key={plan.name} className="text-center p-4 min-w-[180px]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center">
                              <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                              {plan.popular && (
                                <Badge className="ml-2 bg-green-500 text-white text-xs">
                                  Popular
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">{plan.description}</p>
                            <div className="text-center">
                              {plan.isCustom ? (
                                <span className="text-xl font-bold text-gray-900">Custom</span>
                              ) : (
                                <>
                                  <span className="text-2xl font-bold text-gray-900">€{plan.price.yearly}</span>
                                  <span className="text-sm text-gray-600">/month</span>
                                  <div className="text-xs text-green-600 font-medium">
                                    Save €{((plan.price.monthly as number) - (plan.price.yearly as number)) * 12}/year
                                  </div>
                                </>
                              )}
                            </div>
                            <Button 
                              size="sm"
                              className={`w-full mt-2 ${
                                plan.popular 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : 'bg-gray-900 hover:bg-gray-800 text-white'
                              }`}
                              asChild
                            >
                              <a href={plan.href}>{plan.buttonText}</a>
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {features.map((feature, index) => (
                      <TableRow key={index} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="p-4">
                          <div>
                            <h4 className="font-medium text-gray-900 mb-1 text-sm">
                              {feature.name}
                            </h4>
                            <p className="text-xs text-gray-600">
                              {feature.description}
                            </p>
                          </div>
                        </TableCell>
                        {plans.map((plan) => (
                          <TableCell key={plan.name} className="text-center p-4">
                            {getIncludedStatus(feature, plan.level) ? (
                              <Check className="h-5 w-5 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-gray-300 mx-auto" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollAnimatedSection>

      {/* Quick Overview Section */}
      <ScrollAnimatedSection className="bg-gray-50 py-12" delay={200}>
        <div className="max-w-4xl mx-auto text-center mb-8 px-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Quick Overview
          </h2>
          <p className="text-lg text-gray-600">
            Not sure which plan fits? Here's a quick comparison
          </p>
        </div>
        <PricingBasic />
      </ScrollAnimatedSection>

      {/* Bottom CTA */}
      <ScrollAnimatedSection 
        className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600 text-white"
        delay={400}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to Transform Your Business?
          </h3>
          <p className="text-lg mb-6 text-green-100 max-w-2xl mx-auto">
            Join thousands of businesses using our AI assistant. Start your 7-day free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-white text-green-600 hover:bg-green-50 px-6 py-2 font-semibold shadow-lg"
              asChild
            >
              <a href="/sign-up">Start Free Trial</a>
            </Button>
            <Button 
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-green-600 px-6 py-2 font-semibold"
              asChild
            >
              <a href="/contact">Contact Sales</a>
            </Button>
          </div>
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default Pricing;
