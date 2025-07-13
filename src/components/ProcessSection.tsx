
import React, { useState } from 'react';
import WhatsAppChat from './WhatsAppChat';
import CalendarMockup from './CalendarMockup';
import AIAgentTestChat from '@/components/ui/AIAgentTestChat';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import ScrollAnimatedSection from './ScrollAnimatedSection';

const ProcessSection = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden" style={{
      backgroundColor: 'hsl(217, 35%, 12%)'
    }}>
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(71_85_105,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(71_85_105,0.1)_1px,transparent_1px)] bg-[size:64px_64px] opacity-20"></div>
      
      <div className="max-w-6xl mx-auto relative z-10 px-6 md:px-8 lg:px-12">
        <div className="space-y-12 md:space-y-32">
          {/* Header */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            config={{ threshold: 0.3 }}
            className="text-center"
          >
            <h2 className="text-xl md:text-5xl font-bold text-white mb-4 md:mb-6 px-3 sm:px-0">
              See How{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
                It Works
              </span>
            </h2>
            <p className="text-sm md:text-xl text-slate-300 max-w-3xl mx-auto px-3 sm:px-0">
              <span className="md:hidden">Your AI assistant handles everything automatically</span>
              <span className="hidden md:inline">Watch your AI assistant transform WhatsApp messages into confirmed bookings automatically</span>
            </p>
          </ScrollAnimatedSection>

          {/* Step 1: WhatsApp Chat */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <ScrollAnimatedSection 
              animation="slide-right" 
              config={{ threshold: 0.3 }}
              className="space-y-4 lg:space-y-8 order-2 lg:order-1"
            >
              <div className="px-3 sm:px-0">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl">
                    1
                  </div>
                  <h3 className="text-lg md:text-3xl font-bold text-white">Customer Sends WhatsApp</h3>
                </div>
                <p className="text-sm md:text-lg text-slate-300 leading-relaxed">
                  <span className="md:hidden">Customer messages your business WhatsApp. AI assistant responds instantly and asks the right questions to understand their booking needs.</span>
                  <span className="hidden md:inline">When a customer messages your business WhatsApp, your AI assistant responds instantly. It asks intelligent questions to understand exactly what service they need and when they're available.</span>
                </p>
              </div>
            </ScrollAnimatedSection>
            <ScrollAnimatedSection 
              animation="slide-left" 
              config={{ threshold: 0.3 }}
              className="order-1 lg:order-2"
            >
              <WhatsAppChat />
            </ScrollAnimatedSection>
          </div>

          {/* Step 2: Calendar Result */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <ScrollAnimatedSection 
              animation="slide-right" 
              config={{ threshold: 0.2 }}
              className="order-1"
            >
              <CalendarMockup />
            </ScrollAnimatedSection>
            <ScrollAnimatedSection 
              animation="slide-left" 
              config={{ threshold: 0.2 }}
              className="space-y-4 lg:space-y-8 order-2"
            >
              <div className="px-3 sm:px-0">
                <div className="flex items-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl">
                    2
                  </div>
                  <h3 className="text-lg md:text-3xl font-bold text-white">Appointment Booked</h3>
                </div>
                <p className="text-sm md:text-lg text-slate-300 leading-relaxed">
                  <span className="md:hidden">AI finds available time slots, books the appointment automatically, and sends confirmation. Customer gets all details instantly.</span>
                  <span className="hidden md:inline">Your AI assistant checks your real-time availability, finds the perfect time slot, and books the appointment automatically. The customer receives instant confirmation with all the details.</span>
                </p>
              </div>
            </ScrollAnimatedSection>
          </div>

          {/* Step 3: Test AI Agent */}
          <ScrollAnimatedSection 
            animation="fade-up" 
            config={{ threshold: 0.2 }}
            className="text-center"
          >
            <div className="space-y-4 lg:space-y-8">
              <div className="px-3 sm:px-0">
                <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold text-sm md:text-xl">
                    3
                  </div>
                  <h3 className="text-lg md:text-3xl font-bold text-white">Test AI Agent Yourself</h3>
                </div>
                <p className="text-sm md:text-lg text-slate-300 leading-relaxed mb-6 md:mb-8">
                  <span className="md:hidden">Try our AI assistant now and see how it handles booking conversations</span>
                  <span className="hidden md:inline">Experience the power of our AI assistant firsthand. See how naturally it handles complex booking conversations and manages your calendar.</span>
                </p>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 md:px-8 md:py-4 text-sm md:text-lg">
                      <MessageCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                      Try AI Assistant
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-4xl h-[80vh]">
                    <AIAgentTestChat />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </ScrollAnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default ProcessSection;
