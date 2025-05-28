
"use client";

import { Pricing } from "@/components/blocks/pricing";

const demoPlans = [
  {
    name: "STARTER",
    price: "25",
    yearlyPrice: "20",
    period: "per month",
    features: [
      "Basic booking system",
      "Calendar management",
      "Email notifications",
      "Mobile-friendly interface",
      "Basic support",
    ],
    description: "Basic booking only - perfect for getting started",
    buttonText: "Start Free Trial",
    href: "/sign-up",
    isPopular: false,
  },
  {
    name: "PROFESSIONAL",
    price: "50",
    yearlyPrice: "40",
    period: "per month",
    features: [
      "Everything in Starter",
      "Full system integration",
      "Advanced lead generation tools",
      "Analytics and reporting",
      "Priority support",
      "Custom branding",
      "API access",
    ],
    description: "Full integration and lead tools for growing businesses",
    buttonText: "Get Started",
    href: "/sign-up",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    yearlyPrice: "Custom",
    period: "",
    features: [
      "All Professional features",
      "Premium dedicated support",
      "Custom integrations",
      "White-label solutions",
      "Advanced security",
      "SLA guarantees",
      "Dedicated account manager",
      "Custom training",
    ],
    description: "All features + premium support for large organizations",
    buttonText: "Contact Sales",
    href: "/contact",
    isPopular: false,
    isCustom: true,
  },
];

function PricingBasic() {
  return (
    <div className="w-full">
      <Pricing 
        plans={demoPlans}
        title="Try 1 Week Free – Flexible Pricing for Every Business"
        description="Choose the plan that works for you. All plans include access to our platform and dedicated support."
      />
    </div>
  );
}

export { PricingBasic };
