import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import Testimonials from '@/components/ui/testimonials-columns-1';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { useVoiceflowChatbot } from '@/hooks/useVoiceflowChatbot';

import { Shield, Zap, Users, Award, Clock, TrendingUp, CheckCircle, Star, Calendar, ArrowRight, Phone, MessageCircle, Bot, Target, Heart, Brain, Smartphone, Gauge, UserCheck, TabletSmartphone, Rocket } from 'lucide-react';
import { Pricing } from '@/components/Pricing';
import PsychologyMethodologyModal from '@/components/PsychologyMethodologyModal';
import PsychologyDataDisclaimer from '@/components/PsychologyDataDisclaimer';
import MobileFirstDataDisclaimer from '@/components/MobileFirstDataDisclaimer';
import MobileFirstMethodologyModal from '@/components/MobileFirstMethodologyModal';

const WhyUs = () => {
  const { t } = useTranslation('whyUs');
  useVoiceflowChatbot();
  const [flippedCards, setFlippedCards] = useState<boolean[]>([false, false, false, false]);
  const [flippedPsychCards, setFlippedPsychCards] = useState<boolean[]>([false, false, false, false]);
  const [isPsychologyMethodologyModalOpen, setIsPsychologyMethodologyModalOpen] = useState(false);
  const [isMobileFirstMethodologyModalOpen, setIsMobileFirstMethodologyModalOpen] = useState(false);

  // Modal handlers - defined early to ensure scope availability
  const openPsychologyMethodologyModal = () => setIsPsychologyMethodologyModalOpen(true);
  const closePsychologyMethodologyModal = () => setIsPsychologyMethodologyModalOpen(false);
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

      {/* Psychology Methodology Modal */}
      <PsychologyMethodologyModal 
        isOpen={isPsychologyMethodologyModalOpen} 
        onClose={closePsychologyMethodologyModal}
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
