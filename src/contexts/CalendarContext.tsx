
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCalendars } from '@/hooks/useCalendars';
import type { Calendar } from '@/types/database';

interface CalendarContextType {
  selectedCalendar: Calendar | null;
  calendars: Calendar[];
  loading: boolean;
  selectCalendar: (calendar: Calendar) => void;
  refreshCalendars: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const { user } = useAuth();
  const { calendars, loading, refetch } = useCalendars();
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);

  // Auto-select first calendar or default calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendar) {
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      setSelectedCalendar(defaultCalendar);
    }
  }, [calendars, selectedCalendar]);

  // Reset selected calendar when user changes
  useEffect(() => {
    if (!user) {
      setSelectedCalendar(null);
    }
  }, [user]);

  const selectCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    localStorage.setItem('selectedCalendarId', calendar.id);
  };

  const refreshCalendars = () => {
    refetch();
  };

  // Restore selected calendar from localStorage
  useEffect(() => {
    const savedCalendarId = localStorage.getItem('selectedCalendarId');
    if (savedCalendarId && calendars.length > 0) {
      const savedCalendar = calendars.find(cal => cal.id === savedCalendarId);
      if (savedCalendar) {
        setSelectedCalendar(savedCalendar);
      }
    }
  }, [calendars]);

  return (
    <CalendarContext.Provider value={{
      selectedCalendar,
      calendars,
      loading,
      selectCalendar,
      refreshCalendars
    }}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
}
