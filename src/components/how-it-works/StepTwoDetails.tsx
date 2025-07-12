
import React from 'react';
import { CheckCircle, Shield, Star, MessageSquare, MessageCircle, Users } from 'lucide-react';

const StepTwoDetails = () => {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Step badge and content */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">2</span>
          </div>
          <span className="text-blue-600 font-medium text-sm uppercase tracking-wide">Step Two</span>
        </div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 leading-tight">
          Choose your WhatsApp number
        </h3>
        
        <p className="text-gray-600 text-base mb-6 leading-relaxed">
          We'll set up a dedicated WhatsApp number for your business. Choose between our recommended option 
          or use your existing number.
        </p>
        
        <div className="space-y-4">
          {/* Option 1: We arrange */}
          <div className="border-2 border-emerald-200 bg-emerald-50 p-4 rounded-lg relative">
            <div className="absolute top-3 right-3">
              <Star className="w-4 h-4 text-emerald-600 fill-current" />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <h4 className="text-base font-bold text-gray-900">We arrange number</h4>
              <span className="bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-medium">Recommended</span>
            </div>
            <p className="text-emerald-700 text-sm">
              Super fast, no hassle. Your unique WhatsApp number is live within minutes.
            </p>
            <div className="mt-2 text-emerald-600 text-xs">
              <strong>Perfect for:</strong> Quick start, no technical setup
            </div>
          </div>
          
          {/* Option 2: Own number */}
          <div className="border border-gray-200 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h4 className="text-base font-bold text-gray-900">Use your own number</h4>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              That's possible too. We'll help you step by step to safely connect it to our system.
            </p>
            <div className="text-gray-500 text-xs">
              <strong>Perfect for:</strong> Existing business number, brand consistency
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual representation */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="text-center">
          <div className="relative mb-4">
            <MessageCircle className="w-12 h-12 text-blue-500 mx-auto" />
            <div className="absolute -inset-1 bg-blue-100 rounded-full opacity-50"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-4">WhatsApp Ready</h4>
          <div className="space-y-3">
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-700 font-medium text-sm">Number assigned</span>
              </div>
              <p className="text-emerald-600 text-xs">+31 6 12345678</p>
            </div>
            <div className="bg-white border border-gray-200 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 text-sm">Ready for customers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepTwoDetails;
