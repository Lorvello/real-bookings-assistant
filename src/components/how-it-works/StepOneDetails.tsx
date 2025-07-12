
import React from 'react';
import { CheckCircle, Calendar, Settings, Clock, Sparkles } from 'lucide-react';

const StepOneDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">1</span>
          </div>
          <span className="text-emerald-600 font-medium text-sm uppercase tracking-wide">Step One</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
          Quick setup in your calendar system
        </h3>
        
        <p className="text-gray-600 text-base mb-6 leading-relaxed">
          Connect your existing calendar (Google Calendar, Calendly, or Cal.com) and we'll automatically 
          sync your availability. No complicated setup required.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-gray-700">Automatic availability sync</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-gray-700">Real-time booking prevention</span>
          </div>
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <span className="text-gray-700">Multiple calendar support</span>
          </div>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="text-center">
          <div className="relative mb-4">
            <Calendar className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="absolute -inset-1 bg-emerald-100 rounded-full opacity-50"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Connected</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <span className="text-gray-700 text-sm">Google Calendar</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 text-sm font-medium">Live sync active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepOneDetails;
