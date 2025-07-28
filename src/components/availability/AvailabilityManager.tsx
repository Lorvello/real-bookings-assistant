
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { DashboardLayout } from '@/components/DashboardLayout';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityContent } from './AvailabilityContent';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [activeTab, setActiveTab] = useState('schedule');

  // Simple auth check - redirect only if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-base text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <AvailabilityTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-lg p-4">
          <AvailabilityContent
            activeTab={activeTab}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};
