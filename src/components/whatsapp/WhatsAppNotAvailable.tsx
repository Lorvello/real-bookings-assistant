
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, AlertCircle, Zap } from 'lucide-react';
import { useUserStatus } from '@/contexts/UserStatusContext';

export const WhatsAppNotAvailable: React.FC = () => {
  const { userStatus } = useUserStatus();

  const getTitle = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return 'Your WhatsApp Booking Agent is Not Active';
      case 'canceled_and_inactive':
        return 'Your WhatsApp Booking Agent is Not Active';
      default:
        return 'WhatsApp Booking Agent Unavailable';
    }
  };

  const getDescription = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return 'Your trial has expired. Upgrade now to reactivate your WhatsApp booking assistant and continue receiving bookings via WhatsApp.';
      case 'canceled_and_inactive':
        return 'Your subscription has been canceled and has expired. Resubscribe to reactivate your WhatsApp booking assistant.';
      default:
        return 'The WhatsApp booking agent is currently not available for your account.';
    }
  };

  const getActionText = () => {
    switch (userStatus.userType) {
      case 'expired_trial':
        return 'Upgrade Now';
      case 'canceled_and_inactive':
        return 'Resubscribe';
      default:
        return 'Learn More';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl shadow-lg p-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageCircle className="h-8 w-8 text-gray-400" />
            <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
              <AlertCircle className="h-3 w-3 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {getTitle()}
            </h1>
            <p className="text-gray-400 mt-1">Upgrade to activate your WhatsApp booking assistant</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="bg-slate-800/90 border-slate-700/50">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Reactivate Your WhatsApp Booking Agent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 text-lg leading-relaxed">
              {getDescription()}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <Zap className="h-6 w-6 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-100 mb-3 text-lg">
                  WhatsApp Booking Agent Features
                </h3>
                <ul className="text-blue-200 space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                    24/7 automated booking responses
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                    Intelligent appointment scheduling
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                    Real-time availability checking
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                    Customer communication management
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                    Seamless calendar integration
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" size="lg">
              {getActionText()}
            </Button>
            <Button variant="outline" size="lg" className="flex-1 border-slate-600 text-gray-300 hover:bg-slate-700">
              Contact Support
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-400">
              Need help? Contact our support team for assistance with your subscription.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
