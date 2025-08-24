import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Shield, AlertTriangle } from 'lucide-react';

interface StripeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardUrl: string;
}

export const StripeDashboardModal: React.FC<StripeDashboardModalProps> = ({
  isOpen,
  onClose,
  dashboardUrl,
}) => {
  const handleManualRedirect = () => {
    // Try to open the dashboard URL
    const newWindow = window.open(dashboardUrl, '_blank');
    
    // If popup was blocked, show fallback instructions
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Open generic Stripe login page as fallback
      window.open('https://dashboard.stripe.com/login', '_blank');
    }
    
    onClose();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(dashboardUrl);
      // Could add a toast here but keeping it simple
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Stripe Dashboard Access
          </DialogTitle>
          <DialogDescription>
            We're taking you to your Stripe dashboard. If the page doesn't open, it might be blocked by your browser or ad blocker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              If the dashboard doesn't open automatically, try disabling your ad blocker temporarily or allowing pop-ups for this site.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">Alternative options:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Manually go to <span className="font-mono">dashboard.stripe.com</span></li>
              <li>• Copy the dashboard link below</li>
              <li>• Allow pop-ups in your browser settings</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopyUrl}
            className="w-full sm:w-auto"
          >
            Copy Dashboard Link
          </Button>
          <Button
            onClick={handleManualRedirect}
            className="w-full sm:w-auto"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
