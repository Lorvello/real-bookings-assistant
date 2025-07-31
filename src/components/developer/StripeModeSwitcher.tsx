import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const StripeModeSwitcher = () => {
  const [currentMode, setCurrentMode] = useState<'test' | 'live'>('test');
  const { toast } = useToast();

  // Load mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('stripe_mode_override') as 'test' | 'live' | null;
    if (savedMode) {
      setCurrentMode(savedMode);
    }
  }, []);

  const handleModeSwitch = (mode: 'test' | 'live') => {
    setCurrentMode(mode);
    localStorage.setItem('stripe_mode_override', mode);
    
    // Trigger page reload to ensure all components pick up the new mode
    window.location.reload();
    
    toast({
      title: `Switched to ${mode.toUpperCase()} mode`,
      description: `All Stripe operations will now use ${mode} mode settings.`,
      duration: 3000,
    });
  };

  return (
    <Card className="border-blue-500 bg-blue-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-blue-800 flex items-center gap-2 text-sm">
          <CreditCard className="h-4 w-4" />
          Stripe Mode Switcher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-blue-700">Current Mode:</span>
          <Badge 
            variant={currentMode === 'test' ? 'destructive' : 'default'}
            className={currentMode === 'test' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}
          >
            {currentMode === 'test' ? (
              <>
                <TestTube className="h-3 w-3 mr-1" />
                TEST
              </>
            ) : (
              <>
                <CreditCard className="h-3 w-3 mr-1" />
                LIVE
              </>
            )}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={currentMode === 'test' ? 'default' : 'outline'}
            onClick={() => handleModeSwitch('test')}
            className={currentMode === 'test' ? 'bg-orange-500 hover:bg-orange-600' : ''}
          >
            <TestTube className="h-3 w-3 mr-1" />
            Test Mode
          </Button>
          <Button
            size="sm"
            variant={currentMode === 'live' ? 'default' : 'outline'}
            onClick={() => handleModeSwitch('live')}
            className={currentMode === 'live' ? 'bg-green-500 hover:bg-green-600' : ''}
          >
            <CreditCard className="h-3 w-3 mr-1" />
            Live Mode
          </Button>
        </div>
        
        <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded border border-blue-200">
          <strong>💡 Mode Switch:</strong> This overrides the environment-based Stripe mode for testing purposes.
        </div>
      </CardContent>
    </Card>
  );
};