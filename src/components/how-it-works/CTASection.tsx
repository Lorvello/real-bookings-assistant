
import React from 'react';
import ScrollAnimatedSection from '@/components/ScrollAnimatedSection';
import { ArrowRight, CheckCircle, Shield, Zap, Clock } from 'lucide-react';

const CTASection = () => {
  return (
    <ScrollAnimatedSection delay={200}>
      <section className="bg-gradient-to-br from-emerald-600 via-green-600 to-emerald-700 py-24 px-4 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-20 h-20 border border-white rounded-full"></div>
          <div className="absolute top-40 right-20 w-16 h-16 border border-white rounded-full"></div>
          <div className="absolute bottom-20 left-1/4 w-12 h-12 border border-white rounded-full"></div>
          <div className="absolute bottom-40 right-1/3 w-24 h-24 border border-white rounded-full"></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8 leading-tight">
            Ready to save time and never miss a customer again?
          </h2>
          <p className="text-2xl text-emerald-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Start today — your assistant is already waiting to transform your business.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button className="group bg-white text-emerald-600 px-12 py-6 rounded-2xl font-bold text-xl hover:bg-gray-50 transition-all duration-300 flex items-center gap-4 shadow-xl hover:shadow-2xl transform hover:scale-105">
              <span>Start Now</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            
            <div className="flex items-center gap-3 text-emerald-100">
              <CheckCircle className="w-6 h-6" />
              <span className="text-lg">Setup in 5 minutes</span>
            </div>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-emerald-100">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>No technical skills required</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Instant activation</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>24/7 support</span>
            </div>
          </div>
        </div>
      </section>
    </ScrollAnimatedSection>
  );
};

export default CTASection;
