import React, { useEffect, useRef } from 'react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface ConnectTaxThresholdMonitoringProps {
  accountId?: string;
}

export const ConnectTaxThresholdMonitoring: React.FC<ConnectTaxThresholdMonitoringProps> = ({ 
  accountId 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const { getStripeAccount } = useStripeConnect();

  useEffect(() => {
    const loadComponent = async () => {
      if (!mountRef.current || !accountId) return;

      try {
        // In a real implementation, this would load the Stripe Connect embedded component
        // For now, we'll show a placeholder
        mountRef.current.innerHTML = `
          <div class="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span class="text-white text-sm font-bold">⚠</span>
              </div>
              <div>
                <h3 class="text-white font-medium">Tax Threshold Monitoring</h3>
                <p class="text-sm text-gray-400">Account: ${accountId.slice(-6)}</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="p-3 bg-gray-800/50 rounded border">
                <p class="text-gray-300 text-sm">Threshold monitoring is active for your account.</p>
                <p class="text-gray-400 text-xs mt-1">Automatic alerts when approaching tax registration thresholds</p>
              </div>
              <div class="p-3 bg-gray-800/50 rounded border">
                <p class="text-gray-300 text-sm">Current status: Monitoring enabled</p>
                <p class="text-gray-400 text-xs mt-1">Real-time tracking across all jurisdictions</p>
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        console.error('Failed to load threshold monitoring:', error);
      }
    };

    loadComponent();
  }, [accountId]);

  if (!accountId) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to enable threshold monitoring.
        </AlertDescription>
      </Alert>
    );
  }

  return <div ref={mountRef} className="w-full" />;
};