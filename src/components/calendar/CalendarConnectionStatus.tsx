
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, RefreshCw, Unlink } from 'lucide-react';
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
  onDisconnect: (provider: CalendarProvider) => Promise<void>;
}

export const CalendarConnectionStatus: React.FC<CalendarConnectionStatusProps> = ({
  connections,
  providers,
  onDisconnect
}) => {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg mb-4">Verbonden Kalenders</h3>
      
      {connections.map((connection) => {
        const provider = providers.find(p => p.id === connection.provider);
        if (!provider) return null;

        return (
          <Card key={connection.id} className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {provider.name}
                      <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verbonden
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Account: {connection.provider_account_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      Verbonden op: {new Date(connection.connected_at || '').toLocaleDateString('nl-NL')}
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDisconnect(provider)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Unlink className="h-4 w-4 mr-1" />
                  Ontkoppelen
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {connections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Nog geen kalenders verbonden</p>
        </div>
      )}
    </div>
  );
};
