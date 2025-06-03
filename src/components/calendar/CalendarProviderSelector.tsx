
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Loader2, Shield } from 'lucide-react';

interface CalendarProviderSelectorProps {
  onProviderSelect: (providerId: string) => void;
  connecting: boolean;
}

export const CalendarProviderSelector: React.FC<CalendarProviderSelectorProps> = ({
  onProviderSelect,
  connecting
}) => {
  const handleCalcomConnect = () => {
    onProviderSelect('calcom');
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verbind je Cal.com Account</h2>
        <p className="text-gray-600 mb-4">
          Synchroniseer automatisch je Cal.com boekingen met de Affable Bot voor naadloze 24/7 WhatsApp booking
        </p>
        <Badge variant="outline" className="text-sm">
          Stap 1 van 2
        </Badge>
      </div>

      <Card className="border-orange-200 hover:border-orange-300 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-lg">Cal.com</div>
              <div className="text-sm text-gray-600">
                Koppel je Cal.com account voor automatische booking synchronisatie
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-medium text-orange-900 mb-2">✨ Wat krijg je:</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• Automatische synchronisatie van Cal.com boekingen</li>
              <li>• Real-time beschikbaarheid updates</li>
              <li>• 24/7 WhatsApp booking zonder dubbele boekingen</li>
              <li>• Centraal dashboard voor alle afspraken</li>
            </ul>
          </div>

          <Button
            onClick={handleCalcomConnect}
            disabled={connecting}
            className="w-full bg-orange-600 hover:bg-orange-700 py-3"
            size="lg"
          >
            {connecting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verbinden met Cal.com...
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 mr-2" />
                Verbind Cal.com Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Alert className="border-green-200 bg-green-50">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Veilig & Betrouwbaar:</strong> We hebben alleen toegang tot je boekingsgegevens, 
          geen persoonlijke gegevens of wachtwoorden.
        </AlertDescription>
      </Alert>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          Door te verbinden ga je akkoord met onze voorwaarden voor kalender integratie
        </p>
      </div>
    </div>
  );
};
