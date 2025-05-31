
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';

interface CalendarManagementActionsProps {
  hasConnections: boolean;
  syncing: boolean;
  loading: boolean;
  onNewCalendarConnect: () => void;
  onSync: () => void;
}

export const CalendarManagementActions: React.FC<CalendarManagementActionsProps> = ({
  hasConnections,
  syncing,
  loading,
  onNewCalendarConnect,
  onSync
}) => {
  return (
    <div className="flex gap-2 pt-4 border-t">
      <Button
        onClick={onNewCalendarConnect}
        className="flex-1"
        disabled={loading}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Nieuwe Kalender Verbinden
      </Button>
      {hasConnections && (
        <Button
          variant="outline"
          onClick={onSync}
          disabled={syncing || loading}
        >
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              Synchroniseren...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Nu Synchroniseren
            </>
          )}
        </Button>
      )}
    </div>
  );
};
