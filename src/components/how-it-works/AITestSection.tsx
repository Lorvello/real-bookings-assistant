
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';

const AITestSection = () => {
  return (
    <section className="py-8 md:py-16 px-3 md:px-4 relative overflow-hidden">
        
        <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
          <ScrollAnimatedSection animation="fade-up" delay={0} className="text-center mb-8 md:mb-20">

            {/* Main Title with Professional Styling */}
            <ScrollAnimatedSection animation="fade-up" delay={200} as="h2" className="text-2xl md:text-5xl xl:text-6xl 2xl:text-8xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight">
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
                Test Our{' '}
              </span>
              <br className="md:hidden" />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
                AI Assistant
              </span>
            </ScrollAnimatedSection>

            {/* Enhanced Subtitle */}
            <ScrollAnimatedSection animation="fade-up" delay={400} as="p" className="text-sm md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-light px-3 sm:px-0">
              <span className="md:hidden">Experience how quickly our AI handles booking conversations. No registration required!</span>
              <span className="hidden md:inline">Experience how quickly and naturally our AI handles booking conversations.{" "}
              <br />
              <span className="text-emerald-400 font-semibold">No registration required</span>,{" "}
              <span className="text-emerald-400 font-semibold">try it right now!</span></span>
            </ScrollAnimatedSection>
          </ScrollAnimatedSection>
          
          <ScrollAnimatedSection animation="scale" delay={600} className="max-w-6xl mx-auto h-[500px] md:h-[550px]">
            <AIAgentTestChat />
          </ScrollAnimatedSection>
        </div>
      </section>
  );
};

export default AITestSection;
