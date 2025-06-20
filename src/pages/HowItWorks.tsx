
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
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Getting Started Guide
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Welcome! This guide will walk you through how to set up and use your new AI booking assistant.
            </p>
          </div>

          {/* Quick Start Overview */}
          <Card className="bg-blue-50 border-blue-200 mb-10">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                What You Get Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="bg-blue-100 p-2 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">AI Assistant</h4>
                  <p className="text-gray-600 text-sm">Your 24/7 booking agent</p>
                </div>
                <div className="text-center">
                  <div className="bg-green-100 p-2 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">WhatsApp Number</h4>
                  <p className="text-gray-600 text-sm">Your dedicated booking line</p>
                </div>
                <div className="text-center">
                  <div className="bg-purple-100 p-2 rounded-lg w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-1">Calendar Sync</h4>
                  <p className="text-gray-600 text-sm">Automatic booking</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Step-by-Step Setup */}
          <div className="space-y-8 mb-12">
            
            {/* Step 1: Know Your Plan */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    1
                  </div>
                  <CardTitle className="text-xl text-gray-900">Know Your Plan & Get Your Number</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700">
                  First, let's understand what plan you have and how to get your WhatsApp number.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Plan */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        STANDARD PLAN
                      </Badge>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Shared WhatsApp Number</h4>
                    
                    <div className="space-y-3">
                      <div className="bg-white border border-green-200 rounded-lg p-3">
                        <h5 className="font-medium text-green-700 mb-2 flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Your Number is Ready!
                        </h5>
                        <p className="text-green-600 text-sm mb-2">
                          Check your dashboard for your shared WhatsApp number. It's ready to use immediately.
                        </p>
                        <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center">
                          <div className="text-green-600 font-mono">+31 6 XXXX XXXX</div>
                          <div className="text-xs text-gray-500 mt-1">Example shared number</div>
                        </div>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-medium text-amber-800 mb-1">Important for Customers</h6>
                            <p className="text-amber-700 text-sm">
                              New customers must mention your business name in their <strong>first message only</strong>. 
                              After that, the system remembers them.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        PREMIUM PLAN
                      </Badge>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Own WhatsApp Number</h4>
                    
                    <div className="space-y-3">
                      <div className="bg-white border border-blue-200 rounded-lg p-3">
                        <h5 className="font-medium text-blue-700 mb-2 flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Setup Required
                        </h5>
                        <p className="text-blue-600 text-sm mb-3">
                          We need to create your dedicated number and configure everything for you.
                        </p>
                        <Button 
                          onClick={handleBookCall}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Book Your 15-Min Setup Call
                        </Button>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h6 className="font-medium text-green-700 mb-1">What You Get</h6>
                            <p className="text-green-600 text-sm">
                              Your own dedicated WhatsApp number. No need to mention your business name!
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
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    2
                  </div>
                  <CardTitle className="text-xl text-gray-900">Configure Your Business Settings</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Before customers start booking, make sure your AI assistant knows about your business.
                </p>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    Essential Setup (Do This First!)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h5 className="font-medium text-blue-600">Business Information</h5>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          <span>Business name and description</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          <span>Services you offer with prices</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                          <span>Contact information and location</span>
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h5 className="font-medium text-green-600">Availability Settings</h5>
                      <ul className="space-y-1 text-gray-700 text-sm">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Your working hours and days</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Appointment duration for each service</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
                          <span>Buffer time between appointments</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-700 text-sm flex items-start gap-2">
                      <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Important:</strong> Go to your Settings page now to configure these. 
                        Your AI assistant won't work properly until this is done!
                      </span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: How Customers Will Contact You */}
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    3
                  </div>
                  <CardTitle className="text-xl text-gray-900">How Your Customers Will Book</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-700">
                  Here's exactly what your customers need to do to book with you:
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Plan Customer Experience */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-green-600 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      For Standard Plan Customers
                    </h4>
                    
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h5 className="font-medium text-amber-800 mb-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        First Message Only - Important!
                      </h5>
                      
                      <div className="space-y-3">
                        <p className="text-amber-700 text-sm">
                          New customers must mention your business name in their first message.
                        </p>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">✅ Correct first message:</div>
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <div className="text-green-700 text-sm">
                              "Hi, I want to book at <span className="bg-green-200 px-1 rounded font-medium">[Your Business Name]</span>"
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h6 className="font-medium text-green-700 mb-1 flex items-center gap-2">
                            <Star className="h-3 w-3" />
                            After The First Message
                          </h6>
                          <p className="text-green-600 text-sm">
                            Customers can chat normally. The AI remembers them for all future messages.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <h6 className="font-medium text-blue-700 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-white border border-gray-200 rounded p-2">
                        <p className="text-gray-700 text-sm font-mono">
                          "WhatsApp ons op {"{"}nummer{"}"} en vermeld '{"{"}jouw bedrijfsnaam{"}"}' in je eerste bericht!"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-blue-600 hover:text-blue-700"
                          onClick={() => copyToClipboard("WhatsApp ons op {nummer} en vermeld '{jouw bedrijfsnaam}' in je eerste bericht!")}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Text
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan Customer Experience */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-blue-600 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      For Premium Plan Customers
                    </h4>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Simple & Professional
                      </h5>
                      
                      <div className="space-y-3">
                        <p className="text-blue-700 text-sm">
                          Customers can message your dedicated WhatsApp number directly. 
                          <strong> No need to mention your business name</strong>!
                        </p>
                        
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-2">✅ Example customer message:</div>
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <div className="text-blue-700 text-sm">
                              "Hi, I'd like to book a massage for next week"
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-green-700 text-sm flex items-start gap-2">
                            <Star className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>
                              <strong>Professional:</strong> Your customers always know they're talking 
                              directly to your business.
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <h6 className="font-medium text-green-700 mb-2">Share This With Your Customers:</h6>
                      <div className="bg-white border border-gray-200 rounded p-2">
                        <p className="text-gray-700 text-sm font-mono">
                          "WhatsApp ons direct op {"{"}jouw nummer{"}"} om een afspraak te maken!"
                        </p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 text-green-600 hover:text-green-700"
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
            <Card className="border-gray-200">
              <CardHeader>
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                    4
                  </div>
                  <CardTitle className="text-xl text-gray-900">What Happens During a Booking</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  Here's how a typical 20-second booking conversation works:
                </p>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        C
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                        <p className="text-green-800 text-sm font-medium">Customer:</p>
                        <p className="text-green-700 text-sm">"Can you book me for tomorrow 2 o'clock?"</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                        <p className="text-blue-800 text-sm font-medium">AI Assistant:</p>
                        <p className="text-blue-700 text-sm">"Which service would you like?"</p>
                        <div className="mt-2 text-blue-600 text-xs">
                          • Haircut (€25, 30 min)<br/>
                          • Hair + Beard (€35, 45 min)<br/>
                          • Styling (€20, 20 min)
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        C
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                        <p className="text-green-800 text-sm font-medium">Customer:</p>
                        <p className="text-green-700 text-sm">"Haircut please"</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                        <p className="text-blue-800 text-sm font-medium">AI Assistant:</p>
                        <p className="text-blue-700 text-sm">"Perfect! Booked: Haircut tomorrow at 2:00 PM for €25. Can I get your name and phone number?"</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-green-100 text-green-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        C
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex-1">
                        <p className="text-green-800 text-sm font-medium">Customer:</p>
                        <p className="text-green-700 text-sm">"John Smith, 06-12345678"</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center font-medium text-xs flex-shrink-0">
                        AI
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                        <p className="text-blue-800 text-sm font-medium">AI Assistant:</p>
                        <p className="text-blue-700 text-sm">"All set! You'll receive a confirmation message. See you tomorrow at 2:00 PM!"</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="text-lg font-medium text-green-800">Total Time: 20 Seconds</span>
                  </div>
                  <p className="text-green-700 text-sm">
                    While competitors leave customers waiting hours, your AI books them instantly!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Steps CTA */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6 text-center">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
                  <Target className="h-6 w-6 text-blue-600" />
                  You're Ready to Go!
                </h3>
                <p className="text-gray-700 mb-6">
                  You now know exactly how your booking assistant works. Configure your business settings first, 
                  then start sharing your WhatsApp number with customers!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    onClick={() => window.location.href = '/settings'}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
                  >
                    Configure Settings Now
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2"
                  >
                    Go to Dashboard
                  </Button>
                </div>
                <p className="text-gray-500 text-sm mt-4">
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
