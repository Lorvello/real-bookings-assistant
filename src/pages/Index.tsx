
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
      title: "Uren verspild aan heen-en-weer appen",
      description: "Elke dag verlies je kostbare tijd aan het plannen van afspraken via WhatsApp. Klanten stellen vragen op onmogelijke tijden en je mist opportunities.",
      color: "from-red-500 to-red-600"
    },
    {
      icon: PhoneOff,
      title: "Gemiste calls = gemiste inkomsten", 
      description: "Wanneer je niet beschikbaar bent, gaan potentiële klanten naar de concurrent. Elke gemiste call is direct verlies van omzet.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: MessageSquareX,
      title: "Frustratie bij klanten door trage reacties",
      description: "Klanten verwachten snelle antwoorden. Vertraagde reacties leiden tot ontevredenheid en negatieve reviews die je reputatie schaden.",
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
                Herken je dit <span className="text-red-400">probleem</span>?
              </h2>
              <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto px-4 sm:px-0">
                Deze dagelijkse frustraties kosten je tijd, geld en klanten. Het wordt tijd voor een oplossing.
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
