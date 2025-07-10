
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
            <div className="inline-flex items-center bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 md:px-6 md:py-3 mb-4 md:mb-8">
              <span className="text-emerald-400 font-semibold text-sm md:text-lg">✨ Try It Now</span>
            </div>
            <h2 className="text-xl md:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-8 px-3 sm:px-0">
              Test Our AI Assistant
            </h2>
            <p className="text-sm md:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed px-3 sm:px-0">
              Experience how quickly and naturally our AI handles booking conversations. 
              <br className="hidden md:block" />
              <strong className="text-white">No registration required — try it right now!</strong>
            </p>
          </div>
          
          <div className="bg-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl md:rounded-3xl p-3 md:p-12 shadow-2xl max-w-5xl mx-auto min-h-[600px] md:min-h-[700px]">
            <AIAgentTestChat />
          </div>
        </div>
      </section>
    </ScrollAnimatedSection>
  );
};

export default AITestSection;
