
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { CalendarConnection } from '@/types/calendar';

interface CalendarConnectionItemProps {
  connection: CalendarConnection;
  onDisconnect?: () => void;
  showActions?: boolean;
}

export const CalendarConnectionItem: React.FC<CalendarConnectionItemProps> = ({
  connection,
  onDisconnect,
  showActions = true
}) => {
  // Since we're Cal.com only now, we'll use fixed provider details
  const providerName = 'Cal.com';
  const isActive = connection.is_active;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-white">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
          <Calendar className="h-5 w-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{providerName}</span>
            {isActive ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Actief
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Inactief
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-gray-600 mt-1">
            {connection.cal_user_id && (
              <div>Cal.com User: {connection.cal_user_id}</div>
            )}
            <div>
              Verbonden: {new Date(connection.connected_at || connection.created_at).toLocaleDateString('nl-NL')}
            </div>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open('https://cal.com', '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {onDisconnect && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onDisconnect}
              className="text-red-600 hover:text-red-700"
            >
              Verwijderen
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
