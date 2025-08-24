import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { getStripeMode, getStripePublishableKey } from '@/utils/stripeConfig';
import { loadConnectAndInitialize } from '@stripe/connect-js';

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
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [connectInstance, setConnectInstance] = useState<any>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const { toast } = useToast();
  const { createDashboardSession, createLoginLink } = useStripeConnect();

  const testMode = getStripeMode() === 'test';

  const handleLoadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[STRIPE DASHBOARD] Loading embedded dashboard...');
      
      // Create dashboard session
      const session = await createDashboardSession();
      if (!session) {
        throw new Error('Failed to create dashboard session');
      }

      console.log('[STRIPE DASHBOARD] Session created, loading Connect JS...');
      
      // Initialize Stripe Connect
      const stripeConnectInstance = await loadConnectAndInitialize({
        publishableKey: getStripePublishableKey(),
        fetchClientSecret: async () => session.client_secret,
      });
      
      setConnectInstance(stripeConnectInstance);
      setShowEmbedded(true);
      console.log('[STRIPE DASHBOARD] Dashboard initialized');
      
    } catch (err) {
      console.error('[STRIPE DASHBOARD] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      
      // Provide specific error messages for common issues
      let displayMessage = errorMessage;
      if (errorMessage.includes('connect.stripe.com')) {
        displayMessage = 'Unable to load embedded dashboard. This may be due to browser security settings or ad blockers. Please try the external dashboard option below.';
      } else if (errorMessage.includes('duplicate key') || errorMessage.includes('constraint')) {
        displayMessage = 'Account setup in progress. Please try again in a moment.';
      }
      
      setError(displayMessage);
      toast({
        title: "Dashboard Load Error",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExternalDashboard = async () => {
    try {
      const url = await createLoginLink();
      if (url) {
        window.open(url, '_blank');
        onClose();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to open external dashboard",
        variant: "destructive",
      });
    }
  };

  // Load dashboard when modal opens
  useEffect(() => {
    if (isOpen && !showEmbedded && !loading && !error) {
      handleLoadDashboard();
    }
  }, [isOpen]);

  // Render embedded dashboard when ready
  useEffect(() => {
    if (showEmbedded && connectInstance && dashboardRef.current) {
      let accountManagement: any = null;
      
      try {
        console.log('[STRIPE DASHBOARD] Creating account management component...');
        accountManagement = connectInstance.create('account-management');
        
        if (!accountManagement) {
          throw new Error('Failed to create account management component');
        }
        
        console.log('[STRIPE DASHBOARD] Appending component to container...');
        // Clear any existing content
        dashboardRef.current.innerHTML = '';
        // Append the component as a child element (per Stripe docs)
        dashboardRef.current.appendChild(accountManagement);
        console.log('[STRIPE DASHBOARD] Component mounted successfully');
        
      } catch (err) {
        console.error('[STRIPE DASHBOARD] Mount error:', err);
        setError(`Failed to mount dashboard component: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setShowEmbedded(false);
        return;
      }
      
      // Cleanup function
      return () => {
        if (dashboardRef.current) {
          try {
            // Clear the container content
            dashboardRef.current.innerHTML = '';
            console.log('[STRIPE DASHBOARD] Component unmounted');
          } catch (err) {
            console.log('[STRIPE DASHBOARD] Cleanup error:', err);
          }
        }
      };
    }
  }, [showEmbedded, connectInstance]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setError(null);
      setShowEmbedded(false);
      setConnectInstance(null);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {testMode && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                  TEST MODE
                </span>
              )}
              Stripe Dashboard
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="h-[700px] flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Loading your Stripe dashboard...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="max-w-md w-full space-y-4">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Button onClick={handleLoadDashboard} className="w-full">
                    <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Retry Embedded Dashboard
                  </Button>
                  <Button variant="outline" onClick={handleExternalDashboard} className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open External Dashboard
                  </Button>
                </div>
              </div>
            </div>
          )}

          {showEmbedded && (
            <div className="flex-1 p-6">
              <div 
                ref={dashboardRef}
                className="w-full h-full border rounded-lg overflow-hidden"
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};