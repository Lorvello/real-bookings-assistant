import { Button } from "@/components/ui/button";
import { WhatsAppBenefits } from "@/components/ui/feature-whatsapp-benefits";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Solution = () => {
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const solutionCarouselRef = useRef<HTMLDivElement>(null);
  const features = [{
    icon: MessageCircle,
    title: "Instant WhatsApp Responses",
    description: "Responds within seconds to every message, 24/7. Your customers get immediate answers to their questions and available time slots.",
    mobileDescription: "Instant 24/7 responses with available slots.",
    stat: "Average response: 3 seconds",
    color: "from-emerald-500 to-green-500",
    hoverTextColor: "group-hover:text-emerald-300"
  }, {
    icon: Brain,
    title: "Smart Conversations",
    description: "Understands context, asks the right questions, and guides customers to the perfect appointment time that works for everyone.",
    mobileDescription: "Smart questions to find perfect appointment times.",
    stat: "98% customer satisfaction",
    color: "from-blue-500 to-indigo-500",
    hoverTextColor: "group-hover:text-blue-300"
  }, {
    icon: Target,
    title: "Perfect For Every Business",
    description: "Salons, clinics, gyms, consultants - if you book appointments, our AI adapts to your specific business needs.",
    mobileDescription: "Adapts to any appointment-based business.",
    stat: "300% more bookings avg.",
    color: "from-purple-500 to-pink-500",
    hoverTextColor: "group-hover:text-purple-300"
  }];

  // Handle solution carousel scroll
  useEffect(() => {
    const carousel = solutionCarouselRef.current;
    if (!carousel) return;
    const handleScroll = () => {
      const scrollLeft = carousel.scrollLeft;
      const itemWidth = carousel.children[0]?.clientWidth || 0;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setActiveSolutionIndex(newIndex);
    };
    carousel.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => carousel.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle carousel indicator click
  const handleSolutionIndicatorClick = (index: number) => {
    const carousel = solutionCarouselRef.current;
    if (!carousel) return;
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };
  return (
    <section className="relative py-8 md:py-16 bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 overflow-hidden">
      {/* Light top transition overlay */}
      <div className="absolute top-0 left-0 right-0 h-12 md:h-16 bg-gradient-to-b from-slate-800/40 to-transparent z-10"></div>
      
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-20 px-4 md:px-6 lg:px-8">
        {/* Header - Compact mobile with improved spacing */}
        <div className="text-center mb-6 md:mb-16 pt-4 md:pt-8">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 md:px-6 md:py-3 mb-3 md:mb-8 backdrop-blur-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 text-xs md:text-sm font-medium">The Solution</span>
          </div>
          
          <h2 className="text-xl md:text-5xl xl:text-6xl font-bold text-white mb-3 md:mb-6 leading-tight px-2 md:px-0">
            Meet Your <span className="text-emerald-400">24/7</span><br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Booking Assistant
            </span>
          </h2>
          <p className="text-xs md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0">
            <span className="md:hidden">AI that never sleeps, never misses bookings.</span>
            <span className="hidden md:inline">The AI that never sleeps, never misses a lead, and books appointments 
            faster than any human could.</span>
          </p>
        </div>
      </div>
      
      {/* WhatsApp Benefits Component */}
      <WhatsAppBenefits />
    </section>
  );
};

export default Solution;
