
import React from 'react';
import Navbar from '@/components/Navbar';
import ProcessHighlights from '@/components/how-it-works/ProcessHighlights';
import AITestSection from '@/components/how-it-works/AITestSection';
import StepSection from '@/components/how-it-works/StepSection';
import BonusSection from '@/components/how-it-works/BonusSection';
import CTASection from '@/components/how-it-works/CTASection';

const SeeHowItWorks = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-gray-900 to-emerald-900 py-24 px-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            How does <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">it work?</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-16">
            Step by step explanation of how easy it is to get started with our system. 
            No complicated installation, no tech hassle — just go live immediately.
          </p>
          
          <ProcessHighlights />
        </div>
      </section>

      {/* AI Test Section - Direct na hero section */}
      <AITestSection />
      <StepSection />
      <BonusSection />
      <CTASection />
    </div>
  );
};

export default SeeHowItWorks;
