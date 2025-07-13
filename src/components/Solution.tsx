import { Button } from "@/components/ui/button";
import { MessageSquare, Brain, Clock, MessageCircle, Target } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ScrollAnimatedSection from './ScrollAnimatedSection';

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
    <section className="relative py-8 md:py-16 overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 px-6 md:px-8 lg:px-12">
        <div className="space-y-8 md:space-y-20">
          {/* Header */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            config={{ threshold: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              Meet Your{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                24/7 Booking Assistant
              </span>
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">AI that books appointments while you sleep</span>
              <span className="hidden md:inline">Your intelligent AI assistant that handles customer inquiries and books appointments automatically, even while you sleep</span>
            </p>
          </ScrollAnimatedSection>
          
          {/* WhatsApp Benefits Component */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
            {/* Main Feature Card */}
            <ScrollAnimatedSection 
              animation="slide-up" 
              config={{ threshold: 0.2 }}
              className="lg:row-span-2"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 lg:p-8 h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">WhatsApp Integration</h3>
                </div>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  Connect directly to your business WhatsApp number. Your AI assistant responds to customer messages instantly, handles complex booking conversations, and schedules appointments seamlessly.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-300">Instant customer responses</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-300">Natural conversation flow</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-300">Automatic appointment booking</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    <span className="text-slate-300">Multi-language support</span>
                  </div>
                </div>
              </div>
            </ScrollAnimatedSection>

            {/* Secondary Feature Cards */}
            <ScrollAnimatedSection 
              animation="slide-left" 
              delay={200}
              config={{ threshold: 0.2 }}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">24/7 Availability</h3>
                </div>
                <p className="text-slate-300">
                  Never miss a booking opportunity. Your AI assistant works around the clock, even while you sleep.
                </p>
              </div>
            </ScrollAnimatedSection>

            <ScrollAnimatedSection 
              animation="slide-right" 
              delay={400}
              config={{ threshold: 0.2 }}
            >
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Smart Scheduling</h3>
                </div>
                <p className="text-slate-300">
                  Intelligently manages your calendar, prevents double bookings, and optimizes your schedule automatically.
                </p>
              </div>
            </ScrollAnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Solution;
