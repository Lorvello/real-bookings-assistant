import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowNotification(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showNotification) return null;

  return (
    <div
      className={cn(
        'fixed top-4 left-1/2 -translate-x-1/2 z-[100]',
        'px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm',
        'flex items-center gap-2 transition-all duration-300',
        'animate-in slide-in-from-top-2',
        isOnline
          ? 'bg-success/90 text-success-foreground'
          : 'bg-destructive/90 text-destructive-foreground'
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">You're offline</span>
        </>
      )}
    </div>
  );
};
