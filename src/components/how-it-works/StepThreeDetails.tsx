
import React from 'react';
import { MessageCircle, Calendar, Users, CheckCircle, Bot, Sparkles, Zap, Clock } from 'lucide-react';

const StepThreeDetails = () => {
  return (
    <div className="relative">
      {/* Step Header */}
      <div className="text-center mb-16">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/25">
            <span className="text-white text-2xl font-bold">3</span>
          </div>
          <div className="text-left">
            <h3 className="text-4xl lg:text-5xl font-bold text-white mb-2">
              Your assistant <span className="text-purple-400">goes live</span>
            </h3>
            <div className="flex items-center gap-3 text-purple-300">
              <Bot className="w-5 h-5" />
              <span className="text-lg font-medium">AI-powered & fully automated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-2 gap-16 items-start">
        
        {/* Left Content */}
        <div className="space-y-8">
          
          {/* What Customers Can Do */}
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-8">
            <h4 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-purple-400" />
              What your customers can do via WhatsApp
            </h4>
            
            <div className="space-y-4">
              {[
                'Book appointments (based on your real-time calendar)',
                'Reschedule or cancel existing appointments',
                'Get immediate personal help, without waiting time',
                'Ask questions about your services'
              ].map((item, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 font-medium leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Automation Highlight */}
          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <Sparkles className="w-8 h-8 text-purple-400" />
              <span className="text-purple-400 font-bold text-2xl">Fully automated</span>
            </div>
            <p className="text-slate-200 text-lg leading-relaxed">
              You don't have to do anything yourself. Your smart assistant handles everything — 24/7, 
              fully automatic, in your personal style and tone.
            </p>
          </div>
        </div>
        
        {/* Right Content - Features & Status */}
        <div className="space-y-8">
          
          {/* AI Features */}
          <div className="space-y-4">
            <h4 className="text-2xl font-bold text-white mb-6">Intelligent capabilities</h4>
            
            {[
              {
                icon: MessageCircle,
                title: 'Natural conversations',
                description: 'Understands context and responds like a human assistant.',
                color: 'purple'
              },
              {
                icon: Calendar,
                title: 'Smart scheduling',
                description: 'Automatically checks availability and finds optimal time slots.',
                color: 'purple'
              },
              {
                icon: Users,
                title: 'Personal service',
                description: 'Provides personalized attention for every customer interaction.',
                color: 'purple'
              }
            ].map((feature, index) => {
              const Icon = feature.icon;
              
              return (
                <div key={index} className="bg-slate-800/50 border border-slate-600/50 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shrink-0">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-lg mb-2">{feature.title}</h5>
                      <p className="text-slate-300 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Live Status */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
            </div>
            
            <h4 className="font-bold text-white mb-3 flex items-center justify-center gap-3 text-xl">
              <Zap className="w-6 h-6 text-green-400" />
              Active 24/7
            </h4>
            <p className="text-slate-300 text-lg mb-4">Live and ready since today</p>
            
            <div className="flex items-center justify-center gap-4 text-green-300">
              <Clock className="w-5 h-5" />
              <span className="font-medium">Never sleeps, never takes a break</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepThreeDetails;
