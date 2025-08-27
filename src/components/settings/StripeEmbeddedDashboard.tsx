import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { getStripeMode } from '@/utils/stripeConfig';

interface StripeEmbeddedDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StripeEmbeddedDashboard: React.FC<StripeEmbeddedDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { createLoginLink } = useStripeConnect();

  const testMode = getStripeMode() === 'test';

  const handleOpenDashboard = async () => {
    if (!isOpen) return;
    
    setLoading(true);
    setError(null);
    setFallbackUrl(null);

    try {
      console.log('[STRIPE DASHBOARD] Creating login link for direct redirect...');
      
      const url = await createLoginLink();
      if (!url) {
        throw new Error('NO_CONNECTED_ACCOUNT');
      }

      console.log('[STRIPE DASHBOARD] Opening dashboard in new tab:', url);
      
      // Open in new tab to avoid browser blocking issues
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      if (!newWindow) {
        // Fallback if popup blocked - store URL for manual opening
        console.log('[STRIPE DASHBOARD] Popup blocked, providing fallback...');
        setFallbackUrl(url);
        setError('Browser blocked popup. Please use the manual link below.');
        return;
      }
      
      // Success - close modal after short delay
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (err) {
      console.error('[STRIPE DASHBOARD] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to open dashboard';
      
      // Handle specific error cases
      if (errorMessage === 'NO_CONNECTED_ACCOUNT') {
        setError('No Stripe account connected. Please complete onboarding first.');
      } else {
        setError(`Failed to open dashboard: ${errorMessage}`);
        
        // Try to get the URL anyway for fallback
        try {
          const fallbackUrl = await createLoginLink();
          if (fallbackUrl) {
            setFallbackUrl(fallbackUrl);
          }
        } catch {
          // Ignore fallback errors
        }
      }
      
      toast({
        title: "Dashboard Error",
        description: errorMessage === 'NO_CONNECTED_ACCOUNT' 
          ? 'Please complete Stripe onboarding first'
          : 'Failed to open dashboard',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Success",
        description: "Dashboard link copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error", 
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  // Auto-trigger dashboard opening when modal opens
  React.useEffect(() => {
    if (isOpen && !loading && !error) {
      handleOpenDashboard();
    }
  }, [isOpen]);

  // This component now just handles the redirect logic
  // The modal is only shown if there's an error or fallback needed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {testMode && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded mr-2">
                TEST MODE
              </span>
            )}
            Stripe Dashboard
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Opening dashboard...</p>
          </div>
        )}

        {error && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            {fallbackUrl && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  The redirect was blocked. You can open the dashboard manually:
                </p>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(fallbackUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(fallbackUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <Button onClick={handleOpenDashboard} className="w-full">
              <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};