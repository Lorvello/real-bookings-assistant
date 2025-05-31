
/**
 * 🛡️ DISCONNECT CONFIRMATION DIALOG COMPONENT
 * ============================================
 * 
 * Handles the confirmation UI for calendar disconnection with clear messaging
 * about consequences and action buttons.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Unlink, AlertTriangle } from 'lucide-react';

interface DisconnectConfirmationDialogProps {
  providerName: string;
  disconnecting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DisconnectConfirmationDialog: React.FC<DisconnectConfirmationDialogProps> = ({
  providerName,
  disconnecting,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="space-y-3">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Kalender Loskoppelen</strong><br />
          Je {providerName} kalender wordt losgekoppeld. Dit betekent dat:
          <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
            <li>Automatische booking sync wordt uitgeschakeld</li>
            <li>WhatsApp bot kan geen beschikbaarheid meer controleren</li>
            <li>Je kunt altijd opnieuw verbinden via instellingen</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          onClick={onConfirm}
          disabled={disconnecting}
          className="flex-1"
        >
          {disconnecting ? (
            <>
              <Unlink className="h-4 w-4 mr-2 animate-pulse" />
              Loskoppelen...
            </>
          ) : (
            <>
              <Unlink className="h-4 w-4 mr-2" />
              Ja, Loskoppelen
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={disconnecting}
          className="flex-1"
        >
          Annuleren
        </Button>
      </div>
    </div>
  );
};
