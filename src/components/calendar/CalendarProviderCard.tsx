
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface CalendarProvider {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

interface CalendarProviderCardProps {
  provider: CalendarProvider;
  isConnected: boolean;
  onConnect: () => void;
}

export const CalendarProviderCard: React.FC<CalendarProviderCardProps> = ({
  provider,
  isConnected,
  onConnect
}) => {
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 ${
        isConnected ? 'border-green-500 bg-green-50' : provider.color
      } hover:shadow-md`}
      onClick={() => !isConnected && onConnect()}
    >
      <CardContent className="p-6 text-center">
        <div className="flex justify-center mb-4 relative">
          {provider.icon}
          {isConnected && (
            <CheckCircle className="h-4 w-4 text-green-600 absolute -top-1 -right-1" />
          )}
        </div>
        <h3 className="font-semibold text-lg mb-2">{provider.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{provider.description}</p>
        <Button 
          className={`w-full ${
            isConnected 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
          size="sm"
        >
          {isConnected ? 'Connected' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  );
};
