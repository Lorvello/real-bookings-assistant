
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      <div className="relative grid lg:grid-cols-2 gap-16 items-center">
        {/* Left side - Content */}
        <div className="space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">2</span>
            </div>
            <div>
              <h3 className="text-3xl lg:text-4xl font-bold text-white mb-2">Choose your WhatsApp strategy</h3>
              <div className="flex items-center gap-2 text-emerald-400">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm font-medium">Flexible & secure</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <p className="text-xl text-slate-300 leading-relaxed mb-6">
                You have two options to get started. We ensure everything works seamlessly, 
                without you having to do anything technical.
              </p>
              
              <div className="border-l-4 border-emerald-400 pl-6">
                <div className="flex items-center gap-4 mb-3">
                  <Shield className="w-6 h-6 text-emerald-400" />
                  <span className="text-emerald-400 font-bold text-lg">100% secure and GDPR compliant</span>
                </div>
                <p className="text-slate-300">
                  Your WhatsApp data remains completely private.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side - Visual */}
        <div className="relative space-y-6">
          {/* Recommended option */}
          <div className="relative group">
            <div className="absolute -top-4 -right-4 z-10">
              <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                <Star className="w-4 h-4" />
                Recommended
              </div>
            </div>
            
            <div className="border border-emerald-500/30 rounded-3xl p-8">
              <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                We arrange a number for you
              </h4>
              
              <div className="space-y-4 mb-6">
                {[
                  'Live within 5 minutes',
                  'Local number', 
                  'Fully managed by us'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">Perfect for:</strong> Businesses that want to start quickly without hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Second option */}
          <div className="border border-slate-600 rounded-3xl p-8">
            <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              Use your own number
            </h4>
            
            <div className="space-y-4 mb-6">
              {[
                'Keep your current number',
                'Customers already know it',
                'Step-by-step guidance'
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <CheckCircle className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
            
            <div className="bg-slate-700/20 border border-slate-600/30 rounded-xl p-4">
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
