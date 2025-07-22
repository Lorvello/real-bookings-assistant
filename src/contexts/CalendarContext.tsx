
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCalendars } from '@/hooks/useCalendars';
import type { Calendar } from '@/types/database';

interface CalendarContextType {
  selectedCalendar: Calendar | null;
  calendars: Calendar[];
  loading: boolean;
  viewingAllCalendars: boolean;
  selectedCalendarIds: string[];
  selectCalendar: (calendar: Calendar) => void;
  selectAllCalendars: () => void;
  selectMultipleCalendars: (calendarIds: string[]) => void;
  toggleCalendar: (calendarId: string) => void;
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
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  
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
    if (calendars.length > 0 && !selectedCalendar && !viewingAllCalendars && selectedCalendarIds.length === 0) {
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      setSelectedCalendar(defaultCalendar);
      setSelectedCalendarIds([defaultCalendar.id]);
    }
  }, [calendars, selectedCalendar, viewingAllCalendars, selectedCalendarIds]);

  // Reset selected calendar when user changes
  useEffect(() => {
    if (!user) {
      setSelectedCalendar(null);
      setViewingAllCalendars(false);
      setSelectedCalendarIds([]);
    }
  }, [user]);

  const selectCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setViewingAllCalendars(false);
    setSelectedCalendarIds([calendar.id]);
    localStorage.setItem('selectedCalendarId', calendar.id);
    localStorage.removeItem('viewingAllCalendars');
    localStorage.setItem('selectedCalendarIds', JSON.stringify([calendar.id]));
  };

  const selectAllCalendars = () => {
    setViewingAllCalendars(true);
    setSelectedCalendar(null);
    const allIds = calendars.map(cal => cal.id);
    setSelectedCalendarIds(allIds);
    localStorage.setItem('viewingAllCalendars', 'true');
    localStorage.removeItem('selectedCalendarId');
    localStorage.setItem('selectedCalendarIds', JSON.stringify(allIds));
  };

  const selectMultipleCalendars = (calendarIds: string[]) => {
    if (calendarIds.length === 0) return;
    
    if (calendarIds.length === 1) {
      const calendar = calendars.find(cal => cal.id === calendarIds[0]);
      if (calendar) {
        selectCalendar(calendar);
        return;
      }
    }
    
    if (calendarIds.length === calendars.length) {
      selectAllCalendars();
      return;
    }
    
    setSelectedCalendar(null);
    setViewingAllCalendars(false);
    setSelectedCalendarIds(calendarIds);
    localStorage.removeItem('selectedCalendarId');
    localStorage.removeItem('viewingAllCalendars');
    localStorage.setItem('selectedCalendarIds', JSON.stringify(calendarIds));
  };

  const toggleCalendar = (calendarId: string) => {
    const newSelectedIds = selectedCalendarIds.includes(calendarId)
      ? selectedCalendarIds.filter(id => id !== calendarId)
      : [...selectedCalendarIds, calendarId];
    
    if (newSelectedIds.length === 0) return; // Don't allow empty selection
    
    selectMultipleCalendars(newSelectedIds);
  };

  const refreshCalendars = async () => {
    console.log('Refreshing calendars...');
    try {
      const result = await refetch();
      console.log('Calendars refreshed successfully, result:', result);
      
      // Wait a bit for state to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return result;
    } catch (error) {
      console.error('Error refreshing calendars:', error);
      return [];
    }
  };

  const getActiveCalendarIds = () => {
    if (selectedCalendarIds.length > 0) {
      return selectedCalendarIds;
    }
    if (viewingAllCalendars) {
      return calendars.map(cal => cal.id);
    }
    return selectedCalendar ? [selectedCalendar.id] : [];
  };

  // Restore selected calendars from localStorage
  useEffect(() => {
    const savedViewingAll = localStorage.getItem('viewingAllCalendars');
    const savedCalendarId = localStorage.getItem('selectedCalendarId');
    const savedCalendarIds = localStorage.getItem('selectedCalendarIds');
    
    if (savedViewingAll === 'true') {
      setViewingAllCalendars(true);
      setSelectedCalendar(null);
      const allIds = calendars.map(cal => cal.id);
      setSelectedCalendarIds(allIds);
    } else if (savedCalendarIds && calendars.length > 0) {
      try {
        const ids = JSON.parse(savedCalendarIds);
        if (Array.isArray(ids) && ids.length > 0) {
          const validIds = ids.filter(id => calendars.some(cal => cal.id === id));
          if (validIds.length > 0) {
            selectMultipleCalendars(validIds);
            return;
          }
        }
      } catch (error) {
        console.error('Error parsing savedCalendarIds:', error);
      }
    } else if (savedCalendarId && calendars.length > 0) {
      const savedCalendar = calendars.find(cal => cal.id === savedCalendarId);
      if (savedCalendar) {
        setSelectedCalendar(savedCalendar);
        setSelectedCalendarIds([savedCalendar.id]);
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
      selectedCalendarIds,
      selectCalendar,
      selectAllCalendars,
      selectMultipleCalendars,
      toggleCalendar,
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
