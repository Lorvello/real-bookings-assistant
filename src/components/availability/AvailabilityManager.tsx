
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useSettingsData } from '@/hooks/useSettingsData';
import { AvailabilityHeader } from './AvailabilityHeader';
import { CalendarOwnershipHeader } from './CalendarOwnershipHeader';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityContent } from './AvailabilityContent';
import { NoCalendarSelected } from './NoCalendarSelected';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar } = useCalendarContext();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [setToDefault, setSetToDefault] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  const {
    calendarSettings,
    setCalendarSettings,
    loading,
    handleUpdateProfile
  } = useSettingsData();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    try {
      await handleUpdateProfile();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
    }
  };

  const handleUnsavedChanges = () => {
    setHasUnsavedChanges(true);
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-background">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (!selectedCalendar) {
    return <NoCalendarSelected profile={profile} user={profile} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <CalendarOwnershipHeader 
        selectedCalendar={selectedCalendar} 
        profile={profile} 
        user={profile} 
      />
      
      <AvailabilityHeader
        setToDefault={setToDefault}
        onSetToDefaultChange={setSetToDefault}
        hasUnsavedChanges={hasUnsavedChanges}
        loading={loading}
        onSave={handleSave}
      />

      <AvailabilityTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <AvailabilityContent
        activeTab={activeTab}
        calendarId={selectedCalendar.id}
        onUnsavedChanges={handleUnsavedChanges}
      />
    </div>
  );
};
