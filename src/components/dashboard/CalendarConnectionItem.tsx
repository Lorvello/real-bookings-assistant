
import React from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Unlink, RefreshCw } from 'lucide-react';
import { CalendarConnection } from '@/types/calendar';

interface CalendarConnectionItemProps {
  connection: CalendarConnection;
  disconnecting: boolean;
  onDisconnect: (connectionId: string, providerName: string) => void;
}

export const CalendarConnectionItem: React.FC<CalendarConnectionItemProps> = ({
  connection,
  disconnecting,
  onDisconnect
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <div className="font-medium text-green-900 capitalize">
            {connection.provider} Kalender
          </div>
          <div className="text-sm text-green-700">
            Verbonden op {new Date(connection.created_at).toLocaleDateString('nl-NL')}
          </div>
          {connection.provider_account_id !== 'pending' && (
            <div className="text-xs text-green-600">
              Account: {connection.provider_account_id}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onDisconnect(connection.id, connection.provider)}
        disabled={disconnecting}
        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {disconnecting ? (
          <>
            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            Ontkoppelen...
          </>
        ) : (
          <>
            <Unlink className="h-4 w-4 mr-1" />
            Ontkoppelen
          </>
        )}
      </Button>
    </div>
  );
};
