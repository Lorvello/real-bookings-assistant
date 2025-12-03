import React from 'react';
import Header from '@/components/Header';
import PublicPageWrapper from '@/components/PublicPageWrapper';

const About = () => {
  return (
    <PublicPageWrapper>
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900/30">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            About <span className="text-emerald-400">BookingsAssistant</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
            We're building the future of appointment booking through WhatsApp automation.
          </p>
        </div>
      </section>

      {/* Placeholder Content Sections */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Mission Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Mission</h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
              <p className="text-slate-300 text-center text-lg">
                Content coming soon...
              </p>
            </div>
          </div>

          {/* Team Section */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Team</h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
              <p className="text-slate-300 text-center text-lg">
                Content coming soon...
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div>
            <h2 className="text-3xl font-bold text-white mb-6 text-center">Our Values</h2>
            <div className="bg-slate-800/50 rounded-2xl p-8 border border-slate-700/50">
              <p className="text-slate-300 text-center text-lg">
                Content coming soon...
              </p>
            </div>
          </div>

        </div>
      </section>
    </PublicPageWrapper>
  );
};

export default About;
