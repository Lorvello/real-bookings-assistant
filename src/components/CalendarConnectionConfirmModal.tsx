
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Shield, CheckCircle } from 'lucide-react';

interface CalendarConnectionConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isConnecting: boolean;
}

export const CalendarConnectionConfirmModal: React.FC<CalendarConnectionConfirmModalProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isConnecting
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-green-600" />
            Verbind Google Calendar
          </DialogTitle>
          <DialogDescription>
            Koppel je Google Calendar voor automatische afspraak synchronisatie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Automatische Sync</p>
                <p className="text-sm text-gray-600">Je agenda wordt automatisch gesynchroniseerd</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Veilige Verbinding</p>
                <p className="text-sm text-gray-600">Je gegevens zijn beschermd met OAuth 2.0</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Let op:</strong> Je wordt doorgestuurd naar Google om toestemming te geven voor agenda toegang.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={onConfirm}
              disabled={isConnecting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isConnecting ? 'Verbinden...' : 'Verbind Calendar'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConnecting}
            >
              Annuleren
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
