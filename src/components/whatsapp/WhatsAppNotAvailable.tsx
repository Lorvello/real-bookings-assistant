import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, AlertCircle, Zap } from 'lucide-react';
import { useUserStatus } from '@/hooks/useUserStatus';

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <MessageCircle className="h-16 w-16 text-gray-400" />
              <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                <AlertCircle className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {getTitle()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
              {getDescription()}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  WhatsApp Booking Agent Features
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• 24/7 automated booking responses</li>
                  <li>• Intelligent appointment scheduling</li>
                  <li>• Real-time availability checking</li>
                  <li>• Customer communication management</li>
                  <li>• Seamless calendar integration</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button className="flex-1" size="lg">
              {getActionText()}
            </Button>
            <Button variant="outline" size="lg" className="flex-1">
              Contact Support
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Contact our support team for assistance with your subscription.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};