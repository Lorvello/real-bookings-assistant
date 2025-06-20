
import React from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, CheckCircle, Phone, MessageCircle, Settings2, Zap, Users, Shield, Star } from 'lucide-react';

export default function HowItWorks() {
  const handleBookCall = () => {
    window.open('https://bookingsassistentie.com/afspraak', '_blank');
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="bg-green-500/20 p-4 rounded-2xl">
                <FileText className="h-12 w-12 text-green-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              We offer two subscription plans tailored to different business needs. 
              Here's what you get with each plan and what to tell your customers.
            </p>
          </div>

          {/* Plans Comparison */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Standard Plan */}
            <Card className="bg-gray-800 border-gray-700 hover:border-green-500/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-4 py-2 text-sm font-semibold">
                    STANDARD
                  </Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">Plan 1</div>
                    <div className="text-sm text-gray-400">Shared Number</div>
                  </div>
                </div>
                <CardTitle className="text-2xl text-white">Quick Start Solution</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Create your account with us instantly</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MessageCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Get access to our shared WhatsApp number</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Activate your booking assistant immediately</p>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="bg-amber-500/20 p-2 rounded-lg">
                      <MessageCircle className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-400 mb-2">Important Note</h4>
                      <p className="text-sm text-amber-100 mb-3">
                        Since multiple businesses share this number, customers must include your business name in their first message:
                      </p>
                      <div className="bg-gray-900 border border-gray-600 rounded-lg p-3 font-mono text-sm text-green-400">
                        "Plan me in bij [Your Business Name]"
                      </div>
                      <p className="text-xs text-amber-200 mt-2">
                        After this, the system automatically handles everything else.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <Star className="h-4 w-4 mr-2 text-green-400" />
                    Key Benefits
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 justify-start py-2">
                      <Zap className="h-3 w-3 mr-2" />
                      Instant setup
                    </Badge>
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 justify-start py-2">
                      <CheckCircle className="h-3 w-3 mr-2" />
                      Cost-effective
                    </Badge>
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 justify-start py-2">
                      <Settings2 className="h-3 w-3 mr-2" />
                      No technical setup required
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="bg-gray-800 border-gray-700 hover:border-blue-500/50 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-2 text-sm font-semibold">
                    PREMIUM
                  </Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">Plan 2</div>
                    <div className="text-sm text-gray-400">Dedicated Number</div>
                  </div>
                </div>
                <CardTitle className="text-2xl text-white">Professional Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Your own unique WhatsApp business number</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Shield className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Complete privacy - no sharing with other businesses</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Custom branding with your logo and business info</p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Settings2 className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                    <p className="text-gray-300">Full control over customer experience</p>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-400 mb-3 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    How to Get Started
                  </h4>
                  <p className="text-sm text-blue-100 mb-4">
                    Book a quick consultation call with our team. We'll handle the setup and activation of your dedicated number.
                  </p>
                  <Button 
                    onClick={handleBookCall}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  >
                    Schedule Setup Call
                  </Button>
                  <p className="text-xs text-blue-200 mt-3 text-center">
                    bookingsassistentie.com/afspraak
                  </p>
                </div>

                <div className="pt-4">
                  <h4 className="font-semibold text-white mb-4 flex items-center">
                    <Star className="h-4 w-4 mr-2 text-blue-400" />
                    Key Benefits
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 justify-start py-2">
                      <Shield className="h-3 w-3 mr-2" />
                      Complete control
                    </Badge>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 justify-start py-2">
                      <Users className="h-3 w-3 mr-2" />
                      No customer confusion
                    </Badge>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 justify-start py-2">
                      <Settings2 className="h-3 w-3 mr-2" />
                      Professional appearance
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bottom CTA Section */}
          <Card className="bg-gradient-to-r from-gray-800 to-gray-700 border-gray-600">
            <CardContent className="p-8 text-center">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-3xl font-bold text-white mb-4">
                  Which Plan Fits Your Business?
                </h3>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  Start with our Standard plan for immediate access, or choose Premium for a fully branded, 
                  professional experience. You can always upgrade later as your business grows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="border-gray-500 text-gray-300 hover:bg-gray-700">
                    Learn More About Pricing
                  </Button>
                  <Button 
                    onClick={handleBookCall}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                  >
                    Get Started Today
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
