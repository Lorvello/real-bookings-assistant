
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendars } from '@/hooks/useCalendars';
import type { Calendar } from '@/types/database';

interface CalendarContextType {
  selectedCalendar: Calendar | null;
  calendars: Calendar[];
  loading: boolean;
  viewingAllCalendars: boolean;
  selectCalendar: (calendar: Calendar) => void;
  selectAllCalendars: () => void;
  refreshCalendars: () => void;
  getActiveCalendarIds: () => string[];
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

interface CalendarProviderProps {
  children: ReactNode;
}

export function CalendarProvider({ children }: CalendarProviderProps) {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [viewingAllCalendars, setViewingAllCalendars] = useState(false);
  
  const { calendars, loading, refetch } = useCalendars();

  // Handle auth state
  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      } catch (error) {
        console.error('Failed to get session:', error);
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null);
          setAuthLoading(false);
        }
      }
    );

    getSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Auto-select first calendar or default calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendar && !viewingAllCalendars) {
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      setSelectedCalendar(defaultCalendar);
    }
  }, [calendars, selectedCalendar, viewingAllCalendars]);

  // Reset selected calendar when user changes
  useEffect(() => {
    if (!user) {
      setSelectedCalendar(null);
      setViewingAllCalendars(false);
    }
  }, [user]);

  const selectCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setViewingAllCalendars(false);
    localStorage.setItem('selectedCalendarId', calendar.id);
    localStorage.removeItem('viewingAllCalendars');
  };

  const selectAllCalendars = () => {
    setViewingAllCalendars(true);
    setSelectedCalendar(null);
    localStorage.setItem('viewingAllCalendars', 'true');
    localStorage.removeItem('selectedCalendarId');
  };

  const refreshCalendars = async () => {
    console.log('Refreshing calendars...');
    const result = await refetch();
    console.log('Calendars refreshed successfully');
    return result;
  };

  const getActiveCalendarIds = () => {
    if (viewingAllCalendars) {
      return calendars.map(cal => cal.id);
    }
    return selectedCalendar ? [selectedCalendar.id] : [];
  };

  // Restore selected calendar from localStorage
  useEffect(() => {
    const savedViewingAll = localStorage.getItem('viewingAllCalendars');
    const savedCalendarId = localStorage.getItem('selectedCalendarId');
    
    if (savedViewingAll === 'true') {
      setViewingAllCalendars(true);
      setSelectedCalendar(null);
    } else if (savedCalendarId && calendars.length > 0) {
      const savedCalendar = calendars.find(cal => cal.id === savedCalendarId);
      if (savedCalendar) {
        setSelectedCalendar(savedCalendar);
        setViewingAllCalendars(false);
      }
    }
  }, [calendars]);

  return (
    <CalendarContext.Provider value={{
      selectedCalendar,
      calendars,
      loading: loading || authLoading,
      viewingAllCalendars,
      selectCalendar,
      selectAllCalendars,
      refreshCalendars,
      getActiveCalendarIds
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
