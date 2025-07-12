
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
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-16 md:py-32 px-3 md:px-4 relative overflow-hidden">
        {/* Enhanced Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-gradient-to-r from-slate-600/10 to-slate-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-l from-slate-600/10 to-slate-500/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-slate-700/5 to-slate-600/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Sophisticated Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.08)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10 px-4 md:px-6 lg:px-8">
          <h1 className="text-3xl md:text-7xl xl:text-8xl font-bold text-white mb-6 md:mb-10 px-3 sm:px-0 tracking-tight">
            How does <span className="bg-gradient-to-r from-slate-300 to-slate-100 bg-clip-text text-transparent">it work?</span>
          </h1>
          <p className="text-base md:text-2xl text-slate-300 max-w-5xl mx-auto mb-12 md:mb-24 px-3 sm:px-0 leading-relaxed font-light">
            Step by step explanation of how easy it is to get started with our system. 
            <br className="hidden md:block" />
            No complicated installation, no tech hassle — just go live immediately.
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
