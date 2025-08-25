import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const MaintenanceMode = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold">Onderhoudsmodus</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Betaalfunctionaliteit is tijdelijk niet beschikbaar wegens onderhoud.
          </p>
          <p className="text-sm text-muted-foreground">
            We werken eraan om dit zo snel mogelijk te herstellen.
          </p>
          <div className="pt-4">
            <a 
              href="/dashboard" 
              className="text-primary hover:underline text-sm"
            >
              Terug naar dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};