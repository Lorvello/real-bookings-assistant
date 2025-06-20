
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
  Target
} from 'lucide-react';

export default function HowItWorks() {
  const handleBookCall = () => {
    window.open('https://bookingsassistentie.com/afspraak', '_blank');
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
              How Our Booking Assistant Works
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Learn how to set up your automated WhatsApp booking assistant in just a few simple steps. 
              No technical knowledge required!
            </p>
          </div>

          {/* Step-by-Step Tutorial */}
          <div className="space-y-12 mb-16">
            {/* Step 1: Choose Your Plan */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    1
                  </div>
                  <CardTitle className="text-2xl text-white">Choose Your Plan</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  We offer two different plans to match your business needs. Here's what each plan offers:
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Plan Card */}
                  <div className="bg-gray-700 rounded-lg p-6 border border-green-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                        STANDARD PLAN
                      </Badge>
                      <div className="text-green-400 font-semibold">Most Popular</div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">Shared WhatsApp Number</h4>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Get started immediately - no setup required</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Share one WhatsApp number with other businesses</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Perfect for trying out the service</span>
                      </li>
                    </ul>
                  </div>

                  {/* Premium Plan Card */}
                  <div className="bg-gray-700 rounded-lg p-6 border border-blue-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                        PREMIUM PLAN
                      </Badge>
                      <div className="text-blue-400 font-semibold">Professional</div>
                    </div>
                    <h4 className="text-xl font-bold text-white mb-3">Your Own WhatsApp Number</h4>
                    <ul className="space-y-3 text-gray-300">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>Get your own dedicated WhatsApp number</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>Complete privacy - no sharing with others</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                        <span>Professional branding with your logo</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="h-8 w-8 text-green-400" />
            </div>

            {/* Step 2: Getting Started */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    2
                  </div>
                  <CardTitle className="text-2xl text-white">Getting Started</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Plan Setup */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-green-400 flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Standard Plan Setup
                    </h4>
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <p className="text-green-100 mb-4">
                        <strong>Super Easy!</strong> Just create your account and you're ready to go.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                          <span className="text-green-100">Sign up for an account</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                          <span className="text-green-100">Get your shared WhatsApp number</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                          <span className="text-green-100">Start accepting bookings immediately!</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan Setup */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Premium Plan Setup
                    </h4>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <p className="text-blue-100 mb-4">
                        <strong>Personal Touch!</strong> We'll set up everything for you.
                      </p>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                          <span className="text-blue-100">Book a 15-minute setup call</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                          <span className="text-blue-100">We create your dedicated number</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                          <span className="text-blue-100">We configure everything for you</span>
                        </div>
                      </div>
                      <Button 
                        onClick={handleBookCall}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Book Your Setup Call
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Arrow Down */}
            <div className="flex justify-center">
              <ArrowDown className="h-8 w-8 text-green-400" />
            </div>

            {/* Step 3: How Customers Contact You */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    3
                  </div>
                  <CardTitle className="text-2xl text-white">How Customers Contact You</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  Once you're set up, your customers can start booking appointments by sending a WhatsApp message. 
                  Here's what they need to know:
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Standard Plan Customer Instructions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-green-400">Standard Plan Customers</h4>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-5">
                      <h5 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Important: First Message Only
                      </h5>
                      <p className="text-amber-100 mb-4 text-sm leading-relaxed">
                        Since multiple businesses share this number, <strong>new customers must mention your business name in their very first message</strong>. 
                        After that, our system remembers them automatically.
                      </p>
                      
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 mb-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-2">Example of first message:</div>
                          <div className="bg-green-600/20 border border-green-500/30 rounded-lg p-3">
                            <div className="text-green-300 font-medium">
                              "Hi, I want to book an appointment at <span className="bg-green-500/30 px-2 py-1 rounded">[Your Business Name]</span>"
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-xs text-green-200 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Good news:</strong> After this first message, customers can chat normally. 
                            The system remembers who they are and which business they want to book with.
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Plan Customer Instructions */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-blue-400">Premium Plan Customers</h4>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
                      <h5 className="font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Simple & Direct
                      </h5>
                      <p className="text-blue-100 mb-4 text-sm leading-relaxed">
                        Your customers can message your dedicated number directly. No need to mention your business name - 
                        the number is yours alone!
                      </p>
                      
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-4 mb-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-400 mb-2">Example message:</div>
                          <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3">
                            <div className="text-blue-300 font-medium">
                              "Hi, I'd like to book an appointment for next week"
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-xs text-blue-200 flex items-start gap-2">
                          <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>Professional:</strong> Your customers always know they're talking to your business. 
                            No confusion, no sharing.
                          </span>
                        </p>
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

            {/* Step 4: The Magic Happens */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-green-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    4
                  </div>
                  <CardTitle className="text-2xl text-white">The Magic Happens Automatically</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-gray-300 text-lg leading-relaxed">
                  Once a customer sends their message, our AI assistant takes over and handles everything for you:
                </p>

                <div className="grid gap-6">
                  <div className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">AI Greets the Customer</h5>
                      <p className="text-gray-300">
                        The assistant responds immediately with a friendly greeting and asks what service they need.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">Gathers Information</h5>
                      <p className="text-gray-300">
                        The AI asks smart questions to understand what the customer needs and when they're available.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">Checks Your Calendar</h5>
                      <p className="text-gray-300">
                        The assistant looks at your real-time availability and suggests the best appointment times.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">Books the Appointment</h5>
                      <p className="text-gray-300">
                        Once the customer confirms, the AI books the appointment and adds it to your calendar automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-gray-700 rounded-lg">
                    <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      5
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">Sends Confirmations</h5>
                      <p className="text-gray-300">
                        Both you and your customer receive confirmation messages with all the appointment details.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Clock className="h-6 w-6 text-green-400" />
                    <span className="text-xl font-bold text-green-400">Average Time: Under 3 Minutes</span>
                  </div>
                  <p className="text-green-200">
                    While your competitors make customers wait hours for a response, your AI assistant books them instantly!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA */}
          <Card className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-green-500/30">
            <CardContent className="p-8 text-center">
              <div className="max-w-3xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                  <Target className="h-8 w-8 text-green-400" />
                  Ready to Get Started?
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-8">
                  Choose the plan that fits your business best. You can always upgrade later as you grow. 
                  Both plans come with full support and a money-back guarantee.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-3"
                  >
                    Start with Standard Plan
                  </Button>
                  <Button 
                    onClick={handleBookCall}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
                  >
                    Book Premium Setup Call
                  </Button>
                </div>
                <p className="text-gray-400 text-sm mt-4">
                  Questions? Contact us anytime - we're here to help!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
