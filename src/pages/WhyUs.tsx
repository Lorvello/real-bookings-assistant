import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import Testimonials from '@/components/ui/testimonials-columns-1';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { useVoiceflowChatbot } from '@/hooks/useVoiceflowChatbot';

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
  const { t } = useTranslation('whyUs');
  useVoiceflowChatbot();
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
    setIsMobileFirstMethodologyModalOpen(true);
  };
  const closeMobileFirstMethodologyModal = () => {
    setIsMobileFirstMethodologyModalOpen(false);
  };

  const proofPoints = [
    {
      number: "24/7",
      label: t('whyus.proof.p1Label', "Always taking bookings"),
      icon: Users
    },
    {
      number: "0",
      label: t('whyus.proof.p2Label', "Apps to install"),
      icon: Calendar
    },
    {
      number: "30sec",
      label: t('whyus.proof.p3Label', "Average Response"),
      icon: TrendingUp
    },
    {
      number: "Auto",
      label: t('whyus.proof.p4Label', "Reminders that cut no-shows"),
      icon: Shield
    }
  ];

  const whatsappVsTraditionalStats = [
    {
      metric: t('whyus.compareStats.s1Metric', "Response Time"),
      phoneCalls: t('whyus.compareStats.s1Phone', "24-48 hours"),
      websiteForms: t('whyus.compareStats.s1Web', "12-24 hours"),
      whatsapp: t('whyus.compareStats.s1Wa', "Under 30 seconds"),
      improvement: t('whyus.compareStats.s1Imp', "15x faster"),
      icon: Clock
    },
    {
      metric: t('whyus.compareStats.s2Metric', "Availability"),
      phoneCalls: t('whyus.compareStats.s2Phone', "Business hours only"),
      websiteForms: t('whyus.compareStats.s2Web', "24/7 but delays"),
      whatsapp: t('whyus.compareStats.s2Wa', "Instant 24/7"),
      improvement: t('whyus.compareStats.s2Imp', "Always available"),
      icon: Shield
    },
    {
      metric: t('whyus.compareStats.s3Metric', "Booking Completion"),
      phoneCalls: t('whyus.compareStats.s3Phone', "~25%"),
      websiteForms: t('whyus.compareStats.s3Web', "~15%"),
      whatsapp: t('whyus.compareStats.s3Wa', "85-95%"),
      improvement: t('whyus.compareStats.s3Imp', "3x higher success"),
      icon: Target
    },
    {
      metric: t('whyus.compareStats.s4Metric', "Customer Satisfaction"),
      phoneCalls: t('whyus.compareStats.s4Phone', "~60%"),
      websiteForms: t('whyus.compareStats.s4Web', "~45%"),
      whatsapp: t('whyus.compareStats.s4Wa', "95%+"),
      improvement: t('whyus.compareStats.s4Imp', "40% improvement"),
      icon: Heart
    },
    {
      metric: t('whyus.compareStats.s5Metric', "No-Show Rate"),
      phoneCalls: t('whyus.compareStats.s5Phone', "~35%"),
      websiteForms: t('whyus.compareStats.s5Web', "~40%"),
      whatsapp: t('whyus.compareStats.s5Wa', "<20%"),
      improvement: t('whyus.compareStats.s5Imp', "50% reduction"),
      icon: UserCheck
    }
  ];

  const psychologicalBenefits = [
    {
      icon: Heart,
      title: t('whyus.psychBenefits.b1Title', "Personal Touch"),
      description: t('whyus.psychBenefits.b1Desc', "85% of consumers prefer messaging a business over emailing. WhatsApp creates a personal, trusted connection that email simply can't match."),
      mobileDescription: t('whyus.psychBenefits.b1Mobile', "85% prefer messaging - more personal and trusted than email communication."),
    },
    {
      icon: Brain,
      title: t('whyus.psychBenefits.b2Title', "Lower Threshold"),
      description: t('whyus.psychBenefits.b2Desc', "53% of customers are more likely to purchase from businesses reachable via chat. It feels less formal and more approachable than email."),
      mobileDescription: t('whyus.psychBenefits.b2Mobile', "53% more likely to buy from chat-enabled businesses - less formal barrier."),
    },
    {
      icon: Smartphone,
      title: t('whyus.psychBenefits.b3Title', "Mobile-First Behavior"),
      description: t('whyus.psychBenefits.b3Desc', "People check their phone 96 times per day. WhatsApp seamlessly integrates into their natural mobile behavior patterns."),
      mobileDescription: t('whyus.psychBenefits.b3Mobile', "96x daily phone checks - WhatsApp fits natural mobile habits."),
    },
    {
      icon: Zap,
      title: t('whyus.psychBenefits.b4Title', "Real-time Interaction"),
      description: t('whyus.psychBenefits.b4Desc', "Two-way communication flows naturally in one conversation. Customers can instantly ask questions, confirm details, or request changes."),
      mobileDescription: t('whyus.psychBenefits.b4Mobile', "Instant two-way communication - ask, confirm, change in real-time."),
    }
  ];

  const sectorCaseStudies = [
    {
      sector: t('whyus.caseStudies.s1Sector', "Healthcare & Medical"),
      icon: Shield,
      headerStats: [t('whyus.caseStudies.s1Stat1', "75% less phone time"), t('whyus.caseStudies.s1Stat2', "50% fewer no-shows"), t('whyus.caseStudies.s1Stat3', "24/7 availability")],
      caseTitle: "Dr. Martinez Family Practice",
      caseBefore: t('whyus.caseStudies.s1Before', "Receptionists spent 3+ hours daily playing phone tag - patients calling during busy hours, getting voicemail, calling back repeatedly. Manual appointment book checking during calls caused 2-3 minute holds. Double bookings happened weekly."),
      caseAfter: t('whyus.caseStudies.s1After', "WhatsApp automation handles bookings instantly 24/7. Staff focus on patient care instead of answering phones. Zero double bookings with real-time calendar sync."),
      mobileBefore: t('whyus.caseStudies.s1MobileBefore', "3hrs daily phone tag, manual scheduling, double bookings weekly."),
      mobileAfter: t('whyus.caseStudies.s1MobileAfter', "24/7 instant booking, zero phone tag, no scheduling conflicts."),
      implementation: [
        t('whyus.caseStudies.s1Impl1', "24/7 WhatsApp booking bot with calendar integration"),
        t('whyus.caseStudies.s1Impl2', "Automated reminders 24h + 2h before appointments"),
        t('whyus.caseStudies.s1Impl3', "Instant confirmations with appointment details"),
        t('whyus.caseStudies.s1Impl4', "Easy rescheduling without calling office")
      ],
      results: [
        t('whyus.caseStudies.s1Res1', "3 hours/day staff time saved on phone calls"),
        t('whyus.caseStudies.s1Res2', "50% reduction in no-shows with WhatsApp reminders"),
        t('whyus.caseStudies.s1Res3', "35% more bookings from after-hours availability"),
        t('whyus.caseStudies.s1Res4', "Zero double bookings with automated calendar sync")
      ],
      quote: t('whyus.caseStudies.s1Quote', "Our staff used to spend half their day answering the same booking questions. Now they can focus on what matters - taking care of patients.")
    },
    {
      sector: t('whyus.caseStudies.s2Sector', "Beauty & Wellness"),
      icon: Star,
      headerStats: [t('whyus.caseStudies.s2Stat1', "4x more after-hours bookings"), t('whyus.caseStudies.s2Stat2', "65% staff time savings"), t('whyus.caseStudies.s2Stat3', "40% fewer no-shows")],
      caseTitle: "Bella Vista Hair & Beauty Studio",
      caseBefore: t('whyus.caseStudies.s2Before', "Walk-in only policy caused 30+ minute wait times and lost customers. Staff interrupted treatments to answer booking calls. Lost 60% of calls during busy periods when stylists couldn't answer phones."),
      caseAfter: t('whyus.caseStudies.s2After', "WhatsApp booking captures clients anytime. Staff work uninterrupted. Revenue increased 45% from previously missed opportunities."),
      mobileBefore: t('whyus.caseStudies.s2MobileBefore', "Walk-ins only, 30min waits, 60% missed calls during treatments."),
      mobileAfter: t('whyus.caseStudies.s2MobileAfter', "24/7 booking, no interruptions, 45% revenue increase."),
      implementation: [
        t('whyus.caseStudies.s2Impl1', "Intelligent WhatsApp bot understanding beauty services"),
        t('whyus.caseStudies.s2Impl2', "Real-time stylist availability checking"),
        t('whyus.caseStudies.s2Impl3', "Automated appointment confirmations with prep instructions"),
        t('whyus.caseStudies.s2Impl4', "Smart reminder system reducing no-shows")
      ],
      results: [
        t('whyus.caseStudies.s2Res1', "4x more bookings from after-hours WhatsApp availability"),
        t('whyus.caseStudies.s2Res2', "65% reduction in time spent on phone bookings"),
        t('whyus.caseStudies.s2Res3', "40% fewer no-shows with personalized WhatsApp reminders"),
        t('whyus.caseStudies.s2Res4', "45% revenue increase from captured missed opportunities")
      ],
      quote: t('whyus.caseStudies.s2Quote', "Before, we lost so many clients who called during treatments and got no answer. Now WhatsApp works 24/7 and books them instantly.")
    },
    {
      sector: t('whyus.caseStudies.s3Sector', "Professional Services"),
      icon: Users,
      headerStats: [t('whyus.caseStudies.s3Stat1', "85% faster scheduling"), t('whyus.caseStudies.s3Stat2', "24/7 availability"), t('whyus.caseStudies.s3Stat3', "3x response rates")],
      caseTitle: "Thompson Legal Associates",
      caseBefore: t('whyus.caseStudies.s3Before', "Consultation scheduling took 4-6 phone calls per client - attorney availability checks, court schedule conflicts, client callback loops. Receptionists spent 40% of their time on booking coordination."),
      caseAfter: t('whyus.caseStudies.s3After', "WhatsApp bot handles complex scheduling instantly, syncing with attorney calendars and court dates. Clients book preferred times without phone tag."),
      mobileBefore: t('whyus.caseStudies.s3MobileBefore', "4-6 calls per booking, 40% receptionist time on scheduling."),
      mobileAfter: t('whyus.caseStudies.s3MobileAfter', "Instant booking with calendar sync, no phone tag needed."),
      implementation: [
        t('whyus.caseStudies.s3Impl1', "Advanced WhatsApp bot with attorney calendar integration"),
        t('whyus.caseStudies.s3Impl2', "Court schedule conflict checking"),
        t('whyus.caseStudies.s3Impl3', "Automated consultation prep and document requests"),
        t('whyus.caseStudies.s3Impl4', "Client portal links sent automatically")
      ],
      results: [
        t('whyus.caseStudies.s3Res1', "85% faster consultation scheduling process"),
        t('whyus.caseStudies.s3Res2', "3x higher client response rates vs phone calls"),
        t('whyus.caseStudies.s3Res3', "60% reduction in scheduling-related staff time"),
        t('whyus.caseStudies.s3Res4', "24/7 availability increasing bookings by 30%")
      ],
      quote: t('whyus.caseStudies.s3Quote', "Legal scheduling is complex - court dates, attorney availability, client conflicts. WhatsApp automation handles it all instantly while we focus on cases.")
    },
    {
      sector: t('whyus.caseStudies.s4Sector', "Fitness & Training"),
      icon: Award,
      headerStats: [t('whyus.caseStudies.s4Stat1', "50% more PT sessions"), t('whyus.caseStudies.s4Stat2', "24/7 booking"), t('whyus.caseStudies.s4Stat3', "90% less no-shows")],
      caseTitle: "FitCore Personal Training Center",
      caseBefore: t('whyus.caseStudies.s4Before', "Phone bookings only during gym hours (6am-10pm). Clients forgot sessions without reminders. Manual scheduling caused trainer conflicts. Lost revenue from missed calls during training sessions."),
      caseAfter: t('whyus.caseStudies.s4After', "WhatsApp enables 24/7 booking with trainer availability sync. Automated reminders cut no-shows to under 10%. Revenue up 50% from better booking capture."),
      mobileBefore: t('whyus.caseStudies.s4MobileBefore', "Limited phone hours, forgotten sessions, trainer conflicts, missed calls."),
      mobileAfter: t('whyus.caseStudies.s4MobileAfter', "24/7 booking, auto reminders, conflict-free scheduling, 50% revenue boost."),
      implementation: [
        t('whyus.caseStudies.s4Impl1', "Smart WhatsApp bot with trainer schedule integration"),
        t('whyus.caseStudies.s4Impl2', "Automatic session reminders with prep tips"),
        t('whyus.caseStudies.s4Impl3', "Easy session rescheduling without phone calls"),
        t('whyus.caseStudies.s4Impl4', "Payment links and membership renewals via chat")
      ],
      results: [
        t('whyus.caseStudies.s4Res1', "50% increase in personal training session bookings"),
        t('whyus.caseStudies.s4Res2', "90% reduction in no-shows with WhatsApp reminders"),
        t('whyus.caseStudies.s4Res3', "24/7 booking availability vs 16 hours phone coverage"),
        t('whyus.caseStudies.s4Res4', "Zero scheduling conflicts with automated calendar sync")
      ],
      quote: t('whyus.caseStudies.s4Quote', "Personal training relies on consistent sessions. WhatsApp reminders and easy rescheduling keep clients engaged and trainers' calendars full.")
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
      title: t('whyus.cardBack.c1Title', "Always taking bookings"),
      content: t('whyus.cardBack.c1Content', "Your assistant answers on WhatsApp around the clock, so customers can book, reschedule or cancel at any hour, even when you are closed. Every request is captured instead of lost to a missed call or a full voicemail.")
    },
    {
      title: t('whyus.cardBack.c2Title', "No app to install"),
      content: t('whyus.cardBack.c2Content', "Customers book in the WhatsApp they already use every day, so there is nothing to download and no account to create. That lower threshold means more requests actually turn into booked appointments.")
    },
    {
      title: t('whyus.cardBack.c3Title', "30sec Average Response"),
      content: t('whyus.cardBack.c3Content', "While traditional booking methods take minutes or hours, our AI responds instantly to customer inquiries. This includes understanding context, checking availability, and confirming appointments - all in under 30 seconds on average.")
    },
    {
      title: t('whyus.cardBack.c4Title', "Reminders that cut no-shows"),
      content: t('whyus.cardBack.c4Content', "Automatic WhatsApp reminders and one-tap rescheduling make it easy for customers to keep or move an appointment instead of just not turning up. Because people actually read WhatsApp, the reminders land where email often doesn't.")
    }
  ];

  // Psychological benefits back side content
  const psychBackContent = [
    t('whyus.psychBack.pb1', "Psychology research from Dr. Sherry Turkle at MIT reveals that messaging feels like 'being heard' rather than 'being processed.' Businesses report customers share more personal details via WhatsApp, creating genuine relationships. One salon owner noted: 'Clients text me like a friend, not a service provider.'"),
    t('whyus.psychBack.pb2', "Behavioral economics shows messaging removes 'email anxiety' - the fear of formal communication. Customers admit they delay emailing businesses but message instantly. Case study: A dental practice saw 340% more appointment requests when switching from email forms to WhatsApp chat."),
    t('whyus.psychBack.pb3', "Anthropological studies show phones are 'digital extensions of self.' WhatsApp integrates into daily rituals - checking messages while commuting, during breaks, before sleep. Unlike emails buried in inboxes, WhatsApp messages demand immediate attention through our ingrained behavioral patterns."),
    t('whyus.psychBack.pb4', "Cognitive research proves immediate responses trigger dopamine release, creating positive associations with your brand. Customers describe WhatsApp booking as 'effortless' and 'natural.' One restaurant owner shared: 'Customers book tables mid-conversation with friends - it's seamless.'")
  ];


  return (
    <PublicPageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
        <Header />
      
      {/* Hero Section - Premium Design */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-3 md:px-4 relative overflow-hidden">
        {/* Refined ambient background: two restrained emerald glows + a soft central wash (calmer = more premium) */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-56 h-56 md:w-80 md:h-80 bg-gradient-to-br from-emerald-600/12 to-emerald-500/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-[26rem] md:h-[26rem] bg-gradient-to-tl from-emerald-500/12 to-emerald-600/5 rounded-full blur-[120px]"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[420px] bg-gradient-to-r from-emerald-700/8 via-transparent to-emerald-600/8 rounded-full blur-[140px]"></div>
        </div>

        {/* Single fine grid, masked to fade toward the edges for a more intentional, high-end canvas */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16_185_129,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16_185_129,0.04)_1px,transparent_1px)] bg-[size:36px_36px] md:bg-[size:72px_72px] opacity-50 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)] [-webkit-mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
          {/* Floating Badge */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={0}
            as="div" 
            className="mb-6 md:mb-8"
          >
            <div className="hidden md:inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium tracking-wide">{t('whyus.hero.badge', 'Proven Results')}</span>
            </div>
            <div className="md:hidden inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></div>
              <span className="text-emerald-300 text-xs font-medium tracking-wide">{t('whyus.hero.badge', 'Proven Results')}</span>
            </div>
          </ScrollAnimatedSection>

          {/* Premium Main Heading */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={200}
            as="h1" 
            className="text-3xl md:text-4xl xl:text-5xl font-bold mb-6 md:mb-8 -mx-3 md:mx-0 tracking-tight"
          >
            <span className="hidden md:inline bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
              {t('whyus.hero.titleWhy', 'Why ')}
            </span>
            <span className="md:hidden bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
              {t('whyus.hero.titleWhy', 'Why ')}
            </span>
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
              {t('whyus.hero.titleAccent', 'Appointment Businesses')}
            </span>
            <div className="md:hidden h-0"></div>
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
              {t('whyus.hero.titleChoose', ' Choose WhatsApp')}
            </span>
          </ScrollAnimatedSection>

          {/* Enhanced Subtitle */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            delay={400}
            as="p" 
            className="text-xs md:text-lg text-slate-300 max-w-4xl mx-auto mb-6 md:mb-8 px-3 sm:px-0 leading-relaxed font-light"
          >
            {t('whyus.hero.subtitle', '95% higher response rates vs phone calls, 18x faster than web forms, 50% fewer no-shows than manual booking.')}
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
                       className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 md:p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] hover:scale-[1.02] transform transition-all duration-500 group"
                       style={{
                         backfaceVisibility: 'hidden'
                       }}
                     >
                        {/* Small corner button */}
                         <div className="absolute top-1.5 right-1.5 text-[8px] md:text-[9px] text-slate-500 group-hover:text-emerald-400 transition-colors duration-200 flex items-center gap-0.5">
                           {t('whyus.hero.learnMore', 'Learn more')}
                           <ArrowRight className="w-2 h-2 md:w-2.5 md:h-2.5" />
                         </div>
                        
                        <div className="w-8 h-8 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500/30 to-green-500/30 rounded-2xl flex items-center justify-center mb-3 md:mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                          <stat.icon className="w-4 h-4 md:w-8 md:h-8 text-emerald-300 group-hover:text-emerald-200 transition-colors duration-300" />
                        </div>
                        <div className="text-xl md:text-2xl xl:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-2 md:mb-3 group-hover:from-emerald-300 group-hover:to-green-300 transition-all duration-300">
                          {stat.number}
                        </div>
                        <div className="text-[9px] md:text-sm font-semibold text-slate-300 group-hover:text-slate-200 transition-colors duration-300 leading-tight">{stat.label}</div>
                     </div>
                    
                     {/* Back Side */}
                     <div 
                       className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3 md:p-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] transform transition-all duration-500 flex flex-col justify-center"
                       style={{
                         backfaceVisibility: 'hidden',
                         transform: 'rotateY(180deg)'
                       }}
                     >
                       <div className="text-left">
                         <p className="text-[8px] md:text-[12px] lg:text-[13px] text-slate-300 leading-snug italic">{cardBackContent[index].content}</p>
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
                   <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-center mb-6 md:mb-8 bg-gradient-to-r from-emerald-400 via-white to-emerald-400 bg-clip-text text-transparent">
                     {t('whyus.compare.heading', 'WhatsApp vs Traditional Booking')}
                   </h2>
              </ScrollAnimatedSection>
              <ScrollAnimatedSection delay={200}>
                 <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
                  <span className="md:hidden">{t('whyus.compare.subtitleMobile', 'Data from thousands of businesses')}</span>
                  <span className="hidden md:inline">{t('whyus.compare.subtitleDesktop', 'Data-driven comparison across thousands of businesses worldwide')}</span>
                </p>
             </ScrollAnimatedSection>
           </div>
          
            {/* Desktop: Enhanced Premium Professional Table */}
            <ScrollAnimatedSection className="hidden md:block backdrop-blur-sm bg-gradient-to-b from-slate-800/40 to-slate-900/40 rounded-3xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/10 mb-8 overflow-hidden hover:shadow-[0_32px_72px_-12px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] hover:border-emerald-500/20 transition-all duration-500" delay={300}>
              <div className="overflow-x-auto">
                <table className="w-full">
                   <thead>
                     <tr className="bg-gradient-to-r from-slate-800/60 to-slate-800/40 border-b border-slate-600/50">
                       <th className="text-left py-6 px-12 text-slate-100 text-lg font-bold tracking-tight">{t('whyus.compare.thMetric', 'Metric')}</th>
                       <th className="text-center py-6 px-8 text-slate-400 text-lg font-bold tracking-tight">{t('whyus.compare.thPhone', 'Phone Calls')}</th>
                       <th className="text-center py-6 px-8 text-slate-400 text-lg font-bold tracking-tight">{t('whyus.compare.thWebsite', 'Website Forms')}</th>
                       <th className="text-center py-6 px-8 text-green-400 text-lg font-bold tracking-tight bg-green-400/10 border-x border-green-400/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] relative">
                         <div className="absolute inset-0 bg-gradient-to-b from-green-400/5 to-green-400/10"></div>
                         <span className="relative z-10">WhatsApp</span>
                       </th>
                       <th className="text-center py-6 px-8 text-emerald-400 text-lg font-bold tracking-tight">{t('whyus.compare.thImprovement', 'Improvement')}</th>
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
                 <span>{t('whyus.compare.credDesktop', 'WhatsApp adoption and appointment-industry research')}</span>
               </div>
               <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
                 <button
                   onClick={openMethodologyModal}
                   className="text-emerald-400 hover:text-emerald-300 transition-colors duration-300 underline decoration-emerald-400/50 hover:decoration-emerald-300/70 font-medium"
                 >
                   {t('whyus.viewMethodology', 'View methodology')}
                 </button>
                 <span>•</span>
                 <span>{t('whyus.compare.updatedMonthly', 'Data updated monthly')}</span>
                 <span>•</span>
                 <span>{t('whyus.compare.varyByIndustry', 'Results may vary by industry')}</span>
               </div>
             </div>

              {/* Mobile: Compact Table */}
              <ScrollAnimatedSection className="md:hidden overflow-x-auto bg-gradient-to-b from-slate-800/50 to-slate-900/40 border border-white/10 rounded-2xl shadow-[0_16px_40px_-14px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] mb-8" delay={300}>
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full min-w-[500px]">
                    <thead>
                      <tr className="border-b border-slate-600/50">
                        <th className="text-left py-3 px-2 text-slate-100 text-[10px] font-bold tracking-tight">{t('whyus.compare.thMetric', 'Metric')}</th>
                        <th className="text-center py-3 px-2 text-slate-400 text-[10px] font-bold tracking-tight">{t('whyus.compare.thPhoneShort', 'Phone')}</th>
                        <th className="text-center py-3 px-2 text-slate-400 text-[10px] font-bold tracking-tight">{t('whyus.compare.thWebsiteShort', 'Website')}</th>
                        <th className="text-center py-3 px-2 text-green-400 text-[10px] font-bold tracking-tight bg-green-400/10 border-x border-green-400/20 relative">
                          <div className="absolute inset-0 bg-gradient-to-b from-green-400/5 to-green-400/10"></div>
                          <span className="relative z-10">WhatsApp</span>
                        </th>
                        <th className="text-center py-3 px-2 text-emerald-400 text-[10px] font-bold tracking-tight">{t('whyus.compare.thImproveShort', 'Improve')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {whatsappVsTraditionalStats.map((stat, index) => (
                        <tr key={index} className={`border-b border-slate-700/40 hover:bg-slate-800/50 transition-all duration-300 ${index % 2 === 0 ? 'bg-white/[0.02]' : 'bg-slate-900/30'}`}>
                          <td className="py-2 px-2 text-white text-[9px] font-bold">
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 bg-gradient-to-br from-green-400/20 to-green-600/20 rounded-md flex items-center justify-center border border-green-400/30">
                                <stat.icon className="w-3 h-3 text-green-400" />
                              </div>
                              <span className="text-[9px]">{stat.metric}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-center text-slate-300 text-[8px] font-medium">{stat.phoneCalls}</td>
                          <td className="py-2 px-2 text-center text-slate-300 text-[8px] font-medium">{stat.websiteForms}</td>
                          <td className="py-2 px-2 text-center bg-green-400/10 border-x border-green-400/20 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-green-400/5 to-green-400/10"></div>
                            <span className="relative z-10 text-green-400 font-bold text-[9px]">{stat.whatsapp}</span>
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className="text-green-400 font-bold text-[8px]">{stat.improvement}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollAnimatedSection>

                {/* Mobile Enhanced Credibility Footer */}
                <div className="md:hidden text-center mb-1 -mt-2">
                  <div className="flex items-center justify-center gap-1 text-[8px] text-slate-400 font-medium mb-1.5">
                    <span className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></span>
                    <span>{t('whyus.compare.credMobile', 'WhatsApp adoption and industry research')}</span>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-[7px] text-slate-500">
                    <button
                      onClick={openMethodologyModal}
                      className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors duration-300 underline decoration-emerald-400/50 hover:decoration-emerald-300/70"
                    >
                      {t('whyus.viewMethodology', 'View methodology')}
                    </button>
                    <span>•</span>
                    <span>{t('whyus.compare.updatedMonthly', 'Data updated monthly')}</span>
                    <span>•</span>
                    <span>{t('whyus.compare.varyShort', 'Results may vary')}</span>
                  </div>
                </div>
          </div>
        </ScrollAnimatedSection>

      {/* Premium Psychological Benefits Section */}
      <ScrollAnimatedSection as="section" className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-20">
            <ScrollAnimatedSection delay={100}>
              <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-6 md:mb-8 px-3 sm:px-0">
                {t('whyus.psych.headingPre', 'Why WhatsApp Works ')}
                <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
                  <span className="md:hidden">{t('whyus.psych.headingAccent', 'Psychologically')}</span>
                  <span className="hidden md:inline">{t('whyus.psych.headingAccent', 'Psychologically')}</span>
                </span>
                {t('whyus.psych.headingPost', ' Better')}
              </h2>
            </ScrollAnimatedSection>
            <ScrollAnimatedSection delay={200}>
              <p className="text-xs md:text-lg text-slate-300 max-w-4xl mx-auto px-3 sm:px-0">
                <span className="md:hidden">{t('whyus.psych.subtitleMobile', 'How people feel and behave matters')}</span>
                <span className="hidden md:inline">{t('whyus.psych.subtitleDesktop', "It's not just about numbers - it's about how people feel and behave")}</span>
              </p>
            </ScrollAnimatedSection>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 md:gap-12">
            {psychologicalBenefits.map((benefit, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="group relative"
                delay={300 + index * 150}
              >
                {/* Flip Card Container */}
                <div 
                  className="relative cursor-pointer h-40 md:h-52"
                  onClick={() => togglePsychCardFlip(index)}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: flippedPsychCards[index] ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    transition: 'transform 0.6s ease-in-out'
                  }}
                >
                  {/* Front Side */}
                  <div 
                    className="absolute inset-0 p-3 md:p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-slate-800/50 via-slate-900/40 to-slate-800/30 border border-white/10 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_28px_56px_-18px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] hover:border-emerald-400/30 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-900/50 hover:to-emerald-900/10 transform hover:scale-[1.01] hover:-translate-y-1 transition-all duration-500"
                    style={{
                      backfaceVisibility: 'hidden'
                    }}
                  >
                    {/* Content Layout */}
                    <div className="flex flex-col justify-between h-full">
                      <div className="flex items-start space-x-2 md:space-x-4">
                        {/* Icon Container */}
                        <div className="relative w-8 h-8 md:w-14 md:h-14 flex-shrink-0">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-emerald-400/20 to-emerald-600/25 rounded-xl shadow-lg transform group-hover:scale-105 transition-transform duration-300"></div>
                          <div className="absolute inset-0.5 bg-gradient-to-tr from-slate-800/70 to-slate-700/50 rounded-lg backdrop-blur-sm"></div>
                          <div className="relative w-full h-full flex items-center justify-center">
                            <benefit.icon className="w-4 h-4 md:w-7 md:h-7 text-emerald-400 drop-shadow-lg group-hover:text-emerald-300 transition-colors duration-300" />
                          </div>
                        </div>
                        
                        {/* Content Container */}
                        <div className="flex-1 space-y-1 md:space-y-3">
                          {/* Title */}
                          <h3 className="text-base md:text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-emerald-100 bg-clip-text text-transparent leading-tight">
                            {benefit.title}
                          </h3>
                          
                          {/* Description - Mobile only flex to push to left edge */}
                          <div className="md:hidden -ml-10 pl-0">
                            <p className="text-slate-300 text-[11px] leading-tight text-left">
                              {benefit.mobileDescription}
                            </p>
                          </div>
                          
                          {/* Description - Desktop only */}
                          <div className="hidden md:block">
                            <p className="text-slate-300 text-base leading-relaxed">
                              {benefit.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Element - RESTORED AND IMPROVED FOR MOBILE */}
                      <div className="mt-1 md:mt-4 text-right">
                        <span className="text-emerald-400 text-[8px] md:text-sm font-medium opacity-80">
                          {t('whyus.psych.seeEvidence', 'See evidence →')}
                        </span>
                      </div>
                    </div>
                  </div>

                   {/* Back Side */}
                  <div 
                    className="absolute inset-0 p-3 md:p-6 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-slate-800/50 via-slate-900/40 to-slate-800/30 border border-white/10 shadow-[0_20px_48px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] hover:shadow-[0_28px_56px_-18px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] hover:border-emerald-400/30 hover:bg-gradient-to-br hover:from-slate-800/60 hover:via-slate-900/50 hover:to-emerald-900/10 transform hover:scale-[1.01] hover:-translate-y-1 transition-all duration-500 flex items-center justify-center"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)'
                    }}
                  >
                    {/* Text Content Only */}
                    <div className="text-left">
                      <p className="text-slate-300 text-[8px] md:text-base leading-relaxed italic">
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
            <h2 className="text-3xl md:text-4xl xl:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              <span className="text-green-400">{t('whyus.cases.headingAccent', 'Proven Results')}</span>{t('whyus.cases.headingRest', ' Across All Sectors')}
            </h2>
            <p className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">{t('whyus.cases.subtitleMobile', 'Real businesses, dramatic improvements')}</span>
              <span className="hidden md:inline">{t('whyus.cases.subtitleDesktop', 'In-depth case studies of real businesses that saw dramatic improvements')}</span>
            </p>
          </div>
          
          {/* Desktop: Vertical layout */}
          <div className="hidden md:block space-y-12">
            {sectorCaseStudies.map((study, index) => (
              <ScrollAnimatedSection 
                key={index} 
                className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/40 border border-white/10 rounded-3xl p-8 shadow-[0_24px_56px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_32px_72px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(16,185,129,0.14)] hover:border-emerald-500/30 hover:bg-gradient-to-br hover:from-slate-900/90 hover:via-slate-800/70 hover:to-emerald-900/20 transition-all duration-500 transform hover:scale-[1.01] hover:-translate-y-1"
                delay={index * 200}
              >
                <div className="grid lg:grid-cols-3 gap-8">
                  {/* Header */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-600/15 border border-emerald-400/20 rounded-2xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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
                          <span className="text-red-400 font-semibold">{t('whyus.cases.before', 'Before:')}</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">{t('whyus.cases.after', 'After:')}</span>
                          <p className="text-slate-300 text-sm mt-1">{study.caseAfter}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Implementation */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3">{t('whyus.cases.implementation', 'Implementation')}</h4>
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
                    <h4 className="text-lg font-bold text-white mb-3">{t('whyus.cases.results', 'Results')}</h4>
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
                     <div className="relative backdrop-blur-xl bg-gradient-to-br from-slate-900/85 via-slate-800/65 to-slate-900/45 border border-white/10 rounded-2xl p-4 h-full shadow-[0_18px_44px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]">
                      {/* Header */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-green-600/15 border border-emerald-400/20 rounded-xl flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
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
                          <span className="text-red-400 font-semibold">{t('whyus.cases.before', 'Before:')}</span>
                          <p className="text-slate-300 mt-1">{study.mobileBefore}</p>
                        </div>
                        <div>
                          <span className="text-green-400 font-semibold">{t('whyus.cases.after', 'After:')}</span>
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
                  aria-label={t('whyus.cases.goTo', 'Go to case study {{n}}', { n: index + 1 })}
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
              className="text-3xl md:text-4xl xl:text-5xl font-bold mb-6 md:mb-8 tracking-tight"
            >
              <span className="text-white">{t('whyus.mobileFirst.headingWhy', 'Why ')}</span>
              <span className="bg-gradient-to-r from-emerald-300 to-emerald-400 bg-clip-text text-transparent">
                {t('whyus.mobileFirst.headingAccent', 'Mobile-First')}
              </span>
              <span className="text-white">{t('whyus.mobileFirst.headingWins', ' Wins')}</span>
            </ScrollAnimatedSection>

            <ScrollAnimatedSection
              animation="fade-up"
              delay={200}
              as="p"
              className="text-xs md:text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed font-light"
            >
              {t('whyus.mobileFirst.subtitle', 'Three fundamental shifts driving customer behavior and business success')}
            </ScrollAnimatedSection>
          </div>
          
          {/* Mobile: Clean Single Flow */}
          <div className="md:hidden space-y-6">
            {[
              {
                icon: TabletSmartphone,
                title: t('whyus.mobileFirst.i1Title', "Universal Adoption"),
                description: t('whyus.mobileFirst.i1Desc', "96 daily interactions per user"),
                detail: t('whyus.mobileFirst.i1Detail', "Natural mobile behavior drives engagement")
              },
              {
                icon: Rocket,
                title: t('whyus.mobileFirst.i2Title', "Instant Response"),
                description: t('whyus.mobileFirst.i2Desc', "Sub-30 second expectations"),
                detail: t('whyus.mobileFirst.i2Detail', "Speed determines conversion success")
              },
              {
                icon: Users,
                title: t('whyus.mobileFirst.i3Title', "Personal Trust"),
                description: t('whyus.mobileFirst.i3Desc', "85% prefer messaging"),
                detail: t('whyus.mobileFirst.i3Detail', "Conversational commerce builds loyalty")
              }
            ].map((item, index) => (
              <ScrollAnimatedSection 
                key={index}
                animation="fade-up" 
                delay={400 + index * 150}
              >
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_16px_40px_-14px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all duration-300">
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

            {/* Mobile-First Advantage Summary for Mobile */}
            <ScrollAnimatedSection 
              animation="fade-up" 
              delay={850}
            >
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-[0_16px_40px_-14px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-emerald-500/20 transition-all duration-300">
                <div className="text-center space-y-4">
                  <h3 className="text-xl font-bold text-white">
                    {t('whyus.mobileFirst.advantageTitle', 'The Mobile-First Advantage')}
                  </h3>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    {t('whyus.mobileFirst.summaryLead', 'WhatsApp delivers ')}<span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat1', '18x faster responses')}</span>{t('whyus.mobileFirst.summaryMid1', ', ')}
                    <span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat2', '50% higher attendance')}</span>{t('whyus.mobileFirst.summaryMid2', ', and ')}
                    <span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat3', '95% customer satisfaction')}</span>{t('whyus.mobileFirst.summaryEnd', ' compared to traditional booking methods.')}
                  </p>

                  {/* Mobile Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
                    {[
                      { label: t('whyus.mobileFirst.metricFasterShort', "Faster"), value: "18x" },
                      { label: t('whyus.mobileFirst.metricAttendanceShort', "Attendance"), value: "+50%" },
                      { label: t('whyus.mobileFirst.metricSatisfactionShort', "Satisfaction"), value: "95%" }
                    ].map((metric, index) => (
                      <div key={index} className="text-center">
                        <div className="text-emerald-300 text-lg font-bold">{metric.value}</div>
                        <div className="text-slate-400 text-xs">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollAnimatedSection>

            {/* Mobile Disclaimer */}
            <MobileFirstDataDisclaimer onMethodologyClick={openMobileFirstMethodologyModal} />
          </div>

          {/* Desktop: Refined Three-Column Layout */}
          <div className="hidden md:block">
            <div className="grid grid-cols-3 gap-8 lg:gap-12 mb-16">
              {[
                {
                  icon: TabletSmartphone,
                  title: t('whyus.mobileFirst.i1Title', "Universal Adoption"),
                  stat: t('whyus.mobileFirst.i1Stat', "96x Daily"),
                  insight: t('whyus.mobileFirst.i1Insight', "Mobile devices are checked 96 times per day. WhatsApp integrates seamlessly into this natural behavior, ensuring maximum reach and engagement without disrupting user patterns.")
                },
                {
                  icon: Rocket,
                  title: t('whyus.mobileFirst.i2Title', "Instant Response"),
                  stat: t('whyus.mobileFirst.i2Stat', "<30 Sec"),
                  insight: t('whyus.mobileFirst.i2Insight', "Modern customers expect immediate acknowledgment. WhatsApp delivers instant responses while traditional channels create friction, leading to higher conversion rates and customer satisfaction.")
                },
                {
                  icon: Users,
                  title: t('whyus.mobileFirst.i3Title', "Personal Trust"),
                  stat: t('whyus.mobileFirst.i3Stat', "85% Prefer"),
                  insight: t('whyus.mobileFirst.i3Insight', "Messaging feels more personal and trusted than email. This preference drives higher engagement rates and builds stronger customer relationships through conversational commerce.")
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
                    <div className="relative h-full bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-[0_26px_56px_-18px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(16,185,129,0.12)] transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
                      
                      {/* Icon and Stat Integration */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/15 to-emerald-400/25 rounded-2xl flex items-center justify-center">
                          <item.icon className="w-8 h-8 text-emerald-300" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-300">{item.stat}</div>
                          <div className="text-xs text-slate-400 uppercase tracking-wider">{t('whyus.mobileFirst.keyMetric', 'Key Metric')}</div>
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
                <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 md:p-12 shadow-[0_24px_56px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-[0_30px_64px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(16,185,129,0.12)] transition-all duration-500">
                  
                  <div className="space-y-6">
                    <h3 className="text-2xl md:text-3xl font-bold text-white">
                      {t('whyus.mobileFirst.advantageTitle', 'The Mobile-First Advantage')}
                    </h3>

                    <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
                      {t('whyus.mobileFirst.summaryLead', 'WhatsApp delivers ')}<span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat1', '18x faster responses')}</span>{t('whyus.mobileFirst.summaryMid1', ', ')}
                      <span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat2', '50% higher attendance')}</span>{t('whyus.mobileFirst.summaryMid2', ', and ')}
                      <span className="text-emerald-300 font-medium">{t('whyus.mobileFirst.summaryStat3', '95% customer satisfaction')}</span>{t('whyus.mobileFirst.summaryEnd', ' compared to traditional booking methods.')}
                    </p>

                    {/* Integrated Metrics */}
                    <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/[0.06]">
                      {[
                        { label: t('whyus.mobileFirst.metricFaster', "Faster Response"), value: "18x" },
                        { label: t('whyus.mobileFirst.metricAttendance', "Higher Attendance"), value: "+50%" },
                        { label: t('whyus.mobileFirst.metricSatisfaction', "Satisfaction Rate"), value: "95%" }
                      ].map((metric, index) => (
                        <div key={index} className="text-center">
                          <div className="text-emerald-300 text-xl font-bold">{metric.value}</div>
                          <div className="text-slate-400 text-sm">{metric.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollAnimatedSection>
          </div>
        </div>
      </ScrollAnimatedSection>
      
      {/* Desktop Disclaimer - Moved down */}
      <div className="hidden md:block">
        <MobileFirstDataDisclaimer onMethodologyClick={openMobileFirstMethodologyModal} />
      </div>

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
    </PublicPageWrapper>
  );
};

export default WhyUs;
