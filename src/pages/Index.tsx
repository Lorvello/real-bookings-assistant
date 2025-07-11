import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProcessSection from "@/components/ProcessSection";
import PainPoint from "@/components/PainPoint";
import Solution from "@/components/Solution";
import Features from "@/components/Features";
import SocialProof from "@/components/SocialProof";
import { Pricing } from "@/components/Pricing";
import ScrollAnimatedSection from "@/components/ScrollAnimatedSection";
import { Clock, PhoneOff, MessageSquareX } from "lucide-react";
import { useState, useRef, useEffect } from "react";
const Index = () => {
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const painPoints = [{
    icon: Clock,
    title: "Hours wasted on back-and-forth messaging",
    description: "Every day you lose valuable time scheduling appointments via WhatsApp. Customers ask questions at impossible times and you miss opportunities.",
    color: "from-red-500 to-red-600"
  }, {
    icon: PhoneOff,
    title: "Missed calls = missed revenue",
    description: "When you're not available, potential customers go to competitors. Every missed call is direct revenue loss.",
    color: "from-orange-500 to-red-500"
  }, {
    icon: MessageSquareX,
    title: "Customer frustration from slow responses",
    description: "Customers expect quick answers. Delayed responses lead to dissatisfaction and negative reviews that damage your reputation.",
    color: "from-red-600 to-red-700"
  }];

  // Handle carousel scroll and update active indicator
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveCarouselIndex(newIndex);
      setIsAutoScrolling(false);
    };
    carousel.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleIndicatorClick = (index: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
    setActiveCarouselIndex(index);
    setIsAutoScrolling(false);
  };
  return <div className="min-h-screen" style={{
    backgroundColor: 'hsl(217, 35%, 12%)'
  }}>
      <Header />
      <Hero />
      

      {/* Solution Section - Increased mobile padding */}
      <ScrollAnimatedSection delay={100}>
        <Solution />
      </ScrollAnimatedSection>

      {/* Process Section - Increased mobile padding */}
      <ScrollAnimatedSection delay={200}>
        <ProcessSection />
      </ScrollAnimatedSection>

      {/* Features Section - Increased mobile padding */}
      <ScrollAnimatedSection delay={100}>
        <Features />
      </ScrollAnimatedSection>

      {/* Social Proof Section - Increased mobile padding */}
      <ScrollAnimatedSection delay={200}>
        <SocialProof />
      </ScrollAnimatedSection>

      {/* Pricing Section - Increased mobile padding */}
      <ScrollAnimatedSection delay={100}>
        <div id="pricing">
          <Pricing />
        </div>
      </ScrollAnimatedSection>
    </div>;
};
export default Index;