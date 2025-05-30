
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar } from 'lucide-react';
import { CalendarConnection } from '@/types/calendar';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarConnectionStatusProps {
  connections: CalendarConnection[];
  providers: CalendarProvider[];
  onDisconnect: (provider: CalendarProvider) => void;
}

export const CalendarConnectionStatus: React.FC<CalendarConnectionStatusProps> = ({
  connections,
  providers,
  onDisconnect
}) => {
  return (
    <div className="space-y-4 mb-6">
      {connections.map((connection) => {
        const provider = providers.find(p => p.id === connection.provider);
        if (!provider) return null;

        return (
          <Card key={connection.id} className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {provider.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-green-900">{provider.name}</h4>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-green-800">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Connected
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(connection.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDisconnect(provider)}
                  className="text-red-600 hover:text-red-700"
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
