
import React from 'react';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';
import { UserStatusSwitcher } from './UserStatusSwitcher';
import { SubscriptionTierSwitcher } from './SubscriptionTierSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Code } from 'lucide-react';

export const DeveloperDashboard = () => {
  const { isDeveloper } = useDeveloperAccess();

  // Only render for developers in development environment
  if (!isDeveloper) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="border-2 border-red-500 bg-red-50 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-red-800 flex items-center gap-2 text-sm">
            <Code className="h-4 w-4" />
            Developer Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UserStatusSwitcher />
          <SubscriptionTierSwitcher />
          
          <div className="text-xs text-red-600 bg-red-100 p-2 rounded border border-red-200">
            <strong>🚨 Developer Mode:</strong> This dashboard is only visible in development environment for authorized developers.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
