
import React from 'react';
import Header from '@/components/Header';
import ProcessHighlights from '@/components/how-it-works/ProcessHighlights';
import AITestSection from '@/components/how-it-works/AITestSection';
import { Pricing } from '@/components/Pricing';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

const SeeHowItWorks = () => {
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
        
        <div className="max-w-7xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
          {/* Floating Badge */}
          <div className="animate-fade-in mb-6 md:mb-8">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 border border-emerald-500/30 backdrop-blur-sm">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              <span className="text-emerald-300 text-sm font-medium tracking-wide">3 Steps to Success</span>
            </div>
          </div>

          {/* Premium Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
              How does{' '}
            </span>
            <br className="md:hidden" />
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
              it work?
            </span>
          </h1>

          {/* Enhanced Subtitle */}
          <p className="text-lg md:text-xl text-slate-300 max-w-4xl mx-auto mb-6 md:mb-8 px-3 sm:px-0 leading-relaxed font-light animate-fade-in" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            Step by step explanation of how easy it is to get started with our system. 
            <br className="hidden md:block" />
            <span className="text-emerald-300">No complicated installation, no tech hassle</span>, just go live immediately.
          </p>
          
          <ProcessHighlights />
        </div>
      </section>

      {/* AI Test Section - Increased mobile padding */}
      <AITestSection />

      {/* Pricing Section - Increased mobile padding */}
      <ScrollAnimatedSection>
        <div id="pricing">
          <Pricing />
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default SeeHowItWorks;
