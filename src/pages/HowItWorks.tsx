
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  CheckCircle, 
  Phone, 
  MessageCircle, 
  Settings2, 
  Zap, 
  Users, 
  Shield, 
  Star,
  ArrowDown,
  Clock,
  Target,
  Info,
  Copy,
  AlertCircle,
  Calendar,
  Bot
} from 'lucide-react';

export default function HowItWorks() {
  const handleBookCall = () => {
    window.open('https://bookingsassistentie.com/afspraak', '_blank');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-500/20 p-4 rounded-2xl">
                <FileText className="h-10 w-10 text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Getting Started Guide
            </h1>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Welcome! You're now part of our booking assistant family. This guide will walk you through 
              exactly how to set up and use your new AI booking assistant.
            </p>
          </div>

          {/* Quick Start Overview */}
          <Card className="bg-gray-700 border-gray-600 mb-10">
            <CardHeader>
              <CardTitle className="text-xl text-green-400 flex items-center gap-3">
                <Zap className="h-5 w-5" />
                What You Get Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-500/20 p-3 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">AI Assistant</h4>
                  <p className="text-gray-300 text-sm">Your 24/7 booking agent</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500/20 p-3 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">WhatsApp Number</h4>
                  <p className="text-gray-300 text-sm">Your dedicated booking line</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-500/20 p-3 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Calendar Sync</h4>
                  <p className="text-gray-300 text-sm">Automatic booking sync</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Setup */}
          <div className="space-y-8 mb-12">
            
            {/* Step 1: Know Your Plan */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    1
                  </div>
                  <CardTitle className="text-xl text-white">Know Your Plan & Get Your Number</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                  First, let's understand what plan you have and how to get your WhatsApp number.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Plan */}
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        STANDARD PLAN
                      </Badge>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-4">Shared WhatsApp Number</h4>
                    
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h5 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Your Number is Ready!
                        </h5>
                        <p className="text-green-200 text-sm mb-3">
                          Check your dashboard for your shared WhatsApp number. It's ready to use immediately.
                        </p>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-semibold text-amber-400 mb-1">Important for Customers</h6>
                            <p className="text-amber-200 text-sm">
                              New customers must mention your business name in their first message only.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        PREMIUM PLAN
                      </Badge>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-4">Your Own WhatsApp Number</h4>
                    
                    <div className="space-y-4">
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-400 mb-2 flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Setup Required
                        </h5>
                        <p className="text-blue-200 text-sm mb-3">
                          We need to create your dedicated number and configure everything for you.
                        </p>
                        <Button 
                          onClick={handleBookCall}
                          className="w-full bg-green-500 hover:bg-green-600 text-white"
                        >
                          Book Your 15-Min Setup Call
                        </Button>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-semibold text-green-400 mb-1">What You Get</h6>
                            <p className="text-green-200 text-sm">
                              Your own dedicated WhatsApp number. No need to mention business name!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Configure Your Settings */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    2
                  </div>
                  <CardTitle className="text-xl text-white">Configure Your Business Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Before customers start booking, make sure your AI assistant knows about your business.
                </p>

                <div className="bg-gray-800 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-green-400" />
                    Essential Setup (Do This First!)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h5 className="font-medium text-green-400">Business Information</h5>
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Business name and description</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Services you offer with prices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Contact information and location</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium text-green-400">Availability Settings</h5>
                      <ul className="space-y-2 text-gray-300 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Your working hours and days</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Appointment duration for each service</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <span>Buffer time between appointments</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: How Customers Will Contact You */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    3
                  </div>
                  <CardTitle className="text-xl text-white">How Your Customers Will Book</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 leading-relaxed">
                  Here's exactly what your customers need to do to book with you:
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Plan Customer Experience */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      For Standard Plan Customers
                    </h4>
                    
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <h5 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        First Message Only!
                      </h5>
                      
                      <p className="text-amber-200 text-sm mb-3">
                        New customers must mention your business name in their first message.
                      </p>
                      
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                        <div className="text-green-300 text-sm">
                          "Hi, I want to book at <span className="bg-green-500/40 px-1 rounded font-semibold">[Your Business Name]</span>"
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h6 className="font-semibold text-green-400 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3">
                        <p className="text-gray-300 text-sm">
                          "WhatsApp ons op {"{"}nummer{"}"} en vermeld '{"{"}bedrijfsnaam{"}"}' in je eerste bericht!"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-green-400 hover:text-green-300"
                          onClick={() => copyToClipboard("WhatsApp ons op {nummer} en vermeld '{bedrijfsnaam}' in je eerste bericht!")}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Text
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan Customer Experience */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      For Premium Plan Customers
                    </h4>
                    
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h5 className="font-bold text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Simple & Direct
                      </h5>
                      
                      <p className="text-green-200 text-sm mb-3">
                        Customers can message directly. No need to mention your business name!
                      </p>
                      
                      <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                        <div className="text-green-300 text-sm">
                          "Hi, I'd like to book a massage for next week"
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h6 className="font-semibold text-green-400 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3">
                        <p className="text-gray-300 text-sm">
                          "WhatsApp ons direct op {"{"}jouw nummer{"}"} om een afspraak te maken!"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-green-400 hover:text-green-300"
                          onClick={() => copyToClipboard("WhatsApp ons direct op {jouw nummer} om een afspraak te maken!")}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Text
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: The Booking Process */}
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    4
                  </div>
                  <CardTitle className="text-xl text-white">What Happens During a Booking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Here's how a typical booking conversation works (takes about 20 seconds):
                </p>

                <div className="bg-gray-800 rounded-lg p-5">
                  <h4 className="text-lg font-semibold text-white mb-4">Sample Booking Conversation</h4>
                  
                  <div className="space-y-3">
                    {/* Customer message */}
                    <div className="flex justify-end">
                      <div className="bg-green-500 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"Can you book me for tomorrow 2 o'clock?"</p>
                      </div>
                    </div>
                    
                    {/* AI response */}
                    <div className="flex justify-start">
                      <div className="bg-gray-600 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"Sure! Which service would you like?"</p>
                        <div className="mt-2 text-xs bg-gray-700 p-2 rounded">
                          • Haircut - €25<br/>
                          • Hair + Beard - €35<br/>
                          • Styling - €20
                        </div>
                      </div>
                    </div>
                    
                    {/* Customer choice */}
                    <div className="flex justify-end">
                      <div className="bg-green-500 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"Haircut please"</p>
                      </div>
                    </div>
                    
                    {/* AI confirmation */}
                    <div className="flex justify-start">
                      <div className="bg-gray-600 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"Perfect! You're booked for tomorrow at 2:00 PM for a Haircut (€25). Can I get your name and phone number?"</p>
                      </div>
                    </div>
                    
                    {/* Customer details */}
                    <div className="flex justify-end">
                      <div className="bg-green-500 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"John Smith, 06 1234 5678"</p>
                      </div>
                    </div>
                    
                    {/* Final confirmation */}
                    <div className="flex justify-start">
                      <div className="bg-gray-600 text-white p-3 rounded-lg max-w-[70%]">
                        <p className="text-sm">"All set John! See you tomorrow at 2:00 PM ✅"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Clock className="h-5 w-5 text-green-400" />
                    <span className="text-lg font-bold text-green-400">Total Time: ~20 Seconds</span>
                  </div>
                  <p className="text-green-200 text-sm">
                    While competitors leave customers waiting hours, your AI books them instantly!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps CTA */}
          <Card className="bg-gradient-to-r from-green-500/20 to-green-600/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <Target className="h-6 w-6 text-green-400" />
                  You're Ready to Go!
                </h3>
                <p className="text-gray-300 leading-relaxed mb-6">
                  You now know exactly how your booking assistant works. Configure your settings and start sharing your WhatsApp number!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/settings'}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2"
                  >
                    Configure Settings Now
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-2"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
