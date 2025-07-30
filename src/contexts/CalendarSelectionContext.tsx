import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Calendar } from '@/types/database';
import { useCalendarPersistence } from '@/hooks/useCalendarPersistence';

interface CalendarSelectionContextType {
  selectedCalendar: Calendar | null;
  viewingAllCalendars: boolean;
  selectCalendar: (calendar: Calendar) => void;
  selectAllCalendars: () => void;
  getActiveCalendarIds: () => string[];
}

const CalendarSelectionContext = createContext<CalendarSelectionContextType | undefined>(undefined);

interface CalendarSelectionProviderProps {
  children: ReactNode;
  calendars: Calendar[];
}

export function CalendarSelectionProvider({ children, calendars }: CalendarSelectionProviderProps) {
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [viewingAllCalendars, setViewingAllCalendars] = useState(false);
  
  const { saveSelection, loadSelection } = useCalendarPersistence();

  // Auto-select first calendar or default calendar when calendars load
  useEffect(() => {
    if (calendars.length > 0 && !selectedCalendar && !viewingAllCalendars) {
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      setSelectedCalendar(defaultCalendar);
    }
  }, [calendars, selectedCalendar, viewingAllCalendars]);

  // Load saved selection when calendars are available
  useEffect(() => {
    if (calendars.length === 0) return;

    const { savedViewingAll, savedCalendarId } = loadSelection();
    
    if (savedViewingAll) {
      setViewingAllCalendars(true);
      setSelectedCalendar(null);
    } else if (savedCalendarId) {
      const savedCalendar = calendars.find(cal => cal.id === savedCalendarId);
      if (savedCalendar) {
        setSelectedCalendar(savedCalendar);
        setViewingAllCalendars(false);
      } else {
        // Auto-select first calendar if saved one doesn't exist
        const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
        setSelectedCalendar(defaultCalendar);
        setViewingAllCalendars(false);
        saveSelection(defaultCalendar.id, false);
      }
    } else if (!selectedCalendar && !viewingAllCalendars) {
      // Auto-select first calendar for new users
      const defaultCalendar = calendars.find(cal => cal.is_default) || calendars[0];
      setSelectedCalendar(defaultCalendar);
      setViewingAllCalendars(false);
      saveSelection(defaultCalendar.id, false);
    }
  }, [calendars.length, loadSelection, saveSelection]);

  const selectCalendar = (calendar: Calendar) => {
    setSelectedCalendar(calendar);
    setViewingAllCalendars(false);
    saveSelection(calendar.id, false);
  };

  const selectAllCalendars = () => {
    setViewingAllCalendars(true);
    setSelectedCalendar(null);
    saveSelection(null, true);
  };

  const getActiveCalendarIds = () => {
    if (viewingAllCalendars) {
      return calendars.map(cal => cal.id);
    }
    return selectedCalendar ? [selectedCalendar.id] : [];
  };

  return (
    <CalendarSelectionContext.Provider value={{
      selectedCalendar,
      viewingAllCalendars,
      selectCalendar,
      selectAllCalendars,
      getActiveCalendarIds
    }}>
      {children}
    </CalendarSelectionContext.Provider>
  );
}

export function useCalendarSelectionContext() {
  const context = useContext(CalendarSelectionContext);
  if (context === undefined) {
    throw new Error('useCalendarSelectionContext must be used within a CalendarSelectionProvider');
  }
  return context;
}