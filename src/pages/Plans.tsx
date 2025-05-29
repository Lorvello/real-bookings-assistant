
import React from 'react';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const Plans = () => {
  const plans = [
    {
      name: "Starter",
      price: "€20",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 100 bookings/month",
        "WhatsApp integration",
        "Basic calendar sync",
        "Email support",
        "7-day free trial"
      ],
      buttonText: "Start Free Trial",
      popular: false
    },
    {
      name: "Professional", 
      price: "€48",
      period: "/month",
      description: "For growing businesses that need more power",
      features: [
        "Unlimited bookings",
        "Advanced WhatsApp features",
        "Multi-calendar sync",
        "Priority support",
        "Custom integrations",
        "Analytics dashboard",
        "7-day free trial"
      ],
      buttonText: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large businesses with custom needs",
      features: [
        "Everything in Professional",
        "Multiple locations",
        "Dedicated support",
        "Custom development",
        "White-label solution",
        "Advanced analytics",
        "Setup included"
      ],
      buttonText: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-20 px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the perfect plan for your business. Start with a 7-day free trial, no credit card required.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-xl shadow-lg p-8 ${
                plan.popular ? 'ring-2 ring-green-500 scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}
              
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">{plan.period}</span>
                </div>
                <p className="text-gray-600">{plan.description}</p>
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button 
                className={`w-full ${
                  plan.popular 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 mb-4">
            Questions about our plans? We're here to help.
          </p>
          <Button variant="outline">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Plans;
