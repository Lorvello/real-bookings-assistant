
import React from 'react';
import Navbar from '@/components/Navbar';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { PricingBasic } from '@/components/PricingBasic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from 'lucide-react';

const Pricing = () => {
  const detailedFeatures = {
    starter: [
      {
        name: "Own WhatsApp number",
        description: "Get a dedicated business WhatsApp number that customers can contact 24/7 for bookings."
      },
      {
        name: "Unlimited bookings",
        description: "No limits on the number of appointments your AI assistant can book for your business."
      },
      {
        name: "Automated reminders",
        description: "Send automatic booking confirmations and reminders to reduce no-shows and keep customers informed."
      },
      {
        name: "Detailed analytics",
        description: "Track booking patterns, peak times, and customer behavior to optimize your business operations."
      },
      {
        name: "Multi-language support",
        description: "Serve customers in their preferred language with support for 20+ languages including English, Dutch, Spanish, French, and German."
      },
      {
        name: "Automated booking rescheduling & canceling system",
        description: "Let customers easily reschedule or cancel appointments through WhatsApp without your intervention."
      },
      {
        name: "Full calendar sync",
        description: "Seamlessly integrate with Google Calendar, Outlook, Apple Calendar, and other popular calendar apps."
      },
      {
        name: "Available 24/7",
        description: "Your AI assistant never sleeps, taking bookings and answering questions around the clock."
      },
      {
        name: "White-label & custom branding",
        description: "Customize the assistant's personality and responses to match your brand voice and style."
      },
      {
        name: "Personal chatflows",
        description: "Create custom conversation flows tailored to your specific services and booking requirements."
      },
      {
        name: "Dedicated support",
        description: "Get help from our support team within 24 hours whenever you need assistance."
      },
      {
        name: "Quick setup",
        description: "Get up and running in just 5-10 minutes with our streamlined onboarding process."
      },
      {
        name: "Smart availability check",
        description: "Automatically check your real-time availability to prevent double bookings and conflicts."
      }
    ],
    professional: [
      {
        name: "All Starter features included",
        description: "Everything from the Starter plan plus advanced features for growing businesses."
      },
      {
        name: "FAQ integration",
        description: "Train your AI to answer frequently asked questions about your services, pricing, and policies."
      },
      {
        name: "Change tone",
        description: "Adjust your assistant's communication style to be professional, friendly, casual, or match your brand personality."
      },
      {
        name: "Dynamic time suggestions",
        description: "Intelligently suggest optimal appointment times based on your schedule and customer preferences."
      },
      {
        name: "Automated waitlist",
        description: "Automatically manage waitlists and notify customers when earlier slots become available."
      },
      {
        name: "Advanced analytics & insights",
        description: "Get deeper insights into customer behavior, revenue trends, and business performance metrics."
      },
      {
        name: "No-show follow up",
        description: "Automatically detect missed appointments and send follow-up messages to reschedule or understand reasons."
      },
      {
        name: "Support for multiple team members",
        description: "Add team members to manage bookings with different permission levels and access controls."
      },
      {
        name: "CRM integrations (e.g. Notion, Airtable, HubSpot)",
        description: "Sync customer data and booking information with your existing CRM and business tools."
      },
      {
        name: "Priority support",
        description: "Get faster response times with priority support within 4 hours for any questions or issues."
      },
      {
        name: "Review system",
        description: "Automatically collect customer feedback and reviews after appointments to improve your service quality."
      },
      {
        name: "Multiple calendar syncing",
        description: "Sync with multiple calendars and team member schedules for comprehensive availability management."
      },
      {
        name: "Ultimate personal assistant",
        description: "Advanced AI capabilities that handle complex requests and provide personalized customer interactions."
      }
    ],
    enterprise: [
      {
        name: "Everything in Professional",
        description: "All Professional features plus enterprise-grade capabilities for large operations."
      },
      {
        name: "Voice call routing",
        description: "Route incoming calls to the right team members and integrate voice bookings with your WhatsApp system."
      },
      {
        name: "Multiple locations/numbers",
        description: "Manage unlimited business locations and phone numbers from a single centralized dashboard."
      },
      {
        name: "Custom AI workflows & advanced logic",
        description: "Create sophisticated booking workflows with custom business rules and complex decision trees."
      },
      {
        name: "SLA & dedicated priority support",
        description: "Get guaranteed response times within 1 hour and dedicated account management for enterprise needs."
      },
      {
        name: "Done-for-you onboarding & integration support",
        description: "Our team handles the complete setup, integration, and training to get you operational quickly."
      },
      {
        name: "Ultimate lead qualification",
        description: "Advanced AI screening to qualify leads before booking and route high-value prospects appropriately."
      },
      {
        name: "Automated email marketing",
        description: "Integrate with email platforms to automatically nurture leads and follow up with customers."
      },
      {
        name: "Automated social media content creation",
        description: "Generate and schedule social media posts about your services, availability, and customer testimonials."
      },
      {
        name: "Competitor tracker",
        description: "Monitor competitor pricing, services, and market positioning to stay ahead in your industry."
      },
      {
        name: "Google trend analytics",
        description: "Track search trends and seasonal demand patterns to optimize your marketing and pricing strategies."
      },
      {
        name: "Social media DM integration",
        description: "Extend booking capabilities to Instagram, Facebook, and LinkedIn direct messages."
      }
    ]
  };

  const plans = [
    {
      name: "STARTER",
      price: "20",
      yearlyPrice: "20",
      period: "per month",
      description: "Essential booking automation for solo entrepreneurs and new businesses getting started",
      features: detailedFeatures.starter,
      buttonText: "Start Your Free Trial Now",
      href: "/sign-up",
      isPopular: false,
      savings: "Save €60/year"
    },
    {
      name: "PROFESSIONAL", 
      price: "60",
      yearlyPrice: "48",
      period: "per month",
      description: "Advanced booking intelligence with team management and CRM integrations",
      features: detailedFeatures.professional,
      buttonText: "Start Your Free Trial Now",
      href: "/sign-up",
      isPopular: true,
      savings: "Save €144/year"
    },
    {
      name: "ENTERPRISE",
      price: "Custom",
      yearlyPrice: "Custom", 
      period: "",
      description: "Complete business automation with AI marketing and competitive intelligence",
      features: detailedFeatures.enterprise,
      buttonText: "Contact Sales",
      href: "/contact",
      isPopular: false,
      isCustom: true
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Header */}
      <ScrollAnimatedSection className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-green-400 bg-clip-text text-transparent">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Discover detailed features for each plan and find the perfect solution to automate your bookings. 
            Every plan includes a 7-day free trial to test our AI assistant risk-free.
          </p>
        </div>
      </ScrollAnimatedSection>

      {/* Detailed Plan Sections */}
      <div className="max-w-6xl mx-auto py-20 px-4 sm:px-6 lg:px-8 space-y-20">
        {plans.map((plan, index) => (
          <ScrollAnimatedSection 
            key={plan.name} 
            className="relative"
            delay={index * 200}
          >
            <Card className={`relative overflow-hidden ${plan.isPopular ? 'border-2 border-green-500 shadow-2xl' : 'border border-gray-200 shadow-lg'}`}>
              {plan.isPopular && (
                <div className="absolute top-0 left-0 right-0">
                  <div className="flex justify-center">
                    <Badge className="bg-green-500 text-white px-6 py-2 rounded-b-lg font-semibold">
                      Most Popular
                    </Badge>
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center pb-8 pt-12 bg-gradient-to-br from-gray-50 to-white">
                <CardTitle className="text-4xl font-bold text-gray-900 mb-4">
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
                  {plan.description}
                </CardDescription>
                
                <div className="flex items-baseline justify-center space-x-2">
                  {plan.isCustom ? (
                    <span className="text-4xl font-bold text-gray-900">Custom Pricing</span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900">€{plan.yearlyPrice}</span>
                      <span className="text-xl text-gray-600">/month</span>
                    </>
                  )}
                </div>
                
                {!plan.isCustom && (
                  <div className="text-sm text-green-600 font-medium mt-2">
                    {plan.savings}
                  </div>
                )}
                
                <div className="mt-6">
                  <Button 
                    className={`px-8 py-3 text-lg font-semibold ${
                      plan.isPopular 
                        ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg' 
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                    asChild
                  >
                    <a href={plan.href}>{plan.buttonText}</a>
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="p-8">
                <div className="grid gap-6">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {feature.name}
                        </h4>
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </ScrollAnimatedSection>
        ))}
      </div>

      {/* Quick Overview Section */}
      <ScrollAnimatedSection className="bg-gray-50 py-16" delay={600}>
        <div className="max-w-4xl mx-auto text-center mb-12 px-4">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Quick Overview
          </h2>
          <p className="text-xl text-gray-600">
            Compare all plans at a glance and start your free trial today
          </p>
        </div>
        <PricingBasic />
      </ScrollAnimatedSection>

      {/* Bottom CTA */}
      <ScrollAnimatedSection 
        className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600 text-white"
        delay={800}
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
