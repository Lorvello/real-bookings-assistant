import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Crown, 
  Lock,
  Zap,
  Settings
} from 'lucide-react';
import { useUserStatus } from '@/hooks/useUserStatus';
import { useNavigate } from 'react-router-dom';

export function UserStatusDisplay() {
  const { userStatus, accessControl } = useUserStatus();
  const navigate = useNavigate();

  const getStatusIcon = () => {
    switch (userStatus.userType) {
      case 'trial':
        return <Zap className="h-5 w-5 text-blue-600" />;
      case 'expired_trial':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'subscriber':
        return <Crown className="h-5 w-5 text-yellow-600" />;
      case 'canceled_subscriber':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadgeVariant = () => {
    switch (userStatus.userType) {
      case 'trial':
        return 'default';
      case 'expired_trial':
        return 'destructive';
      case 'subscriber':
        return 'secondary';
      case 'canceled_subscriber':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusDisplayName = () => {
    switch (userStatus.userType) {
      case 'trial':
        return 'Free Trial';
      case 'expired_trial':
        return 'Trial Expired';
      case 'subscriber':
        return 'Active Subscriber';
      case 'canceled_subscriber':
        return 'Subscription Ending';
      default:
        return 'Unknown Status';
    }
  };

  const getAccessLevel = () => {
    if (userStatus.hasFullAccess) return 'Full Access';
    if (userStatus.isExpired) return 'Limited Access';
    return 'View Only';
  };

  const getProgressValue = () => {
    if (userStatus.userType === 'trial') {
      return (userStatus.daysRemaining / 7) * 100;
    }
    return userStatus.hasFullAccess ? 100 : 0;
  };

  const getProgressColor = () => {
    if (userStatus.userType === 'trial') {
      if (userStatus.daysRemaining <= 1) return 'bg-red-500';
      if (userStatus.daysRemaining <= 3) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    return userStatus.hasFullAccess ? 'bg-green-500' : 'bg-red-500';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          User Status Overview
        </CardTitle>
        <CardDescription>
          Current account status and access permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={getStatusBadgeVariant()}>
              {getStatusDisplayName()}
            </Badge>
            <span className="text-sm text-gray-600">
              {getAccessLevel()}
            </span>
          </div>
          {userStatus.needsUpgrade && (
            <Button 
              onClick={() => navigate('/settings')}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Settings className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          )}
        </div>

        {/* Status Message */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-2">
            {userStatus.statusMessage}
          </p>
          {userStatus.userType === 'trial' && (
            <Progress 
              value={getProgressValue()} 
              className="h-2 mb-2"
            />
          )}
        </div>

        {/* Access Control Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Features</h4>
            <div className="space-y-1">
              {[
                { label: 'Dashboard', access: accessControl.canViewDashboard },
                { label: 'Create Bookings', access: accessControl.canCreateBookings },
                { label: 'Edit Bookings', access: accessControl.canEditBookings },
                { label: 'WhatsApp', access: accessControl.canAccessWhatsApp },
                { label: 'AI Assistant', access: accessControl.canUseAI },
                { label: 'Export Data', access: accessControl.canExportData },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.access ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-gray-400" />
                  )}
                  <span className={`text-sm ${item.access ? 'text-green-700' : 'text-gray-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-700">Limits</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Calendars:</span>
                <span className="font-medium">{accessControl.maxCalendars}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bookings/Month:</span>
                <span className="font-medium">{accessControl.maxBookingsPerMonth}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Team Members:</span>
                <span className="font-medium">{accessControl.maxTeamMembers}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">API Access:</span>
                <span className="font-medium">
                  {accessControl.canAccessAPI ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Trial Information */}
        {userStatus.userType === 'trial' && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">Free Trial Active</span>
            </div>
            <p className="text-sm text-blue-700">
              You have {userStatus.daysRemaining} day{userStatus.daysRemaining === 1 ? '' : 's'} remaining.
              {userStatus.daysRemaining <= 3 && ' Consider upgrading to keep full access.'}
            </p>
          </div>
        )}

        {/* Expired Trial */}
        {userStatus.userType === 'expired_trial' && (
          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Trial Expired</span>
            </div>
            <p className="text-sm text-red-700 mb-3">
              Your free trial has ended. Upgrade to restore full access to all features.
            </p>
            <Button 
              onClick={() => navigate('/settings')}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              Upgrade Now
            </Button>
          </div>
        )}

        {/* Active Subscriber */}
        {userStatus.userType === 'subscriber' && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-900">Active Subscription</span>
            </div>
            <p className="text-sm text-green-700">
              You have full access to all features. Thank you for being a subscriber!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}