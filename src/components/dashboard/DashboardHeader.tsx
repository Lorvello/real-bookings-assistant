
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  userName: string;
  syncing: boolean;
  onManualSync: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  userName,
  syncing,
  onManualSync
}) => {
  return (
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600">
          Welcome back, {userName}
        </p>
      </div>
      <Button 
        onClick={onManualSync}
        disabled={syncing}
        variant="outline"
        className="flex items-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync Calendar'}
      </Button>
    </div>
  );
};
