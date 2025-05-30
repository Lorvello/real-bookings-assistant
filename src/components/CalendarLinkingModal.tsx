
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle, ExternalLink } from 'lucide-react';

interface CalendarLinkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CalendarLinkingModal = ({ open, onOpenChange, onSuccess }: CalendarLinkingModalProps) => {
  const handleLinkCalendar = () => {
    // Redirect to login page where they can use Google OAuth with calendar scopes
    window.location.href = '/login';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-green-600" />
            Calendar Integration Available
          </DialogTitle>
          <DialogDescription>
            Link your Google Calendar for automatic booking synchronization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Automatic Sync</p>
                <p className="text-sm text-gray-600">Your calendar events will sync automatically</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Real-time Updates</p>
                <p className="text-sm text-gray-600">Changes appear instantly on your dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Secure Connection</p>
                <p className="text-sm text-gray-600">Your data is protected with OAuth 2.0</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleLinkCalendar}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Link Google Calendar
            </Button>
            
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            You'll be taken to the login page to connect with Google Calendar.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
