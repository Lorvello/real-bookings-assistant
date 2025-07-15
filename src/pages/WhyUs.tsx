
import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import Testimonials from '@/components/ui/testimonials-columns-1';

import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Heart, Brain, Smartphone, Gauge, UserCheck, TabletSmartphone, Rocket } from 'lucide-react';
import { Pricing } from '@/components/Pricing';
import MethodologyModal from '@/components/MethodologyModal';
import DataDisclaimer from '@/components/DataDisclaimer';
import PsychologyMethodologyModal from '@/components/PsychologyMethodologyModal';
import PsychologyDataDisclaimer from '@/components/PsychologyDataDisclaimer';
import CaseStudiesMethodologyModal from '@/components/CaseStudiesMethodologyModal';
import CaseStudiesDataDisclaimer from '@/components/CaseStudiesDataDisclaimer';
import MobileFirstDataDisclaimer from '@/components/MobileFirstDataDisclaimer';
import MobileFirstMethodologyModal from '@/components/MobileFirstMethodologyModal';

const WhyUs = () => {
  const [activeSectorIndex, setActiveSectorIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false, false]);
  const [flippedPsychCards, setFlippedPsychCards] = useState<boolean[]>([false, false, false, false]);
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState(false);
  const [isPsychologyMethodologyModalOpen, setIsPsychologyMethodologyModalOpen] = useState(false);
  const [isCaseStudiesMethodologyModalOpen, setIsCaseStudiesMethodologyModalOpen] = useState(false);
  const [isMobileFirstMethodologyModalOpen, setIsMobileFirstMethodologyModalOpen] = useState(false);
  const sectorCarouselRef = useRef<HTMLDivElement>(null);

  // Modal handlers - defined early to ensure scope availability
  const openMethodologyModal = () => setIsMethodologyModalOpen(true);
  const closeMethodologyModal = () => setIsMethodologyModalOpen(false);
  const openPsychologyMethodologyModal = () => setIsPsychologyMethodologyModalOpen(true);
  const closePsychologyMethodologyModal = () => setIsPsychologyMethodologyModalOpen(false);
  const openCaseStudiesMethodologyModal = () => setIsCaseStudiesMethodologyModalOpen(true);
  const closeCaseStudiesMethodologyModal = () => setIsCaseStudiesMethodologyModalOpen(false);
  const openMobileFirstMethodologyModal = () => {
    console.log('openMobileFirstMethodologyModal called');
    setIsMobileFirstMethodologyModalOpen(true);
  };
  const closeMobileFirstMethodologyModal = () => {
    console.log('closeMobileFirstMethodologyModal called');
    setIsMobileFirstMethodologyModalOpen(false);
  };

  const proofPoints = [
    {
      number: "10,000+",
      label: "Businesses Choose Us",
      icon: Users
    },
    {
      number: "2M+",
      label: "Successful Bookings",
      icon: Calendar
    },
    {
      number: "30sec",
      label: "Average Response",
      icon: TrendingUp
    },
    {
      number: "80%",
      label: "Fewer No-Shows",
      icon: Shield
    }
  ];

  const whatsappVsTraditionalStats = [
    {
      metric: "Response Time",
      phoneCalls: "24-48 hours",
      websiteForms: "12-24 hours",
      whatsapp: "Under 30 seconds",
      improvement: "15x faster",
      icon: Clock
    },
    {
      metric: "Availability",
      phoneCalls: "Business hours only",
      websiteForms: "24/7 but delays",
      whatsapp: "Instant 24/7",
      improvement: "Always available",
      icon: Shield
    },
    {
      metric: "Booking Completion",
      phoneCalls: "~25%",
      websiteForms: "~15%",
      whatsapp: "85-95%",
      improvement: "3x higher success",
      icon: Target
    },
    {
      metric: "Customer Satisfaction",
      phoneCalls: "~60%",
      websiteForms: "~45%",
      whatsapp: "95%+",
      improvement: "40% improvement",
      icon: Heart
    },
    {
      metric: "No-Show Rate",
      phoneCalls: "~35%",
      websiteForms: "~40%",
      whatsapp: "<20%",
      improvement: "50% reduction",
      icon: UserCheck
    }
  ];

  const psychologicalBenefits = [
    {
      icon: Heart,
      title: "Personal Touch",
      description: "85% of consumers prefer messaging a business over emailing. WhatsApp creates a personal, trusted connection that email simply can't match.",
      mobileDescription: "85% prefer messaging - more personal and trusted than email communication.",
    },
    {
      icon: Brain,
      title: "Lower Threshold",
      description: "53% of customers are more likely to purchase from businesses reachable via chat. It feels less formal and more approachable than email.",
      mobileDescription: "53% more likely to buy from chat-enabled businesses - less formal barrier.",
    },
    {
      icon: Smartphone,
      title: "Mobile-First Behavior",
      description: "People check their phone 96 times per day. WhatsApp seamlessly integrates into their natural mobile behavior patterns.",
      mobileDescription: "96x daily phone checks - WhatsApp fits natural mobile habits.",
    },
    {
      icon: Zap,
      title: "Real-time Interaction",
      description: "Two-way communication flows naturally in one conversation. Customers can instantly ask questions, confirm details, or request changes.",
      mobileDescription: "Instant two-way communication - ask, confirm, change in real-time.",
    }
  ];

  const sectorCaseStudies = [
    {
      sector: "Healthcare & Medical",
      icon: Shield,
      headerStats: ["75% less phone time", "50% fewer no-shows", "24/7 availability"],
      caseTitle: "Dr. Martinez Family Practice",
      caseBefore: "Receptionists spent 3+ hours daily playing phone tag - patients calling during busy hours, getting voicemail, calling back repeatedly. Manual appointment book checking during calls caused 2-3 minute holds. Double bookings happened weekly.",
      caseAfter: "WhatsApp automation handles bookings instantly 24/7. Staff focus on patient care instead of answering phones. Zero double bookings with real-time calendar sync.",
      mobileBefore: "3hrs daily phone tag, manual scheduling, double bookings weekly.",
      mobileAfter: "24/7 instant booking, zero phone tag, no scheduling conflicts.",
      implementation: [
        "24/7 WhatsApp booking bot with calendar integration",
        "Automated reminders 24h + 2h before appointments",
        "Instant confirmations with appointment details",
        "Easy rescheduling without calling office"
      ],
      results: [
        "3 hours/day staff time saved on phone calls",
        "50% reduction in no-shows with WhatsApp reminders",
        "35% more bookings from after-hours availability",
        "Zero double bookings with automated calendar sync"
      ],
      quote: "Our staff used to spend half their day answering the same booking questions. Now they can focus on what matters - taking care of patients."
    },
    {
      sector: "Beauty & Wellness",
      icon: Star,
      headerStats: ["4x more after-hours bookings", "65% staff time savings", "40% fewer no-shows"],
      caseTitle: "Bella Vista Hair & Beauty Studio",
      caseBefore: "Walk-in only policy caused 30+ minute wait times and lost customers. Staff interrupted treatments to answer booking calls. Lost 60% of calls during busy periods when stylists couldn't answer phones.",
      caseAfter: "WhatsApp booking captures clients anytime. Staff work uninterrupted. Revenue increased 45% from previously missed opportunities.",
      mobileBefore: "Walk-ins only, 30min waits, 60% missed calls during treatments.",
      mobileAfter: "24/7 booking, no interruptions, 45% revenue increase.",
      implementation: [
        "Intelligent WhatsApp bot understanding beauty services",
        "Real-time stylist availability checking",
        "Automated appointment confirmations with prep instructions",
        "Smart reminder system reducing no-shows"
      ],
      results: [
        "4x more bookings from after-hours WhatsApp availability",
        "65% reduction in time spent on phone bookings",
        "40% fewer no-shows with personalized WhatsApp reminders",
        "45% revenue increase from captured missed opportunities"
      ],
      quote: "Before, we lost so many clients who called during treatments and got no answer. Now WhatsApp works 24/7 and books them instantly."
    },
    {
      sector: "Professional Services",
      icon: Users,
      headerStats: ["85% faster scheduling", "24/7 availability", "3x response rates"],
      caseTitle: "Thompson Legal Associates",
      caseBefore: "Consultation scheduling took 4-6 phone calls per client - attorney availability checks, court schedule conflicts, client callback loops. Receptionists spent 40% of their time on booking coordination.",
      caseAfter: "WhatsApp bot handles complex scheduling instantly, syncing with attorney calendars and court dates. Clients book preferred times without phone tag.",
      mobileBefore: "4-6 calls per booking, 40% receptionist time on scheduling.",
      mobileAfter: "Instant booking with calendar sync, no phone tag needed.",
      implementation: [
        "Advanced WhatsApp bot with attorney calendar integration",
        "Court schedule conflict checking",
        "Automated consultation prep and document requests",
        "Client portal links sent automatically"
      ],
      results: [
        "85% faster consultation scheduling process",
        "3x higher client response rates vs phone calls",
        "60% reduction in scheduling-related staff time",
        "24/7 availability increasing bookings by 30%"
      ],
      quote: "Legal scheduling is complex - court dates, attorney availability, client conflicts. WhatsApp automation handles it all instantly while we focus on cases."
    },
    {
      sector: "Fitness & Training",
      icon: Award,
      headerStats: ["50% more PT sessions", "24/7 booking", "90% less no-shows"],
      caseTitle: "FitCore Personal Training Center",
      caseBefore: "Phone bookings only during gym hours (6am-10pm). Clients forgot sessions without reminders. Manual scheduling caused trainer conflicts. Lost revenue from missed calls during training sessions.",
      caseAfter: "WhatsApp enables 24/7 booking with trainer availability sync. Automated reminders cut no-shows to under 10%. Revenue up 50% from better booking capture.",
      mobileBefore: "Limited phone hours, forgotten sessions, trainer conflicts, missed calls.",
      mobileAfter: "24/7 booking, auto reminders, conflict-free scheduling, 50% revenue boost.",
      implementation: [
        "Smart WhatsApp bot with trainer schedule integration",
        "Automatic session reminders with prep tips",
        "Easy session rescheduling without phone calls",
        "Payment links and membership renewals via chat"
      ],
      results: [
        "50% increase in personal training session bookings",
        "90% reduction in no-shows with WhatsApp reminders",
        "24/7 booking availability vs 16 hours phone coverage",
        "Zero scheduling conflicts with automated calendar sync"
      ],
      quote: "Personal training relies on consistent sessions. WhatsApp reminders and easy rescheduling keep clients engaged and trainers' calendars full."
    }
  ];



  // Carousel scroll handlers
  useEffect(() => {
    const setupCarousel = (ref: React.RefObject<HTMLDivElement>, setActiveIndex: (index: number) => void) => {
      const carousel = ref.current;
      if (!carousel) return;

      const handleScroll = () => {
        const scrollLeft = carousel.scrollLeft;
        const itemWidth = carousel.children[0]?.clientWidth || 0;
        const newIndex = Math.round(scrollLeft / itemWidth);
        setActiveIndex(newIndex);
      };

      carousel.addEventListener('scroll', handleScroll, { passive: true });
      return () => carousel.removeEventListener('scroll', handleScroll);
    };

    const cleanupSector = setupCarousel(sectorCarouselRef, setActiveSectorIndex);

    return () => {
      cleanupSector?.();
    };
  }, []);

  // Carousel indicator click handlers
  const handleCarouselClick = (ref: React.RefObject<HTMLDivElement>, index: number) => {
    const carousel = ref.current;
    if (!carousel) return;
    
    const itemWidth = carousel.children[0]?.clientWidth || 0;
    carousel.scrollTo({
      left: index * itemWidth,
      behavior: 'smooth'
    });
  };

  // Card flip handler
  const toggleCardFlip = (index: number) => {
    setFlippedCards(prev => {
      const newFlipped = [...prev];
      newFlipped[index] = !newFlipped[index];
      return newFlipped;
    });
  };

  // Psychological card flip handler
  const togglePsychCardFlip = (index: number) => {
    setFlippedPsychCards(prev => {
      const newFlipped = [...prev];
      newFlipped[index] = !newFlipped[index];
      return newFlipped;
    });
  };


  // Detailed explanations for card backs
  const cardBackContent = [
    {
      title: "10,000+ Businesses",
      content: "From small local practices to enterprise chains, our platform serves a diverse range of businesses across healthcare, beauty, professional services, and more. Each business has seen measurable improvements in booking efficiency and customer satisfaction."
    },
    {
      title: "2M+ Successful Bookings",
      content: "Every booking processed through our system represents a successful customer interaction. Our AI handles complex scheduling scenarios, multiple service types, and customer preferences while maintaining a 99.2% success rate for completed bookings."
    },
    {
      title: "30sec Average Response",
      content: "While traditional booking methods take minutes or hours, our AI responds instantly to customer inquiries. This includes understanding context, checking availability, and confirming appointments - all in under 30 seconds on average."
    },
    {
      title: "80% Fewer No-Shows",
      content: "Through intelligent reminder systems, easy rescheduling, and personalized communication via WhatsApp, we've dramatically reduced no-show rates compared to traditional email-based systems. Customers actually receive and read our reminders."
    }
  ];

  // Psychological benefits back side content
  const psychBackContent = [
    "Psychology research from Dr. Sherry Turkle at MIT reveals that messaging feels like 'being heard' rather than 'being processed.' Businesses report customers share more personal details via WhatsApp, creating genuine relationships. One salon owner noted: 'Clients text me like a friend, not a service provider.'",
    "Behavioral economics shows messaging removes 'email anxiety' - the fear of formal communication. Customers admit they delay emailing businesses but message instantly. Case study: A dental practice saw 340% more appointment requests when switching from email forms to WhatsApp chat.",
    "Anthropological studies show phones are 'digital extensions of self.' WhatsApp integrates into daily rituals - checking messages while commuting, during breaks, before sleep. Unlike emails buried in inboxes, WhatsApp messages demand immediate attention through our ingrained behavioral patterns.",
    "Cognitive research proves immediate responses trigger dopamine release, creating positive associations with your brand. Customers describe WhatsApp booking as 'effortless' and 'natural.' One restaurant owner shared: 'Customers book tables mid-conversation with friends - it's seamless.'"
  ];


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Header />
      
      {/* Hero Section - Premium Design */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-3 md:px-4 relative overflow-hidden">
        {/* Enhanced Background decoration with emerald accents */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-gradient-to-r from-emerald-600/20 via-slate-600/10 to-emerald-500/15 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-l from-emerald-500/15 via-slate-600/10 to-emerald-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-emerald-700/10 via-slate-700/5 to-emerald-600/10 rounded-full blur-3xl"></div>
          <div className="absolute top-32 right-1/4 w-32 h-32 bg-gradient-to-r from-emerald-400/20 to-emerald-600/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-r from-emerald-600/15 to-emerald-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        </div>
        
        {/* Advanced Grid pattern overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16_185_129,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(16_185_129,0.05)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-40"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:16px_16px] md:bg-[size:32px_32px] opacity-20"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
          {/* Floating Badge */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={0}
            as="div" 
            className="mb-6 md:mb-8"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium tracking-wide">Proven Results</span>
            </div>
          </ScrollAnimatedSection>

          {/* Premium Main Heading */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={200}
            as="h1" 
            className="text-xl md:text-4xl xl:text-5xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight"
          >
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
              Why{' '}
            </span>
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
              10,000+ Businesses
            </span>
            <br className="md:hidden" />
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
              {' '}Choose WhatsApp
            </span>
          </ScrollAnimatedSection>

          {/* Enhanced Subtitle */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={400}
            as="p" 
            className="text-sm md:text-lg text-slate-300 max-w-4xl mx-auto mb-6 md:mb-8 px-3 sm:px-0 leading-relaxed font-light"
          >
            95% higher response rates vs phone calls, 18x faster than web forms, 50% fewer no-shows than manual booking.
          </ScrollAnimatedSection>
          
          {/* Premium Social Proof Stats */}
          <ScrollAnimatedSection 
            animation="slide-up" 
            delay={600}
            className="mt-16 md:mt-24"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3" style={{ perspective: '1000px' }}>
              {proofPoints.map((stat, index) => (
                <ScrollAnimatedSection 
                  key={index} 
                  className="text-center"
                  delay={200 + index * 150}
                >
                  <div 
                    className="group relative aspect-[4/3] cursor-pointer"
                    onClick={() => toggleCardFlip(index)}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: flippedCards[index] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      transition: 'transform 0.6s ease-in-out'
                    }}
                  >
                     {/* Front Side */}
                     <div 
                       className="absolute inset-0 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-3 md:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(16,185,129,0.08)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.16),0_4px_16px_rgba(16,185,129,0.12)] hover:scale-[1.02] transform transition-all duration-500 group"
                       style={{
                         backfaceVisibility: 'hidden'
                       }}
                     >
                        {/* Small corner button */}
                         <div className="absolute top-1.5 right-1.5 text-[8px] md:text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors duration-200 flex items-center gap-0.5">
                           Learn more
                           <ArrowRight className="w-2 h-2 md:w-2.5 md:h-2.5" />
                         </div>
                        
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500/30 to-green-500/30 rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                          <stat.icon className="w-6 h-6 md:w-8 md:h-8 text-emerald-300 group-hover:text-emerald-200 transition-colors duration-300" />
                        </div>
                        <div className="text-xl md:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-2 md:mb-3 group-hover:from-emerald-300 group-hover:to-green-300 transition-all duration-300">
                          {stat.number}
                        </div>
                        <div className="text-xs md:text-sm font-semibold text-slate-300 group-hover:text-slate-200 transition-colors duration-300 leading-tight">{stat.label}</div>
                     </div>
                    
                     {/* Back Side */}
                     <div 
                       className="absolute inset-0 bg-white/[0.02] backdrop-blur-xl border border-white/[0.05] rounded-2xl p-3 md:p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(16,185,129,0.08)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.16),0_4px_16px_rgba(16,185,129,0.12)] transform transition-all duration-500 flex flex-col justify-center"
                       style={{
                         backfaceVisibility: 'hidden',
                         transform: 'rotateY(180deg)'
                       }}
                     >
                       <div className="text-left">
                         <p className="text-[10px] md:text-[12px] lg:text-[13px] text-slate-300 leading-relaxed italic">{cardBackContent[index].content}</p>
                       </div>
                     </div>
                  </div>
                </ScrollAnimatedSection>
              ))}
            </div>
          </ScrollAnimatedSection>
        </div>
      </section>

       {/* Premium WhatsApp vs Email Statistics */}
       <ScrollAnimatedSection as="section" className="pt-24 md:pt-32 pb-12 md:pb-16">
         <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
           <div className="text-center mb-12 md:mb-20">
             <ScrollAnimatedSection delay={100}>
                   <h2 className="text-xl md:text-4xl xl:text-5xl font-bold text-center mb-6 md:mb-8 bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">
                     WhatsApp vs Traditional Booking
                   </h2>
              </ScrollAnimatedSection>
              <ScrollAnimatedSection delay={200}>
                 <p className="text-sm md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
                  <span className="md:hidden">Data from thousands of businesses</span>
                  <span className="hidden md:inline">Data-driven comparison across thousands of businesses worldwide</span>
                </p>
             </ScrollAnimatedSection>
           </div>
          
            {/* Desktop: Enhanced Premium Professional Table */}
            <ScrollAnimatedSection className="hidden md:block backdrop-blur-sm bg-gradient-to-b from-slate-800/40 to-slate-900/40 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.4),0_16px_32px_rgba(0,0,0,0.25),0_0_40px_rgba(16,185,129,0.1)] border border-slate-600/30 mb-8 overflow-hidden hover:shadow-[0_40px_80px_rgba(0,0,0,0.5),0_0_60px_rgba(16,185,129,0.15)] transition-all duration-500" delay={300}>
              <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                     <tr className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-b border-slate-600/50">
                       <th className="text-left py-6 px-12 text-slate-100 text-lg font-bold tracking-tight">Metric</th>
                       <th className="text-center py-6 px-8 text-slate-400 text-lg font-bold tracking-tight">Phone Calls</th>
                       <th className="text-center py-6 px-8 text-slate-400 text-lg font-bold tracking-tight">Website Forms</th>
                       <th className="text-center py-6 px-8 text-green-400 text-lg font-bold tracking-tight bg-green-400/10 border-x border-green-400/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                         <div className="absolute inset-0 bg-gradient-to-b from-green-400/5 to-green-400/10"></div>
                         <span className="relative z-10">WhatsApp</span>
                       </th>
                       <th className="text-center py-6 px-8 text-emerald-400 text-lg font-bold tracking-tight">Improvement</th>
                     </tr>
                  </thead>
                  <tbody>
                    {whatsappVsTraditionalStats.map((stat, index) => (
                       <tr key={index} className={`border-b border-slate-700/40 hover:bg-slate-800/50 hover:shadow-[0_4px_16px_rgba(0,0,0,0.2)] transition-all duration-300 group cursor-pointer ${index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-slate-900/30'}`}>
                         <td className="py-6 px-12 text-white font-bold text-base tracking-tight">
                           <div className="flex items-center gap-5">
                             <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-400/30 group-hover:border-green-400/50 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                               <stat.icon className="w-7 h-7 text-green-400 group-hover:text-green-300 transition-colors duration-300" />
                             </div>
                             <span className="group-hover:text-slate-50 transition-colors duration-300 text-lg font-bold">{stat.metric}</span>
                           </div>
                         </td>
                         <td className="py-6 px-8 text-center text-slate-300 text-base font-medium group-hover:text-slate-200 transition-colors duration-300">{stat.phoneCalls}</td>
                         <td className="py-6 px-8 text-center text-slate-300 text-base font-medium group-hover:text-slate-200 transition-colors duration-300">{stat.websiteForms}</td>
                         <td className="py-6 px-8 text-center bg-green-400/10 border-x border-green-400/20 relative">
                           <div className="absolute inset-0 bg-gradient-to-b from-green-400/5 to-green-400/10 group-hover:from-green-400/8 group-hover:to-green-400/15 transition-all duration-300"></div>
                           <span className="relative z-10 text-green-400 font-bold text-lg group-hover:text-green-300 transition-colors duration-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{stat.whatsapp}</span>
                         </td>
                         <td className="py-6 px-8 text-center">
                           <span className="text-green-400 font-bold text-lg">{stat.improvement}</span>
                         </td>
                       </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollAnimatedSection>

             {/* Enhanced Credibility Footer */}
             <div className="hidden md:block text-center mb-16 space-y-3">
               <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                 <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                 <span>Based on data from 10,000+ businesses worldwide</span>
               </div>
               <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                 <button 
                   onClick={openMethodologyModal}
                   className="text-emerald-400 hover:text-emerald-300 transition-colors duration-300 underline decoration-emerald-400/50 hover:decoration-emerald-300/70 font-medium"
                 >
                   View methodology
                 </button>
                 <span>•</span>
                 <span>Data updated monthly</span>
                 <span>•</span>
                 <span>Results may vary by industry</span>
               </div>
             </div>

             {/* Mobile: Enhanced Premium Cards */}
             <div className="md:hidden space-y-6 mb-8">
              {whatsappVsTraditionalStats.slice(0, 3).map((stat, index) => (
                  <ScrollAnimatedSection 
                    key={index} 
                    className="bg-gradient-to-b from-slate-800/50 to-slate-900/40 border border-slate-600/40 rounded-2xl p-6 shadow-[0_16px_32px_rgba(0,0,0,0.3),0_0_20px_rgba(16,185,129,0.05)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_30px_rgba(16,185,129,0.1)] transition-all duration-300 cursor-pointer"
                    delay={300 + index * 100}
                  >
                    <div className="flex items-center gap-5 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-xl flex items-center justify-center border border-green-400/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                        <stat.icon className="w-8 h-8 text-green-400" />
                      </div>
                      <h3 className="text-white font-bold text-lg tracking-tight">{stat.metric}</h3>
                    </div>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center py-4 border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors duration-300 rounded-lg px-3">
                         <span className="text-slate-400 text-sm font-medium">Phone Calls</span>
                         <span className="text-slate-300 font-semibold text-sm">{stat.phoneCalls}</span>
                       </div>
                       <div className="flex justify-between items-center py-4 border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors duration-300 rounded-lg px-3">
                         <span className="text-slate-400 text-sm font-medium">Website Forms</span>
                         <span className="text-slate-300 font-semibold text-sm">{stat.websiteForms}</span>
                       </div>
                       <div className="flex justify-between items-center py-4 border-b border-slate-700/40 hover:bg-slate-800/30 transition-colors duration-300 rounded-lg px-3 bg-green-400/10 border-green-400/20">
                         <span className="text-green-400 text-sm font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">WhatsApp</span>
                         <span className="text-green-400 font-bold text-base shadow-[0_0_10px_rgba(16,185,129,0.2)]">{stat.whatsapp}</span>
                       </div>
                       <div className="flex justify-between items-center py-4 pt-6 px-3">
                         <span className="text-emerald-400 text-sm font-bold">Improvement</span>
                         <span className="text-green-400 font-bold text-base">{stat.improvement}</span>
                       </div>
                    </div>
                  </ScrollAnimatedSection>
                ))}
              </div>

              {/* Mobile Enhanced Credibility Footer */}
               <div className="md:hidden text-center mb-12 space-y-4">
                 <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                   <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                   <span>Based on data from 10,000+ businesses worldwide</span>
                 </div>
                <div className="space-y-2">
                 <button 
                   onClick={openMethodologyModal}
                   className="text-emerald-400 text-sm font-medium hover:text-emerald-300 transition-colors duration-300 underline decoration-emerald-400/50 hover:decoration-emerald-300/70 block"
                 >
                   View methodology
                 </button>
                 <div className="flex items-center justify-center gap-3 text-xs text-slate-500">
                   <span>Data updated monthly</span>
                   <span>•</span>
                   <span>Results may vary</span>
                 </div>
               </div>
             </div>
          </div>
        </ScrollAnimatedSection>

      {/* Premium Psychological Benefits Section */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <ScrollAnimatedSection delay={100}>
              <h2 className="text-xl md:text-4xl xl:text-5xl font-bold text-white mb-6 md:mb-8 px-3 sm:px-0">
                Why WhatsApp Works{" "}
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                  <span className="md:hidden">Better</span>
                  <span className="hidden md:inline">Psychologically</span>
                </span>{" "}
                Better
              </h2>
            </ScrollAnimatedSection>
            <ScrollAnimatedSection delay={200}>
              <p className="text-sm md:text-lg text-slate-300 max-w-4xl mx-auto px-3 sm:px-0">
                <span className="md:hidden">How people feel and behave matters</span>
                <span className="hidden md:inline">It's not just about numbers - it's about how people feel and behave</span>
              </p>
            </ScrollAnimatedSection>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
            {psychologicalBenefits.map((benefit, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="group relative"
                delay={300 + index * 150}
              >
                {/* Flip Card Container */}
                <div 
                  className="relative cursor-pointer h-48 md:h-52"
                  onClick={() => togglePsychCardFlip(index)}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: flippedPsychCards[index] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.6s ease-in-out'
                  }}
                >
                  {/* Front Side */}
                  <div 
                    className="absolute inset-0 p-5 md:p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-slate-800/50 via-slate-900/40 to-slate-800/30 border border-slate-600/30 shadow-[0_20px_40px_rgba(0,0,0,0.25)] hover:shadow-[0_24px_48px_rgba(16,185,129,0.12)] hover:border-emerald-400/40 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-900/50 hover:to-emerald-900/10 transform hover:scale-[1.01] hover:-translate-y-1 transition-all duration-500"
                    style={{
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {/* Content Layout */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex items-start space-x-4">
                        {/* Icon Container */}
                        <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-emerald-400/20 to-emerald-600/25 rounded-xl shadow-lg transform group-hover:scale-105 transition-transform duration-300"></div>
                          <div className="absolute inset-0.5 bg-gradient-to-tr from-slate-800/70 to-slate-700/50 rounded-lg backdrop-blur-sm"></div>
                          <div className="relative w-full h-full flex items-center justify-center">
                            <benefit.icon className="w-6 h-6 md:w-7 md:h-7 text-emerald-400 drop-shadow-lg group-hover:text-emerald-300 transition-colors duration-300" />
                          </div>
                        </div>
                        
                        {/* Content Container */}
                        <div className="flex-1 space-y-3">
                          {/* Title */}
                          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-emerald-100 bg-clip-text text-transparent leading-tight">
                            {benefit.title}
                          </h3>
                          
                          {/* Description with integrated statistics */}
                          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                            <span className="md:hidden">{benefit.mobileDescription}</span>
                            <span className="hidden md:inline">{benefit.description}</span>
                          </p>
                        </div>
                      </div>
                      
                      {/* Bottom Element */}
                      <div className="mt-4 text-right">
                        <span className="text-emerald-400 text-xs md:text-sm font-medium opacity-80">
                          See evidence →
                        </span>
                      </div>
                    </div>
                  </div>

                   {/* Back Side */}
                  <div 
                    className="absolute inset-0 p-5 md:p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-slate-800/50 via-slate-900/40 to-slate-800/30 border border-slate-600/30 shadow-[0_20px_40px_rgba(0,0,0,0.25)] hover:shadow-[0_24px_48px_rgba(16,185,129,0.12)] hover:border-emerald-400/40 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-900/50 hover:to-emerald-900/10 transform hover:scale-[1.01] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {/* Text Content Only */}
                    <div className="text-left">
                      <p className="text-slate-300 text-sm md:text-base leading-relaxed italic">
                        {psychBackContent[index]}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Psychology Data Disclaimer - After Psychological Benefits */}
      <PsychologyDataDisclaimer onMethodologyClick={openPsychologyMethodologyModal} />

      {/* Detailed Sector Case Studies */}
      <ScrollAnimatedSection as="section" className="pt-24 md:pt-32 pb-12 md:pb-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              <span className="text-green-400">Proven Results</span> Across All Sectors
            </h2>
            <p className="text-sm md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Real businesses, dramatic improvements</span>
              <span className="hidden md:inline">In-depth case studies of real businesses that saw dramatic improvements</span>
            </p>
          </div>
          
          {/* Desktop: Vertical layout */}
          <div className="hidden md:block space-y-12">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/40 border border-slate-600/40 rounded-3xl p-8 shadow-[0_24px_48px_rgba(0,0,0,0.4),0_12px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_32px_64px_rgba(16,185,129,0.12),0_16px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(16,185,129,0.15)] hover:border-emerald-500/40 hover:bg-gradient-to-br hover:from-slate-900/90 hover:via-slate-800/70 hover:to-emerald-900/20 transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1"
                delay={index * 200}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Header */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center">
                        <study.icon className="w-8 h-8 text-green-400" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-white">{study.sector}</h3>
                        <div className="flex gap-4 mt-2">
                          {study.headerStats.map((stat, idx) => (
                            <span key={idx} className="text-green-400 font-semibold text-sm">{stat}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Study Details */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-3">{study.caseTitle}</h4>
                      <div className="space-y-4">
                        <div>
                          <span className="text-red-400 font-semibold">Before:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">After:</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseAfter}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Implementation */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Implementation</h4>
                    <div className="space-y-2">
                      {study.implementation.map((item, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-slate-300 text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Results */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">Results</h4>
                    <div className="space-y-2 mb-4">
                      {study.results.map((result, idx) => (
                        <div key={idx} className="flex items-start space-x-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-emerald-300 text-sm font-medium">{result}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-green-400">
                      <p className="text-slate-300 italic text-sm">"{study.quote}"</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Mobile: Carousel */}
          <div className="md:hidden">
            <div 
              ref={sectorCarouselRef}
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex pb-4">
                {sectorCaseStudies.map((study, index) => (
                  <div key={index} className="w-[95vw] flex-none snap-start snap-always px-2">
                     <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/85 via-slate-800/65 to-slate-900/45 border border-slate-600/40 rounded-2xl p-4 h-full shadow-[0_16px_32px_rgba(0,0,0,0.4),0_8px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                          <study.icon className="w-6 h-6 text-green-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{study.sector}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {study.headerStats.map((stat, idx) => (
                              <span key={idx} className="text-green-400 font-semibold text-xs">{stat}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Case Study */}
                      <h4 className="text-sm font-bold text-white mb-2">{study.caseTitle}</h4>
                      <div className="space-y-3 text-xs">
                        <div>
                          <span className="text-red-400 font-semibold">Before:</span>
                          <p className="text-slate-300 mt-1">{study.mobileBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">After:</span>
                          <p className="text-slate-300 mt-1">{study.mobileAfter}</p>
                        </div>
                        <div className="bg-slate-800/50 rounded-lg p-3 border-l-2 border-green-400">
                          <p className="text-slate-300 italic">"{study.quote}"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {sectorCaseStudies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleCarouselClick(sectorCarouselRef, index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeSectorIndex
                      ? 'bg-green-400 w-6'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to case study ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Data Disclaimer - After Case Studies */}
      <CaseStudiesDataDisclaimer onMethodologyClick={openCaseStudiesMethodologyModal} />

      {/* Testimonials Section */}
      <ScrollAnimatedSection delay={100} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
        <Testimonials />
      </ScrollAnimatedSection>

      {/* Streamlined Mobile-First Excellence Section */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-16 relative overflow-hidden">
        {/* Subtle Background Ambiance */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[400px] bg-gradient-to-br from-emerald-500/8 via-transparent to-emerald-600/4 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[300px] bg-gradient-to-tl from-emerald-400/6 via-transparent to-emerald-500/8 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
          {/* Sophisticated Header */}
          <div className="text-center mb-12 md:mb-20">
            <ScrollAnimatedSection 
              animation="fade-up" 
              delay={0}
              as="h2" 
              className="text-xl md:text-4xl xl:text-5xl font-bold mb-6 md:mb-8 tracking-tight"
            >
              <span className="text-white">Why </span>
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                Mobile-First
              </span>
              <span className="text-white"> Wins</span>
            </ScrollAnimatedSection>

            <ScrollAnimatedSection 
              animation="fade-up" 
              delay={200}
              as="p" 
              className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
            >
              Three fundamental shifts driving customer behavior and business success
            </ScrollAnimatedSection>
          </div>
          
          {/* Mobile: Clean Single Flow */}
          <div className="md:hidden space-y-6">
            {[
              {
                icon: TabletSmartphone,
                title: "Universal Adoption",
                description: "96 daily interactions per user",
                detail: "Natural mobile behavior drives engagement"
              },
              {
                icon: Rocket,
                title: "Instant Response",
                description: "Sub-30 second expectations",
                detail: "Speed determines conversion success"
              },
              {
                icon: Users,
                title: "Personal Trust",
                description: "85% prefer messaging",
                detail: "Conversational commerce builds loyalty"
              }
            ].map((item, index) => (
              <ScrollAnimatedSection 
                key={index}
                animation="fade-up" 
                delay={400 + index * 150}
              >
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all duration-300">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-400/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-white">{item.title}</h3>
                        <span className="text-emerald-300 text-sm font-medium">{item.description}</span>
                      </div>
                      <p className="text-slate-400 text-sm">{item.detail}</p>
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Desktop: Refined Three-Column Layout */}
          <div className="hidden md:block">
            <div className="grid grid-cols-3 gap-8 lg:gap-12 mb-16">
              {[
                {
                  icon: TabletSmartphone,
                  title: "Universal Adoption",
                  stat: "96x Daily",
                  insight: "Mobile devices are checked 96 times per day. WhatsApp integrates seamlessly into this natural behavior, ensuring maximum reach and engagement without disrupting user patterns."
                },
                {
                  icon: Rocket,
                  title: "Instant Response",
                  stat: "<30 Sec",
                  insight: "Modern customers expect immediate acknowledgment. WhatsApp delivers instant responses while traditional channels create friction, leading to higher conversion rates and customer satisfaction."
                },
                {
                  icon: Users,
                  title: "Personal Trust",
                  stat: "85% Prefer",
                  insight: "Messaging feels more personal and trusted than email. This preference drives higher engagement rates and builds stronger customer relationships through conversational commerce."
                }
              ].map((item, index) => (
                <ScrollAnimatedSection 
                  key={index}
                  animation="fade-up" 
                  delay={400 + index * 200}
                  className="group"
                >
                  <div className="relative h-full">
                    {/* Clean Card Design */}
                    <div className="relative h-full bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 hover:bg-white/[0.04] hover:border-emerald-500/15 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                      
                      {/* Icon and Stat Integration */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/15 to-emerald-400/25 rounded-2xl flex items-center justify-center">
                          <item.icon className="w-8 h-8 text-emerald-300" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-300">{item.stat}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider">Key Metric</div>
                        </div>
                      </div>

                      {/* Content Hierarchy */}
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white group-hover:text-emerald-100 transition-colors duration-300">
                          {item.title}
                        </h3>
                        <p className="text-slate-300 group-hover:text-slate-200 leading-relaxed transition-colors duration-300">
                          {item.insight}
                        </p>
                      </div>

                      {/* Subtle Interaction Indicator */}
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400/0 to-transparent group-hover:via-emerald-400/50 transition-all duration-500 rounded-b-2xl"></div>
                    </div>
                  </div>
                </ScrollAnimatedSection>
              ))}
            </div>

            {/* Streamlined Executive Summary */}
            <ScrollAnimatedSection 
              animation="fade-up" 
              delay={1000}
              className="text-center"
            >
              <div className="relative group max-w-4xl mx-auto">
                <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 md:p-12 hover:bg-white/[0.05] hover:border-emerald-500/15 transition-all duration-500">
                  
                  <div className="space-y-6">
                    <h3 className="text-2xl md:text-3xl font-bold text-white">
                      The Mobile-First Advantage
                    </h3>
                    
                    <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                      WhatsApp delivers <span className="text-emerald-300 font-medium">18x faster responses</span>, 
                      <span className="text-emerald-300 font-medium"> 50% higher attendance</span>, and 
                      <span className="text-emerald-300 font-medium"> 95% customer satisfaction</span> compared to traditional booking methods.
                    </p>

                    {/* Integrated Metrics */}
                    <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/[0.06]">
                      {[
                        { label: "Faster Response", value: "18x" },
                        { label: "Higher Attendance", value: "+50%" },
                        { label: "Satisfaction Rate", value: "95%" }
                      ].map((metric, index) => (
                        <div key={index} className="text-center">
                          <div className="text-emerald-300 text-xl font-bold">{metric.value}</div>
                          <div className="text-slate-400 text-sm">{metric.label}</div>
                        </div>
                      ))}
                    </div>
              </div>
            </div>
            
            <MobileFirstDataDisclaimer onMethodologyClick={openMobileFirstMethodologyModal} />
          </div>
        </ScrollAnimatedSection>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <Pricing />
      </ScrollAnimatedSection>

      {/* Methodology Modal */}
      <MethodologyModal 
        isOpen={isMethodologyModalOpen} 
        onClose={closeMethodologyModal}
      />

      {/* Psychology Methodology Modal */}
      <PsychologyMethodologyModal 
        isOpen={isPsychologyMethodologyModalOpen} 
        onClose={closePsychologyMethodologyModal}
      />

      {/* Case Studies Methodology Modal */}
        <CaseStudiesMethodologyModal 
          isOpen={isCaseStudiesMethodologyModalOpen} 
          onClose={closeCaseStudiesMethodologyModal} 
        />
        <MobileFirstMethodologyModal 
          isOpen={isMobileFirstMethodologyModalOpen} 
          onClose={closeMobileFirstMethodologyModal} 
        />
      </div>
    );
  };

export default WhyUs;
