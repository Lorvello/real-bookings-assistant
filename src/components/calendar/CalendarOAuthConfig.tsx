
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const CalendarOAuthConfig = () => {
  const handleOpenGoogleConsole = () => {
    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
  };

  const handleOpenSupabaseAuth = () => {
    window.open('https://supabase.com/dashboard/project/qzetadfdmsholqyxxfbh/auth/providers', '_blank');
  };

  return (
    <Alert className="border-blue-200 bg-blue-50 mb-4">
      <Info className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <div className="space-y-3">
          <p className="font-medium">OAuth Configuration Required</p>
          <div className="text-sm space-y-2">
            <p>Voor Google Calendar integratie moet de OAuth correct geconfigureerd zijn:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Client ID: 7344737510-1846vbrgkq4ac0e1ehrjg1dlg001o56.apps.googleusercontent.com</li>
              <li>Authorized JavaScript origins: https://bookingsassistant.com</li>
              <li>Authorized redirect URIs: https://qzetadfdmsholqyxxfbh.supabase.co/auth/v1/callback</li>
              <li>Google Calendar API moet geactiveerd zijn</li>
            </ul>
          </div>
          <div className="flex gap-2 mt-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenGoogleConsole}
              className="text-blue-700 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Google Console
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenSupabaseAuth}
              className="text-blue-700 hover:text-blue-800"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Supabase Auth
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};
