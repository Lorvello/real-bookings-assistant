
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
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-500/20 p-4 rounded-2xl">
                <FileText className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Getting Started Guide
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Welcome! You're now part of our booking assistant family. This guide will walk you through 
              exactly how to set up and use your new AI booking assistant.
            </p>
          </div>

          {/* Quick Start Overview */}
          <Card className="bg-blue-900/20 border-blue-500/30 mb-12">
            <CardHeader>
              <CardTitle className="text-2xl text-blue-400 flex items-center gap-3">
                <Zap className="h-6 w-6" />
                What You Get Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-green-500/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-green-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">AI Assistant</h4>
                  <p className="text-gray-300 text-sm">Your 24/7 booking agent that never sleeps</p>
                </div>
                <div className="text-center">
                  <div className="bg-blue-500/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <MessageCircle className="h-8 w-8 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">WhatsApp Number</h4>
                  <p className="text-gray-300 text-sm">Your dedicated line for customer bookings</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-500/20 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-white mb-2">Calendar Sync</h4>
                  <p className="text-gray-300 text-sm">Automatic booking to your calendar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Setup */}
          <div className="space-y-12 mb-16">
            
            {/* Step 1: Know Your Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <CardTitle className="text-2xl text-white">Know Your Plan & Get Your Number</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  First, let's understand what plan you have and how to get your WhatsApp number.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Plan */}
                  <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        STANDARD PLAN
                      </Badge>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4">Shared WhatsApp Number</h4>
                    
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <h5 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Your Number is Ready!
                        </h5>
                        <p className="text-green-200 text-sm mb-3">
                          Check your dashboard for your shared WhatsApp number. It's ready to use immediately.
                        </p>
                        <div className="bg-gray-800 border border-gray-600 rounded p-3">
                          <div className="text-center">
                            <div className="text-green-400 font-mono text-lg">+31 6 XXXX XXXX</div>
                            <div className="text-xs text-gray-400 mt-1">Example shared number</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-semibold text-amber-400 mb-1">Important for Customers</h6>
                            <p className="text-amber-200 text-sm">
                              Since this number is shared, new customers must mention your business name 
                              in their <strong>very first message only</strong>. After that, the system remembers them automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        PREMIUM PLAN
                      </Badge>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-4">Your Own WhatsApp Number</h4>
                    
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
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Book Your 15-Min Setup Call
                        </Button>
                      </div>

                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-semibold text-green-400 mb-1">What You Get</h6>
                            <p className="text-green-200 text-sm">
                              Your own dedicated WhatsApp number that customers can contact directly. 
                              No need to mention your business name - it's all yours!
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="h-8 w-8 text-green-400" />
            </div>

            {/* Step 2: Configure Your Settings */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <CardTitle className="text-2xl text-white">Configure Your Business Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  Before customers start booking, make sure your AI assistant knows about your business.
                </p>

                <div className="grid gap-6">
                  <div className="bg-gray-700 rounded-lg p-6">
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
                        <h5 className="font-medium text-blue-400">Availability Settings</h5>
                        <ul className="space-y-2 text-gray-300 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Your working hours and days</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Appointment duration for each service</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span>Buffer time between appointments</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-blue-200 text-sm flex items-start gap-2">
                        <Target className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>
                          <strong>Pro Tip:</strong> Go to your Settings page right now to configure these. 
                          Your AI assistant won't work properly until this is done!
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="h-8 w-8 text-green-400" />
            </div>

            {/* Step 3: How Customers Will Contact You */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <CardTitle className="text-2xl text-white">How Your Customers Will Book</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <p className="text-gray-300 text-lg leading-relaxed">
                  Now that you're set up, here's exactly what your customers need to do to book with you:
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Plan Customer Experience */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-green-400 flex items-center gap-2">
                      <MessageCircle className="h-5 w-5" />
                      For Standard Plan Customers
                    </h4>
                    
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-6">
                      <h5 className="font-bold text-amber-400 mb-4 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        First Message Only - Very Important!
                      </h5>
                      
                      <div className="space-y-4">
                        <p className="text-amber-200 text-sm leading-relaxed">
                          Since multiple businesses share this WhatsApp number, <strong>new customers must mention 
                          your business name in their very first message</strong>. This tells our AI which business they want to book with.
                        </p>
                        
                        <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                          <div className="text-center mb-3">
                            <div className="text-xs text-gray-400 mb-2">✅ CORRECT first message example:</div>
                            <div className="bg-green-600/20 border border-green-500/40 rounded-lg p-4">
                              <div className="text-green-300 text-sm">
                                "Hi, I want to book a haircut at <span className="bg-green-500/40 px-2 py-1 rounded font-semibold">[Your Business Name]</span>"
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <h6 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            After The First Message
                          </h6>
                          <p className="text-green-200 text-sm">
                            Great news! After that first message, customers can chat normally. 
                            The AI remembers who they are and automatically connects them to your business for all future messages.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <h6 className="font-semibold text-blue-400 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3">
                        <p className="text-gray-300 text-sm font-mono">
                          "WhatsApp ons op {"{"}nummer{"}"} en vermeld '{"{"}jouw bedrijfsnaam{"}"}' in je eerste bericht om een afspraak te maken!"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-blue-400 hover:text-blue-300"
                          onClick={() => copyToClipboard("WhatsApp ons op {nummer} en vermeld '{jouw bedrijfsnaam}' in je eerste bericht om een afspraak te maken!")}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Text
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan Customer Experience */}
                  <div className="space-y-6">
                    <h4 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      For Premium Plan Customers
                    </h4>
                    
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
                      <h5 className="font-bold text-blue-400 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Simple & Professional
                      </h5>
                      
                      <div className="space-y-4">
                        <p className="text-blue-200 text-sm leading-relaxed">
                          Your customers can message your dedicated WhatsApp number directly. 
                          <strong> No need to mention your business name</strong> - the number belongs to you alone!
                        </p>
                        
                        <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                          <div className="text-center mb-3">
                            <div className="text-xs text-gray-400 mb-2">✅ Example customer message:</div>
                            <div className="bg-blue-600/20 border border-blue-500/40 rounded-lg p-4">
                              <div className="text-blue-300 text-sm">
                                "Hi, I'd like to book a massage for next week"
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <p className="text-green-200 text-sm flex items-start gap-2">
                            <Star className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Professional Advantage:</strong> Your customers always know they're talking 
                              directly to your business. No confusion, no sharing with others.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <h6 className="font-semibold text-green-400 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-gray-800 border border-gray-600 rounded p-3">
                        <p className="text-gray-300 text-sm font-mono">
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

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="h-8 w-8 text-green-400" />
            </div>

            {/* Step 4: The Booking Process */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                  <CardTitle className="text-2xl text-white">What Happens During a Booking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  Once a customer sends their message, here's the step-by-step process your AI assistant follows:
                </p>

                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: "Friendly Welcome",
                      description: "The AI greets your customer warmly and asks what service they need.",
                      example: '"Hi! Welcome to [Your Business]. I\'m here to help you book an appointment. What service are you interested in?"'
                    },
                    {
                      step: 2,
                      title: "Service Selection",
                      description: "The AI shows available services with prices and asks the customer to choose.",
                      example: '"We offer: Haircut (€25), Hair + Beard (€35), Styling (€20). Which would you prefer?"'
                    },
                    {
                      step: 3,
                      title: "Date Preference",
                      description: "The AI asks when the customer would like their appointment.",
                      example: '"Great choice! When would you like to schedule this? Any specific day or time preference?"'
                    },
                    {
                      step: 4,
                      title: "Check Availability",
                      description: "The AI checks your real-time calendar and suggests available time slots.",
                      example: '"Let me check availability... I have these times free: Today 2:00 PM, Tomorrow 10:00 AM, Friday 3:30 PM. Which works best?"'
                    },
                    {
                      step: 5,
                      title: "Confirm Details",
                      description: "The AI confirms all appointment details and gets customer information.",
                      example: '"Perfect! So that\'s a Haircut on Friday at 3:30 PM for €25. Can I get your full name and phone number?"'
                    },
                    {
                      step: 6,
                      title: "Book & Confirm",
                      description: "The AI books the appointment and sends confirmation to both you and the customer.",
                      example: '"All booked! You\'ll receive a confirmation message shortly. See you Friday at 3:30 PM!"'
                    }
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 p-4 bg-gray-700 rounded-lg">
                      <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {item.step}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-white mb-2">{item.title}</h5>
                        <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                        <div className="bg-gray-800 border border-gray-600 rounded p-3">
                          <p className="text-green-300 text-xs italic">"{item.example}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Clock className="h-6 w-6 text-green-400" />
                    <span className="text-xl font-bold text-green-400">Average Booking Time: 2-3 Minutes</span>
                  </div>
                  <p className="text-green-200">
                    While your competitors leave customers waiting for hours, your AI books them instantly - 
                    even at 2 AM on Sunday!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps CTA */}
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-500/30">
            <CardContent className="p-8 text-center">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <Target className="h-8 w-8 text-green-400" />
                  You're Ready to Go!
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  You now know exactly how your booking assistant works. If you haven't configured your 
                  business settings yet, do that first. Then start sharing your WhatsApp number with customers!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/settings'}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3"
                  >
                    Configure Settings Now
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
                  >
                    Go to Dashboard
                  </Button>
                </div>
                <p className="text-gray-400 text-sm mt-6">
                  Need help? Check your dashboard for your WhatsApp number and contact support anytime.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
