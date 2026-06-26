
import { Button } from "@/components/ui/button";
import { WhatsAppBenefits } from "@/components/ui/feature-whatsapp-benefits";
import { MessageCircle, Brain, Target, Clock, Users, TrendingUp } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import StaggeredAnimationContainer from './StaggeredAnimationContainer';

const Solution = () => {
  const { t } = useTranslation('home');
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const solutionCarouselRef = useRef<HTMLDivElement>(null);
  const features = [{
    icon: MessageCircle,
    title: t('solution.features.instant.title', "Instant WhatsApp Responses"),
    description: t('solution.features.instant.description', "Responds within seconds to every message, 24/7. Your customers get immediate answers to their questions and available time slots."),
    mobileDescription: t('solution.features.instant.mobileDescription', "Instant 24/7 responses with available slots."),
    stat: t('solution.features.instant.stat', "Average response: 3 seconds"),
    color: "from-emerald-500 to-green-500",
    hoverTextColor: "group-hover:text-emerald-300"
  }, {
    icon: Brain,
    title: t('solution.features.smart.title', "Smart Conversations"),
    description: t('solution.features.smart.description', "Understands context, asks the right questions, and guides customers to the perfect appointment time that works for everyone."),
    mobileDescription: t('solution.features.smart.mobileDescription', "Smart questions to find perfect appointment times."),
    stat: t('solution.features.smart.stat', "98% customer satisfaction"),
    color: "from-blue-500 to-indigo-500",
    hoverTextColor: "group-hover:text-blue-300"
  }, {
    icon: Target,
    title: t('solution.features.everyBusiness.title', "Perfect For Every Business"),
    description: t('solution.features.everyBusiness.description', "Salons, clinics, gyms, consultants - if you book appointments, our AI adapts to your specific business needs."),
    mobileDescription: t('solution.features.everyBusiness.mobileDescription', "Adapts to any appointment-based business."),
    stat: t('solution.features.everyBusiness.stat', "300% more bookings avg."),
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
    <section className="relative -mt-16 md:-mt-8 py-1 md:py-16 overflow-hidden">
      
      {/* Background decoration - removed to preserve BackgroundProvider hero gradients */}
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
      
      
      <div className="max-w-6xl mx-auto relative z-20 px-4 md:px-6 lg:px-8">
        <StaggeredAnimationContainer 
          staggerDelay={300} 
          variant="hero"
          className="space-y-3 md:space-y-12"
        >
          {/* Header - HEADERS (Largest) */}
          <div className="text-center pt-2 md:pt-8">
          <h2 className="text-3xl md:text-5xl xl:text-6xl font-medium text-white mb-3 md:mb-6 leading-tight px-2 md:px-0">
            {t('solution.titlePre', 'Meet Your')} <span className="text-emerald-400 biolum-text-subtle">{t('solution.titleAccent1', '24/7')}</span>{" "}
            <span className="bg-gradient-to-b from-emerald-300 via-emerald-400 to-emerald-600 bg-clip-text text-transparent biolum-text">
              {t('solution.titleAccent2', 'Booking Assistant')}
            </span>
          </h2>
          <p className="text-base md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed px-3 sm:px-0 mb-6 md:mb-8 font-garamond font-light">
            <span className="md:hidden">{t('solution.subtitleMobile', 'AI that never sleeps, never misses bookings.')}</span>
            <span className="hidden md:inline">{t('solution.subtitleDesktop', 'The AI that never sleeps, never misses a lead, and books appointments faster than any human could.')}</span>
          </p>

          <p className="text-base md:text-lg text-emerald-400/80 font-semibold tracking-wide uppercase mb-8 md:mb-0">
              {t('solution.kicker', "Here's what makes it revolutionary:")}
            </p>
          </div>
          
          {/* Enhanced Benefits Section with Visual Separation */}
          <div className="relative">
            {/* Visual separator with subtle gradient */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
            <div className="pt-2 md:pt-4">
              <WhatsAppBenefits />
            </div>
          </div>
        </StaggeredAnimationContainer>
      </div>
    </section>
  );
};

export default Solution;
