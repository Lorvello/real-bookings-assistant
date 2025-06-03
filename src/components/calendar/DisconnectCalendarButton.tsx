
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Unlink } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { DisconnectConfirmationDialog } from './DisconnectConfirmationDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DisconnectCalendarButtonProps {
  user: User | null;
  connectionId: string;
  providerName: string;
  onDisconnectSuccess?: () => void;
  variant?: 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showConfirmation?: boolean;
  className?: string;
}

export const DisconnectCalendarButton: React.FC<DisconnectCalendarButtonProps> = ({
  user,
  connectionId,
  providerName,
  onDisconnectSuccess,
  variant = 'outline',
  size = 'sm',
  showConfirmation = true,
  className
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const { toast } = useToast();

  const handleDisconnect = async () => {
    if (!user) return;

    setDisconnecting(true);
    try {
      console.log(`[DisconnectButton] Disconnecting ${providerName} connection:`, connectionId);
      
      const { error } = await supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      console.log(`[DisconnectButton] ${providerName} disconnected successfully`);
      
      toast({
        title: "Calendar Ontkoppeld",
        description: `${providerName} is succesvol ontkoppeld`,
      });

      onDisconnectSuccess?.();
    } catch (error) {
      console.error(`[DisconnectButton] Error disconnecting ${providerName}:`, error);
      toast({
        title: "Disconnect Mislukt",
        description: `Kon ${providerName} niet ontkoppelen. Probeer het opnieuw.`,
        variant: "destructive",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleInitialClick = () => {
    if (showConfirmation) {
      setShowConfirm(true);
    } else {
      handleDisconnect();
    }
  };

  const handleConfirmDisconnect = async () => {
    await handleDisconnect();
    setShowConfirm(false);
  };

  const handleCancelDisconnect = () => {
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <DisconnectConfirmationDialog
        providerName={providerName}
        disconnecting={disconnecting}
        onConfirm={handleConfirmDisconnect}
        onCancel={handleCancelDisconnect}
      />
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleInitialClick}
      disabled={disconnecting}
      className={`text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 ${className || ''}`}
    >
      {disconnecting ? (
        <>
          <Unlink className="h-4 w-4 mr-2 animate-pulse" />
          Loskoppelen...
        </>
      ) : (
        <>
          <Unlink className="h-4 w-4 mr-2" />
          Loskoppelen
        </>
      )}
    </Button>
  );
};
