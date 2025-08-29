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
                <span class="text-white text-sm font-bold">S</span>
              </div>
              <div>
                <h3 class="text-white font-medium">Stripe Tax Threshold Monitoring</h3>
                <p class="text-sm text-gray-400">Account: ${accountId.slice(-6)}</p>
              </div>
            </div>
            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-gray-400">Netherlands (NL)</span>
                <span class="text-green-400">€10,000 / year</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-400">Germany (DE)</span>
                <span class="text-yellow-400">Approaching threshold</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-gray-400">France (FR)</span>
                <span class="text-gray-500">Not registered</span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-700">
              <button class="text-blue-400 hover:text-blue-300 text-sm">
                Configure thresholds in Stripe Dashboard →
              </button>
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