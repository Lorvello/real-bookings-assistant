
import React from 'react';
import Navbar from '@/components/Navbar';
import ProcessSection from '@/components/ProcessSection';
import Timeline from '@/components/Timeline';
import HowItWorks from '@/components/HowItWorks';
import { MessageCircle, Calendar, CheckCircle, Clock, Users, Zap } from 'lucide-react';

const SeeHowItWorks = () => {
  const benefits = [
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Your AI agent never sleeps, books appointments around the clock"
    },
    {
      icon: Users,
      title: "Unlimited Capacity",
      description: "Handle hundreds of booking requests simultaneously"
    },
    {
      icon: Zap,
      title: "Instant Response",
      description: "Customers get immediate replies, no more waiting"
    },
    {
      icon: CheckCircle,
      title: "99% Accuracy",
      description: "AI understands context and books correctly every time"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            See How <span className="text-green-600">AI Booking</span> Works
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
            Watch how our intelligent AI agent transforms a simple WhatsApp message 
            into a confirmed appointment in under 30 seconds
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {benefits.map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4 mx-auto">
                  <benefit.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <ProcessSection />
      
      {/* Timeline */}
      <Timeline />
      
      {/* How It Works */}
      <HowItWorks />
      
      {/* Detailed Breakdown */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Behind the Scenes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Understanding what happens when your AI agent handles a booking request
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">1</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Analysis</h3>
                  <p className="text-gray-600">AI analyzes the customer's message, understanding intent, service needs, and urgency level.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">2</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Calendar Check</h3>
                  <p className="text-gray-600">Real-time availability check across all your connected calendars and booking systems.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">3</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Qualification</h3>
                  <p className="text-gray-600">Asks intelligent follow-up questions to gather all necessary booking information.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-sm font-bold">4</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Instant Booking</h3>
                  <p className="text-gray-600">Confirms the appointment, updates your calendar, and sends confirmations to both parties.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Average Booking Time</h3>
                <div className="text-5xl font-bold text-green-600 mb-2">23s</div>
                <p className="text-gray-600 mb-6">From first message to confirmed appointment</p>
                
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-green-800 font-medium">
                    <strong>300% faster</strong> than traditional booking methods
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-br from-green-600 to-emerald-600 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Automate Your Bookings?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of businesses already using AI to book more appointments
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition-colors">
              Start Free Trial
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors">
              See Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SeeHowItWorks;
