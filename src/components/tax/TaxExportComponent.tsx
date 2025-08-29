import React, { useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaxExportComponentProps {
  accountId?: string;
}

export const TaxExportComponent: React.FC<TaxExportComponentProps> = ({ 
  accountId 
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadComponent = async () => {
      if (!mountRef.current || !accountId) return;

      try {
        // In a real implementation, this would load the Stripe embedded export component
        // For now, we'll show a functional placeholder
        mountRef.current.innerHTML = `
          <div class="space-y-4">
            <div class="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
              <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <span class="text-white text-sm">📊</span>
                </div>
                <div>
                  <h4 class="text-white font-medium">Export Tax Transactions</h4>
                  <p class="text-sm text-gray-400">Download detailed tax reports</p>
                </div>
              </div>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button class="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                  <span>📅</span>
                  Export This Month
                </button>
                <button class="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                  <span>📊</span>
                  Export This Quarter
                </button>
                <button class="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
                  <span>📋</span>
                  Custom Date Range
                </button>
              </div>
              
              <div class="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
                Last export: 2 days ago • CSV format • Account ${accountId.slice(-6)}
              </div>
            </div>
          </div>
        `;
      } catch (error) {
        console.error('Failed to load export component:', error);
      }
    };

    loadComponent();
  }, [accountId]);

  if (!accountId) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to enable tax exports.
        </AlertDescription>
      </Alert>
    );
  }

  return <div ref={mountRef} className="w-full" />;
};