
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        {/* Left side - Content */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">2</span>
            </div>
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-1">Choose your WhatsApp strategy</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Flexible & secure</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <p className="text-lg text-slate-300 leading-relaxed">
              You have two options to get started. We ensure everything works seamlessly, 
              without you having to do anything technical.
            </p>
            
            <div className="border-l-4 border-emerald-400 pl-4 bg-emerald-500/5 py-3 rounded-r-lg">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">100% secure and GDPR compliant</span>
              </div>
              <p className="text-slate-300 text-sm">
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
              <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                <Star className="w-3 h-3" />
                Recommended
              </div>
            </div>
            
            <div className="border border-emerald-500/30 rounded-xl p-6 bg-emerald-500/5">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                We arrange a number for you
              </h4>
              
              <div className="space-y-3 mb-4">
                {[
                  'Live within 5 minutes',
                  'Local number', 
                  'Fully managed by us'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-200 text-sm">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                <p className="text-xs text-slate-300">
                  <strong className="text-white">Perfect for:</strong> Businesses that want to start quickly without hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Second option */}
          <div className="border border-slate-600 rounded-xl p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              Use your own number
            </h4>
            
            <div className="space-y-3 mb-4">
              {[
                'Keep your current number',
                'Customers already know it',
                'Step-by-step guidance'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
              <p className="text-xs text-slate-400">
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
