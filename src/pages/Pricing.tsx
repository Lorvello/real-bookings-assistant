
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
    { name: "Own WhatsApp number", description: "Get a dedicated business WhatsApp number that customers can contact 24/7 for bookings", included: "starter" },
    { name: "Unlimited bookings", description: "No limits on the number of appointments your AI assistant can book for your business", included: "starter" },
    { name: "Automated reminders", description: "Send automatic booking confirmations and reminders to reduce no-shows and keep customers informed", included: "starter" },
    { name: "Detailed analytics", description: "Track booking patterns, peak times, and customer behavior to optimize your business operations", included: "starter" },
    { name: "Multi-language support", description: "Serve customers in their preferred language with support for 20+ languages including English, Dutch, Spanish, French, and German", included: "starter" },
    { name: "Automated booking rescheduling & canceling system", description: "Let customers easily reschedule or cancel appointments through WhatsApp without your intervention", included: "starter" },
    { name: "Full calendar sync", description: "Seamlessly integrate with Google Calendar, Outlook, Apple Calendar, and other popular calendar apps", included: "starter" },
    { name: "Available 24/7", description: "Your AI assistant never sleeps, taking bookings and answering questions around the clock", included: "starter" },
    { name: "White-label & custom branding", description: "Customize the assistant's personality and responses to match your brand voice and style", included: "starter" },
    { name: "Personal chatflows", description: "Create custom conversation flows tailored to your specific services and booking requirements", included: "starter" },
    { name: "Dedicated support", description: "Get help from our support team within 24 hours whenever you need assistance", included: "starter" },
    { name: "Quick setup", description: "Get up and running in just 5-10 minutes with our streamlined onboarding process", included: "starter" },
    { name: "Smart availability check", description: "Automatically check your real-time availability to prevent double bookings and conflicts", included: "starter" },
    
    { name: "FAQ integration", description: "Train your AI to answer frequently asked questions about your services, pricing, and policies", included: "pro" },
    { name: "Change tone", description: "Adjust your assistant's communication style to be professional, friendly, casual, or match your brand personality", included: "pro" },
    { name: "Dynamic time suggestions", description: "Intelligently suggest optimal appointment times based on your schedule and customer preferences", included: "pro" },
    { name: "Automated waitlist", description: "Automatically manage waitlists and notify customers when earlier slots become available", included: "pro" },
    { name: "Advanced analytics & insights", description: "Get deeper insights into customer behavior, revenue trends, and business performance metrics", included: "pro" },
    { name: "No-show follow up", description: "Automatically detect missed appointments and send follow-up messages to reschedule or understand reasons", included: "pro" },
    { name: "Support for multiple team members", description: "Add team members to manage bookings with different permission levels and access controls", included: "pro" },
    { name: "CRM integrations (e.g. Notion, Airtable, HubSpot)", description: "Sync customer data and booking information with your existing CRM and business tools", included: "pro" },
    { name: "Priority support", description: "Get faster response times with priority support within 4 hours for any questions or issues", included: "pro" },
    { name: "Review system", description: "Automatically collect customer feedback and reviews after appointments to improve your service quality", included: "pro" },
    { name: "Multiple calendar syncing", description: "Sync with multiple calendars and team member schedules for comprehensive availability management", included: "pro" },
    { name: "Ultimate personal assistant", description: "Advanced AI capabilities that handle complex requests and provide personalized customer interactions", included: "pro" },
    
    { name: "Voice call routing", description: "Route incoming calls to the right team members and integrate voice bookings with your WhatsApp system", included: "enterprise" },
    { name: "Multiple locations/numbers", description: "Manage unlimited business locations and phone numbers from a single centralized dashboard", included: "enterprise" },
    { name: "Custom AI workflows & advanced logic", description: "Create sophisticated booking workflows with custom business rules and complex decision trees", included: "enterprise" },
    { name: "SLA & dedicated priority support", description: "Get guaranteed response times within 1 hour and dedicated account management for enterprise needs", included: "enterprise" },
    { name: "Done-for-you onboarding & integration support", description: "Our team handles the complete setup, integration, and training to get you operational quickly", included: "enterprise" },
    { name: "Ultimate lead qualification", description: "Advanced AI screening to qualify leads before booking and route high-value prospects appropriately", included: "enterprise" },
    { name: "Automated email marketing", description: "Integrate with email platforms to automatically nurture leads and follow up with customers", included: "enterprise" },
    { name: "Automated social media content creation", description: "Generate and schedule social media posts about your services, availability, and customer testimonials", included: "enterprise" },
    { name: "Competitor tracker", description: "Monitor competitor pricing, services, and market positioning to stay ahead in your industry", included: "enterprise" },
    { name: "Google trend analytics", description: "Track search trends and seasonal demand patterns to optimize your marketing and pricing strategies", included: "enterprise" },
    { name: "Social media DM integration", description: "Extend booking capabilities to Instagram, Facebook, and LinkedIn direct messages", included: "enterprise" },
  ];

  const plans = [
    {
      name: "STARTER",
      price: { monthly: 25, yearly: 20 },
      level: "starter",
      description: "Essential booking automation for solo entrepreneurs and new businesses getting started",
      buttonText: "Start Your Free Trial Now",
      href: "/sign-up"
    },
    {
      name: "PROFESSIONAL", 
      price: { monthly: 60, yearly: 48 },
      level: "pro",
      description: "Advanced booking intelligence with team management and CRM integrations",
      buttonText: "Start Your Free Trial Now",
      href: "/sign-up",
      popular: true
    },
    {
      name: "ENTERPRISE",
      price: { monthly: "Custom", yearly: "Custom" },
      level: "enterprise",
      description: "Complete business automation with AI marketing and competitive intelligence",
      buttonText: "Contact Sales",
      href: "/contact",
      isCustom: true
    }
  ];

  const getIncludedStatus = (feature: any, planLevel: string) => {
    if (feature.included === "starter") {
      return true; // All plans include starter features
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
      <ScrollAnimatedSection className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
            Detailed Pricing Plans
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Compare all features across our plans and find the perfect solution for your business. 
            Every plan includes a 7-day free trial to test our AI assistant risk-free.
          </p>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Table */}
      <ScrollAnimatedSection className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-xl border-0 bg-white">
            <CardHeader className="text-center pb-8 bg-gradient-to-br from-gray-50 to-white">
              <CardTitle className="text-3xl font-bold text-gray-900 mb-4">
                Compare All Features
              </CardTitle>
              <CardDescription className="text-lg text-gray-600 max-w-2xl mx-auto">
                Detailed breakdown of every feature included in each plan
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-200">
                      <TableHead className="w-1/2 p-6 text-left font-semibold text-gray-900">
                        Features
                      </TableHead>
                      {plans.map((plan) => (
                        <TableHead key={plan.name} className="text-center p-6 min-w-[200px]">
                          <div className="space-y-2">
                            <div className="flex items-center justify-center">
                              <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                              {plan.popular && (
                                <Badge className="ml-2 bg-green-500 text-white">
                                  Most Popular
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                            <div className="text-center">
                              {plan.isCustom ? (
                                <span className="text-2xl font-bold text-gray-900">Custom Pricing</span>
                              ) : (
                                <>
                                  <span className="text-3xl font-bold text-gray-900">€{plan.price.yearly}</span>
                                  <span className="text-sm text-gray-600">/month</span>
                                  <div className="text-xs text-green-600 font-medium">
                                    Save €{(plan.price.monthly - plan.price.yearly) * 12}/year
                                  </div>
                                </>
                              )}
                            </div>
                            <Button 
                              className={`w-full mt-4 ${
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
                        <TableCell className="p-6">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {feature.name}
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                        </TableCell>
                        {plans.map((plan) => (
                          <TableCell key={plan.name} className="text-center p-6">
                            {getIncludedStatus(feature, plan.level) ? (
                              <Check className="h-6 w-6 text-green-500 mx-auto" />
                            ) : (
                              <X className="h-6 w-6 text-gray-300 mx-auto" />
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
      <ScrollAnimatedSection className="bg-gray-50 py-16" delay={200}>
        <div className="max-w-4xl mx-auto text-center mb-12 px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Quick Overview
          </h2>
          <p className="text-xl text-gray-600">
            Not sure which plan is right for you? Here's a quick overview to help you decide
          </p>
        </div>
        <PricingBasic />
      </ScrollAnimatedSection>

      {/* Bottom CTA */}
      <ScrollAnimatedSection 
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600 text-white"
        delay={400}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Business?
          </h3>
          <p className="text-xl mb-8 text-green-100 max-w-2xl mx-auto">
            Join thousands of businesses already using our AI assistant to automate bookings and save time. 
            Start your 7-day free trial today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-white text-green-600 hover:bg-green-50 px-8 py-3 text-lg font-semibold shadow-lg"
              asChild
            >
              <a href="/sign-up">Start Free Trial</a>
            </Button>
            <Button 
              className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-green-600 px-8 py-3 text-lg font-semibold"
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
