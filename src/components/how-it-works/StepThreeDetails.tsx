
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center shadow-lg rounded-xl p-6 border border-slate-700/50" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">3</span>
          </div>
          <span className="text-emerald-400 font-medium text-sm uppercase tracking-wide">Step Three</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          Your system goes live immediately
        </h3>
        
        <p className="text-slate-300 text-base mb-6 leading-relaxed">
          That's it! Your entire booking system is instantly active and ready to serve customers 24/7. 
          You can adjust settings anytime, but everything works perfectly from day one.
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white text-sm">Instant activation</h4>
              <p className="text-slate-300 text-sm">Everything works immediately after account creation</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white text-sm">Optional customization</h4>
              <p className="text-slate-300 text-sm">Adjust settings anytime to match your preferences</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white text-sm">24/7 ready to serve</h4>
              <p className="text-slate-300 text-sm">Your customers can book immediately via WhatsApp</p>
            </div>
          </div>
        </div>
        
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-emerald-300 font-semibold text-sm">Live Status</span>
          </div>
          <p className="text-emerald-200 text-sm">
            Your complete booking system is active and serving customers
          </p>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="relative mb-3">
              <MessageCircle className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="absolute -inset-1 bg-emerald-400/20 rounded-full opacity-50"></div>
            </div>
            <h4 className="text-lg font-semibold text-white">System Active</h4>
          </div>
          
          <div className="space-y-3">
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-medium text-sm">Calendar Live</span>
              </div>
              <p className="text-slate-300 text-xs">Accepting bookings instantly</p>
            </div>
            
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-white font-medium text-sm">AI Assistant</span>
              </div>
              <p className="text-slate-300 text-xs">Ready to help customers</p>
            </div>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 font-medium text-sm">Live and serving</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
