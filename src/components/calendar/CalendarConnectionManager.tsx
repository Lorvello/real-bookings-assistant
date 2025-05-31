
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Calendar, Plus, RefreshCw, Unlink } from 'lucide-react';
import { CalendarConnection } from '@/types/calendar';
import { DisconnectCalendarButton } from './DisconnectCalendarButton';
import { User } from '@supabase/supabase-js';

interface CalendarConnectionManagerProps {
  user: User | null;
  connections: CalendarConnection[];
  loading: boolean;
  onRefresh: () => void;
  onAddCalendar: () => void;
}

export const CalendarConnectionManager: React.FC<CalendarConnectionManagerProps> = ({
  user,
  connections,
  loading,
  onRefresh,
  onAddCalendar
}) => {
  const renderConnectionCard = (connection: CalendarConnection) => {
    const getProviderDetails = (provider: string) => {
      switch (provider.toLowerCase()) {
        case 'google':
          return {
            name: 'Google Calendar',
            color: 'bg-green-50 border-green-200',
            iconColor: 'text-green-600',
            textColor: 'text-green-900'
          };
        case 'microsoft':
          return {
            name: 'Microsoft Outlook',
            color: 'bg-blue-50 border-blue-200',
            iconColor: 'text-blue-600',
            textColor: 'text-blue-900'
          };
        default:
          return {
            name: `${provider} Calendar`,
            color: 'bg-gray-50 border-gray-200',
            iconColor: 'text-gray-600',
            textColor: 'text-gray-900'
          };
      }
    };

    const providerDetails = getProviderDetails(connection.provider);

    return (
      <Card key={connection.id} className={`${providerDetails.color} border-2`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <CheckCircle className={`h-5 w-5 ${providerDetails.iconColor}`} />
              <div>
                <div className={`font-semibold ${providerDetails.textColor}`}>
                  {providerDetails.name}
                </div>
                <div className="text-sm opacity-75">
                  Verbonden op {new Date(connection.created_at).toLocaleDateString('nl-NL')}
                </div>
                {connection.provider_account_id !== 'pending' && (
                  <div className="text-xs opacity-60 mt-1">
                    Account: {connection.provider_account_id}
                  </div>
                )}
              </div>
            </div>
            
            <Badge variant="outline" className="text-green-700 border-green-300">
              Actief
            </Badge>
          </div>
          
          {/* Prominent Disconnect Button */}
          <div className="flex justify-end">
            <DisconnectCalendarButton
              user={user}
              connectionId={connection.id}
              providerName={providerDetails.name}
              onDisconnectSuccess={onRefresh}
              variant="destructive"
              size="sm"
              className="w-full sm:w-auto"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-green-600" />
        <div className="text-sm text-gray-600">Verbindingen laden...</div>
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Geen Kalender Verbindingen
        </h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Verbind je kalender om automatische beschikbaarheidscontrole en 
          24/7 booking via WhatsApp mogelijk te maken.
        </p>
        <Button onClick={onAddCalendar} className="bg-green-600 hover:bg-green-700">
          <Plus className="h-4 w-4 mr-2" />
          Kalender Verbinden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Connected Calendars */}
      <div className="space-y-3">
        {connections.map(renderConnectionCard)}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 pt-4 border-t">
        <Button
          onClick={onAddCalendar}
          variant="outline"
          className="flex-1"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Kalender
        </Button>
        <Button
          onClick={onRefresh}
          variant="outline"
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Vernieuwen
        </Button>
      </div>
    </div>
  );
};
