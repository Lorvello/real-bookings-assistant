
import React, { useState, useRef, useEffect } from 'react';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Rocket, Crown, Mail, BarChart3, Timer, UserCheck, Heart, Brain, Smartphone, Gauge } from 'lucide-react';
import { Pricing } from '@/components/Pricing';

const WhyUs = () => {
  const [activeSectorIndex, setActiveSectorIndex] = useState(0);
  const [activeAdvantageIndex, setActiveAdvantageIndex] = useState(0);
  const [activeTestimonialIndex, setActiveTestimonialIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false, false]);
  const sectorCarouselRef = useRef<HTMLDivElement>(null);
  const advantageCarouselRef = useRef<HTMLDivElement>(null);
  const testimonialCarouselRef = useRef<HTMLDivElement>(null);

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
      improvement: "50x faster",
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
      improvement: "4x higher success",
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
      description: "85% of consumers prefer messaging a business over emailing. WhatsApp feels personal and trusted.",
      mobileDescription: "85% prefer messaging - more personal than email.",
      stat: "85% prefers messaging"
    },
    {
      icon: Brain,
      title: "Lower Threshold",
      description: "53% of customers are more likely to purchase from businesses that are reachable via chat. It feels less formal than email.",
      mobileDescription: "53% more likely to buy from chat-enabled businesses.",
      stat: "53% higher conversion"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Behavior",
      description: "People check their phone 96 times per day. WhatsApp fits into their natural behavior.",
      mobileDescription: "WhatsApp fits natural phone checking habits.",
      stat: "96x per day checked"
    },
    {
      icon: Zap,
      title: "Real-time Interaction",
      description: "Two-way communication in one conversation. Customers can directly ask, confirm or change.",
      mobileDescription: "Direct two-way communication in one chat.",
      stat: "Direct interaction"
    }
  ];

  const sectorCaseStudies = [
    {
      sector: "Healthcare & Medical",
      icon: Shield,
      headerStats: ["80% faster scheduling", "40% fewer no-shows", "95% messages read"],
      caseTitle: "Gynecology Clinic London",
      caseBefore: "Scheduling appointments took an average of 5 minutes per phone/email back-and-forth. No-show rate was high due to missed email reminders.",
      caseAfter: "After implementing WhatsApp chatbot: appointment scheduling in <1 minute, 40% fewer no-shows through effective reminders.",
      mobileBefore: "5 minutes per booking, high no-shows from missed emails.",
      mobileAfter: "<1 minute booking, 40% fewer no-shows via WhatsApp.",
      implementation: [
        "Automated WhatsApp chatbot for bookings",
        "Personal reminders 24h in advance",
        "Easy confirmation/rescheduling via chat",
        "95% of messages read within minutes"
      ],
      results: [
        "80% time savings in appointment scheduling",
        "40% reduction in no-shows",
        "Nearly 100% reach of reminders",
        "Higher patient satisfaction through personal approach"
      ],
      quote: "From 5 minutes of phone ping-pong to less than 1 minute via the chatbot. Patients no longer forget appointments."
    },
    {
      sector: "Beauty & Wellness",
      icon: Star,
      headerStats: ["30% more bookings", "50% fewer no-shows", "More repeat bookings"],
      caseTitle: "Dutch Salons via Aimy Platform",
      caseBefore: "Lots of back-and-forth emailing/calling for appointments. Email reminders were often missed (30% open rate).",
      caseAfter: "WhatsApp integration led to spectacular growth in bookings and dramatic drop in no-shows.",
      mobileBefore: "Email back-and-forth, 30% open rate for reminders.",
      mobileAfter: "WhatsApp = 30% more bookings, 50% fewer no-shows.",
      implementation: [
        "WhatsApp messages for appointment confirmation",
        "Automatic reminders via WhatsApp",
        "Follow-up messages for repeat bookings",
        "Personal service tips and preparation"
      ],
      results: [
        "30% increase in total bookings",
        "50% fewer no-shows vs email reminders",
        "95% read rate vs 30% with email",
        "Significant increase in repeat bookings"
      ],
      quote: "Email reminders are only opened 30% of the time, WhatsApp messages have a 95% read rate. The difference is night and day."
    },
    {
      sector: "Recruitment & HR",
      icon: Users,
      headerStats: ["10x higher response ratio", "5-10x faster responses", "98% open rate"],
      caseTitle: "HR Agencies and Recruiters",
      caseBefore: "Candidates responded slowly to email invitations. Many interviews had to be postponed due to late responses.",
      caseAfter: "WhatsApp invitations lead to 10x higher response and drastically accelerated recruitment process.",
      mobileBefore: "Slow email responses, postponed interviews.",
      mobileAfter: "10x higher response, faster recruitment.",
      implementation: [
        "WhatsApp invitations for interviews",
        "Quick confirmation of appointments",
        "Updates on recruitment process via chat",
        "Low-threshold communication with candidates"
      ],
      results: [
        "10x higher response ratio from candidates",
        "5-10x faster response time",
        "98% open rate for messages",
        "Dramatically accelerated recruitment process"
      ],
      quote: "Candidates respond within minutes instead of days. Our recruitment process has become lightning fast."
    },
    {
      sector: "Hospitality & Restaurants",
      icon: Award,
      headerStats: ["95% messages read", "Fewer no-shows", "Higher guest satisfaction"],
      caseTitle: "3-Step WhatsApp Funnel",
      caseBefore: "Reservation confirmations via email were often missed. Last-minute cancellations didn't get through, empty tables.",
      caseAfter: "Personal WhatsApp reminders keep tables full and guests informed.",
      mobileBefore: "Missed email confirmations, empty tables.",
      mobileAfter: "WhatsApp reminders = full tables, informed guests.",
      implementation: [
        "Step 1: Direct confirmation via WhatsApp with extra info",
        "Step 2: Reminder 4h in advance with cancellation link",
        "Step 3: Follow-up after visit for reviews",
        "95% of messages read within minutes"
      ],
      results: [
        "Significantly fewer no-shows",
        "Higher table occupancy through timely communication",
        "More 5-star reviews through follow-up",
        "Less stress for staff"
      ],
      quote: "Guests no longer forget. A WhatsApp reminder prevents tables from being 'forgotten' and gives guests an easy option to cancel."
    }
  ];

  const competitiveAdvantages = [
    {
      icon: Crown,
      title: "4+ Years Proven Results",
      description: "While others are still catching up, we already have 4+ years of experience with AI-driven appointment automation.",
      mobileDescription: "4+ years experience while others catch up.",
      proof: "10,000+ satisfied businesses"
    },
    {
      icon: Rocket,
      title: "5 Minutes vs 5 Weeks Setup",
      description: "Our competitors need weeks of setup. We get you live in minutes, without technical knowledge.",
      mobileDescription: "Live in minutes, not weeks like competitors.",
      proof: "Average setup: 4.7 minutes"
    },
    {
      icon: Target,
      title: "300% Better Results",
      description: "Independent studies show that our AI converts 3x more inquiries into bookings than other systems.",
      mobileDescription: "3x more bookings than other AI systems.",
      proof: "Verified by 1,000+ case studies"
    }
  ];

  const testimonials = [
    {
      quote: "We tried 3 other booking systems before finding this one. None came even close. This is the only one that actually understands our business.",
      mobileQuote: "Tried 3 others first. None came close. This actually works.",
      author: "Sarah Chen",
      role: "Owner, Wellness Spa",
      result: "+400% bookings",
      rating: 5
    },
    {
      quote: "Switched from Calendly and another AI tool. The difference is night and day - this really works like a real receptionist.",
      mobileQuote: "Switched from Calendly. Night and day difference.",
      author: "Mike Rodriguez", 
      role: "Manager, Auto Repair",
      result: "+250% revenue",
      rating: 5
    },
    {
      quote: "First tried the 'big names'. Wasted months. Should have started here. Best ROI of any business tool I've ever bought.",
      mobileQuote: "Tried big names first. Wasted months. Best ROI ever.",
      author: "Emma Thompson",
      role: "Director, Medical Clinic", 
      result: "+180% efficiency",
      rating: 5
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
    const cleanupAdvantage = setupCarousel(advantageCarouselRef, setActiveAdvantageIndex);
    const cleanupTestimonial = setupCarousel(testimonialCarouselRef, setActiveTestimonialIndex);

    return () => {
      cleanupSector?.();
      cleanupAdvantage?.();
      cleanupTestimonial?.();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Header />
      
      {/* Hero Section - Premium Design */}
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-16 md:py-24 px-3 md:px-4 relative overflow-hidden">
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
            className="text-2xl md:text-5xl xl:text-6xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight"
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
            className="text-sm md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto mb-6 md:mb-8 px-3 sm:px-0 leading-relaxed font-light"
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
                    className="relative aspect-[4/3] cursor-pointer"
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
                        <p className="text-[10px] md:text-[12px] lg:text-[13px] text-slate-300 leading-relaxed">{cardBackContent[index].content}</p>
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
       <ScrollAnimatedSection as="section" className="py-16 md:py-24">
         <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
           <div className="text-center mb-12 md:mb-20">
             <ScrollAnimatedSection delay={100}>
                 <h2 className="text-2xl md:text-5xl font-bold text-white mb-6 md:mb-8 px-3 sm:px-0">
                   WhatsApp vs Traditional Booking
                 </h2>
             </ScrollAnimatedSection>
             <ScrollAnimatedSection delay={200}>
                <p className="text-lg md:text-2xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
                  <span className="md:hidden">Data from thousands of businesses</span>
                  <span className="hidden md:inline">Data-driven comparison across thousands of businesses worldwide</span>
                </p>
             </ScrollAnimatedSection>
           </div>
          
           {/* Desktop: Clean Professional Table */}
           <ScrollAnimatedSection className="hidden md:block backdrop-blur-sm bg-black/20 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.3)] border border-slate-700/20 mb-16 overflow-hidden" delay={300}>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="bg-slate-800/40 border-b border-slate-600/30">
                     <th className="text-left py-6 px-8 text-slate-200 text-lg font-semibold">Metric</th>
                     <th className="text-center py-6 px-8 text-slate-400 text-lg font-semibold">Phone Calls</th>
                     <th className="text-center py-6 px-8 text-slate-400 text-lg font-semibold">Website Forms</th>
                     <th className="text-center py-6 px-8 text-green-400 text-lg font-semibold">WhatsApp</th>
                     <th className="text-center py-6 px-8 text-emerald-400 text-lg font-semibold">Improvement</th>
                   </tr>
                 </thead>
                 <tbody>
                   {whatsappVsTraditionalStats.map((stat, index) => (
                     <tr key={index} className="border-b border-slate-700/20 hover:bg-slate-800/20 transition-colors duration-200">
                       <td className="py-5 px-8 text-white font-medium text-base">{stat.metric}</td>
                       <td className="py-5 px-8 text-center text-slate-300 text-base">{stat.phoneCalls}</td>
                       <td className="py-5 px-8 text-center text-slate-300 text-base">{stat.websiteForms}</td>
                       <td className="py-5 px-8 text-center text-green-400 font-semibold text-base">{stat.whatsapp}</td>
                       <td className="py-5 px-8 text-center text-emerald-400 font-semibold text-base">{stat.improvement}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </ScrollAnimatedSection>

            {/* Mobile: Clean Cards */}
            <div className="md:hidden space-y-4 mb-8">
             {whatsappVsTraditionalStats.slice(0, 3).map((stat, index) => (
                 <ScrollAnimatedSection 
                   key={index} 
                   className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-5 shadow-lg transition-all duration-300"
                   delay={300 + index * 100}
                 >
                   <div className="flex items-center gap-3 mb-4">
                     <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                       <stat.icon className="w-4 h-4 text-slate-300" />
                     </div>
                     <h3 className="text-white font-semibold text-base">{stat.metric}</h3>
                   </div>
                   <div className="space-y-3">
                     <div className="flex justify-between items-center py-2">
                       <span className="text-slate-400 text-sm">Phone Calls</span>
                       <span className="text-slate-300 font-medium">{stat.phoneCalls}</span>
                     </div>
                     <div className="flex justify-between items-center py-2">
                       <span className="text-slate-400 text-sm">Website Forms</span>
                       <span className="text-slate-300 font-medium">{stat.websiteForms}</span>
                     </div>
                     <div className="flex justify-between items-center py-2">
                       <span className="text-green-400 text-sm">WhatsApp</span>
                       <span className="text-green-400 font-semibold">{stat.whatsapp}</span>
                     </div>
                     <div className="flex justify-between items-center py-2 border-t border-slate-600/30 pt-3">
                       <span className="text-emerald-400 text-sm font-medium">Improvement</span>
                       <span className="text-emerald-400 font-semibold">{stat.improvement}</span>
                     </div>
                   </div>
                 </ScrollAnimatedSection>
               ))}
             </div>
         </div>
       </ScrollAnimatedSection>

      {/* Premium Psychological Benefits Section */}
      <ScrollAnimatedSection as="section" className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <ScrollAnimatedSection delay={100}>
              <h2 className="text-2xl md:text-5xl font-bold text-white mb-6 md:mb-8 px-3 sm:px-0">
                Why WhatsApp Works{" "}
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                  <span className="md:hidden">Better</span>
                  <span className="hidden md:inline">Psychologically</span>
                </span>{" "}
                Better
              </h2>
            </ScrollAnimatedSection>
            <ScrollAnimatedSection delay={200}>
              <p className="text-lg md:text-2xl text-slate-300 max-w-4xl mx-auto px-3 sm:px-0">
                <span className="md:hidden">How people feel and behave matters</span>
                <span className="hidden md:inline">It's not just about numbers - it's about how people feel and behave</span>
              </p>
            </ScrollAnimatedSection>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
            {psychologicalBenefits.map((benefit, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-3xl p-6 md:p-10 hover:bg-slate-800/80 hover:border-emerald-500/30 transition-all duration-300 shadow-xl hover:shadow-emerald-500/20"
                delay={300 + index * 150}
              >
                <div className="flex items-start space-x-4 md:space-x-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-3xl flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="w-8 h-8 md:w-10 md:h-10 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-3 md:mb-4">{benefit.title}</h3>
                    <p className="text-slate-300 mb-4 md:mb-6 text-base md:text-lg leading-relaxed">
                      <span className="md:hidden">{benefit.mobileDescription}</span>
                      <span className="hidden md:inline">{benefit.description}</span>
                    </p>
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 text-green-400 px-4 md:px-6 py-2 md:py-3 rounded-full text-sm md:text-base font-bold inline-block shadow-lg">
                      {benefit.stat}
                    </div>
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Detailed Sector Case Studies */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-xl md:text-4xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              <span className="text-green-400">Proven Results</span> Across All Sectors
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Real businesses, dramatic improvements</span>
              <span className="hidden md:inline">In-depth case studies of real businesses that saw dramatic improvements</span>
            </p>
          </div>
          
          {/* Desktop: Vertical layout */}
          <div className="hidden md:block space-y-12">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-green-500/30 transition-all duration-300"
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
                    <div className="border border-slate-700/30 rounded-2xl p-4 h-full bg-slate-800/30">
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

      {/* Competitive Advantages */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-20 bg-slate-800/20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-xl md:text-4xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              Why We're Different From <span className="text-emerald-400">All Others</span>
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Advanced AI that understands your business</span>
              <span className="hidden md:inline">We didn't just build a booking tool. We built the most advanced AI assistant that truly understands your business.</span>
            </p>
          </div>
          
          {/* Desktop: Grid */}
          <div className="hidden md:grid lg:grid-cols-3 gap-8">
            {competitiveAdvantages.map((advantage, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
                  <advantage.icon className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{advantage.title}</h3>
                <p className="text-slate-300 mb-4">{advantage.description}</p>
                <div className="text-emerald-400 font-bold text-sm">
                  {advantage.proof}
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Mobile: Carousel */}
          <div className="md:hidden">
            <div 
              ref={advantageCarouselRef}
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex pb-4">
                {competitiveAdvantages.map((advantage, index) => (
                  <div key={index} className="w-[95vw] flex-none snap-start snap-always px-2">
                    <div className="border border-slate-700/30 rounded-2xl p-4 h-full bg-slate-800/30">
                      <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                        <advantage.icon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white mb-3">{advantage.title}</h3>
                      <p className="text-slate-300 mb-3 text-sm">
                        <span className="md:hidden">{advantage.mobileDescription}</span>
                        <span className="hidden md:inline">{advantage.description}</span>
                      </p>
                      <div className="text-emerald-400 font-bold text-xs">
                        {advantage.proof}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {competitiveAdvantages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleCarouselClick(advantageCarouselRef, index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeAdvantageIndex
                      ? 'bg-emerald-400 w-6'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to advantage ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Social Proof - Testimonials */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-xl md:text-4xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              <span className="md:hidden">Why Businesses Switch To Us</span>
              <span className="hidden md:inline">Why Businesses Switch From Competitors To Us</span>
            </h2>
            <p className="text-sm md:text-xl text-slate-300 px-3 sm:px-0">
              <span className="md:hidden">Tried others first, then found us</span>
              <span className="hidden md:inline">Real stories from businesses that tried others first, and then found us</span>
            </p>
          </div>
          
          {/* Desktop: Grid */}
          <div className="hidden md:grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="border border-slate-700/30 rounded-2xl p-8 hover:border-emerald-500/30 transition-all duration-300"
                delay={index * 150}
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6 italic font-medium">"{testimonial.quote}"</p>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="font-bold text-white">{testimonial.author}</div>
                    <div className="text-slate-400 text-sm">{testimonial.role}</div>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-sm font-bold border border-emerald-500/20">
                    {testimonial.result}
                  </div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Mobile: Carousel */}
          <div className="md:hidden">
            <div 
              ref={testimonialCarouselRef}
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth overscroll-x-contain perfect-snap-carousel"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <div className="flex pb-4">
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-[95vw] flex-none snap-start snap-always px-2">
                    <div className="border border-slate-700/30 rounded-2xl p-4 h-full bg-slate-800/30">
                      <div className="flex gap-1 mb-3">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-slate-300 mb-4 italic font-medium text-sm">
                        "<span className="md:hidden">{testimonial.mobileQuote}</span>
                        <span className="hidden md:inline">{testimonial.quote}</span>"
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <div className="font-bold text-white text-sm">{testimonial.author}</div>
                          <div className="text-slate-400 text-xs">{testimonial.role}</div>
                        </div>
                        <div className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-xs font-bold border border-emerald-500/20">
                          {testimonial.result}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Carousel indicators */}
            <div className="flex justify-center space-x-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleCarouselClick(testimonialCarouselRef, index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeTestimonialIndex
                      ? 'bg-yellow-400 w-6'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Digital Transformation Conclusion */}
      <ScrollAnimatedSection as="section" className="py-6 md:py-20 bg-gradient-to-r from-emerald-500/10 to-green-500/10">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-4 md:mb-16">
            <h2 className="text-lg md:text-4xl font-bold text-white mb-2 md:mb-6 px-3 sm:px-0">
              The Future is <span className="text-green-400">Mobile-First</span>
            </h2>
            <p className="text-xs md:text-xl text-slate-300 max-w-4xl mx-auto leading-relaxed px-3 sm:px-0">
              <span className="md:hidden">WhatsApp beats email: speed, personal touch, better results.</span>
              <span className="hidden md:inline">
                The shift from email to WhatsApp is not temporary - it's part of a broader digital transformation. 
                Consumers expect speed, convenience and personal communication. Businesses that embrace this 
                <strong className="text-emerald-400"> win more customers, retain them longer and grow faster</strong>.
              </span>
            </p>
          </div>
          
          {/* Mobile: Simplified conclusion */}
          <div className="md:hidden text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-3 mx-3">
              <p className="text-xs text-green-300 leading-relaxed">
                WhatsApp = <strong>faster bookings + higher attendance + better results</strong>
              </p>
            </div>
          </div>

          {/* Desktop: Full content */}
          <div className="hidden md:block">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Smartphone className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Mobile-First Behavior</h3>
                <p className="text-slate-300 text-sm md:text-base">People check their phone 96 times per day. WhatsApp fits into their natural behavior.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Zap className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Expectation of Speed</h3>
                <p className="text-slate-300 text-sm md:text-base">Customers expect immediate responses. WhatsApp delivers this, email no longer does.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Heart className="w-6 h-6 md:w-8 md:h-8 text-green-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Personal Connection</h3>
                <p className="text-slate-300 text-sm md:text-base">85% prefer messaging over emails. It feels more personal and trusted.</p>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-2xl p-4 md:p-8 max-w-4xl mx-auto mx-3 md:mx-auto">
                <h3 className="text-lg md:text-2xl font-bold text-white mb-3 md:mb-4">Conclusion in One Sentence</h3>
                <p className="text-sm md:text-xl text-green-300 leading-relaxed">
                  WhatsApp ensures faster confirmation, higher attendance and better business results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <Pricing />
      </ScrollAnimatedSection>
    </div>
  );
};

export default WhyUs;
