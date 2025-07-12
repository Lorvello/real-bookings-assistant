
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">3</span>
          </div>
          <span className="text-purple-600 font-medium text-sm uppercase tracking-wide">Step Three</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
          Your AI assistant goes live
        </h3>
        
        <p className="text-gray-600 text-base mb-6 leading-relaxed">
          That's it! Your WhatsApp AI assistant is now active and ready to help your customers 
          book appointments automatically, 24/7.
        </p>
        
        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Bot className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Automated booking</h4>
              <p className="text-gray-600 text-sm">Customers can schedule, reschedule, or cancel appointments</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Smart responses</h4>
              <p className="text-gray-600 text-sm">AI understands context and responds naturally</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">Always available</h4>
              <p className="text-gray-600 text-sm">Works 24/7 without breaks or holidays</p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-purple-700 font-semibold text-sm">Live Status</span>
          </div>
          <p className="text-purple-600 text-sm">
            Your assistant is active and ready to handle customer inquiries
          </p>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <div className="relative mb-3">
              <MessageCircle className="w-12 h-12 text-purple-500 mx-auto" />
              <div className="absolute -inset-1 bg-purple-100 rounded-full opacity-50"></div>
            </div>
            <h4 className="text-lg font-semibold text-gray-900">AI Assistant Active</h4>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-gray-900 font-medium text-sm">Smart Scheduling</span>
              </div>
              <p className="text-gray-600 text-xs">Automatically finds available slots</p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-purple-500" />
                <span className="text-gray-900 font-medium text-sm">Customer Care</span>
              </div>
              <p className="text-gray-600 text-xs">Instant support and answers</p>
            </div>
            
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 font-medium text-sm">Live and active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
