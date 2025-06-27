
import React from 'react';
import Navbar from '@/components/Navbar';
import ProcessHighlights from '@/components/how-it-works/ProcessHighlights';
import AITestSection from '@/components/how-it-works/AITestSection';
import { PricingBasic } from '@/components/PricingBasic';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';

const SeeHowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      
      {/* Hero Section - Increased mobile padding */}
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 py-12 md:py-24 px-3 md:px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-2xl md:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
            How does <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">it work?</span>
          </h1>
          <p className="text-sm md:text-xl text-slate-300 max-w-4xl mx-auto mb-8 md:mb-16 px-3 sm:px-0">
            Step by step explanation of how easy it is to get started with our system. 
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
          <PricingBasic />
        </div>
      </ScrollAnimatedSection>
    </div>
  );
};

export default SeeHowItWorks;
