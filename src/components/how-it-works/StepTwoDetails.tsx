
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare, ArrowDown } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="relative">
      {/* Step Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/25">
            <span className="text-white text-2xl font-bold">2</span>
          </div>
          <div className="text-left">
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              Choose your <span className="text-blue-400">WhatsApp strategy</span>
            </h3>
            <div className="flex items-center gap-3 text-blue-300">
              <MessageSquare className="w-5 h-5" />
              <span className="text-lg font-medium">Flexible & completely secure</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto">
        
        {/* Intro Text */}
        <div className="text-center mb-12">
          <p className="text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto mb-8">
            You have two options to get started. We ensure everything works seamlessly, 
            without you having to do anything technical.
          </p>
          
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6 inline-block">
            <div className="flex items-center gap-4">
              <Shield className="w-6 h-6 text-blue-400" />
              <span className="text-blue-400 font-bold text-lg">100% secure and GDPR compliant</span>
            </div>
            <p className="text-slate-300 mt-2">
              Your WhatsApp data remains completely private and secure.
            </p>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Option 1 - Recommended */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 z-10">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
                <Star className="w-4 h-4" />
                RECOMMENDED
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border-2 border-blue-500/30 rounded-2xl p-8 h-full">
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-400" />
                  <h4 className="text-2xl font-bold text-white">We arrange a number for you</h4>
                </div>
                
                <div className="space-y-4 mb-6">
                  {[
                    { text: 'Live within 5 minutes', highlight: true },
                    { text: 'Local phone number included', highlight: false },
                    { text: 'Fully managed by our team', highlight: false }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-blue-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-400 shrink-0" />
                      <span className={`font-medium ${item.highlight ? 'text-blue-200' : 'text-slate-200'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-blue-400/20 border border-blue-400/30 rounded-xl p-4 mt-auto">
                <p className="text-blue-200 font-medium">
                  <strong className="text-white">Perfect for:</strong> Businesses that want to start quickly without any hassle.
                </p>
              </div>
            </div>
          </div>
          
          {/* Option 2 */}
          <div className="bg-slate-800/50 border border-slate-600/50 rounded-2xl p-8 h-full">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <MessageSquare className="w-8 h-8 text-slate-400" />
                <h4 className="text-2xl font-bold text-white">Use your existing number</h4>
              </div>
              
              <div className="space-y-4 mb-6">
                {[
                  'Keep your current WhatsApp number',
                  'Customers already know this number',
                  'Step-by-step setup guidance'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-slate-400 shrink-0" />
                    <span className="text-slate-300 font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4 mt-auto">
              <p className="text-slate-400 font-medium">
                <strong className="text-slate-200">Perfect for:</strong> Established businesses with a known WhatsApp number.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Arrow */}
      <div className="flex justify-center mt-16">
        <div className="flex flex-col items-center">
          <ArrowDown className="w-8 h-8 text-blue-400 animate-bounce" />
          <span className="text-blue-400 text-sm font-medium mt-2">Final step</span>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
