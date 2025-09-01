import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getStripeMode } from '@/utils/stripeConfig';

export const SyncServicesButton = () => {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const testMode = getStripeMode() === 'test';
      
      const { data, error } = await supabase.functions.invoke('sync-services-with-stripe', {
        body: { test_mode: testMode }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
      } else {
        throw new Error(data.error || 'Failed to sync services');
      }
    } catch (error) {
      console.error('Error syncing services:', error);
      toast.error('Failed to sync services with Stripe');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      onClick={handleSync} 
      disabled={syncing}
      variant="outline"
      size="sm"
    >
      {syncing ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Zap className="h-4 w-4 mr-2" />
      )}
      {syncing ? 'Syncing...' : 'Sync with Stripe'}
    </Button>
  );
};