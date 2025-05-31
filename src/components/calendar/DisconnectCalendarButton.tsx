
/**
 * 🔌 DISCONNECT CALENDAR BUTTON COMPONENT
 * =======================================
 * 
 * Simplified calendar disconnect button with confirmation flow.
 * Refactored for better maintainability and separation of concerns.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Unlink } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { DisconnectConfirmationDialog } from './DisconnectConfirmationDialog';
import { useCalendarDisconnect } from '@/hooks/useCalendarDisconnect';

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
  
  const { disconnecting, handleDisconnect } = useCalendarDisconnect({
    user,
    connectionId,
    providerName,
    onDisconnectSuccess
  });

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
