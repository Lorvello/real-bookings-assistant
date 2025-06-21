
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettingsData } from '@/hooks/useSettingsData';
import { CalendarTab } from '@/components/settings/CalendarTab';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

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

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Beschikbaarheid</h1>
        <p className="text-gray-400 mt-1">Beheer je kalender en beschikbaarheid instellingen</p>
      </div>

      {/* Content */}
      <div className="max-w-4xl">
        <CalendarTab
          calendarSettings={calendarSettings}
          setCalendarSettings={setCalendarSettings}
          loading={loading}
          handleUpdateProfile={handleUpdateProfile}
        />
      </div>
    </div>
  );
};
