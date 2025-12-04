import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { getStripeConfig } from '@/utils/stripeConfig';
import { useDeveloperAccess } from '@/hooks/useDeveloperAccess';

export const StripeModeIndicator = () => {
  const { isDeveloper } = useDeveloperAccess();
  const config = getStripeConfig();

  // Only render for developers
  if (!isDeveloper) {
    return null;
  }

  return (
    <Card className={config.mode === 'live' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}>
      <CardHeader className="pb-2">
        <CardTitle className={`flex items-center gap-2 text-sm ${config.mode === 'live' ? 'text-red-800' : 'text-blue-800'}`}>
          <CreditCard className="h-4 w-4" />
          Stripe Mode Status (Read-Only)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-sm ${config.mode === 'live' ? 'text-red-700' : 'text-blue-700'}`}>
            Current Mode:
          </span>
          <Badge 
            variant={config.mode === 'live' ? 'destructive' : 'secondary'}
            className={config.mode === 'live' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600 text-white'}
          >
            {config.mode === 'live' ? '🔴 LIVE MODE' : '🟢 TEST MODE'}
          </Badge>
        </div>
        
        <div className={`text-xs p-2 rounded border ${config.mode === 'live' ? 'text-red-600 bg-red-100 border-red-200' : 'text-blue-600 bg-blue-100 border-blue-200'}`}>
          <strong>ℹ️ Mode Control:</strong> Stripe mode is controlled by the <code className="bg-black/10 px-1 rounded">VITE_STRIPE_MODE</code> environment variable.
          {config.mode === 'live' && (
            <div className="mt-1 font-semibold">⚠️ Real payments will be processed!</div>
          )}
          {config.mode === 'test' && (
            <div className="mt-1">Using Stripe test environment - safe for development.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
