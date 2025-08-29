import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileSpreadsheet, RefreshCw, AlertCircle, Download, Calendar } from 'lucide-react';
import { useStripeConnect } from '@/hooks/useStripeConnect';
import { getStripePublishableKey } from '@/utils/stripeConfig';

interface TaxExportsProps {
  accountId?: string;
  useMockData?: boolean;
}

export const TaxExports: React.FC<TaxExportsProps> = ({ 
  accountId,
  useMockData = false
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const { createEmbeddedSession } = useStripeConnect();

  const loadExportComponent = async () => {
    if (!mountRef.current || (!accountId && !useMockData)) return;

    if (useMockData) {
      // Show mock data for development
      mountRef.current.innerHTML = `
        <div class="space-y-4">
          <div class="p-4 bg-muted/50 rounded-lg border">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <span class="text-white text-sm">📊</span>
              </div>
              <div>
                <h4 class="font-medium">Tax Transaction Exports</h4>
                <p class="text-sm text-muted-foreground">Mock Mode - Development Only</p>
              </div>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button class="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors">
                <Calendar class="w-4 h-4" />
                Export This Month
              </button>
              <button class="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors">
                <FileSpreadsheet class="w-4 h-4" />
                Export This Quarter
              </button>
              <button class="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors">
                <Download class="w-4 h-4" />
                Custom Date Range
              </button>
              <button class="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg text-sm transition-colors">
                <FileSpreadsheet class="w-4 h-4" />
                Annual Summary
              </button>
            </div>
            
            <div class="mt-4 pt-3 border-t text-xs text-muted-foreground">
              <div class="flex justify-between">
                <span>Last export: 2 days ago</span>
                <span>CSV format</span>
              </div>
            </div>
          </div>
        </div>
      `;
      setComponentLoaded(true);
      setLastUpdated(new Date());
      return;
    }

    try {
      setLoading(true);
      
      // Try to load the Stripe embedded component
      const session = await createEmbeddedSession();
      
      // For now, show placeholder until Stripe Tax embedded components are available
      try {
        if (session && window.Stripe) {
          console.warn('Tax export component not available:', componentError);
          // Fallback to functional placeholder
          mountRef.current.innerHTML = `
            <div class="space-y-4">
              <div class="p-4 bg-muted/50 rounded-lg border">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <FileSpreadsheet class="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 class="font-medium">Export Tax Data</h4>
                    <p class="text-sm text-muted-foreground">Download tax transaction reports</p>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button class="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors" 
                          onclick="window.open('#', '_blank')">
                    <Calendar class="w-4 h-4" />
                    Current Month
                  </button>
                  <button class="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm transition-colors"
                          onclick="window.open('#', '_blank')">
                    <FileSpreadsheet class="w-4 h-4" />
                    Current Quarter
                  </button>
                  <button class="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg text-sm transition-colors"
                          onclick="window.open('#', '_blank')">
                    <Download class="w-4 h-4" />
                    Custom Range
                  </button>
                  <button class="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg text-sm transition-colors"
                          onclick="window.open('#', '_blank')">
                    <FileSpreadsheet class="w-4 h-4" />
                    Annual Report
                  </button>
                </div>
                
                <div class="mt-4 pt-3 border-t text-xs text-muted-foreground">
                  <p>Export functionality is available through your Stripe dashboard.</p>
                </div>
              </div>
            </div>
          `;
          setComponentLoaded(true);
          setLastUpdated(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to load export component:', error);
      mountRef.current.innerHTML = `
        <div class="p-4 bg-red-900/20 border border-red-700 rounded-lg">
          <p class="text-red-200 text-sm">Failed to load export component.</p>
        </div>
      `;
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setComponentLoaded(false);
    setLoading(true);
    await loadExportComponent();
  };

  useEffect(() => {
    if (accountId || useMockData) {
      loadExportComponent();
    }
  }, [accountId, useMockData]);

  if (!accountId && !useMockData) {
    return (
      <Alert className="bg-orange-900/20 border-orange-700">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-orange-200">
          Connect your Stripe account to enable tax exports.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Tax Reports & Exports
            </CardTitle>
            <CardDescription>
              Download tax transaction reports and summaries
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !componentLoaded ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-muted rounded-lg"></div>
            <div className="h-16 bg-muted rounded-lg"></div>
          </div>
        ) : (
          <div ref={mountRef} className="w-full" />
        )}
      </CardContent>
    </Card>
  );
};