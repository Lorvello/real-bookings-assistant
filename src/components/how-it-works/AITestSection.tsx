
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';

const AITestSection = () => {
  return (
    <ScrollAnimatedSection>
      <section className="py-12 md:py-32 px-3 md:px-4 bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-48 h-48 md:w-72 md:h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-64 h-64 md:w-96 md:h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:64px_64px] opacity-20"></div>
        
        <div className="max-w-6xl mx-auto relative z-10 px-4 md:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-20">

            {/* Main Title with Professional Styling */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-6 md:mb-8 px-3 sm:px-0 tracking-tight animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <span className="bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent drop-shadow-2xl">
                Test Our{' '}
              </span>
              <br className="md:hidden" />
              <span className="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-2xl glow-text">
                AI Assistant
              </span>
            </h2>

            {/* Enhanced Subtitle */}
            <p className="text-lg md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-light animate-fade-in px-3 sm:px-0" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
              <span className="md:hidden">Experience how quickly our AI handles booking conversations. No registration required!</span>
              <span className="hidden md:inline">Experience how quickly and naturally our AI handles booking conversations.{" "}
              <br />
              <span className="text-emerald-400 font-semibold">No registration required</span>,{" "}
              <span className="text-emerald-400 font-semibold">try it right now!</span></span>
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto h-[650px] md:h-[750px]">
            <AIAgentTestChat />
          </div>
        </div>
      </section>
    </ScrollAnimatedSection>
  );
};

export default AITestSection;
