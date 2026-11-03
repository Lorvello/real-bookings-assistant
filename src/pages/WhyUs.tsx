import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import Testimonials from '@/components/ui/testimonials-columns-1';
import PublicPageWrapper from '@/components/PublicPageWrapper';
import { useVoiceflowChatbot } from '@/hooks/useVoiceflowChatbot';

import { Pricing } from '@/components/Pricing';

const WhyUs = () => {
  const { t } = useTranslation('whyUs');
  useVoiceflowChatbot();
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

        </div>
      </section>

      {/* Testimonials Section */}
      <ScrollAnimatedSection delay={100} config={{ threshold: 0.05, rootMargin: '200px 0px 0px 0px' }}>
        <Testimonials />
      </ScrollAnimatedSection>

      {/* Pricing Section */}
      <ScrollAnimatedSection delay={200}>
        <Pricing />
      </ScrollAnimatedSection>

    </div>
    </PublicPageWrapper>
  );
};

export default WhyUs;
