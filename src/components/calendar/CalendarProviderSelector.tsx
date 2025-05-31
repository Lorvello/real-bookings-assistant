
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'available' | 'coming-soon';
  color: string;
}

interface CalendarProviderSelectorProps {
  onProviderSelect: (providerId: string) => void;
  connecting: boolean;
}

export const CalendarProviderSelector: React.FC<CalendarProviderSelectorProps> = ({
  onProviderSelect,
  connecting
}) => {
  const providers: CalendarProvider[] = [
    {
      id: 'google',
      name: 'Google Calendar',
      description: 'Meest populaire keuze - werkt direct',
      icon: (
        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
          G
        </div>
      ),
      status: 'available',
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'microsoft',
      name: 'Microsoft Outlook',
      description: 'Outlook en Exchange kalenders',
      icon: (
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
          M
        </div>
      ),
      status: 'coming-soon',
      color: 'bg-gray-50 border-gray-200'
    },
    {
      id: 'apple',
      name: 'Apple Calendar',
      description: 'iCloud en Apple kalenders',
      icon: (
        <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-white font-bold text-xl">
          🍎
        </div>
      ),
      status: 'coming-soon',
      color: 'bg-gray-50 border-gray-200'
    },
    {
      id: 'calendly',
      name: 'Calendly',
      description: 'Import je Calendly beschikbaarheid',
      icon: (
        <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
          C
        </div>
      ),
      status: 'coming-soon',
      color: 'bg-gray-50 border-gray-200'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Kies je kalender provider
        </h2>
        <p className="text-gray-600">
          Verbind je agenda om automatisch beschikbaarheid te synchroniseren
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <Card 
            key={provider.id}
            className={`cursor-pointer transition-all duration-200 ${provider.color} ${
              provider.status === 'coming-soon' ? 'opacity-60' : ''
            }`}
            onClick={() => {
              if (provider.status === 'available' && !connecting) {
                onProviderSelect(provider.id);
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {provider.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {provider.name}
                    </h3>
                    {provider.status === 'coming-soon' && (
                      <Badge variant="secondary" className="text-xs">
                        Binnenkort
                      </Badge>
                    )}
                    {provider.status === 'available' && (
                      <Badge variant="default" className="text-xs bg-green-600">
                        Beschikbaar
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {provider.description}
                  </p>
                  <Button 
                    className={`w-full ${
                      provider.status === 'available' 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={provider.status === 'coming-soon' || connecting}
                    size="sm"
                  >
                    {provider.status === 'available' ? 'Verbinden' : 'Binnenkort'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-500">
        <p>Meer agenda providers komen binnenkort beschikbaar</p>
      </div>
    </div>
  );
};
