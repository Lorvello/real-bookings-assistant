
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCalendarContext } from '@/contexts/CalendarContext';

interface ConversationCalendarContextType {
  selectedCalendarId: string | null;
  setSelectedCalendarId: (calendarId: string) => void;
  calendars: Array<{ id: string; name: string }>;
}

const ConversationCalendarContext = createContext<ConversationCalendarContextType | undefined>(undefined);

export function ConversationCalendarProvider({ children }: { children: React.ReactNode }) {
  const { calendars, selectedCalendar } = useCalendarContext();
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null);

  // Auto-select the first available calendar or the currently selected one
  useEffect(() => {
    if (selectedCalendar) {
      setSelectedCalendarId(selectedCalendar.id);
    } else if (calendars.length > 0 && !selectedCalendarId) {
      setSelectedCalendarId(calendars[0].id);
    }
  }, [selectedCalendar, calendars, selectedCalendarId]);

  const handleSetSelectedCalendarId = (calendarId: string) => {
    setSelectedCalendarId(calendarId);
  };

  return (
    <ConversationCalendarContext.Provider
      value={{
        selectedCalendarId,
        setSelectedCalendarId: handleSetSelectedCalendarId,
        calendars: calendars.map(cal => ({ id: cal.id, name: cal.name })),
      }}
    >
      {children}
    </ConversationCalendarContext.Provider>
  );
}

export function useConversationCalendar() {
  const context = useContext(ConversationCalendarContext);
  if (context === undefined) {
    throw new Error('useConversationCalendar must be used within a ConversationCalendarProvider');
  }
  return context;
}
