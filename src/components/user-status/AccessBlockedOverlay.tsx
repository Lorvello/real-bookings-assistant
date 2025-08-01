
import React from 'react';
import { Lock, ArrowUp, RefreshCw, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserStatus } from '@/types/userStatus';

interface AccessBlockedOverlayProps {
  userStatus: UserStatus;
  feature: string;
  description?: string;
  onUpgrade: () => void;
}

export function AccessBlockedOverlay({ userStatus, feature, description, onUpgrade }: AccessBlockedOverlayProps) {
  const { userType, statusMessage } = userStatus;

  const getIcon = () => {
    if (feature === 'Future Insights') return <Brain className="h-12 w-12 text-purple-400" />;
    if (userType === 'canceled_subscriber') return <RefreshCw className="h-12 w-12 text-yellow-400" />;
    return <Lock className="h-12 w-12 text-red-400" />;
  };

  const getTitle = () => {
    if (feature === 'Future Insights') return 'Professional Feature';
    if (userType === 'expired_trial') return 'Trial Expired';
    if (userType === 'canceled_subscriber') return 'Subscription Canceled';
    return 'Access Restricted';
  };

  const getDescription = () => {
    if (feature === 'Future Insights') {
      return description || 'Future Insights is only available for Professional and Enterprise subscriptions. Upgrade now for access to advanced predictions and AI recommendations.';
    }
    if (userType === 'expired_trial') {
      return `Your free trial has expired. Upgrade to continue using ${feature}.`;
    }
    if (userType === 'canceled_subscriber') {
      return `Your subscription has been canceled. Reactivate to continue using ${feature}.`;
    }
    return description || `Access to ${feature} requires an active subscription.`;
  };

  const getButtonText = () => {
    if (feature === 'Future Insights') return 'Upgrade naar Professional';
    if (userType === 'canceled_subscriber') return 'Reactivate Subscription';
    return 'Upgrade Now';
  };

  const getButtonIcon = () => {
    if (userType === 'canceled_subscriber') return <RefreshCw className="h-4 w-4" />;
    return <ArrowUp className="h-4 w-4" />;
  };

  const getCardStyles = () => {
    if (feature === 'Future Insights') {
      return 'bg-gradient-to-br from-purple-900/50 to-gray-800 border-purple-600/30';
    }
    return 'bg-gray-800 border-gray-700';
  };

  const getButtonStyles = () => {
    if (feature === 'Future Insights') {
      return 'bg-purple-600 hover:bg-purple-700 text-white';
    }
    return 'bg-green-600 hover:bg-green-700 text-white';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className={`max-w-md w-full ${getCardStyles()}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-xl font-bold text-white">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {statusMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-300 text-center">
            {getDescription()}
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={onUpgrade}
              className={`flex-1 ${getButtonStyles()}`}
            >
              {getButtonIcon()}
              <span className="ml-2">{getButtonText()}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Go Back
            </Button>
          </div>
          
          {feature === 'Future Insights' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Professional features include geavanceerde analytics, voorspellingen en AI-aanbevelingen
              </p>
            </div>
          )}
          
          {userType === 'expired_trial' && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Your data is safe and will be restored when you upgrade
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
