
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCalendarContext } from '@/contexts/CalendarContext';
import { useCalendars } from '@/hooks/useCalendars';
import { AvailabilityTabs } from './AvailabilityTabs';
import { AvailabilityContent } from './AvailabilityContent';
import { NoCalendarSelected } from './NoCalendarSelected';
import type { Calendar } from '@/types/database';

export const AvailabilityManager = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { selectedCalendar, viewingAllCalendars } = useCalendarContext();
  const { calendars } = useCalendars();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [setToDefault, setSetToDefault] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');

  // Voor availability gebruiken we altijd een specifieke kalender
  // Als gebruiker "Alle kalenders" heeft geselecteerd, nemen we de eerste beschikbare kalender
  const availabilityCalendar: Calendar | null = React.useMemo(() => {
    if (!calendars.length) return null;
    
    // Als er een specifieke kalender geselecteerd is en niet "Alle kalenders", gebruik die
    if (selectedCalendar && !viewingAllCalendars) {
      return selectedCalendar;
    }
    
    // Anders gebruik de eerste beschikbare kalender (default of eerste)
    const defaultCalendar = calendars.find(cal => cal.is_default);
    return defaultCalendar || calendars[0];
  }, [selectedCalendar, viewingAllCalendars, calendars]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const handleSave = async () => {
    try {
      // Note: Save functionality moved to individual components
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
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (!availabilityCalendar) {
    return (
      <div className="bg-gray-900 min-h-full p-8">
        <NoCalendarSelected profile={profile} user={profile} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-full">
      {/* Save Button and Status */}
      {hasUnsavedChanges && (
        <div className="p-8 pb-0">
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="text-yellow-400">
                You have unsaved changes
              </div>
              <button
                onClick={handleSave}
                disabled={false}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <AvailabilityTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="p-8 pt-6">
        <div className="bg-card/95 backdrop-blur-sm border border-border/60 shadow-lg rounded-xl p-6">
          <AvailabilityContent
            activeTab={activeTab}
            onUnsavedChanges={handleUnsavedChanges}
          />
        </div>
      </div>
    </div>
  );
};
