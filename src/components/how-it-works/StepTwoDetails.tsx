
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare, MessageCircle, Users } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center shadow-lg rounded-xl p-6 border border-slate-700/50" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">2</span>
          </div>
          <span className="text-emerald-400 font-medium text-sm uppercase tracking-wide">Step Two</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
          Get your WhatsApp number instantly
        </h3>
        
        <p className="text-slate-300 text-base mb-6 leading-relaxed">
          Your account comes with an instant WhatsApp number assignment. You can also choose to 
          connect your existing business number if you prefer.
        </p>
        
        <div className="space-y-4">
          {/* Option 1: We arrange */}
          <div className="border-2 border-emerald-500/30 bg-emerald-500/10 p-4 rounded-lg relative">
            <div className="absolute top-3 right-3">
              <Star className="w-4 h-4 text-emerald-400 fill-current" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base font-bold text-white">Instant number assignment</h4>
              <span className="bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium">Automatic</span>
            </div>
            <p className="text-emerald-200 text-sm">
              Your unique WhatsApp number is assigned immediately upon account creation.
            </p>
            <div className="mt-2 text-emerald-300 text-xs">
              <strong>Perfect for:</strong> Immediate start, zero configuration
            </div>
          </div>
          
          {/* Option 2: Own number */}
          <div className="border border-slate-600 bg-slate-700/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-slate-400" />
              <h4 className="text-base font-bold text-white">Connect existing number</h4>
            </div>
            <p className="text-slate-300 text-sm mb-2">
              You can also connect your existing business WhatsApp number to our system.
            </p>
            <div className="text-slate-400 text-xs">
              <strong>Perfect for:</strong> Existing business number, brand consistency
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="text-center">
          <div className="relative mb-4">
            <MessageCircle className="w-12 h-12 text-emerald-400 mx-auto" />
            <div className="absolute -inset-1 bg-emerald-400/20 rounded-full opacity-50"></div>
          </div>
          <h4 className="text-lg font-semibold text-white mb-4">WhatsApp Ready</h4>
          <div className="space-y-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-300 font-medium text-sm">Number assigned</span>
              </div>
              <p className="text-emerald-200 text-xs">+31 6 12345678</p>
            </div>
            <div className="bg-slate-700/50 border border-slate-600 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200 text-sm">Ready for customers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
