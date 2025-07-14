
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
      <section className="py-16 md:py-24 px-3 md:px-4 relative overflow-hidden">
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
            className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight"
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
            className="text-xs md:text-lg lg:text-xl text-slate-300 max-w-4xl mx-auto mb-6 md:mb-8 px-3 sm:px-0 leading-relaxed font-light"
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
                   <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-center mb-6 md:mb-8 bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">
                     WhatsApp vs Traditional Booking
                   </h2>
              </ScrollAnimatedSection>
              <ScrollAnimatedSection delay={200}>
                 <p className="text-base md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
                  <span className="md:hidden">Data from thousands of businesses</span>
                  <span className="hidden md:inline">Data-driven comparison across thousands of businesses worldwide</span>
                </p>
             </ScrollAnimatedSection>
           </div>
          
           {/* Desktop: Premium Professional Table */}
           <ScrollAnimatedSection className="hidden md:block backdrop-blur-sm bg-slate-800/30 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.4),0_16px_32px_rgba(0,0,0,0.25)] border border-slate-600/30 mb-16 overflow-hidden hover:shadow-[0_40px_80px_rgba(0,0,0,0.5)] transition-all duration-500" delay={300}>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                    <tr className="bg-slate-800/50 border-b border-slate-600/40">
                      <th className="text-left py-4 px-10 text-slate-100 text-xl font-bold tracking-tight">Metric</th>
                      <th className="text-center py-4 px-10 text-slate-400 text-xl font-bold tracking-tight">Phone Calls</th>
                      <th className="text-center py-4 px-10 text-slate-400 text-xl font-bold tracking-tight">Website Forms</th>
                      <th className="text-center py-4 px-10 text-green-400 text-xl font-bold tracking-tight">WhatsApp</th>
                      <th className="text-center py-4 px-10 text-emerald-400 text-xl font-bold tracking-tight">Improvement</th>
                    </tr>
                 </thead>
                 <tbody>
                   {whatsappVsTraditionalStats.map((stat, index) => (
                      <tr key={index} className={`border-b border-slate-700/30 hover:bg-slate-800/30 transition-all duration-300 ${index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'}`}>
                        <td className="py-4 px-10 text-white font-semibold text-lg tracking-tight">{stat.metric}</td>
                        <td className="py-4 px-10 text-center text-slate-300 text-lg font-medium">{stat.phoneCalls}</td>
                        <td className="py-4 px-10 text-center text-slate-300 text-lg font-medium">{stat.websiteForms}</td>
                        <td className="py-4 px-10 text-center text-green-400 font-bold text-lg">{stat.whatsapp}</td>
                        <td className="py-4 px-10 text-center text-emerald-400 font-bold text-lg">{stat.improvement}</td>
                      </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </ScrollAnimatedSection>

            {/* Mobile: Premium Cards */}
            <div className="md:hidden space-y-5 mb-8">
             {whatsappVsTraditionalStats.slice(0, 3).map((stat, index) => (
                 <ScrollAnimatedSection 
                   key={index} 
                   className="bg-slate-800/40 border border-slate-600/40 rounded-2xl p-6 shadow-[0_16px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-300"
                   delay={300 + index * 100}
                 >
                   <div className="flex items-center gap-4 mb-5">
                     <div className="w-10 h-10 bg-slate-700/60 rounded-xl flex items-center justify-center border border-slate-600/50">
                       <stat.icon className="w-5 h-5 text-slate-200" />
                     </div>
                     <h3 className="text-white font-bold text-lg tracking-tight">{stat.metric}</h3>
                   </div>
                   <div className="space-y-4">
                     <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                       <span className="text-slate-400 text-base font-medium">Phone Calls</span>
                       <span className="text-slate-300 font-semibold text-base">{stat.phoneCalls}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                       <span className="text-slate-400 text-base font-medium">Website Forms</span>
                       <span className="text-slate-300 font-semibold text-base">{stat.websiteForms}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                       <span className="text-green-400 text-base font-medium">WhatsApp</span>
                       <span className="text-green-400 font-bold text-base">{stat.whatsapp}</span>
                     </div>
                     <div className="flex justify-between items-center py-3 pt-4">
                       <span className="text-emerald-400 text-base font-bold">Improvement</span>
                       <span className="text-emerald-400 font-bold text-base">{stat.improvement}</span>
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
              <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-white mb-6 md:mb-8 px-3 sm:px-0">
                Why WhatsApp Works{" "}
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                  <span className="md:hidden">Better</span>
                  <span className="hidden md:inline">Psychologically</span>
                </span>{" "}
                Better
              </h2>
            </ScrollAnimatedSection>
            <ScrollAnimatedSection delay={200}>
              <p className="text-base md:text-xl text-slate-300 max-w-4xl mx-auto px-3 sm:px-0">
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
                {/* Ultra-Premium Card Container with Advanced Glassmorphism */}
                <div className="relative p-5 md:p-7 rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-slate-800/40 via-slate-900/30 to-slate-800/20 border border-slate-600/20 shadow-[0_32px_64px_rgba(0,0,0,0.3),0_16px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-700 ease-out hover:shadow-[0_48px_96px_rgba(16,185,129,0.15),0_24px_48px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(16,185,129,0.2)] hover:border-emerald-400/30 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-900/40 hover:to-emerald-900/10 transform hover:scale-[1.02] hover:-translate-y-2">
                  
                  {/* Luxury Accent Border */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-transparent to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10 blur-xl"></div>
                  
                  {/* Premium Content Layout */}
                  <div className="flex items-start space-x-4 md:space-x-6">
                    {/* Executive-Grade Icon Container */}
                    <div className="relative w-20 h-20 md:w-24 md:h-24 flex-shrink-0">
                      {/* Sophisticated Background with Multiple Layers */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-emerald-400/15 to-emerald-600/20 rounded-2xl shadow-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500"></div>
                      <div className="absolute inset-1 bg-gradient-to-tr from-slate-800/60 to-slate-700/40 rounded-xl backdrop-blur-sm"></div>
                      <div className="relative w-full h-full flex items-center justify-center">
                        <benefit.icon className="w-10 h-10 md:w-12 md:h-12 text-emerald-400 drop-shadow-lg group-hover:text-emerald-300 transition-all duration-500" />
                      </div>
                      {/* Subtle Glow Effect */}
                      <div className="absolute inset-0 bg-emerald-400/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-700"></div>
                    </div>
                    
                    {/* Premium Content Container */}
                    <div className="flex-1 space-y-3 md:space-y-4">
                      {/* Executive Headline with Sophisticated Typography */}
                      <h3 className="text-2xl md:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-white via-slate-100 to-emerald-100 bg-clip-text text-transparent leading-tight tracking-tight">
                        {benefit.title}
                      </h3>
                      
                      {/* Refined Description with Enhanced Readability */}
                      <p className="text-slate-300 text-lg md:text-xl leading-relaxed font-light tracking-wide">
                        <span className="md:hidden">{benefit.mobileDescription}</span>
                        <span className="hidden md:inline">{benefit.description}</span>
                      </p>
                      
                      {/* Premium Statistics Badge */}
                      <div className="inline-flex items-center">
                        <div className="relative group/badge">
                          {/* Sophisticated Badge Background */}
                          <div className="bg-gradient-to-r from-emerald-500/20 via-emerald-400/25 to-emerald-500/20 backdrop-blur-xl border border-emerald-400/40 rounded-full px-6 md:px-8 py-3 md:py-4 shadow-2xl shadow-emerald-500/20">
                            <span className="text-emerald-300 font-bold text-base md:text-lg tracking-wide">
                              {benefit.stat}
                            </span>
                          </div>
                          {/* Advanced Glow Animation */}
                          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-emerald-500/30 rounded-full blur-lg opacity-0 group-hover/badge:opacity-70 transition-all duration-500 -z-10"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle Premium Accent Lines */}
                  <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"></div>
                  <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent"></div>
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
            <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              <span className="text-green-400">Proven Results</span> Across All Sectors
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Real businesses, dramatic improvements</span>
              <span className="hidden md:inline">In-depth case studies of real businesses that saw dramatic improvements</span>
            </p>
          </div>
          
          {/* Desktop: Ultra-Premium Floating Cards */}
          <div className="hidden md:block space-y-16">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="group relative"
                delay={index * 200}
              >
                {/* Ultra-Premium Glassmorphism Card */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-800/90 backdrop-blur-2xl border border-slate-600/40 hover:border-emerald-400/50 transition-all duration-700 ease-out p-12 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_32px_64px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.05)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.15),0_40px_80px_rgba(0,0,0,0.3),0_0_0_1px_rgba(16,185,129,0.2)] hover:scale-[1.02] transform-gpu">
                  
                  {/* Sophisticated Background Pattern */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.08),transparent_50%)]"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_48%,rgba(16,185,129,0.03)_49%,rgba(16,185,129,0.03)_51%,transparent_52%)] bg-[length:8px_8px]"></div>
                  </div>

                  {/* Premium Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-600/5 opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>

                  {/* Floating Accent Elements */}
                  <div className="absolute -top-1 -left-1 w-24 h-24 bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-700"></div>
                  <div className="absolute -bottom-1 -right-1 w-32 h-32 bg-gradient-to-tl from-emerald-500/15 to-emerald-400/5 rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"></div>

                  <div className="relative z-10">
                    <div className="grid lg:grid-cols-3 gap-12">
                      {/* Luxury Header Section */}
                      <div className="lg:col-span-3">
                        <div className="flex items-center space-x-6 mb-8">
                          {/* Elite Icon Container */}
                          <div className="relative">
                            <div className="w-20 h-20 bg-gradient-to-br from-emerald-500/20 via-emerald-400/15 to-emerald-600/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-emerald-400/30 shadow-[0_8px_32px_rgba(16,185,129,0.15)]">
                              <study.icon className="w-10 h-10 text-emerald-300" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500"></div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-3xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent mb-3 tracking-tight">
                              {study.sector}
                            </h3>
                            <div className="flex flex-wrap gap-4">
                              {study.headerStats.map((stat, idx) => (
                                <div key={idx} className="relative group/stat">
                                  <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 via-emerald-400/15 to-emerald-500/20 backdrop-blur-xl rounded-full border border-emerald-400/30 shadow-lg">
                                    <span className="text-emerald-300 font-semibold text-sm tracking-wide">{stat}</span>
                                  </div>
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 to-emerald-500/30 rounded-full blur-md opacity-0 group-hover/stat:opacity-50 transition-opacity duration-300"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Executive Case Study Panel */}
                      <div className="space-y-8">
                        <div className="relative">
                          <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-600/10 rounded-2xl blur-xl opacity-50"></div>
                          <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/40">
                            <h4 className="text-xl font-bold text-white mb-6 tracking-tight">{study.caseTitle}</h4>
                            <div className="space-y-6">
                              <div className="relative">
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-2 h-2 bg-red-400 rounded-full shadow-lg shadow-red-400/50"></div>
                                  <span className="text-red-300 font-semibold text-sm uppercase tracking-widest">Before</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed pl-5 border-l border-slate-600/40">{study.caseBefore}</p>
                              </div>
                              <div className="relative">
                                <div className="flex items-center space-x-3 mb-3">
                                  <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"></div>
                                  <span className="text-emerald-300 font-semibold text-sm uppercase tracking-widest">After</span>
                                </div>
                                <p className="text-slate-200 leading-relaxed pl-5 border-l border-emerald-400/40">{study.caseAfter}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sophisticated Implementation Panel */}
                      <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-600/10 via-transparent to-emerald-500/10 rounded-2xl blur-xl opacity-50"></div>
                        <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/40">
                          <h4 className="text-xl font-bold text-white mb-6 tracking-tight">Implementation</h4>
                          <div className="space-y-4">
                            {study.implementation.map((item, idx) => (
                              <div key={idx} className="flex items-start space-x-4 group/item">
                                <div className="relative mt-1">
                                  <CheckCircle className="w-5 h-5 text-emerald-400 group-hover/item:text-emerald-300 transition-colors duration-300" />
                                  <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-md opacity-0 group-hover/item:opacity-50 transition-opacity duration-300"></div>
                                </div>
                                <span className="text-slate-200 leading-relaxed group-hover/item:text-white transition-colors duration-300">{item}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Premium Results Panel */}
                      <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 via-transparent to-emerald-400/10 rounded-2xl blur-xl opacity-50"></div>
                        <div className="relative bg-slate-800/60 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/40">
                          <h4 className="text-xl font-bold text-white mb-6 tracking-tight">Results</h4>
                          <div className="space-y-4 mb-8">
                            {study.results.map((result, idx) => (
                              <div key={idx} className="flex items-start space-x-4 group/result">
                                <div className="relative mt-1">
                                  <TrendingUp className="w-5 h-5 text-emerald-400 group-hover/result:text-emerald-300 transition-colors duration-300" />
                                  <div className="absolute inset-0 bg-emerald-400/30 rounded-full blur-md opacity-0 group-hover/result:opacity-50 transition-opacity duration-300"></div>
                                </div>
                                <span className="text-emerald-300 font-medium leading-relaxed group-hover/result:text-emerald-200 transition-colors duration-300">{result}</span>
                              </div>
                            ))}
                          </div>
                          
                          {/* Executive Quote Container */}
                          <div className="relative">
                            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 rounded-xl blur-lg opacity-70"></div>
                            <div className="relative bg-gradient-to-br from-slate-700/80 to-slate-800/90 backdrop-blur-xl rounded-xl p-6 border-l-4 border-emerald-400 shadow-[0_8px_32px_rgba(16,185,129,0.1)]">
                              <div className="flex items-start space-x-4">
                                <div className="w-8 h-6 text-emerald-400/60 flex-shrink-0">
                                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                                  </svg>
                                </div>
                                <p className="text-slate-200 italic leading-relaxed font-medium">{study.quote}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Luxury Border Accents */}
                  <div className="absolute top-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
                  <div className="absolute bottom-0 left-12 right-12 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
                  <div className="absolute left-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent"></div>
                  <div className="absolute right-0 top-12 bottom-12 w-px bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent"></div>
                </div>
              </ScrollAnimatedSection>
            ))}
          </div>

          {/* Mobile: Ultra-Premium Floating Cards Carousel */}
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
              <div className="flex pb-6">
                {sectorCaseStudies.map((study, index) => (
                  <div key={index} className="w-[95vw] flex-none snap-start snap-always px-3">
                    {/* Ultra-Premium Mobile Glassmorphism Card */}
                    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800/90 via-slate-900/95 to-slate-800/90 backdrop-blur-2xl border border-slate-600/40 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.3),0_24px_48px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.05)] h-full">
                      
                      {/* Sophisticated Mobile Background Pattern */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.1),transparent_50%)]"></div>
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(16,185,129,0.08),transparent_50%)]"></div>
                      </div>

                      {/* Premium Mobile Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-600/5 opacity-50"></div>

                      {/* Mobile Floating Accent Elements */}
                      <div className="absolute -top-1 -left-1 w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 rounded-full blur-xl opacity-60"></div>
                      <div className="absolute -bottom-1 -right-1 w-20 h-20 bg-gradient-to-tl from-emerald-500/15 to-emerald-400/5 rounded-full blur-2xl opacity-40"></div>

                      <div className="relative z-10">
                        {/* Luxury Mobile Header */}
                        <div className="flex items-center space-x-4 mb-6">
                          {/* Elite Mobile Icon Container */}
                          <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 via-emerald-400/15 to-emerald-600/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-emerald-400/30 shadow-[0_4px_16px_rgba(16,185,129,0.15)]">
                              <study.icon className="w-8 h-8 text-emerald-300" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 rounded-xl blur-md opacity-30"></div>
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-white via-emerald-100 to-white bg-clip-text text-transparent mb-2 tracking-tight">
                              {study.sector}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {study.headerStats.map((stat, idx) => (
                                <div key={idx} className="relative">
                                  <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-500/20 via-emerald-400/15 to-emerald-500/20 backdrop-blur-xl rounded-full border border-emerald-400/30 shadow-md">
                                    <span className="text-emerald-300 font-semibold text-xs tracking-wide">{stat}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Executive Mobile Case Study */}
                        <div className="mb-6">
                          <h4 className="text-lg font-bold text-white mb-4 tracking-tight">{study.caseTitle}</h4>
                          <div className="space-y-4 text-sm">
                            <div className="relative">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-red-400 rounded-full shadow-md shadow-red-400/50"></div>
                                <span className="text-red-300 font-semibold text-xs uppercase tracking-widest">Before</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed pl-4 border-l border-slate-600/40">{study.mobileBefore}</p>
                            </div>
                            <div className="relative">
                              <div className="flex items-center space-x-2 mb-2">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-md shadow-emerald-400/50"></div>
                                <span className="text-emerald-300 font-semibold text-xs uppercase tracking-widest">After</span>
                              </div>
                              <p className="text-slate-200 leading-relaxed pl-4 border-l border-emerald-400/40">{study.mobileAfter}</p>
                            </div>
                          </div>
                        </div>

                        {/* Premium Mobile Quote Container */}
                        <div className="relative">
                          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400/20 to-emerald-600/20 rounded-xl blur-lg opacity-50"></div>
                          <div className="relative bg-gradient-to-br from-slate-700/80 to-slate-800/90 backdrop-blur-xl rounded-xl p-4 border-l-3 border-emerald-400 shadow-[0_4px_16px_rgba(16,185,129,0.1)]">
                            <div className="flex items-start space-x-3">
                              <div className="w-6 h-4 text-emerald-400/60 flex-shrink-0 mt-0.5">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                                </svg>
                              </div>
                              <p className="text-slate-200 italic leading-relaxed text-sm font-medium">"{study.quote}"</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Luxury Mobile Border Accents */}
                      <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
                      <div className="absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Premium Carousel Indicators */}
            <div className="flex justify-center space-x-3 mt-6">
              {sectorCaseStudies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleCarouselClick(sectorCarouselRef, index)}
                  className={`relative transition-all duration-500 ${
                    index === activeSectorIndex
                      ? 'w-8 h-3'
                      : 'w-3 h-3 hover:w-4'
                  }`}
                  aria-label={`Go to case study ${index + 1}`}
                >
                  <div className={`w-full h-full rounded-full transition-all duration-500 ${
                    index === activeSectorIndex
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-lg shadow-emerald-400/50'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}></div>
                  {index === activeSectorIndex && (
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full blur-md opacity-60"></div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollAnimatedSection>

      {/* Competitive Advantages */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-16">
            <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
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
            <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
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
      <ScrollAnimatedSection as="section" className="py-6 md:py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-4 md:mb-16">
            <h2 className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold text-white mb-2 md:mb-6 px-3 sm:px-0">
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
