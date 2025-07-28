import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStableAvailabilityState } from '@/hooks/useStableAvailabilityState';

export const AvailabilityRouter: React.FC = () => {
  const navigate = useNavigate();
  const availabilityState = useStableAvailabilityState();

  useEffect(() => {
    // Only redirect once we have a definitive state (not 'checking')
    if (availabilityState.setupState === 'checking' || availabilityState.isRefreshing) {
      return; // Still loading, don't redirect yet
    }

    // Smart routing logic - redirect immediately based on actual state
    if (availabilityState.setupState === 'needs_calendar' || availabilityState.setupState === 'needs_config') {
      navigate('/availability/configure', { replace: true });
    } else if (availabilityState.setupState === 'configured') {
      navigate('/availability/schedule', { replace: true });
    }
  }, [availabilityState.setupState, availabilityState.isRefreshing, navigate]);

  // Show loading while determining where to route
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-base font-medium text-foreground">Loading availability...</div>
      </div>
    </div>
  );
};