
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative bg-gradient-to-r from-blue-500/5 to-blue-600/10 rounded-3xl p-8 border border-blue-500/20">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-blue-600 rounded-t-3xl"></div>
      
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shadow-xl border-2 border-blue-400">
              <span className="text-white text-xl font-bold">2</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Choose your WhatsApp strategy</h3>
              <div className="flex items-center gap-2 text-blue-300">
                <MessageSquare className="w-5 h-5" />
                <span className="text-base font-semibold">Flexible & secure</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <p className="text-lg text-slate-200 leading-relaxed font-medium">
              You have two options to get started. We ensure everything works seamlessly, 
              without you having to do anything technical.
            </p>
            
            <div className="border-l-4 border-blue-400 pl-6 bg-blue-500/10 py-4 rounded-r-xl border border-blue-500/20">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-6 h-6 text-blue-400" />
                <span className="text-blue-300 font-bold text-lg">100% secure and GDPR compliant</span>
              </div>
              <p className="text-slate-300">
                Your WhatsApp data remains completely private.
              </p>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="space-y-4">
          {/* Recommended option */}
          <div className="relative">
            <div className="absolute -top-3 -right-3 z-10">
              <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-xl border-2 border-blue-400">
                <Star className="w-4 h-4" />
                Recommended
              </div>
            </div>
            
            <div className="border-2 border-blue-400/50 rounded-2xl p-6 bg-blue-500/10 backdrop-blur-sm">
              <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                We arrange a number for you
              </h4>
              
              <div className="space-y-3 mb-4">
                {[
                  'Live within 5 minutes',
                  'Local number', 
                  'Fully managed by us'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-blue-500/30">
                    <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="text-slate-200 font-medium">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-blue-500/15 border border-blue-500/30 rounded-xl p-4">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">Perfect for:</strong> Businesses that want to start quickly without hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Second option */}
          <div className="border border-slate-500 rounded-2xl p-6 bg-slate-800/40 backdrop-blur-sm">
            <h4 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              Use your own number
            </h4>
            
            <div className="space-y-3 mb-4">
              {[
                'Keep your current number',
                'Customers already know it',
                'Step-by-step guidance'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3 bg-slate-700/40 p-3 rounded-xl border border-slate-600/50">
                  <CheckCircle className="w-5 h-5 text-slate-400 shrink-0" />
                  <span className="text-slate-300 font-medium">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/30 border border-slate-600/40 rounded-xl p-4">
              <p className="text-sm text-slate-400">
                <strong className="text-slate-200">Perfect for:</strong> Established businesses with a known WhatsApp number.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
