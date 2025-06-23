
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { PricingBasic } from "@/components/PricingBasic";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";
import { Clock, PhoneOff, MessageSquareX } from "lucide-react";

const Index = () => {
  const painPoints = [
    {
      icon: Clock,
      title: "Hours wasted on back-and-forth messaging",
      description: "Every day you lose precious time scheduling appointments via WhatsApp. Customers ask questions at impossible times and you miss opportunities.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: PhoneOff,
      title: "Missed calls = missed revenue", 
      description: "When you're not available, potential customers go to competitors. Every missed call is direct loss of revenue.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: MessageSquareX,
      title: "Customer frustration from slow responses",
      description: "Customers expect quick answers. Delayed responses lead to dissatisfaction and negative reviews that damage your reputation.",
      color: "from-red-600 to-red-700"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <ScrollAnimatedSection>
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12 sm:mb-16">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6">
                Do you recognize this <span className="text-red-400">problem</span>?
              </h2>
              <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto px-4 sm:px-0">
                These daily frustrations cost you time, money and customers. It's time for a solution.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
              {painPoints.map((painPoint, index) => (
                <ScrollAnimatedSection key={index} delay={index * 150}>
                  <PainPoint
                    icon={painPoint.icon}
                    title={painPoint.title}
                    description={painPoint.description}
                    color={painPoint.color}
                  />
                </ScrollAnimatedSection>
              ))}
            </div>
          </div>
        </section>
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <Solution />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={200}>
        <ProcessSection />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <Features />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={200}>
        <SocialProof />
      </ScrollAnimatedSection>
      <ScrollAnimatedSection delay={100}>
        <div id="pricing">
          <PricingBasic />
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default Index;
