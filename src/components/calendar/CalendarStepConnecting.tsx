
import React from 'react';
import { Loader2 } from 'lucide-react';

interface CalendarStepConnectingProps {
  provider: string;
}

export const CalendarStepConnecting: React.FC<CalendarStepConnectingProps> = ({
  provider
}) => {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-blue-600" />
      <h3 className="text-xl font-semibold mb-2">Verbinden met {provider}</h3>
      <p className="text-gray-600">Je wordt doorgestuurd naar de autorisatiepagina...</p>
    </div>
  );
};
