
"use client";

import { Pricing } from "@/components/blocks/pricing";

const demoPlans = [
  {
    name: "STARTER",
    price: "25",
    yearlyPrice: "20",
    period: "per month",
    features: [
      "Own WhatsApp number",
      "Unlimited bookings",
      "Automated reminders",
      "Detailed analytics",
      "Multi-language support",
      "Automated booking rescheduling & canceling system",
      "Full calendar sync",
      "Available 24/7",
      "White-label & custom branding",
      "Personal chatflows",
      "Dedicated support",
      "Quick setup",
      "Smart availability check",
    ],
    description: "Essential booking automation for solo entrepreneurs and new businesses getting started",
    buttonText: "Start Free Trial",
    href: "/signup",
    isPopular: false,
  },
  {
    name: "PROFESSIONAL",
    price: "60",
    yearlyPrice: "48",
    period: "per month",
    features: [
      "All Starter features included",
      "FAQ integration",
      "Change tone",
      "Dynamic time suggestions",
      "Automated waitlist",
      "Advanced analytics & insights",
      "No-show follow up",
      "Support for multiple team members",
      "CRM integrations (e.g. Notion, Airtable, HubSpot)",
      "Priority support",
      "Review system",
      "Multiple calendar syncing",
      "Ultimate personal assistant",
    ],
    description: "Advanced booking intelligence with team management and CRM integrations",
    buttonText: "Get Started",
    href: "/signup",
    isPopular: true,
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    yearlyPrice: "Custom",
    period: "",
    features: [
      "Everything in Professional",
      "Voice call routing",
      "Multiple locations/numbers",
      "Custom AI workflows & advanced logic",
      "SLA & dedicated priority support",
      "Done-for-you onboarding & integration support",
      "Ultimate lead qualification",
      "Automated email marketing",
      "Automated social media content creation",
      "Competitor tracker",
      "Google trend analytics",
      "Social media DM integration",
    ],
    description: "Complete business automation with AI marketing and competitive intelligence",
    buttonText: "Contact Sales",
    href: "/contact",
    isPopular: false,
    isCustom: true,
  },
];

interface PricingBasicProps {
  selectedPlan?: string;
  onPlanSelect?: (plan: string) => void;
  showAsSelection?: boolean;
}

function PricingBasic({ selectedPlan, onPlanSelect, showAsSelection = false }: PricingBasicProps) {
  const title = showAsSelection 
    ? "Choose Your Plan - 1 Week Free Trial" 
    : "Try 1 Week Free – Flexible Pricing for Every Business";
    
  const description = showAsSelection
    ? "Select the plan that works for you. All plans include access to our platform and dedicated support."
    : "Choose the plan that works for you. All plans include access to our platform and dedicated support.";

  return (
    <div className="w-full">
      <Pricing 
        plans={demoPlans}
        title={title}
        description={description}
        selectedPlan={selectedPlan}
        onPlanSelect={onPlanSelect}
        showAsSelection={showAsSelection}
      />
    </div>
  );
}

export { PricingBasic };
